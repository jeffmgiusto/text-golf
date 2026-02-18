// API Route: /api/tournaments
// Fetches tournament schedule from SlashGolf API

import { NextResponse } from 'next/server';
import { fetchTournamentSchedule } from '@/lib/slashgolf';
import { TournamentsApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const { upcoming, past } = await fetchTournamentSchedule();

    const response: TournamentsApiResponse = {
      upcoming,
      past,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tournaments';

    const response: TournamentsApiResponse = {
      upcoming: [],
      past: [],
      error: errorMessage,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
