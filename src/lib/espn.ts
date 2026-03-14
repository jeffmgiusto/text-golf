// ESPN API client for tee times
// Non-blocking enhancement — returns empty object on any failure

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';

let teeTimeCache: { data: Record<string, string>; cachedAt: number } | null = null;

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatTeeTime(dateStr: string): string | null {
  // Parse "Thu Mar 12 08:40:00 PDT 2026" — extract HH:MM:SS
  const match = dateStr.match(/(\d{2}):(\d{2}):\d{2}/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const suffix = hour >= 12 ? 'p' : 'a';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute}${suffix}`;
}

export async function fetchTeeTimes(): Promise<Record<string, string>> {
  // Check cache
  if (teeTimeCache && Date.now() - teeTimeCache.cachedAt < CACHE_DURATION_MS) {
    return teeTimeCache.data;
  }

  try {
    const res = await fetch(ESPN_SCOREBOARD_URL);
    if (!res.ok) return {};

    const json = await res.json();
    const competitors = json?.events?.[0]?.competitions?.[0]?.competitors;
    if (!Array.isArray(competitors)) return {};

    const teeTimes: Record<string, string> = {};

    for (const competitor of competitors) {
      const name = competitor?.athlete?.displayName;
      if (!name) continue;

      const linescores = competitor?.linescores;
      if (!Array.isArray(linescores)) continue;

      // Find first incomplete round
      for (const linescore of linescores) {
        if (linescore?.value > 0) continue; // Round is complete

        const teeTimeStr = linescore?.statistics?.categories?.[0]?.stats?.[6]?.displayValue;
        if (!teeTimeStr) continue;

        const formatted = formatTeeTime(teeTimeStr);
        if (formatted) {
          teeTimes[normalizeName(name)] = formatted;
        }
        break; // Only care about the first incomplete round
      }
    }

    teeTimeCache = { data: teeTimes, cachedAt: Date.now() };
    return teeTimes;
  } catch {
    return {};
  }
}
