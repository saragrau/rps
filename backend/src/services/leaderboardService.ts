import { getStore } from '../gameStore';
import { LeaderboardEntry, buildLeaderboard, toMatchResult } from '../types';

/**
 * LeaderboardService — builds ranked player standings from the in-memory
 * GameStore rather than re-fetching all history on every request.
 */
export class LeaderboardService {
  /**
   * Return the leaderboard for today (UTC calendar day), sorted by wins
   * descending then win-rate descending.
   */
  async getTodayLeaderboard(): Promise<LeaderboardEntry[]> {
    await getStore().partialReady; // all of today's games are loaded — don't wait for full history
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const matches = getStore().getByDay(today).map(toMatchResult);
    return buildLeaderboard(matches);
  }

  /**
   * Return the leaderboard for an arbitrary UTC date range.
   *
   * @param startDate  Start date in YYYY-MM-DD format (inclusive).
   * @param endDate    End date in YYYY-MM-DD format (inclusive).
   */
  async getLeaderboardByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<LeaderboardEntry[]> {
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
    const matches = getStore().getByDateRange(startDate, endDate).map(toMatchResult);
    return buildLeaderboard(matches);
  }
}
