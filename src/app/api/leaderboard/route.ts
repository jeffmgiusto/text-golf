// API Route: /api/leaderboard
// Uses SlashGolf API for all leaderboard data
// Sub-minute updates during live tournaments!

import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveLeaderboard } from '@/lib/slashgolf';

export async function GET(request: NextRequest) {
  try {
    const tournId = request.nextUrl.searchParams.get('tournId') || undefined;
    const year = request.nextUrl.searchParams.get('year') || undefined;

    const leaderboard = await fetchLiveLeaderboard(tournId, year);

    // Use the full CourseInfo (with real par + location) when available (e.g. preview mode),
    // otherwise fall back to constructing from the course name embedded in leaderboard rows.
    const courseInfo = leaderboard.courseInfoFull
      ? leaderboard.courseInfoFull
      : leaderboard.courseName
        ? { courseName: leaderboard.courseName, par: 72 }
        : null;

    return NextResponse.json({
      info: leaderboard.info,
      players: leaderboard.players,
      courseInfo,
      activeTournaments: leaderboard.activeTournaments,
      fetchedAt: new Date().toISOString(),
      source: 'slashgolf',
      isLive: leaderboard.isLive,
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
