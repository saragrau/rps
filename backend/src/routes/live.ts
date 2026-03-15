import { Router, Request, Response } from 'express';
import { getStore } from '../gameStore';
import { GameResult, toMatchResult } from '../types';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/live  — SSE stream
// ---------------------------------------------------------------------------
/**
 * Forwards live game results to browser clients via Server-Sent Events.
 *
 * Rather than opening one upstream /live connection per HTTP client, this
 * handler subscribes to the GameStore's 'game' EventEmitter event.  The
 * GameStore maintains exactly ONE connection to the upstream API regardless
 * of how many clients are connected here.
 *
 * Each SSE event is a JSON-serialised MatchResult (GameResult + computed winner).
 */
router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
  res.flushHeaders();

  const sendEvent = (eventName: string, payload: unknown): void => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const sendHeartbeat = (): void => {
    res.write(': heartbeat\n\n');
  };

  sendHeartbeat();
  const heartbeatTimer = setInterval(sendHeartbeat, 25_000);

  const store = getStore();

  const onGame = (game: GameResult): void => {
    sendEvent('match', toMatchResult(game));
  };

  store.on('game', onGame);

  const cleanup = (): void => {
    clearInterval(heartbeatTimer);
    store.off('game', onGame);
  };

  req.on('close', cleanup);
});

export default router;
