/**
 * server.js — Campus Connect entry point
 * Boots: MongoDB → Express app → Socket.io → Cron jobs → HTTP listen
 */

import 'dotenv/config';
import http from 'http';
import { connectDB, disconnectDB } from './config/db.js';
import createApp from './app.js';
import { initSocket } from './config/socket.js';
import { registerAllJobs, stopAllJobs } from './jobs/index.js';
import { ensureOwner } from './utils/ensureOwner.js';

// Register all Mongoose models before any query runs
import './models/index.js';

const { PORT = 5000, NODE_ENV = 'development' } = process.env;

let cronTasks = [];

const bootstrap = async () => {
  await connectDB();
  await ensureOwner();   // wipes stale owner docs, inserts fresh verified one

  const app = createApp();
  const server = http.createServer(app);

  // Socket.io — attaches to HTTP server AND registers socketService singleton
  initSocket(server);

  // Cron jobs — run after DB is ready
  cronTasks = registerAllJobs();

  server.listen(PORT, () => {
    console.log(`Campus Connect running on http://localhost:${PORT}`);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────
  const shutdown = async () => {
    stopAllJobs(cronTasks);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force exit if server doesn't close within 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[Server] UnhandledRejection:', reason);
    if (NODE_ENV === 'development') process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Server] UncaughtException:', err);
    process.exit(1);
  });
};

bootstrap();
