// API Route: /api/tee-times
// Returns tee times from ESPN for players who haven't started
// Always returns 200 — tee times are a non-blocking enhancement

import { NextResponse } from 'next/server';
import { fetchTeeTimes } from '@/lib/espn';

export async function GET() {
  const teeTimes = await fetchTeeTimes();
  return NextResponse.json({ teeTimes });
}
