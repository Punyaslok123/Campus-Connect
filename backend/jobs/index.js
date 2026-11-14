/**
 * jobs/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Cron job registry. Called once from server.js after DB connection.
 *
 * All jobs are registered here. To add a new job:
 *   1. Create jobs/myJob.job.js with a registerMyJob() export
 *   2. Import and call it here
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { registerSubscriptionExpiryJob } from './subscriptionExpiry.job.js';

/**
 * Register all background cron jobs.
 * Returns an array of ScheduledTask instances (for graceful shutdown).
 *
 * @returns {import('node-cron').ScheduledTask[]}
 */
export const registerAllJobs = () => {
  const tasks = [
    registerSubscriptionExpiryJob(),   // Daily 00:05 UTC
  ];

  return tasks;
};

/**
 * Gracefully stop all registered jobs.
 * Call this in the server shutdown handler.
 *
 * @param {import('node-cron').ScheduledTask[]} tasks
 */
export const stopAllJobs = (tasks = []) => {
  tasks.forEach(t => t.stop());
};
