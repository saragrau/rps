import { Router, Request, Response, NextFunction } from 'express';
import { LeaderboardService } from '../services/leaderboardService';

const router = Router();
const leaderboardService = new LeaderboardService();

// ---------------------------------------------------------------------------
// GET /api/leaderboard/today
// ---------------------------------------------------------------------------
/**
 * Returns the leaderboard for today (UTC calendar day), ranked by wins
 * descending then win-rate descending.
 */
router.get('/today', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await leaderboardService.getTodayLeaderboard();
    const today = new Date().toISOString().slice(0, 10);
    res.json({ data: entries, count: entries.length, date: today });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/leaderboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ---------------------------------------------------------------------------
/**
 * Returns the leaderboard aggregated over an arbitrary date range.
 *
 * Query params:
 *   startDate  (required)  — YYYY-MM-DD, inclusive, UTC.
 *   endDate    (required)  — YYYY-MM-DD, inclusive, UTC.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = req.query['startDate'] as string | undefined;
    const endDate = req.query['endDate'] as string | undefined;

    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Both startDate and endDate query parameters are required (YYYY-MM-DD)',
      });
      return;
    }

    const entries = await leaderboardService.getLeaderboardByDateRange(startDate, endDate);
    res.json({ data: entries, count: entries.length, startDate, endDate });
  } catch (err) {
    if (err instanceof Error && /Invalid (start|end)Date|must not be after/.test(err.message)) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
