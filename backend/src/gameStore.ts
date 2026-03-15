import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';
import { RpsApiClient } from './rpsApiClient';
import { GameResult } from './types';

const API_TOKEN = process.env.RPS_API_TOKEN ?? 'odzgBUW0RpsUzZuX6Dh73IqMpNYK5Ry-';

// Cache file lives next to the compiled output, outside src.
const CACHE_FILE =
  process.env.CACHE_FILE ?? path.join(__dirname, '../../.cache/games.json');

interface CacheFile {
  savedAt: string;
  games: GameResult[];
}

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * GameStore — single in-memory cache for all RPS game data.
 *
 * ### Cold start (no cache file)
 *   Fetches every page of /history sequentially (cursor-based — parallelism is
 *   impossible because cursor N+1 is only known after receiving page N).
 *   400 pages × ~100 ms RTT ≈ 40-80 s.  Saves result to disk when done.
 *
 * ### Warm start (cache file exists)
 *   Loads the JSON file in < 1 s, marks `ready` immediately so the server
 *   starts serving requests right away, then syncs only new pages in the
 *   background (stopping as soon as it sees games already in the cache).
 *
 * ### Live updates
 *   One upstream /live SSE connection is kept open; new games are prepended
 *   to the array and re-emitted as 'game' events for SSE route handlers.
 */
export class GameStore extends EventEmitter {
  private games: GameResult[] = [];

  public status: StoreStatus = 'idle';
  public loadedCount = 0;

  private stopStream: (() => void) | null = null;

  // Resolves once ALL history pages are loaded.
  private _ready: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (err: Error) => void;

  // Resolves as soon as today's games + the most recent matches are in memory.
  // Landing-page queries (latest matches, today's leaderboard) await this
  // instead of `ready` so they don't block on the full 400-page load.
  private _partialReady: Promise<void>;
  private resolvePartialReady!: () => void;
  private partialReadyResolved = false;

  constructor(private readonly client: RpsApiClient) {
    super();
    this.setMaxListeners(200);
    this._ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this._partialReady = new Promise((resolve) => {
      this.resolvePartialReady = resolve;
    });
  }

  /** Resolves once ALL historical pages are loaded. */
  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Resolves as soon as today's games and the first page of results are in
   * memory — typically after just a handful of pages rather than all 400.
   * Use this for landing-page queries (latest matches, today's leaderboard).
   */
  get partialReady(): Promise<void> {
    return this._partialReady;
  }

  async initialize(): Promise<void> {
    if (this.status !== 'idle') return;
    this.status = 'loading';

    try {
      const cached = await this.readCache();

      if (cached.length > 0) {
        // Warm start: serve from cache immediately.
        this.games = cached;
        this.loadedCount = this.games.length;
        this.status = 'ready';
        this.resolveReady();
        this.markPartialReady(); // cache has everything — landing page is instant
        console.log(
          `[GameStore] Warm start: ${this.loadedCount} games loaded from cache. Syncing new games in background...`,
        );

        // Sync new pages in the background — does not block requests.
        this.syncNewGames(cached[0].time).catch((err: Error) =>
          console.error('[GameStore] Background sync error:', err.message),
        );
      } else {
        // Cold start: full sequential load (one-time cost).
        await this.fullLoad();
      }

      this.startLiveStream();
    } catch (err) {
      this.status = 'error';
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[GameStore] Initialization failed:', error.message);
      this.rejectReady(error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — helpers
  // ---------------------------------------------------------------------------

  /** Resolves partialReady once, idempotent. */
  private markPartialReady(): void {
    if (!this.partialReadyResolved) {
      this.partialReadyResolved = true;
      this.resolvePartialReady();
    }
  }

  // ---------------------------------------------------------------------------
  // Private — loading
  // ---------------------------------------------------------------------------

  /** Sequential full load of all history pages. Saves to cache when done. */
  private async fullLoad(): Promise<void> {
    console.log('[GameStore] Cold start: fetching full history...');
    const todayStart = new Date(
      new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
    ).getTime();

    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const page = await this.client.fetchHistory(cursor);
      this.games.push(...page.data);
      this.loadedCount = this.games.length;
      cursor = page.cursor;
      pageCount++;

      // Resolve partialReady once we've fetched all of today's games.
      // The API returns newest-first, so when the last game on a page is
      // older than today, every subsequent page is also older — we have all
      // we need for the landing page.
      if (!this.partialReadyResolved) {
        const lastOnPage = page.data[page.data.length - 1];
        if (!lastOnPage || lastOnPage.time < todayStart) {
          console.log(
            `[GameStore] Landing-page data ready after ${pageCount} page(s) (${this.loadedCount} games). Continuing full load in background...`,
          );
          this.markPartialReady();
        }
      }

      if (pageCount % 25 === 0) {
        console.log(
          `[GameStore] ${pageCount} pages fetched (${this.loadedCount} games)...`,
        );
      }
    } while (cursor !== undefined);

    this.games.sort((a, b) => b.time - a.time);

    console.log(
      `[GameStore] Full load complete: ${this.loadedCount} games across ${pageCount} pages.`,
    );

    this.status = 'ready';
    this.resolveReady();
    this.markPartialReady(); // safety net: resolve if no games existed today

    // Persist to disk so the next start is instant.
    await this.writeCache().catch((err: Error) =>
      console.warn('[GameStore] Could not write cache:', err.message),
    );
  }

  /**
   * Fetch only pages newer than `latestKnownTime` and prepend them.
   * Stops as soon as a page contains a game older than the newest cached game.
   */
  private async syncNewGames(latestKnownTime: number): Promise<void> {
    const newGames: GameResult[] = [];
    let cursor: string | undefined;
    let done = false;

    do {
      const page = await this.client.fetchHistory(cursor);

      for (const game of page.data) {
        if (game.time <= latestKnownTime) {
          done = true;
          break;
        }
        newGames.push(game);
      }

      cursor = done ? undefined : page.cursor;
    } while (cursor !== undefined && !done);

    if (newGames.length > 0) {
      // newGames are newest-first; existing this.games are also newest-first.
      this.games = [...newGames, ...this.games];
      this.loadedCount = this.games.length;
      console.log(
        `[GameStore] Background sync complete: ${newGames.length} new games added (total: ${this.loadedCount}).`,
      );
      await this.writeCache().catch((err: Error) =>
        console.warn('[GameStore] Could not update cache:', err.message),
      );
    } else {
      console.log('[GameStore] Background sync complete: cache is up to date.');
    }
  }

  private startLiveStream(): void {
    this.stopStream = this.client.streamLive(
      (game) => {
        this.games.unshift(game);
        this.loadedCount = this.games.length;
        this.emit('game', game);
      },
      (err) => {
        console.error('[GameStore] Live stream error:', err.message);
        // TODO: reconnect with exponential backoff
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private — cache I/O
  // ---------------------------------------------------------------------------

  private async readCache(): Promise<GameResult[]> {
    try {
      const raw = await fs.readFile(CACHE_FILE, 'utf8');
      const parsed: CacheFile = JSON.parse(raw);
      console.log(
        `[GameStore] Cache found (saved ${parsed.savedAt}): ${parsed.games.length} games.`,
      );
      return parsed.games;
    } catch {
      // Cache missing or corrupt — treat as cold start.
      return [];
    }
  }

  private async writeCache(): Promise<void> {
    const dir = path.dirname(CACHE_FILE);
    await fs.mkdir(dir, { recursive: true });
    const payload: CacheFile = {
      savedAt: new Date().toISOString(),
      games: this.games,
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(payload), 'utf8');
    console.log(`[GameStore] Cache written: ${this.games.length} games → ${CACHE_FILE}`);
  }

  // ---------------------------------------------------------------------------
  // Query methods — all run against the in-memory array
  // ---------------------------------------------------------------------------

  /** Most recent `limit` games. O(1). */
  getLatest(limit = 50): GameResult[] {
    return this.games.slice(0, limit);
  }

  /**
   * All games played on a specific UTC calendar day.
   * Early-exits once past the day boundary (array is newest-first).
   */
  getByDay(date: string): GameResult[] {
    const dayStart = new Date(`${date}T00:00:00.000Z`).getTime();
    const dayEnd = new Date(`${date}T23:59:59.999Z`).getTime();
    const result: GameResult[] = [];

    for (const g of this.games) {
      if (g.time > dayEnd) continue;
      if (g.time < dayStart) break;
      result.push(g);
    }

    return result;
  }

  /** All games in which a given player participated. */
  getByPlayer(name: string): GameResult[] {
    return this.games.filter(
      (g) => g.playerA.name === name || g.playerB.name === name,
    );
  }

  /**
   * All games within an inclusive UTC date range.
   * Early-exits once past the start boundary.
   */
  getByDateRange(startDate: string, endDate: string): GameResult[] {
    const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
    const result: GameResult[] = [];

    for (const g of this.games) {
      if (g.time > end) continue;
      if (g.time < start) break;
      result.push(g);
    }

    return result;
  }

  destroy(): void {
    if (this.stopStream) {
      this.stopStream();
      this.stopStream = null;
    }
    this.removeAllListeners();
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

let _store: GameStore | null = null;

export function getStore(): GameStore {
  if (!_store) {
    _store = new GameStore(new RpsApiClient(API_TOKEN));
  }
  return _store;
}
