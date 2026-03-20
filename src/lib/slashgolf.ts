// SlashGolf API client - PRIMARY DATA SOURCE
// Pro tier: 20,000 calls/month - optimized caching strategy
// Sub-minute score updates during live tournaments!

import {
  ProcessedScorecard,
  RoundScorecard,
  ScheduledTournament,
  TournamentResult,
  HistoricalPlayer,
  PlayerWithStats,
  TournamentInfo,
  CourseInfo,
  ActiveTournament,
} from './types';
import { isValidPGATourEvent } from './tourFilters';

const SLASHGOLF_BASE_URL = 'https://live-golf-data.p.rapidapi.com';

// Caching durations - optimized for 20k calls/month
const LIVE_CACHE_DURATION_MS = 1 * 60 * 1000;           // 1 minute for live scores
const SCORECARD_CACHE_DURATION_MS = 2 * 60 * 1000;      // 2 minutes for scorecards (halves API calls for repeated clicks)
const SCHEDULE_CACHE_DURATION_MS = 5 * 60 * 1000;       // 5 minutes for schedules
const TOURNAMENT_CACHE_DURATION_MS = 30 * 60 * 1000;    // 30 minutes for tournament info (rarely changes mid-event)
const PLAYER_ID_CACHE_DURATION_MS = 30 * 60 * 1000;     // 30 minutes for player IDs
const HISTORICAL_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours for historical data

// In-memory caches (server-side)
const scorecardCache = new Map<string, { data: ProcessedScorecard; cachedAt: number }>();
const leaderboardCache = new Map<string, { data: { info: TournamentInfo; players: PlayerWithStats[]; courseName: string; courseInfoFull?: CourseInfo | null }; cachedAt: number }>();

// Tournament info cache - avoids repeated schedule API calls
const tournamentCache = new Map<string, { data: { tournId: string; name: string; year: string; isPreview: boolean; startDate?: string; endDate?: string }; cachedAt: number }>();

// Player ID cache - populated from leaderboard, avoids extra leaderboard calls for scorecards
// Key: normalized player name, Value: { playerId, tournId, year, cachedAt }
const playerIdCache = new Map<string, { playerId: string; tournId: string; year: string; cachedAt: number }>();

// Parse MongoDB extended JSON number format
function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && '$numberInt' in val) {
    return parseInt((val as { $numberInt: string }).$numberInt, 10);
  }
  return 0;
}

// Get Monday 11:59:59 PM (local time) after a given timestamp
// Used to determine when to switch from showing completed tournament to next preview
function getMondayMidnightAfter(endMs: number): number {
  const endDate = new Date(endMs);
  const dayOfWeek = endDate.getDay(); // 0=Sun, 1=Mon, 2=Tue, ...
  // If Sunday (0), Monday is 1 day away
  // If Monday (1), next Monday is 7 days away (we want the Monday AFTER)
  // If any other day, calculate days until next Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const monday = new Date(endMs);
  monday.setDate(monday.getDate() + daysUntilMonday);
  monday.setHours(23, 59, 59, 999);
  return monday.getTime();
}

// Get current PGA Tour tournament info
// Logic: Show tournament until Monday night after it ends, then show next tournament preview
// Falls back to most recent completed tournament if no upcoming events
// Only returns valid PGA Tour events (no Korn Ferry, Q-School, etc.)
// Uses 30-minute cache to minimize API calls
export async function getCurrentTournament(): Promise<{ tournId: string; name: string; year: string; isPreview: boolean; startDate?: string; endDate?: string } | null> {
  // Check tournament cache first (30-minute duration)
  const cacheKey = 'current-tournament';
  const cached = tournamentCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TOURNAMENT_CACHE_DURATION_MS) {
    return cached.data;
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) return null;

  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear, currentYear - 1];
  const now = Date.now();

  // Categorize tournaments
  let inProgressTournament: { tournId: string; name: string; year: string } | null = null;
  let justEndedTournament: { tournId: string; name: string; year: string; cutoffMs: number } | null = null;
  let upcomingTournaments: { tournId: string; name: string; year: string; startMs: number; endMs: number }[] = [];
  let fallbackTournament: { tournId: string; name: string; year: string; endMs: number } | null = null;

  for (const year of yearsToTry) {
    try {
      const response = await fetch(
        `${SLASHGOLF_BASE_URL}/schedule?orgId=1&year=${year}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      for (const tournament of data.schedule || []) {
        // Skip non-PGA Tour events (Korn Ferry, Q-School, etc.)
        if (!isValidPGATourEvent(tournament.name)) continue;

        const start = tournament.date?.start?.$date?.$numberLong;
        const end = tournament.date?.end?.$date?.$numberLong;

        if (start && end) {
          const startMs = parseInt(start, 10);
          const endMs = parseInt(end, 10);
          const mondayCutoff = getMondayMidnightAfter(endMs);

          // Category 1: Tournament is currently in progress
          if (now >= startMs && now <= endMs) {
            inProgressTournament = { tournId: tournament.tournId, name: tournament.name, year: String(year) };
          }
          // Category 2: Tournament ended but still before Monday midnight (show until Monday)
          else if (now > endMs && now <= mondayCutoff) {
            if (!justEndedTournament || mondayCutoff > justEndedTournament.cutoffMs) {
              justEndedTournament = {
                tournId: tournament.tournId,
                name: tournament.name,
                year: String(year),
                cutoffMs: mondayCutoff
              };
            }
          }
          // Category 3: Tournament hasn't started yet (upcoming)
          else if (now < startMs) {
            upcomingTournaments.push({
              tournId: tournament.tournId,
              name: tournament.name,
              year: String(year),
              startMs,
              endMs,
            });
          }
          // Category 4: Tournament is fully past Monday cutoff (fallback)
          else if (now > mondayCutoff) {
            if (!fallbackTournament || endMs > fallbackTournament.endMs) {
              fallbackTournament = {
                tournId: tournament.tournId,
                name: tournament.name,
                year: String(year),
                endMs
              };
            }
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Priority 1: In-progress tournament
  if (inProgressTournament) {
    const result = { ...inProgressTournament, isPreview: false };
    tournamentCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  }

  // Priority 2: Just-ended tournament (before Monday midnight)
  if (justEndedTournament) {
    const result = {
      tournId: justEndedTournament.tournId,
      name: justEndedTournament.name,
      year: justEndedTournament.year,
      isPreview: false
    };
    tournamentCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  }

  // Priority 3: Next upcoming tournament (Tuesday+ preview mode)
  if (upcomingTournaments.length > 0) {
    // Sort by start date, pick the earliest
    upcomingTournaments.sort((a, b) => a.startMs - b.startMs);
    const next = upcomingTournaments[0];
    const fmtDate = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const result = {
      tournId: next.tournId,
      name: next.name,
      year: next.year,
      isPreview: true,
      startDate: fmtDate(next.startMs),
      endDate: fmtDate(next.endMs),
    };
    tournamentCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  }

  // Priority 4: Fallback to most recent completed tournament (off-season)
  if (fallbackTournament) {
    const result = {
      tournId: fallbackTournament.tournId,
      name: fallbackTournament.name,
      year: fallbackTournament.year,
      isPreview: false
    };
    tournamentCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  }

  return null;
}

// Get ALL currently active tournaments (in-progress + just-ended fallback)
// Used to populate the multi-tournament toggle on the home page
export async function getCurrentTournaments(): Promise<ActiveTournament[]> {
  const cacheKey = 'current-tournaments';
  const cached = tournamentCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TOURNAMENT_CACHE_DURATION_MS) {
    return (cached.data as unknown as ActiveTournament[]);
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) return [];

  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear, currentYear - 1];
  const now = Date.now();

  const inProgress: ActiveTournament[] = [];
  const justEnded: ActiveTournament[] = [];

  for (const year of yearsToTry) {
    try {
      const response = await fetch(
        `${SLASHGOLF_BASE_URL}/schedule?orgId=1&year=${year}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
          },
        }
      );

      if (!response.ok) continue;

      const data = await response.json();

      for (const tournament of data.schedule || []) {
        if (!isValidPGATourEvent(tournament.name)) continue;

        const start = tournament.date?.start?.$date?.$numberLong;
        const end = tournament.date?.end?.$date?.$numberLong;

        if (start && end) {
          const startMs = parseInt(start, 10);
          const endMs = parseInt(end, 10);
          const mondayCutoff = getMondayMidnightAfter(endMs);

          if (now >= startMs && now <= endMs) {
            inProgress.push({ tournId: tournament.tournId, name: tournament.name, year: String(year) });
          } else if (now > endMs && now <= mondayCutoff) {
            justEnded.push({ tournId: tournament.tournId, name: tournament.name, year: String(year) });
          }
        }
      }
    } catch {
      continue;
    }
  }

  const result = inProgress.length > 0 ? inProgress : justEnded;

  // Store in tournament cache (reuse the map with a special key)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (tournamentCache as Map<string, { data: any; cachedAt: number }>).set(cacheKey, { data: result, cachedAt: Date.now() });

  return result;
}

// Find player ID by name from SlashGolf leaderboard
export async function findPlayerId(
  playerName: string,
  tournId: string,
  year: string
): Promise<string | null> {
  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/leaderboard?orgId=1&tournId=${tournId}&year=${year}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Normalize player name for matching (handle "Last, First" format)
    const normalizedSearch = playerName.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
    const nameParts = normalizedSearch.split(' ').filter(Boolean);

    for (const row of data.leaderboardRows || []) {
      const firstName = (row.firstName || '').toLowerCase();
      const lastName = (row.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const reverseName = `${lastName} ${firstName}`;

      // Try various matching strategies
      if (
        fullName.includes(normalizedSearch) ||
        reverseName.includes(normalizedSearch) ||
        normalizedSearch.includes(lastName) ||
        (nameParts.length >= 2 && nameParts.some(p => lastName.includes(p)))
      ) {
        return row.playerId;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Fetch scorecard for a player
export async function fetchScorecard(
  playerName: string,
  tournIdParam?: string | null,
  yearParam?: string | null,
  forceRefresh = false
): Promise<ProcessedScorecard | null> {
  const cacheKey = tournIdParam && yearParam
    ? `${playerName.toLowerCase()}-${tournIdParam}-${yearParam}`
    : playerName.toLowerCase();

  // Check cache first
  if (!forceRefresh) {
    const cached = scorecardCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < SCORECARD_CACHE_DURATION_MS) {
      return cached.data;
    }
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  // Use provided tournament context or fall back to current tournament
  let tournament: { tournId: string; name: string; year: string } | null;
  if (tournIdParam && yearParam) {
    tournament = { tournId: tournIdParam, name: '', year: yearParam };
  } else {
    tournament = await getCurrentTournament();
  }
  if (!tournament) {
    throw new Error('No active tournament found');
  }

  // Check player ID cache first (populated from leaderboard)
  const normalizedSearch = playerName.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
  const cachedPlayer = playerIdCache.get(normalizedSearch);

  let playerId: string | null = null;

  // Use cached player ID if valid and matches current tournament
  if (
    cachedPlayer &&
    cachedPlayer.tournId === tournament.tournId &&
    cachedPlayer.year === tournament.year &&
    Date.now() - cachedPlayer.cachedAt < PLAYER_ID_CACHE_DURATION_MS
  ) {
    playerId = cachedPlayer.playerId;
  } else {
    // Fall back to API call if not in cache
    playerId = await findPlayerId(playerName, tournament.tournId, tournament.year);
  }

  if (!playerId) {
    throw new Error(`Player not found in ${tournament.name}`);
  }

  // Fetch scorecard
  const response = await fetch(
    `${SLASHGOLF_BASE_URL}/scorecard?orgId=1&tournId=${tournament.tournId}&year=${tournament.year}&playerId=${playerId}`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`SlashGolf API error: ${response.status}`);
  }

  const rawData: RoundScorecard[] = await response.json();

  if (!Array.isArray(rawData) || rawData.length === 0) {
    throw new Error('No scorecard data available');
  }

  // Process the scorecard data
  const processed: ProcessedScorecard = {
    playerName: `${rawData[0].firstName} ${rawData[0].lastName}`,
    rounds: rawData.map((round) => ({
      roundId: parseNumber(round.roundId),
      score: round.currentRoundScore || 'E',
      complete: round.roundComplete,
      currentHole: parseNumber(round.currentHole),
      totalShots: parseNumber(round.totalShots),
      holes: Array.from({ length: 18 }, (_, i) => {
        const holeNum = String(i + 1);
        const hole = round.holes?.[holeNum];
        return {
          hole: i + 1,
          par: hole ? parseNumber(hole.par) : 4,
          score: hole ? parseNumber(hole.holeScore) : null,
        };
      }),
    })),
    cachedAt: Date.now(),
  };

  // Cache the result
  scorecardCache.set(cacheKey, { data: processed, cachedAt: Date.now() });

  return processed;
}

// Get cache stats (for monitoring API usage)
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: scorecardCache.size,
    entries: Array.from(scorecardCache.keys()),
  };
}

// ============================================
// Live Leaderboard Function
// ============================================

// Fetch live leaderboard for current tournament (or a specific tournament if tournId/year provided)
export async function fetchLiveLeaderboard(tournId?: string, year?: string): Promise<{
  info: TournamentInfo;
  players: PlayerWithStats[];
  isLive: boolean;
  courseName: string;
  courseInfoFull?: CourseInfo | null;
  activeTournaments: ActiveTournament[];
}> {
  const activeTournaments = await getCurrentTournaments();

  // Use provided tournId/year or fall back to getCurrentTournament()
  let tournament: { tournId: string; name: string; year: string; isPreview: boolean; startDate?: string; endDate?: string } | null;
  if (tournId && year) {
    // Find the name from activeTournaments if possible
    const match = activeTournaments.find(t => t.tournId === tournId);
    tournament = { tournId, name: match?.name || '', year, isPreview: false };
  } else {
    tournament = await getCurrentTournament();
  }

  if (!tournament) {
    return {
      info: {
        event_name: 'No PGA Tour Event',
        current_round: 0,
        last_update: new Date().toLocaleString(),
      },
      players: [],
      isLive: false,
      courseName: '',
      activeTournaments,
    };
  }

  const cacheKey = `live-${tournament.tournId}-${tournament.year}`;
  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < LIVE_CACHE_DURATION_MS) {
    return { ...cached.data, isLive: !tournament.isPreview, activeTournaments };
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  const response = await fetch(
    `${SLASHGOLF_BASE_URL}/leaderboard?orgId=1&tournId=${tournament.tournId}&year=${tournament.year}`,
    {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
      },
    }
  );

  if (!response.ok) {
    if (tournament.isPreview) {
      // Tournament hasn't started yet — return a lightweight preview response
      const courseInfo = await fetchCourseInfo(tournament.tournId, tournament.year);
      const previewResult = {
        info: {
          event_name: tournament.name,
          current_round: 0,
          last_update: new Date().toLocaleString(),
          tournId: tournament.tournId,
          year: tournament.year,
          isPreview: true,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
        },
        players: [] as PlayerWithStats[],
        courseName: courseInfo?.courseName ?? '',
        courseInfoFull: courseInfo,
      };
      leaderboardCache.set(cacheKey, { data: previewResult, cachedAt: Date.now() });
      return { ...previewResult, isLive: false, activeTournaments };
    }
    throw new Error(`SlashGolf API error: ${response.status}`);
  }

  const data = await response.json();

  // Define the row type
  interface LeaderboardRow {
    playerId?: string;
    position?: string | number | { $numberInt: string };
    firstName?: string;
    lastName?: string;
    country?: string;
    total?: string | number | { $numberInt: string };
    currentRound?: string | number | { $numberInt: string };
    thru?: string | number | { $numberInt: string };
    rounds?: Array<{ scoreToPar?: string; score?: string | number; courseName?: string }>;
  }

  // Extract course name from first player's first round
  let courseName = '';
  if (data.leaderboardRows?.[0]?.rounds?.[0]?.courseName) {
    courseName = data.leaderboardRows[0].rounds[0].courseName;
  }

  // Determine current round from tournament data
  // Use the API's currentRound field as primary signal — rounds.length is unreliable
  // because the API may not add an entry for the in-progress round until a player tees off.
  let currentRound = 1;
  for (const row of data.leaderboardRows || []) {
    const rowRound = parseNumber(row.currentRound);
    if (rowRound > currentRound) {
      currentRound = rowRound;
    }
    if (row.rounds && row.rounds.length > currentRound) {
      currentRound = row.rounds.length;
    }
  }

  const players: PlayerWithStats[] = (data.leaderboardRows || []).map((row: LeaderboardRow) => {
    // Parse position
    let position = '-';
    if (typeof row.position === 'string') {
      position = row.position;
    } else if (typeof row.position === 'number') {
      position = String(row.position);
    } else if (row.position && typeof row.position === 'object' && '$numberInt' in row.position) {
      position = row.position.$numberInt;
    }

    // Parse total score
    let totalScore = 0;
    if (typeof row.total === 'string') {
      totalScore = row.total === 'E' ? 0 : parseInt(row.total.replace('+', ''), 10) || 0;
    } else if (typeof row.total === 'number') {
      totalScore = row.total;
    } else if (row.total && typeof row.total === 'object' && '$numberInt' in row.total) {
      totalScore = parseInt(row.total.$numberInt, 10);
    }

    // Parse thru
    let thru: string | number = 'F';
    if (typeof row.thru === 'string') {
      thru = row.thru;
    } else if (typeof row.thru === 'number') {
      thru = row.thru;
    } else if (row.thru && typeof row.thru === 'object' && '$numberInt' in row.thru) {
      thru = parseInt(row.thru.$numberInt, 10);
    }

    // Parse today's score - only show if player has started current round
    let today: number | null = null;
    const rounds = row.rounds || [];

    // Player has started today's round if their rounds count matches tournament round
    // Note: scoreToPar in each round entry is per-round (not cumulative)
    if (rounds.length >= currentRound && rounds.length > 0) {
      const currentRoundData = rounds[currentRound - 1];
      if (currentRoundData?.scoreToPar) {
        today = currentRoundData.scoreToPar === 'E'
          ? 0
          : parseInt(currentRoundData.scoreToPar.replace('+', ''), 10) || 0;
      }
    }

    // Fallback: compute today from totalScore minus completed rounds
    // Handles: rounds array shorter than currentRound (including round 1 with empty array),
    // or rounds array has an entry for the current round but scoreToPar is missing.
    if (today === null) {
      const thruVal = typeof thru === 'number' ? thru : (thru === 'F' ? 18 : parseInt(String(thru), 10) || 0);
      if (thruVal > 0) {
        const completedRounds = rounds.slice(0, currentRound - 1);
        const completedSum = completedRounds.reduce((sum, r) => {
          if (r.scoreToPar) {
            return sum + (r.scoreToPar === 'E' ? 0
              : parseInt(r.scoreToPar.replace('+', ''), 10) || 0);
          }
          return sum;
        }, 0);
        today = totalScore - completedSum;
      }
    }

    // Parse round scores — scoreToPar is per-round
    const roundScores: (number | undefined)[] = rounds.map((r) => {
      if (r.scoreToPar) {
        return r.scoreToPar === 'E' ? 0
          : parseInt(r.scoreToPar.replace('+', ''), 10) || 0;
      }
      return undefined;
    });

    // Fill in current round score from today if not already set
    if (today !== null) {
      while (roundScores.length < currentRound) roundScores.push(undefined);
      if (roundScores[currentRound - 1] === undefined) {
        roundScores[currentRound - 1] = today;
      }
    }

    const playerName = `${row.firstName || ''} ${row.lastName || ''}`.trim();

    // Cache player ID for scorecard lookups (avoids extra API calls)
    if (row.playerId && playerName) {
      const normalizedName = playerName.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
      playerIdCache.set(normalizedName, {
        playerId: row.playerId,
        tournId: tournament.tournId,
        year: tournament.year,
        cachedAt: Date.now(),
      });
    }

    return {
      playerId: row.playerId || '',
      player_name: playerName,
      country: row.country || '',
      current_pos: position,
      current_score: totalScore,
      today,
      thru,
      round: currentRound,
      R1: roundScores[0],
      R2: roundScores[1],
      R3: roundScores[2],
      R4: roundScores[3],
      stats: null, // SlashGolf doesn't provide strokes gained
    };
  });

  const courseInfo = await fetchCourseInfo(tournament.tournId, tournament.year);

  const result = {
    info: {
      event_name: tournament.name,
      current_round: currentRound,
      last_update: new Date().toLocaleString(),
      tournId: tournament.tournId,
      year: tournament.year,
      isPreview: tournament.isPreview,
    },
    players,
    courseName,
    courseInfoFull: courseInfo,
  };

  // Cache the result
  leaderboardCache.set(cacheKey, { data: result, cachedAt: Date.now() });

  // If the tournament was marked as preview but the API returned 200, it started early — treat as live
  return { ...result, isLive: true, activeTournaments };
}

// ============================================
// Tournament Schedule Functions
// ============================================

// Cache for schedule data
const scheduleCache = new Map<string, { data: unknown; cachedAt: number }>();

// Format date from MongoDB extended JSON
function formatDate(dateObj: { $date: { $numberLong: string } } | undefined): string {
  if (!dateObj?.$date?.$numberLong) return '';
  const ms = parseInt(dateObj.$date.$numberLong, 10);
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Fetch tournament schedule (upcoming + past)
// Fetches both current year and previous year to get past tournaments
export async function fetchTournamentSchedule(): Promise<{
  upcoming: ScheduledTournament[];
  past: TournamentResult[];
}> {
  const cacheKey = 'schedule';
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SCHEDULE_CACHE_DURATION_MS) {
    return cached.data as { upcoming: ScheduledTournament[]; past: TournamentResult[] };
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const now = Date.now();

  const upcoming: ScheduledTournament[] = [];
  const past: TournamentResult[] = [];

  // Helper to process tournaments from a schedule response
  // Only includes valid PGA Tour events (no Korn Ferry, Q-School, LIV, etc.)
  const processSchedule = (data: { schedule?: Array<{
    tournId: string;
    name: string;
    date?: {
      start?: { $date: { $numberLong: string } };
      end?: { $date: { $numberLong: string } };
    };
    course?: { name?: string; city?: string; state?: string };
    purse?: unknown;
  }> }, year: number) => {
    for (const tournament of data.schedule || []) {
      // Skip non-PGA Tour events (Korn Ferry, Q-School, LIV, etc.)
      if (!isValidPGATourEvent(tournament.name)) continue;

      const startMs = tournament.date?.start?.$date?.$numberLong
        ? parseInt(tournament.date.start.$date.$numberLong, 10)
        : 0;
      const endMs = tournament.date?.end?.$date?.$numberLong
        ? parseInt(tournament.date.end.$date.$numberLong, 10)
        : 0;

      const isUpcoming = startMs > now;
      const isInProgress = now >= startMs && now <= endMs;
      const isCompleted = endMs > 0 && now > endMs;

      // Only add upcoming/in-progress from current year
      if (year === currentYear && (isUpcoming || isInProgress)) {
        const scheduledTournament: ScheduledTournament = {
          tournId: tournament.tournId,
          name: tournament.name,
          courseName: tournament.course?.name || 'TBD',
          location: tournament.course?.city && tournament.course?.state
            ? `${tournament.course.city}, ${tournament.course.state}`
            : tournament.course?.city || tournament.course?.state || 'TBD',
          startDate: formatDate(tournament.date?.start),
          endDate: formatDate(tournament.date?.end),
          status: isInProgress ? 'in_progress' : 'upcoming',
        };
        upcoming.push(scheduledTournament);
      }

      // Add completed tournaments from both years
      if (isCompleted) {
        past.push({
          tournId: tournament.tournId,
          name: tournament.name,
          year: String(year),
          winner: '', // Will be populated later
          winningScore: '-',
          endDate: formatDate(tournament.date?.end),
          endDateMs: endMs, // For sorting
        } as TournamentResult & { endDateMs: number });
      }
    }
  };

  // Fetch schedule for current year
  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/schedule?orgId=1&year=${currentYear}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      processSchedule(data, currentYear);
    }
  } catch (error) {
    console.error('Failed to fetch current year schedule:', error);
  }

  // Fetch schedule for previous year (for past tournaments)
  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/schedule?orgId=1&year=${previousYear}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      processSchedule(data, previousYear);
    }
  } catch (error) {
    console.error('Failed to fetch previous year schedule:', error);
  }

  // Sort upcoming by start date (nearest first)
  upcoming.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Sort past by end date (most recent first) using the stored ms value
  (past as (TournamentResult & { endDateMs?: number })[]).sort((a, b) => (b.endDateMs || 0) - (a.endDateMs || 0));

  // Clean up the endDateMs property we added for sorting
  past.forEach(t => {
    delete (t as TournamentResult & { endDateMs?: number }).endDateMs;
  });

  // Limit results
  const result = {
    upcoming: upcoming.slice(0, 5),
    past: past.slice(0, 20), // Show more past tournaments
  };

  // Fetch course info for upcoming tournaments from the /tournaments endpoint
  // (the /schedule endpoint does not include course data)
  for (let i = 0; i < result.upcoming.length; i++) {
    const tournament = result.upcoming[i];
    try {
      const courseInfo = await fetchCourseInfo(tournament.tournId, String(currentYear));
      if (courseInfo) {
        result.upcoming[i].courseName = courseInfo.courseName;
        if (courseInfo.location) {
          result.upcoming[i].location = courseInfo.location;
        }
      }
    } catch {
      // Keep 'TBD' defaults
    }
  }

  // Fetch winner info for ALL past tournaments (data is cached, so this is efficient)
  for (let i = 0; i < result.past.length; i++) {
    const tournament = result.past[i];
    try {
      const leaderboard = await fetchHistoricalLeaderboard(tournament.tournId, tournament.year);
      if (leaderboard.players.length > 0) {
        const winner = leaderboard.players[0];
        result.past[i].winner = winner.playerName;
        result.past[i].winningScore = winner.totalScore;
      } else {
        // No players means no results available
        result.past[i].winner = 'No results';
      }
    } catch {
      result.past[i].winner = 'TBD';
    }
  }

  // Cache the result
  scheduleCache.set(cacheKey, { data: result, cachedAt: Date.now() });

  return result;
}

// Fetch historical leaderboard for a specific tournament
export async function fetchHistoricalLeaderboard(
  tournId: string,
  year: string
): Promise<{ tournament: { name: string; year: string; courseName: string }; players: HistoricalPlayer[] }> {
  const cacheKey = `leaderboard-${tournId}-${year}`;
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < HISTORICAL_CACHE_DURATION_MS) {
    return cached.data as { tournament: { name: string; year: string; courseName: string }; players: HistoricalPlayer[] };
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/leaderboard?orgId=1&tournId=${tournId}&year=${year}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SlashGolf API error: ${response.status}`);
    }

    const data = await response.json();

    // Define the row type based on actual API response
    interface LeaderboardRow {
      position?: string | number | { $numberInt: string };
      firstName?: string;
      lastName?: string;
      total?: string | number | { $numberInt: string };
      rounds?: Array<{ scoreToPar?: string; score?: string; courseName?: string }>;
    }

    // Extract course name from first player's first round (if available)
    let courseName = 'Unknown Course';
    if (data.leaderboardRows?.[0]?.rounds?.[0]?.courseName) {
      courseName = data.leaderboardRows[0].rounds[0].courseName;
    }

    const players: HistoricalPlayer[] = (data.leaderboardRows || []).map((row: LeaderboardRow) => {
      // Handle position - can be string like "1", "T4" or wrapped in $numberInt
      let position = '-';
      if (typeof row.position === 'string') {
        position = row.position;
      } else if (typeof row.position === 'number') {
        position = String(row.position);
      } else if (row.position && typeof row.position === 'object' && '$numberInt' in row.position) {
        position = row.position.$numberInt;
      }

      // Handle total score - can be string like "-23" or wrapped
      let totalScore = '-';
      if (typeof row.total === 'string') {
        totalScore = row.total;
      } else if (typeof row.total === 'number') {
        totalScore = formatScoreNumber(row.total);
      } else if (row.total && typeof row.total === 'object' && '$numberInt' in row.total) {
        totalScore = formatScoreNumber(parseInt(row.total.$numberInt, 10));
      }

      // Handle rounds - use scoreToPar field if available
      const rounds = (row.rounds || []).map((r) => r.scoreToPar || r.score || '-');

      return {
        position,
        playerName: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        totalScore,
        rounds,
      };
    });

    const result = {
      tournament: {
        name: data.tournament?.name || 'Unknown Tournament',
        year,
        courseName: data.tournament?.course?.name || courseName,
      },
      players,
    };

    // Cache the result
    scheduleCache.set(cacheKey, { data: result, cachedAt: Date.now() });

    return result;
  } catch (error) {
    console.error('Failed to fetch historical leaderboard:', error);
    throw error;
  }
}

// Fetch list of PGA Tour tournaments for current year
export async function fetchTournamentList(): Promise<Array<{ tournId: string; name: string }>> {
  const cacheKey = 'tournament-list';
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < HISTORICAL_CACHE_DURATION_MS) {
    return cached.data as Array<{ tournId: string; name: string }>;
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  const currentYear = new Date().getFullYear();

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/schedule?orgId=1&year=${currentYear}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SlashGolf API error: ${response.status}`);
    }

    const data = await response.json();

    const tournaments: Array<{ tournId: string; name: string }> = [];
    for (const tournament of data.schedule || []) {
      if (!isValidPGATourEvent(tournament.name)) continue;
      tournaments.push({ tournId: tournament.tournId, name: tournament.name });
    }

    scheduleCache.set(cacheKey, { data: tournaments, cachedAt: Date.now() });

    return tournaments;
  } catch (error) {
    console.error('Failed to fetch tournament list:', error);
    throw error;
  }
}

// Get tournament IDs for the 4 major championships
export async function getMajorTournamentIds(): Promise<{
  masters: string;
  pga: string;
  usopen: string;
  theopen: string;
} | null> {
  const cacheKey = 'major-tournament-ids';
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < HISTORICAL_CACHE_DURATION_MS) {
    return cached.data as { masters: string; pga: string; usopen: string; theopen: string };
  }

  try {
    const tournaments = await fetchTournamentList();

    let masters = '';
    let pga = '';
    let usopen = '';
    let theopen = '';

    for (const t of tournaments) {
      const name = t.name;
      if (!masters && /masters/i.test(name) && !/masters\s+champions/i.test(name)) {
        masters = t.tournId;
      } else if (!pga && /pga\s+championship/i.test(name)) {
        pga = t.tournId;
      } else if (!usopen && /u\.?s\.?\s*open/i.test(name)) {
        usopen = t.tournId;
      } else if (!theopen && !usopen.includes(t.tournId) && (/open\s+championship/i.test(name) || /the\s+open/i.test(name) || /british\s+open/i.test(name)) && !/u\.?s\.?\s*open/i.test(name)) {
        theopen = t.tournId;
      }
    }

    if (!masters || !pga || !usopen || !theopen) return null;

    const result = { masters, pga, usopen, theopen };
    scheduleCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  } catch {
    return null;
  }
}

// Format score number to string (e.g., -12 -> "-12", 0 -> "E", 5 -> "+5")
function formatScoreNumber(score: number): string {
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return String(score);
}

// ============================================
// Rankings Functions
// ============================================

import { RankingEntry, PlayerEarnings, PlayerPoints } from './types';

// Cache for rankings (refresh every 5 minutes)
const rankingsCache = new Map<string, { data: RankingEntry[]; cachedAt: number }>();

// Fetch OWGR or FedEx Cup rankings
export async function fetchRankings(type: 'owgr' | 'fedex'): Promise<RankingEntry[]> {
  const cacheKey = `rankings-${type}`;
  const cached = rankingsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SCHEDULE_CACHE_DURATION_MS) {
    return cached.data;
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  // SlashGolf uses /stats endpoint with statId for rankings
  // statId=186 for OWGR, statId=02671 for FedEx Cup
  const statId = type === 'owgr' ? '186' : '02671';
  const currentYear = new Date().getFullYear();

  // Try current year first, then fallback to previous year
  let data = null;
  for (const year of [currentYear, currentYear - 1]) {
    try {
      const response = await fetch(
        `${SLASHGOLF_BASE_URL}/stats?orgId=1&year=${year}&statId=${statId}`,
        {
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
          },
        }
      );

      if (response.ok) {
        data = await response.json();
        if (data.rankings && data.rankings.length > 0) {
          break; // Found valid data
        }
      }
    } catch {
      // Try next year
      continue;
    }
  }

  if (!data || !data.rankings) {
    throw new Error('No rankings data available');
  }

  // Define row type based on actual API response
  interface RankingRow {
    rank?: number | string | { $numberInt: string };
    firstName?: string;
    lastName?: string;
    fullName?: string;
    playerId?: string;
    avgPoints?: number | string | { $numberDouble: string };
    totalPoints?: number | string | { $numberDouble: string };
  }

  const rankings: RankingEntry[] = (data.rankings || []).slice(0, 100).map((row: RankingRow) => {
    // Parse rank
    let rank = 0;
    if (typeof row.rank === 'number') {
      rank = row.rank;
    } else if (typeof row.rank === 'string') {
      rank = parseInt(row.rank.replace(/,/g, ''), 10) || 0;
    } else if (row.rank && typeof row.rank === 'object' && '$numberInt' in row.rank) {
      rank = parseInt(row.rank.$numberInt, 10);
    }

    // Parse player name - prefer fullName, fallback to firstName + lastName
    const playerName = row.fullName ||
      `${row.firstName || ''} ${row.lastName || ''}`.trim();

    // Parse points - OWGR uses avgPoints, FedEx uses totalPoints
    let points = 0;
    const pointsValue = row.avgPoints || row.totalPoints;
    if (typeof pointsValue === 'number') {
      points = pointsValue;
    } else if (typeof pointsValue === 'string') {
      points = parseFloat(pointsValue.replace(/,/g, '')) || 0;
    } else if (pointsValue && typeof pointsValue === 'object' && '$numberDouble' in pointsValue) {
      points = parseFloat(pointsValue.$numberDouble);
    }

    return {
      rank,
      playerName,
      points,
    };
  });

  // Cache the result
  rankingsCache.set(cacheKey, { data: rankings, cachedAt: Date.now() });

  return rankings;
}

// ============================================
// Earnings & Points Functions
// ============================================

// Cache for earnings/points data
const earningsCache = new Map<string, { data: PlayerEarnings[]; cachedAt: number }>();
const pointsCache = new Map<string, { data: PlayerPoints[]; cachedAt: number }>();

// Fetch player earnings for a tournament
export async function fetchTournamentEarnings(
  tournId: string,
  year: string
): Promise<PlayerEarnings[]> {
  const cacheKey = `earnings-${tournId}-${year}`;
  const cached = earningsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SCHEDULE_CACHE_DURATION_MS) {
    return cached.data;
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/earnings?orgId=1&tournId=${tournId}&year=${year}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SlashGolf API error: ${response.status}`);
    }

    const data = await response.json();

    interface EarningsRow {
      playerId?: string;
      firstName?: string;
      lastName?: string;
      earnings?: number | { $numberInt: string } | { $numberDouble: string };
      position?: string | number;
    }

    const earnings: PlayerEarnings[] = (data.earnings || data || []).map((row: EarningsRow) => {
      let earningsAmount = 0;
      if (typeof row.earnings === 'number') {
        earningsAmount = row.earnings;
      } else if (row.earnings && typeof row.earnings === 'object') {
        if ('$numberDouble' in row.earnings) {
          earningsAmount = parseFloat(row.earnings.$numberDouble);
        } else if ('$numberInt' in row.earnings) {
          earningsAmount = parseInt(row.earnings.$numberInt, 10);
        }
      }

      return {
        playerId: row.playerId || '',
        playerName: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        earnings: earningsAmount,
        position: String(row.position || ''),
      };
    });

    earningsCache.set(cacheKey, { data: earnings, cachedAt: Date.now() });
    return earnings;
  } catch (error) {
    console.error('Failed to fetch earnings:', error);
    return [];
  }
}

// Fetch FedEx Cup points for a tournament
export async function fetchTournamentPoints(
  tournId: string,
  year: string
): Promise<PlayerPoints[]> {
  const cacheKey = `points-${tournId}-${year}`;
  const cached = pointsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SCHEDULE_CACHE_DURATION_MS) {
    return cached.data;
  }

  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) {
    throw new Error('SLASHGOLF_API_KEY is not configured');
  }

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/points?orgId=1&tournId=${tournId}&year=${year}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`SlashGolf API error: ${response.status}`);
    }

    const data = await response.json();

    interface PointsRow {
      playerId?: string;
      firstName?: string;
      lastName?: string;
      points?: number | { $numberInt: string } | { $numberDouble: string };
      position?: string | number;
    }

    const points: PlayerPoints[] = (data.points || data || []).map((row: PointsRow) => {
      let pointsAmount = 0;
      if (typeof row.points === 'number') {
        pointsAmount = row.points;
      } else if (row.points && typeof row.points === 'object') {
        if ('$numberDouble' in row.points) {
          pointsAmount = parseFloat(row.points.$numberDouble);
        } else if ('$numberInt' in row.points) {
          pointsAmount = parseInt(row.points.$numberInt, 10);
        }
      }

      return {
        playerId: row.playerId || '',
        playerName: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
        points: pointsAmount,
        position: String(row.position || ''),
      };
    });

    pointsCache.set(cacheKey, { data: points, cachedAt: Date.now() });
    return points;
  } catch (error) {
    console.error('Failed to fetch points:', error);
    return [];
  }
}

// ============================================
// Course Info Function
// ============================================

// Fetch course info for current tournament
export async function fetchCourseInfo(
  tournId: string,
  year: string
): Promise<CourseInfo | null> {
  const apiKey = process.env.SLASHGOLF_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${SLASHGOLF_BASE_URL}/tournament?orgId=1&tournId=${tournId}&year=${year}`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'live-golf-data.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // The /tournament endpoint returns courses as an array
    const course = data.courses?.[0];

    // Parse par value
    let par = 72; // Default
    const parValue = course?.parTotal;
    if (typeof parValue === 'number') {
      par = parValue;
    } else if (parValue && typeof parValue === 'object' && '$numberInt' in parValue) {
      par = parseInt(parValue.$numberInt, 10);
    }

    const courseName = course?.courseName || 'Unknown Course';
    const city = course?.location?.city;
    const state = course?.location?.state;
    const location = city && state
      ? `${city}, ${state}`
      : city || state || undefined;

    return {
      courseName,
      par,
      location,
    };
  } catch (error) {
    console.error('Failed to fetch course info:', error);
    return null;
  }
}
