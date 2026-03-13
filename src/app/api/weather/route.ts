// API Route: /api/weather
// Returns live weather for a golf course location via OpenWeatherMap
// Always returns 200 — weather is a non-blocking enhancement

import { NextRequest, NextResponse } from 'next/server';
import { fetchWeather } from '@/lib/weather';
import { WeatherApiResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  const location = request.nextUrl.searchParams.get('location');

  if (!location) {
    return NextResponse.json<WeatherApiResponse>({ weather: null });
  }

  const weather = await fetchWeather(location);
  return NextResponse.json<WeatherApiResponse>({ weather });
}
