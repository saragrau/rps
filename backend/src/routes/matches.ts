import { Router, Request, Response, NextFunction } from 'express';
import { MatchService } from '../services/matchService';

const router = Router();
const matchService = new MatchService();

// ---------------------------------------------------------------------------
// GET /api/matches?limit=N
// ---------------------------------------------------------------------------
/**
 * Returns the most-recent N matches, sorted newest-first.
 *
 * Query params:
 *   limit  (optional, integer > 0)  — number of matches to return (default 50).
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawLimit = req.query['limit'];
    let limit: number | undefined;

    if (rawLimit !== undefined) {
      limit = parseInt(rawLimit as string, 10);
      if (isNaN(limit) || limit < 1) {
        res.status(400).json({ error: 'limit must be a positive integer' });
        return;
      }
    }

    const matches = await matchService.getLatestMatches(limit);
    res.json({ data: matches, count: matches.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/matches/day?date=YYYY-MM-DD
// ---------------------------------------------------------------------------
/**
 * Returns all matches played on a given UTC calendar day.
 *
 * Query params:
 *   date  (required)  — YYYY-MM-DD string.
 */
router.get('/day', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.query['date'] as string | undefined;

    if (!date) {
      res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
      return;
    }

    const matches = await matchService.getMatchesByDay(date);
    res.json({ data: matches, count: matches.length, date });
  } catch (err) {
    // Surface validation errors as 400 rather than 500.
    if (err instanceof Error && err.message.startsWith('Invalid date')) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/players/:name/matches
// ---------------------------------------------------------------------------
/**
 * Returns all matches in which the named player participated.
 *
 * Route params:
 *   name  — URL-encoded player display name.
 */
router.get('/player/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerName = decodeURIComponent(req.params['name'] ?? '');

    if (!playerName) {
      res.status(400).json({ error: 'Player name must not be empty' });
      return;
    }

    const matches = await matchService.getMatchesByPlayer(playerName);
    res.json({ data: matches, count: matches.length, playerName });
  } catch (err) {
    next(err);
  }
});

export default router;
