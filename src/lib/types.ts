// Types for SlashGolf API responses

// ============================================
// Leaderboard Types (SlashGolf)
// ============================================

// Individual player data from the leaderboard
export interface Player {
  playerId: string;
  player_name: string;
  country: string;
  current_pos: string;      // Position like "1", "T2", "CUT"
  current_score: number;    // Total tournament score (negative = under par)
  today: number | null;     // Today's round score (null if not started)
  thru: string | number;    // Holes completed: "F" (finished) or number like "12"
  round: number;            // Current round number
  R1?: number;              // Round 1 score
  R2?: number;              // Round 2 score
  R3?: number;              // Round 3 score
  R4?: number;              // Round 4 score
}

// Tournament metadata
export interface TournamentInfo {
  event_name: string;
  current_round: number;
  last_update: string;      // e.g., "2024-01-15 2:35 PM"
  tournId?: string;
  year?: string;
  isPreview?: boolean;      // true when showing upcoming tournament field before it starts
  startDate?: string;       // e.g. "Feb 20, 2026"
  endDate?: string;         // e.g. "Feb 23, 2026"
}

// Full API response
export interface LeaderboardResponse {
  info: TournamentInfo;
  data: Player[];
}

// Player with stats placeholder (no stats from SlashGolf)
export interface PlayerWithStats extends Player {
  stats: null;  // SlashGolf doesn't provide strokes gained
}

// Active tournament entry (for multi-tournament toggle)
export interface ActiveTournament {
  tournId: string;
  name: string;
  year: string;
}

// API response from our /api/leaderboard endpoint
export interface ApiLeaderboardResponse {
  info: TournamentInfo;
  players: PlayerWithStats[];
  courseInfo?: CourseInfo | null;
  activeTournaments?: ActiveTournament[];
  fetchedAt: string;
  source: 'slashgolf';
  isLive: boolean;
  message?: string;
}

// Our internal state for the leaderboard
export interface LeaderboardState {
  tournament: TournamentInfo | null;
  players: PlayerWithStats[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

// ============================================
// SlashGolf Scorecard Types
// ============================================

// Individual hole score from SlashGolf
export interface HoleScore {
  holeId: number;
  holeScore: number;
  par: number;
}

// Round scorecard from SlashGolf API
export interface RoundScorecard {
  roundId: number;
  playerId: string;
  firstName: string;
  lastName: string;
  currentRoundScore: string;
  roundComplete: boolean;
  currentHole: number;
  totalShots: number;
  holes: { [key: string]: HoleScore };
}

// Processed scorecard for display
export interface ProcessedScorecard {
  playerName: string;
  rounds: {
    roundId: number;
    score: string;
    complete: boolean;
    currentHole: number;
    totalShots: number;
    holes: {
      hole: number;
      par: number;
      score: number | null;
    }[];
  }[];
  cachedAt: number;
}

// Scorecard API response
export interface ScorecardApiResponse {
  scorecard: ProcessedScorecard | null;
  error?: string;
  fromCache: boolean;
}

// ============================================
// Tournament Schedule Types (SlashGolf)
// ============================================

// Tournament from schedule endpoint
export interface ScheduledTournament {
  tournId: string;
  name: string;
  courseName: string;
  location: string;
  startDate: string;     // Formatted date string
  endDate: string;       // Formatted date string
  purse?: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

// Tournament result (for past tournaments)
export interface TournamentResult {
  tournId: string;
  name: string;
  year: string;
  winner: string;
  winningScore: string;
  endDate: string;
}

// Historical leaderboard entry
export interface HistoricalPlayer {
  position: string;
  playerName: string;
  totalScore: string;
  rounds: string[];
}

// API responses
export interface TournamentsApiResponse {
  upcoming: ScheduledTournament[];
  past: TournamentResult[];
  error?: string;
}

export interface HistoricalLeaderboardResponse {
  tournament: {
    name: string;
    year: string;
    courseName: string;
  };
  players: HistoricalPlayer[];
  error?: string;
}

// ============================================
// Rankings Types (SlashGolf)
// ============================================

export interface RankingEntry {
  rank: number;
  playerName: string;
  points: number;
  country?: string;
}

export interface RankingsResponse {
  type: 'owgr' | 'fedex';
  rankings: RankingEntry[];
  lastUpdated: string;
  error?: string;
}

// ============================================
// Player Earnings/Points Types (SlashGolf)
// ============================================

export interface PlayerEarnings {
  playerId: string;
  playerName: string;
  earnings: number;
  position: string;
}

export interface PlayerPoints {
  playerId: string;
  playerName: string;
  points: number;
  position: string;
}

// ============================================
// Course Info Types (SlashGolf)
// ============================================

export interface CourseInfo {
  courseName: string;
  par: number;
  location?: string;
}

// Extended tournament info with course details
export interface TournamentInfoWithCourse extends TournamentInfo {
  course?: CourseInfo;
}

// ============================================
// Weather Types
// ============================================

export interface WeatherData {
  temp: number;          // Fahrenheit, rounded integer
  condition: string;     // "Sunny", "Partly Cloudy", "Rain", etc.
  icon: string;          // "☀", "⛅", "☁", "🌧", "⛈", "🌫", "💨"
  windAm: number;        // AM wind mph, rounded integer
  windPm: number;        // PM wind mph, rounded integer
  rainAm: number;        // AM precipitation probability (0-100%)
  rainPm: number;        // PM precipitation probability (0-100%)
}

export interface WeatherApiResponse {
  weather: WeatherData | null;
}

// ============================================
// Player Results Types
// ============================================

export interface PlayerTournamentResult {
  tournamentName: string;
  position: string;       // "1", "T5", "CUT", "WD", "DQ"
  score: string | null;   // "-12", "E", "+5", or null for CUT/WD/DQ
}

export interface PlayerResultsData {
  playerName: string;
  results: PlayerTournamentResult[];
}

export interface PlayerResultsResponse {
  topPlayers: string[];
  playerResults: Record<string, PlayerResultsData>;
  fetchedAt: string;
}
