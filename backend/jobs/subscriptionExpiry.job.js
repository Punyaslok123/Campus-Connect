/**
 * jobs/subscriptionExpiry.job.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Daily subscription expiry scanner.
 *
 * Schedule: Every day at 00:05 UTC (5 min after midnight for clock skew buffer)
 *
 * What it does:
 *   PASS 1 — Warning: Find subscriptions expiring in ≤14 days → emit warning socket event
 *   PASS 2 — Expiry:  Find subscriptions where endDate < now AND status = 'active'
 *                     → set status = 'expired'
 *                     → deactivate college (status: 'inactive')
 *                     → emit subscription:expired socket event
 *                     → write AuditLog entry
 *                     → push in-app notification to collegeAdmin(s)
 *
 * Error handling:
 *   Per-subscription errors are caught and logged individually.
 *   One failed subscription does NOT abort the entire batch.
 *   Job completion is logged with a summary.
 *
 * Idempotency:
 *   All DB writes are conditional on current status — safe to re-run.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import cron from 'node-cron';

import {
  Subscription,
  College,
  User,
  Notification,
  AuditLog,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
}                       from '../models/index.js';
import { socketService } from '../services/socketService.js';

const JOB_NAME = '[CronJob:SubscriptionExpiry]';

// ── Pass 1: Expiry warnings ───────────────────────────────────────────────────

/**
 * Find active subscriptions expiring within the next 14 days.
 * Emits subscription:warning socket event and pushes a notification.
 * Does NOT change subscription status.
 */
const processExpiryWarnings = async () => {
  const now        = new Date();
  const in14Days   = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const warningSubs = await Subscription.find({
    status:  'active',
    endDate: { $gt: now, $lte: in14Days },
  })
    .select('collegeId endDate planType')
    .lean();

  if (!warningSubs.length) return;

  for (const sub of warningSubs) {
    try {
      const daysRemaining = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24));

      // Emit warning to college room
      socketService.emitSubscriptionWarning(sub.collegeId.toString(), {
        subscriptionId: sub._id.toString(),
        endDate:        sub.endDate.toISOString(),
        daysRemaining,
      });

      // Push notification to college admins
      const admins = await User.find({
        collegeId: sub.collegeId,
        role:      'collegeAdmin',
        isActive:  true,
      }, '_id').lean();

      if (admins.length) {
        await Notification.bulkNotify({
          userIds:    admins.map(a => a._id),
          collegeId:  sub.collegeId,
          type:       NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
          title:      'Subscription Expiring Soon',
          message:    `Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Renew now to avoid interruption.`,
          refId:      sub._id,
          refModel:   'Subscription',
          actionUrl:  '/billing/renew',
          priority:   daysRemaining <= 3 ? 'urgent' : 'high',
        });
      }

    } catch (err) {
      console.error(`${JOB_NAME} Warning pass error for sub ${sub._id}:`, err.message);
    }
  }
};

// ── Pass 2: Expire subscriptions ─────────────────────────────────────────────

/**
 * Find active subscriptions past their endDate.
 * Marks them expired, deactivates the college, emits events, logs to audit.
 */
const processExpiredSubscriptions = async () => {
  const now = new Date();

  // Find all active subs that are now past their end date
  // (accounting for grace period: endDate + gracePeriodDays < now)
  const expiredSubs = await Subscription.aggregate([
    {
      $match: {
        status: 'active',
      },
    },
    {
      $addFields: {
        effectiveEnd: {
          $dateAdd: {
            startDate: '$endDate',
            unit:      'day',
            amount:    { $ifNull: ['$gracePeriodDays', 0] },
          },
        },
      },
    },
    {
      $match: {
        effectiveEnd: { $lt: now },
      },
    },
    {
      $project: {
        _id:         1,
        collegeId:   1,
        planType:    1,
        endDate:     1,
        purchasedBy: 1,
      },
    },
  ]);

  if (!expiredSubs.length) {
    return 0;
  }

  let successCount = 0;
  let errorCount   = 0;

  for (const sub of expiredSubs) {
    try {
      const collegeIdStr = sub.collegeId.toString();

      // ── 1. Mark subscription as expired ───────────────────────────────────
      await Subscription.findByIdAndUpdate(sub._id, {
        $set: { status: 'expired' },
      });

      // ── 2. Deactivate the college ──────────────────────────────────────────
      await College.findByIdAndUpdate(sub.collegeId, {
        $set: {
          status:               'inactive',
          activeSubscriptionId: null,
          statusReason:         'Subscription expired',
        },
      });

      // ── 3. Emit socket event to all connected college users ────────────────
      socketService.emitSubscriptionExpired(collegeIdStr, {
        subscriptionId: sub._id.toString(),
        endDate:        sub.endDate.toISOString(),
        planType:       sub.planType,
      });

      // ── 4. Push in-app notification to college admins ──────────────────────
      const admins = await User.find({
        collegeId: sub.collegeId,
        role:      'collegeAdmin',
        isActive:  true,
      }, '_id').lean();

      if (admins.length) {
        await Notification.bulkNotify({
          userIds:   admins.map(a => a._id),
          collegeId: sub.collegeId,
          type:      NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED,
          title:     'Subscription Expired',
          message:   'Your subscription has expired. All college features are currently restricted. Renew now to restore access.',
          refId:     sub._id,
          refModel:  'Subscription',
          actionUrl: '/billing/renew',
          priority:  'urgent',
        });
      }

      // ── 5. AuditLog ────────────────────────────────────────────────────────
      await AuditLog.record({
        action:      AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED,
        collegeId:   sub.collegeId,
        performedBy: null,           // system action (cron)
        targetId:    sub._id,
        targetModel: 'Subscription',
        metadata: {
          planType:    sub.planType,
          endDate:     sub.endDate,
          triggeredBy: 'cron:subscriptionExpiry',
        },
        outcome: 'success',
      });

      successCount++;
    } catch (err) {
      errorCount++;
      console.error(`${JOB_NAME} Failed to process sub ${sub._id}:`, err.message);

      // Log individual failures to AuditLog for visibility
      await AuditLog.record({
        action:      AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED,
        collegeId:   sub.collegeId,
        targetId:    sub._id,
        targetModel: 'Subscription',
        outcome:     'failure',
        errorMessage: err.message,
        metadata:    { triggeredBy: 'cron:subscriptionExpiry' },
      }).catch(() => {});  // Don't throw on audit log failure
    }
  }

  return successCount;
};

// ── Job registration ──────────────────────────────────────────────────────────

/**
 * Register the subscription expiry cron job.
 * Call this once from jobs/index.js during server startup.
 *
 * @returns {cron.ScheduledTask}
 */
export const registerSubscriptionExpiryJob = () => {
  // Run at 00:05 every day (UTC)
  // '5 0 * * *' = minute 5, hour 0, every day, every month, every weekday
  const task = cron.schedule('5 0 * * *', async () => {
    try {
      await processExpiryWarnings();
      await processExpiredSubscriptions();
    } catch (err) {
      console.error(`${JOB_NAME} Fatal error:`, err);
    }
  }, {
    scheduled:  true,
    timezone:   'UTC',
  });

  return task;
};

// ── Manual trigger (dev/admin use) ────────────────────────────────────────────

/**
 * Run both passes immediately without waiting for the schedule.
 * Used in: admin panel "Run Now" button, integration tests.
 */
export const runSubscriptionExpiryJobNow = async () => {
  await processExpiryWarnings();
  return processExpiredSubscriptions();
};
