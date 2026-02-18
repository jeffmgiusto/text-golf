// API Route: /api/tournaments/leaderboard
// Fetches historical leaderboard for a specific tournament

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalLeaderboard } from '@/lib/slashgolf';
import { HistoricalLeaderboardResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tournId = searchParams.get('tournId');
  const year = searchParams.get('year');

  if (!tournId || !year) {
    return NextResponse.json(
      { tournament: { name: '', year: '', courseName: '' }, players: [], error: 'tournId and year are required' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchHistoricalLeaderboard(tournId, year);

    const response: HistoricalLeaderboardResponse = {
      tournament: result.tournament,
      players: result.players,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leaderboard';

    const response: HistoricalLeaderboardResponse = {
      tournament: { name: '', year: '', courseName: '' },
      players: [],
      error: errorMessage,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
