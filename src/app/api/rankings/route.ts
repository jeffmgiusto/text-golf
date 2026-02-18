import { NextResponse } from 'next/server';
import { fetchRankings } from '@/lib/slashgolf';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'owgr' | 'fedex' || 'owgr';

  try {
    const rankings = await fetchRankings(type);

    return NextResponse.json({
      type,
      rankings,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch rankings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
