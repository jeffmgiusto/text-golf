// API Route: /api/scorecard
// Fetches hole-by-hole scorecard from SlashGolf API

import { NextRequest, NextResponse } from 'next/server';
import { fetchScorecard } from '@/lib/slashgolf';
import { ScorecardApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const playerName = searchParams.get('player');
  const tournId = searchParams.get('tournId');
  const year = searchParams.get('year');

  if (!playerName) {
    return NextResponse.json(
      { scorecard: null, error: 'Player name is required', fromCache: false },
      { status: 400 }
    );
  }

  try {
    const scorecard = await fetchScorecard(playerName, tournId, year);

    const response: ScorecardApiResponse = {
      scorecard,
      fromCache: scorecard ? Date.now() - scorecard.cachedAt < 1000 : false,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch scorecard';

    const response: ScorecardApiResponse = {
      scorecard: null,
      error: errorMessage,
      fromCache: false,
    };

    // Return 200 with error message so UI can handle gracefully
    return NextResponse.json(response);
  }
}
