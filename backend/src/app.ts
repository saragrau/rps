import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getStore } from './gameStore';

import matchesRouter from './routes/matches';
import leaderboardRouter from './routes/leaderboard';
import liveRouter from './routes/live';

const app: Application = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    // TODO: restrict to the actual frontend origin in production.
    //       e.g. origin: process.env.FRONTEND_URL ?? 'http://localhost:3000'
    origin: '*',
    methods: ['GET'],
  }),
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  const store = getStore();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      status: store.status,       // 'idle' | 'loading' | 'ready' | 'error'
      gamesLoaded: store.loadedCount,
    },
  });
});

// ---------------------------------------------------------------------------
// Route mounting
// ---------------------------------------------------------------------------

// /api/matches        — latest, by-day, by-player
app.use('/api/matches', matchesRouter);

// /api/players/:name/matches — redirect-friendly alias kept in the matches
// router under /player/:name, but we also expose the /api/players prefix here.
app.use('/api/players', matchesRouter);

// /api/leaderboard    — today, date-range
app.use('/api/leaderboard', leaderboardRouter);

// /api/live           — SSE proxy
app.use('/api/live', liveRouter);

// ---------------------------------------------------------------------------
// 404 fallthrough
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

export default app;
