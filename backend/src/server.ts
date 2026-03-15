import app from './app';
import { getStore } from './gameStore';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`[server] RPS League API listening on http://localhost:${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);

  // Kick off the full history load after the HTTP server is ready.
  // Route handlers await store.ready, so requests that arrive during the load
  // will simply wait — no 503s, no empty responses.
  getStore()
    .initialize()
    .catch((err: Error) => {
      console.error('[server] Fatal: GameStore initialization failed:', err.message);
      process.exit(1);
    });
});

const shutdown = (signal: string): void => {
  console.log(`[server] Received ${signal} — shutting down gracefully...`);

  // Close the live stream and drop all EventEmitter listeners.
  getStore().destroy();

  server.close(() => {
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[server] Forced exit after timeout.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
