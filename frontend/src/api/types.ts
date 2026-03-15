// ---------------------------------------------------------------------------
// Shared domain types for the React frontend
// These mirror the backend types.ts but are kept separate so the frontend
// bundle does not depend on any Node-only modules.
// ---------------------------------------------------------------------------

/** The three possible moves in Rock-Paper-Scissors */
export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

/** Which side won a match, or if it was a tie */
export type WinnerSide = 'A' | 'B' | 'TIE';

/** A single player's participation in one match */
export interface Player {
  name: string;
  played: Move;
}

/**
 * An enriched game result as returned by the backend API.
 * The `winner` and `winnerName` fields are computed server-side.
 */
export interface MatchResult {
  gameId: string;
  /** ISO-8601 date-time string */
  playedAt: string;
  playerA: Player;
  playerB: Player;
  /** Which side won, or 'TIE' */
  winner: WinnerSide;
  /** Display name of the winner, or null on a tie */
  winnerName: string | null;
}

/** A single row in the leaderboard */
export interface LeaderboardEntry {
  playerName: string;
  wins: number;
  losses: number;
  ties: number;
  /** Total games played */
  played: number;
  /** Win rate as a value between 0 and 1 (e.g. 0.75 = 75 %) */
  winRate: number;
}

// ---------------------------------------------------------------------------
// Generic API response wrappers
// ---------------------------------------------------------------------------

/**
 * Standard success envelope returned by list endpoints.
 *
 * Example: GET /api/matches → ApiListResponse<MatchResult>
 */
export interface ApiListResponse<T> {
  data: T[];
  count: number;
}

/**
 * Standard success envelope returned by endpoints that also echo back a
 * date or player-name filter.
 */
export interface ApiFilteredListResponse<T> extends ApiListResponse<T> {
  /** The filter value echoed back by the server (date or player name) */
  filter?: string;
}

/**
 * Matches-by-day response shape.
 */
export interface MatchesByDayResponse extends ApiListResponse<MatchResult> {
  date: string;
}

/**
 * Matches-by-player response shape.
 */
export interface MatchesByPlayerResponse extends ApiListResponse<MatchResult> {
  playerName: string;
}

/**
 * Today's leaderboard response shape.
 */
export interface TodayLeaderboardResponse extends ApiListResponse<LeaderboardEntry> {
  date: string;
}

/**
 * Date-range leaderboard response shape.
 */
export interface RangeLeaderboardResponse extends ApiListResponse<LeaderboardEntry> {
  startDate: string;
  endDate: string;
}

/** Standard error envelope */
export interface ApiErrorResponse {
  error: string;
  message?: string;
}
