import { NextResponse } from 'next/server';
import { fetchTournamentList } from '@/lib/slashgolf';

export async function GET() {
  try {
    const tournaments = await fetchTournamentList();
    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('Tournament list API error:', error);
    return NextResponse.json(
      { tournaments: [], error: error instanceof Error ? error.message : 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
