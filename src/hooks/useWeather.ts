'use client';

import { useState, useEffect } from 'react';
import { WeatherData, WeatherApiResponse } from '@/lib/types';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useWeather(location: string | undefined | null): WeatherData | null {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!location) return;

    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
        if (!res.ok) return;
        const data: WeatherApiResponse = await res.json();
        if (!cancelled) {
          setWeather(data.weather);
        }
      } catch {
        // Weather is non-blocking — silently ignore errors
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location]);

  return weather;
}
