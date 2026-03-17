import { NextResponse } from 'next/server';
import { fetchHistoricalLeaderboard } from '@/lib/slashgolf';

function parseScoreToNumber(str: string): number | null {
  if (!str || str === '-' || str === '') return null;
  if (str === 'E') return 0;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournId = searchParams.get('tournId');

  if (!tournId) {
    return NextResponse.json(
      { error: 'tournId parameter is required' },
      { status: 400 }
    );
  }

  const currentYear = new Date().getFullYear();
  const years: Array<{
    year: number;
    winningScore: number | null;
    lowRound: number | null;
    top10: Array<{ playerName: string; position: string }>;
  }> = [];

  for (let y = currentYear; y > currentYear - 10; y--) {
    try {
      const data = await fetchHistoricalLeaderboard(tournId, String(y));
      if (!data.players || data.players.length === 0) continue;

      // Winning score
      const winningScore = parseScoreToNumber(data.players[0].totalScore);

      // Low round: min of all players' individual round scores
      let lowRound: number | null = null;
      for (const player of data.players) {
        for (const round of player.rounds) {
          const score = parseScoreToNumber(round);
          if (score !== null && (lowRound === null || score < lowRound)) {
            lowRound = score;
          }
        }
      }

      // Top 10 finishers
      const top10: Array<{ playerName: string; position: string }> = [];
      for (const player of data.players) {
        const posStr = player.position.replace(/^T/, '');
        const posNum = parseInt(posStr, 10);
        if (!isNaN(posNum) && posNum <= 10) {
          top10.push({ playerName: player.playerName, position: player.position });
        }
      }

      years.push({ year: y, winningScore, lowRound, top10 });
    } catch {
      // Skip years with no data
    }
  }

  return NextResponse.json({ years });
}
