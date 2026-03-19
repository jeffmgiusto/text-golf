// OpenWeatherMap client for live weather conditions
// Free tier — non-blocking enhancement, returns null on any failure

import { WeatherData } from './types';

const WEATHER_CACHE_DURATION_MS = 30 * 60 * 1000;   // 30 minutes
const GEOCODE_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory caches (server-side)
const weatherCache = new Map<string, { data: WeatherData; cachedAt: number }>();
const geocodeCache = new Map<string, { data: { lat: number; lon: number }; cachedAt: number }>();

interface ConditionMapping {
  icon: string;
  condition: string;
}

function mapCondition(id: number, windSpeed: number): ConditionMapping {
  if (id === 800) return { icon: '☀', condition: 'Sunny' };
  if (id >= 801 && id <= 802) return { icon: '⛅', condition: 'Partly Cloudy' };
  if (id >= 803 && id <= 804) return { icon: '☁', condition: 'Cloudy' };
  if (id >= 500 && id <= 531) return { icon: '🌧', condition: 'Rain' };
  if (id >= 200 && id <= 232) return { icon: '⛈', condition: 'Thunderstorm' };
  if (id >= 701 && id <= 762) return { icon: '🌫', condition: 'Fog' };
  // Windy override when no precipitation
  if (windSpeed > 20) return { icon: '💨', condition: 'Windy' };
  return { icon: '☀', condition: 'Clear' };
}

async function geocode(location: string, apiKey: string): Promise<{ lat: number; lon: number } | null> {
  const cached = geocodeCache.get(location);
  if (cached && Date.now() - cached.cachedAt < GEOCODE_CACHE_DURATION_MS) {
    return cached.data;
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const coords = { lat: data[0].lat, lon: data[0].lon };
  geocodeCache.set(location, { data: coords, cachedAt: Date.now() });
  return coords;
}

export async function fetchWeather(location: string): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  // Check weather cache
  const cached = weatherCache.get(location);
  if (cached && Date.now() - cached.cachedAt < WEATHER_CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    // Geocode location
    const coords = await geocode(location, apiKey);
    if (!coords) return null;

    const { lat, lon } = coords;

    // Fetch current weather + forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`),
    ]);

    if (!currentRes.ok || !forecastRes.ok) return null;

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    // Extract temp and condition from current weather
    const temp = Math.round(current.main.temp);
    const conditionId = current.weather?.[0]?.id ?? 800;
    const currentWind = current.wind?.speed ?? 0;
    const { icon, condition } = mapCondition(conditionId, currentWind);

    // Extract AM/PM wind from forecast
    // Use city.timezone offset (seconds from UTC) to determine local hours
    const tzOffset = forecast.city?.timezone ?? 0; // seconds from UTC
    const now = Date.now();
    const todayLocalStart = new Date(now + tzOffset * 1000);
    const todayDateStr = todayLocalStart.toISOString().slice(0, 10);

    let amWindSpeeds: number[] = [];
    let pmWindSpeeds: number[] = [];
    let amRainChances: number[] = [];
    let pmRainChances: number[] = [];

    for (const entry of forecast.list ?? []) {
      const entryUtcMs = entry.dt * 1000;
      // Convert to local time using timezone offset
      const localDate = new Date(entryUtcMs + tzOffset * 1000);
      const entryDateStr = localDate.toISOString().slice(0, 10);

      if (entryDateStr !== todayDateStr) continue;

      const localHour = localDate.getUTCHours();
      const windSpeed = entry.wind?.speed ?? 0;
      const pop = entry.pop ?? 0; // 0-1 precipitation probability

      if (localHour >= 6 && localHour < 12) {
        amWindSpeeds.push(windSpeed);
        amRainChances.push(pop);
      } else if (localHour >= 12 && localHour < 18) {
        pmWindSpeeds.push(windSpeed);
        pmRainChances.push(pop);
      }
    }

    // Average wind speeds, fall back to current wind if no forecast entries
    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : Math.round(currentWind);
    const windAm = avg(amWindSpeeds);
    const windPm = avg(pmWindSpeeds);
    const rainAm = amRainChances.length > 0 ? Math.round(Math.max(...amRainChances) * 100) : 0;
    const rainPm = pmRainChances.length > 0 ? Math.round(Math.max(...pmRainChances) * 100) : 0;

    const result: WeatherData = { temp, condition, icon, windAm, windPm, rainAm, rainPm };
    weatherCache.set(location, { data: result, cachedAt: Date.now() });
    return result;
  } catch {
    return null;
  }
}
