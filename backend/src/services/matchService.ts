import { getStore } from '../gameStore';
import { MatchResult, toMatchResult } from '../types';

const DEFAULT_LATEST_LIMIT = 50;

/**
 * MatchService — queries the in-memory GameStore rather than hitting the
 * upstream API on every request.
 *
 * All methods await store.ready so that callers made before the initial
 * history load completes will simply wait until the data is available.
 */
export class MatchService {
  /**
   * Return the `limit` most-recently played matches, enriched with computed
   * winner information.
   */
  async getLatestMatches(limit = DEFAULT_LATEST_LIMIT): Promise<MatchResult[]> {
    await getStore().partialReady; // today's data is enough — don't wait for full history
    return getStore().getLatest(limit).map(toMatchResult);
  }

  /**
   * Return all matches played on a specific calendar day (UTC).
   *
   * @param date  Date string in YYYY-MM-DD format.
   */
  async getMatchesByDay(date: string): Promise<MatchResult[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
    }
    await getStore().ready;
    return getStore().getByDay(date).map(toMatchResult);
  }

  /**
   * Return all matches in which a given player participated, most recent first.
   *
   * @param playerName  Exact display name of the player (case-sensitive).
   */
  async getMatchesByDateRange(startDate: string, endDate: string): Promise<MatchResult[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error(`Invalid startDate format: "${startDate}". Expected YYYY-MM-DD.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error(`Invalid endDate format: "${endDate}". Expected YYYY-MM-DD.`);
    }
    if (startDate > endDate) {
      throw new Error('startDate must not be after endDate.');
    }
    await getStore().ready;
    return getStore().getByDateRange(startDate, endDate).map(toMatchResult);
  }

  async getMatchesByPlayer(playerName: string): Promise<MatchResult[]> {
    if (!playerName || playerName.trim() === '') {
      throw new Error('playerName must not be empty.');
    }
    await getStore().ready;
    return getStore().getByPlayer(playerName).map(toMatchResult);
  }
}
