/**
 * React API client — function signatures for all backend endpoints.
 *
 * All functions target the backend running at BASE_URL.  Implementations
 * are left as stubs (throw new Error('not implemented')) so that the type
 * contracts are established and can be wired up incrementally.
 *
 * TODO: replace each `throw new Error('not implemented')` body with a real
 *       fetch/axios call once the backend is reachable from the frontend.
 */

import type {
  ApiListResponse,
  LeaderboardEntry,
  MatchResult,
  MatchesByDayResponse,
  MatchesByPlayerResponse,
  RangeLeaderboardResponse,
  TodayLeaderboardResponse,
} from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL of the backend API.
 *
 * TODO: load this from an environment variable (e.g. REACT_APP_API_URL or
 *       VITE_API_URL) so it can be overridden per environment.
 */
const BASE_URL = process.env['REACT_APP_API_URL'] ?? 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

/** Options accepted by the live-match subscription. */
export interface LiveSubscriptionOptions {
  /** Called when the SSE connection is first established. */
  onOpen?: () => void;
  /** Called when the SSE connection closes or errors. */
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Match endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch the most-recently played matches.
 *
 * @param limit  Maximum number of results to return (default determined by server).
 * @returns      Array of MatchResult objects sorted newest-first.
 *
 * Calls: GET /api/matches?limit=<limit>
 *
 * TODO: implement using fetch or axios.
 */
export async function getLatestMatches(
  limit?: number,
): Promise<MatchResult[]> {
  // TODO: implement
  //   const params = limit !== undefined ? `?limit=${limit}` : '';
  //   const res = await fetch(`${BASE_URL}/api/matches${params}`);
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const body: ApiListResponse<MatchResult> = await res.json();
  //   return body.data;
  throw new Error('not implemented');
}

/**
 * Fetch all matches played on a specific calendar day (UTC).
 *
 * @param date  Date string in YYYY-MM-DD format.
 * @returns     Array of MatchResult objects for that day, sorted newest-first.
 *
 * Calls: GET /api/matches/day?date=<date>
 *
 * TODO: implement.
 */
export async function getMatchesByDay(
  date: string,
): Promise<MatchResult[]> {
  // TODO: implement
  //   const res = await fetch(`${BASE_URL}/api/matches/day?date=${encodeURIComponent(date)}`);
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const body: MatchesByDayResponse = await res.json();
  //   return body.data;
  throw new Error('not implemented');
}

/**
 * Fetch all matches in which a given player participated.
 *
 * @param playerName  Exact display name of the player.
 * @returns           Array of MatchResult objects, sorted newest-first.
 *
 * Calls: GET /api/players/<playerName>/matches
 *
 * TODO: implement.
 */
export async function getMatchesByPlayer(
  playerName: string,
): Promise<MatchResult[]> {
  // TODO: implement
  //   const res = await fetch(
  //     `${BASE_URL}/api/players/${encodeURIComponent(playerName)}/matches`,
  //   );
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const body: MatchesByPlayerResponse = await res.json();
  //   return body.data;
  throw new Error('not implemented');
}

// ---------------------------------------------------------------------------
// Leaderboard endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch the leaderboard for today (UTC calendar day).
 *
 * @returns  Array of LeaderboardEntry objects, sorted by wins descending.
 *
 * Calls: GET /api/leaderboard/today
 *
 * TODO: implement.
 */
export async function getTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  // TODO: implement
  //   const res = await fetch(`${BASE_URL}/api/leaderboard/today`);
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const body: TodayLeaderboardResponse = await res.json();
  //   return body.data;
  throw new Error('not implemented');
}

/**
 * Fetch the leaderboard aggregated over a date range.
 *
 * @param startDate  Start date in YYYY-MM-DD format (inclusive, UTC).
 * @param endDate    End date in YYYY-MM-DD format (inclusive, UTC).
 * @returns          Array of LeaderboardEntry objects, sorted by wins descending.
 *
 * Calls: GET /api/leaderboard?startDate=<startDate>&endDate=<endDate>
 *
 * TODO: implement.
 */
export async function getLeaderboardByDateRange(
  startDate: string,
  endDate: string,
): Promise<LeaderboardEntry[]> {
  // TODO: implement
  //   const res = await fetch(
  //     `${BASE_URL}/api/leaderboard?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  //   );
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const body: RangeLeaderboardResponse = await res.json();
  //   return body.data;
  throw new Error('not implemented');
}

// ---------------------------------------------------------------------------
// Live SSE endpoint
// ---------------------------------------------------------------------------

/**
 * Subscribe to the real-time match stream via Server-Sent Events.
 *
 * Opens an EventSource connection to GET /api/live.  Each incoming event
 * is parsed as a MatchResult and passed to `onMatch`.
 *
 * @param onMatch   Called with each MatchResult received from the stream.
 * @param options   Optional lifecycle callbacks (onOpen, onClose).
 * @returns         A cleanup function — call it to close the EventSource.
 *
 * Usage:
 *   const unsubscribe = subscribeToLiveMatches((match) => {
 *     setMatches((prev) => [match, ...prev]);
 *   });
 *   // On component unmount:
 *   return () => unsubscribe();
 *
 * TODO: implement.
 */
export function subscribeToLiveMatches(
  onMatch: (match: MatchResult) => void,
  options?: LiveSubscriptionOptions,
): () => void {
  // TODO: implement
  //   const es = new EventSource(`${BASE_URL}/api/live`);
  //
  //   es.onopen = () => options?.onOpen?.();
  //
  //   es.addEventListener('match', (event: MessageEvent) => {
  //     try {
  //       const match: MatchResult = JSON.parse(event.data);
  //       onMatch(match);
  //     } catch {
  //       console.error('Failed to parse live match event', event.data);
  //     }
  //   });
  //
  //   es.addEventListener('error', (event: MessageEvent) => {
  //     console.error('SSE error event', event);
  //   });
  //
  //   es.onerror = () => {
  //     options?.onClose?.();
  //     es.close();
  //   };
  //
  //   return () => {
  //     es.close();
  //     options?.onClose?.();
  //   };
  throw new Error('not implemented');
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export type { MatchResult, LeaderboardEntry } from './types';
