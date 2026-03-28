import { NextResponse } from 'next/server';
import { fetchTournamentSchedule, fetchRankings, fetchHistoricalLeaderboard } from '@/lib/slashgolf';
import type { PlayerTournamentResult } from '@/lib/types';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: unknown; cachedAt: number }>();

interface CachedData {
  rankings: { rank: number; playerName: string }[];
  allPlayerNames: string[];
  playerResults: Record<string, { playerName: string; results: PlayerTournamentResult[] }>;
}

function isNonFinishPosition(pos: string): boolean {
  const upper = pos.toUpperCase();
  return upper === 'CUT' || upper === 'WD' || upper === 'DQ' || upper === 'MC';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerParam = searchParams.get('player');

  try {
    // Check cache
    const cached = cache.get('player-results');
    if (cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
      const data = cached.data as CachedData;

      if (playerParam) {
        const key = playerParam.toLowerCase();
        const playerData = data.playerResults[key];
        return NextResponse.json({
          playerName: playerData?.playerName || playerParam,
          results: playerData?.results || [],
        });
      }

      return NextResponse.json(data);
    }

    // Fetch completed tournaments (up to 20, most recent first)
    const schedule = await fetchTournamentSchedule();
    const pastTournaments = schedule.past.slice(0, 20);

    // Fetch all leaderboards in parallel
    const fetchPromises = pastTournaments.map(t =>
      fetchHistoricalLeaderboard(t.tournId, t.year)
        .then(data => ({ tournament: data.tournament, players: data.players }))
        .catch(() => null)
    );

    const results = await Promise.allSettled(fetchPromises);

    // Build player results map
    const playerMap = new Map<string, { playerName: string; results: PlayerTournamentResult[] }>();
    const allPlayerNamesSet = new Set<string>();

    results.forEach((result, index) => {
      if (result.status !== 'fulfilled' || !result.value) return;

      const { players } = result.value;
      const tournamentName = pastTournaments[index].name;

      for (const player of players) {
        allPlayerNamesSet.add(player.playerName);
        const key = player.playerName.toLowerCase();

        if (!playerMap.has(key)) {
          playerMap.set(key, { playerName: player.playerName, results: [] });
        }

        const entry = playerMap.get(key)!;

        const isNonFinish = isNonFinishPosition(player.position);
        const score = isNonFinish || player.totalScore === '-'
          ? null
          : player.totalScore;

        entry.results.push({
          tournamentName,
          position: player.position,
          score,
        });
      }
    });

    // Truncate to 10 results per player
    for (const [key, data] of playerMap) {
      if (data.results.length > 10) {
        playerMap.set(key, { ...data, results: data.results.slice(0, 10) });
      }
    }

    // Fetch OWGR top 25
    const rankings = await fetchRankings('owgr');
    const top25 = rankings.slice(0, 25).map(r => ({ rank: r.rank, playerName: r.playerName }));

    // Build response with ALL players
    const playerResults: Record<string, { playerName: string; results: PlayerTournamentResult[] }> = {};
    for (const [key, data] of playerMap) {
      playerResults[key] = data;
    }

    const fullResponse: CachedData = {
      rankings: top25,
      allPlayerNames: Array.from(allPlayerNamesSet).sort(),
      playerResults,
    };

    // Cache the assembled response
    cache.set('player-results', { data: fullResponse, cachedAt: Date.now() });

    // Return based on mode
    if (playerParam) {
      const key = playerParam.toLowerCase();
      const playerData = fullResponse.playerResults[key];
      return NextResponse.json({
        playerName: playerData?.playerName || playerParam,
        results: playerData?.results || [],
      });
    }

    return NextResponse.json(fullResponse);
  } catch (error) {
    console.error('Player results error:', error);
    return NextResponse.json({ error: 'Failed to fetch player results' }, { status: 500 });
  }
}
