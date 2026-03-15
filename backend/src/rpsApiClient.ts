import axios, { AxiosInstance } from 'axios';
import EventSource from 'eventsource';
import { GameResult, HistoryPage } from './types';

const BASE_URL = 'https://assignments.reaktor.com';

/**
 * Thin wrapper around the external Reaktor RPS API.
 *
 * Responsibilities:
 *   - Inject the Bearer token on every request.
 *   - Deserialise the paginated /history response.
 *   - Open and manage the /live SSE stream.
 */
export class RpsApiClient {
  private readonly http: AxiosInstance;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
    this.http = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  /**
   * Fetch one page of historical game results.
   *
   * @param cursor  Opaque pagination cursor returned by the previous page.
   *                Omit (or pass undefined) to fetch the first page.
   */
  async fetchHistory(cursor?: string): Promise<HistoryPage> {
    const params: Record<string, string> = {};
    if (cursor !== undefined) {
      params['cursor'] = cursor;
    }

    const response = await this.http.get<HistoryPage>('/history', { params });
    return response.data;
  }

  /**
   * Convenience helper: fetch ALL historical pages by following cursors.
   *
   * Warning: this can return a very large number of records.  Callers that
   * only need recent data should use fetchHistory() directly and stop early.
   *
   * TODO: add a maxPages / maxRecords safety cap before using in production.
   */
  async fetchAllHistory(): Promise<GameResult[]> {
    const allGames: GameResult[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.fetchHistory(cursor);
      allGames.push(...page.data);
      cursor = page.cursor;
    } while (cursor !== undefined);

    return allGames;
  }

  // ---------------------------------------------------------------------------
  // Live SSE stream
  // ---------------------------------------------------------------------------

  /**
   * Open a Server-Sent Events connection to /live and call `onGame` for each
   * received GameResult.
   *
   * @param onGame   Called with every parsed GameResult that arrives on the stream.
   * @param onError  Called when the underlying EventSource emits an error.
   * @returns        A cleanup function — call it to close the connection.
   *
   * Usage:
   *   const stop = client.streamLive(
   *     (game) => console.log(game),
   *     (err)  => console.error(err),
   *   );
   *   // later:
   *   stop();
   */
  streamLive(
    onGame: (game: GameResult) => void,
    onError: (err: Error) => void,
  ): () => void {
    const url = `${BASE_URL}/live`;

    const es = new EventSource(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    es.onmessage = (event: MessageEvent) => {
      try {
        // The stream may send non-JSON heartbeat/comment lines; guard against
        // empty or non-parseable data gracefully.
        if (!event.data || event.data.trim() === '') return;

        const game: GameResult = JSON.parse(event.data as string);

        // Only forward events that look like game results.
        if (game.type === 'GAME_RESULT') {
          onGame(game);
        }
      } catch (parseError) {
        onError(
          new Error(
            `Failed to parse SSE message: ${(parseError as Error).message}`,
          ),
        );
      }
    };

    es.onerror = (_event: Event) => {
      onError(new Error('SSE connection error on /live'));
    };

    // Return a cleanup function so callers can close the stream.
    return () => {
      es.close();
    };
  }
}
