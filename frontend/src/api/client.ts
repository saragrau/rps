import type {
  LeaderboardEntry,
  MatchResult,
  MatchesByDayResponse,
  MatchesByPlayerResponse,
  RangeLeaderboardResponse,
  TodayLeaderboardResponse,
  ApiListResponse,
} from './types';

const BASE_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Match endpoints
// ---------------------------------------------------------------------------

export async function getLatestMatches(limit = 50): Promise<MatchResult[]> {
  const body = await apiFetch<ApiListResponse<MatchResult>>(`/api/matches?limit=${limit}`);
  return body.data;
}

export async function getMatchesByDay(date: string): Promise<MatchResult[]> {
  const body = await apiFetch<MatchesByDayResponse>(
    `/api/matches/day?date=${encodeURIComponent(date)}`,
  );
  return body.data;
}

export async function getMatchesByDateRange(
  startDate: string,
  endDate: string,
): Promise<MatchResult[]> {
  const body = await apiFetch<ApiListResponse<MatchResult>>(
    `/api/matches/range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );
  return body.data;
}

export async function getMatchesByPlayer(playerName: string): Promise<MatchResult[]> {
  const body = await apiFetch<MatchesByPlayerResponse>(
    `/api/players/${encodeURIComponent(playerName)}/matches`,
  );
  return body.data;
}

// ---------------------------------------------------------------------------
// Leaderboard endpoints
// ---------------------------------------------------------------------------

export async function getTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  const body = await apiFetch<TodayLeaderboardResponse>('/api/leaderboard/today');
  return body.data;
}

export async function getLeaderboardByDate(date: string): Promise<LeaderboardEntry[]> {
  const body = await apiFetch<RangeLeaderboardResponse>(
    `/api/leaderboard?startDate=${encodeURIComponent(date)}&endDate=${encodeURIComponent(date)}`,
  );
  return body.data;
}

export async function getLeaderboardByDateRange(
  startDate: string,
  endDate: string,
): Promise<LeaderboardEntry[]> {
  const body = await apiFetch<RangeLeaderboardResponse>(
    `/api/leaderboard?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );
  return body.data;
}

// ---------------------------------------------------------------------------
// Live SSE
// ---------------------------------------------------------------------------

export interface LiveSubscriptionOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export function subscribeToLiveMatches(
  onMatch: (match: MatchResult) => void,
  options?: LiveSubscriptionOptions,
): () => void {
  const es = new EventSource(`${BASE_URL}/api/live`);

  es.onopen = () => options?.onOpen?.();

  es.addEventListener('match', (event: MessageEvent) => {
    try {
      onMatch(JSON.parse(event.data as string) as MatchResult);
    } catch {
      console.error('[SSE] Failed to parse match event', event.data);
    }
  });

  es.onerror = () => {
    options?.onClose?.();
    es.close();
  };

  return () => {
    es.close();
    options?.onClose?.();
  };
}

export type { MatchResult, LeaderboardEntry } from './types';
