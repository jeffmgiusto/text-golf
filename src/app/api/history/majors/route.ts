import { NextResponse } from 'next/server';
import { getMajorTournamentIds, fetchRankings, fetchHistoricalLeaderboard } from '@/lib/slashgolf';

const MAJORS = [
  { key: 'masters', name: 'Masters Tournament' },
  { key: 'pga', name: 'PGA Championship' },
  { key: 'usopen', name: 'U.S. Open' },
  { key: 'theopen', name: 'The Open Championship' },
] as const;

type MajorKey = typeof MAJORS[number]['key'];

function getPlayerPosition(
  leaderboards: Map<string, { players: { position: string; playerName: string }[] }>,
  majorKey: string,
  year: number,
  playerName: string
): string | null {
  const key = `${majorKey}-${year}`;
  const lb = leaderboards.get(key);
  if (!lb) return 'NT'; // tournament not held or data unavailable

  const normalizedSearch = playerName.toLowerCase();
  for (const p of lb.players) {
    if (p.playerName.toLowerCase() === normalizedSearch) {
      return p.position;
    }
  }
  return null; // didn't play
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerParam = searchParams.get('player');

  try {
    const majorIds = await getMajorTournamentIds();
    if (!majorIds) {
      return NextResponse.json({ error: 'Could not identify major championships' }, { status: 500 });
    }

    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y > currentYear - 10; y--) {
      years.push(y);
    }

    // Fetch all 40 leaderboards (4 majors × 10 years) in parallel
    const leaderboards = new Map<string, { players: { position: string; playerName: string }[] }>();
    const allPlayerNamesSet = new Set<string>();

    const fetchPromises: { key: string; promise: Promise<{ players: { position: string; playerName: string }[] }> }[] = [];

    for (const major of MAJORS) {
      const tournId = majorIds[major.key as MajorKey];
      for (const year of years) {
        const key = `${major.key}-${year}`;
        fetchPromises.push({
          key,
          promise: fetchHistoricalLeaderboard(tournId, String(year))
            .then(data => ({ players: data.players.map(p => ({ position: p.position, playerName: p.playerName })) }))
            .catch(() => ({ players: [] })),
        });
      }
    }

    const results = await Promise.allSettled(fetchPromises.map(fp => fp.promise));

    results.forEach((result, index) => {
      const { key } = fetchPromises[index];
      if (result.status === 'fulfilled') {
        const data = result.value;
        if (data.players.length > 0) {
          leaderboards.set(key, data);
          for (const p of data.players) {
            allPlayerNamesSet.add(p.playerName);
          }
        } else {
          // No data — mark as NT (not held)
          leaderboards.set(key, { players: [] });
        }
      }
    });

    const allPlayerNames = Array.from(allPlayerNamesSet).sort();

    // Mode 2: specific player lookup
    if (playerParam) {
      const playerResults: Record<string, Record<string, { position: string }>> = {};
      for (const major of MAJORS) {
        playerResults[major.key] = {};
        for (const year of years) {
          const pos = getPlayerPosition(leaderboards, major.key, year, playerParam);
          if (pos !== null) {
            playerResults[major.key][String(year)] = { position: pos };
          }
        }
      }

      return NextResponse.json({ playerName: playerParam, results: playerResults });
    }

    // Mode 1: full page load
    const rankings = await fetchRankings('owgr');
    const top25 = rankings.slice(0, 25);

    const playerResults: Record<string, Record<string, Record<string, { position: string }>>> = {};

    for (const entry of top25) {
      const name = entry.playerName;
      playerResults[name] = {};
      for (const major of MAJORS) {
        playerResults[name][major.key] = {};
        for (const year of years) {
          const pos = getPlayerPosition(leaderboards, major.key, year, name);
          if (pos !== null) {
            playerResults[name][major.key][String(year)] = { position: pos };
          }
        }
      }
    }

    return NextResponse.json({
      rankings: top25.map(r => ({ rank: r.rank, playerName: r.playerName })),
      allPlayerNames,
      years,
      majors: MAJORS.map(m => ({ key: m.key, name: m.name })),
      playerResults,
    });
  } catch (error) {
    console.error('Majors history error:', error);
    return NextResponse.json({ error: 'Failed to fetch majors history' }, { status: 500 });
  }
}
