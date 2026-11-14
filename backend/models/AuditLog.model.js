/**
 * AuditLog.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable audit trail for all sensitive platform actions.
 * NEVER update or delete audit log documents — they are the compliance record.
 *
 * All subscription changes, role changes, content deletions, and user
 * activations/deactivations MUST write an AuditLog entry. This is enforced
 * in the service layer, not in this schema.
 *
 * Immutability enforced via:
 *   1. No update indexes or static update methods
 *   2. pre('save') hook blocks updates to existing documents
 *   3. Recommended: MongoDB role-based access (no update/delete on collection)
 *
 * Indexes:
 *   { collegeId, createdAt }         — audit feed per tenant (Owner dashboard)
 *   { collegeId, action }            — filter by action type
 *   { performedBy }                  — user's action history
 *   { targetId, targetModel }        — entity history (what happened to X?)
 *   { createdAt }                    — global Owner cross-tenant feed (TTL candidate)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// All auditable actions — extend this list as features are added
export const AUDIT_ACTIONS = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  USER_LOGIN:              'USER_LOGIN',
  USER_LOGOUT:             'USER_LOGOUT',
  USER_LOGIN_FAILED:       'USER_LOGIN_FAILED',
  PASSWORD_RESET_REQUEST:  'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',

  // ── User Management ──────────────────────────────────────────────────────────
  USER_CREATED:            'USER_CREATED',
  USER_VERIFIED:           'USER_VERIFIED',
  USER_REJECTED:           'USER_REJECTED',
  USER_DEACTIVATED:        'USER_DEACTIVATED',
  USER_REACTIVATED:        'USER_REACTIVATED',
  USER_ROLE_CHANGED:       'USER_ROLE_CHANGED',
  USER_DELETED:            'USER_DELETED',

  // ── Subscription ─────────────────────────────────────────────────────────────
  SUBSCRIPTION_CREATED:    'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_ACTIVATED:  'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_RENEWED:    'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_EXPIRED:    'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED:  'SUBSCRIPTION_CANCELLED',
  PAYMENT_SUCCESS:         'PAYMENT_SUCCESS',
  PAYMENT_FAILED:          'PAYMENT_FAILED',

  // ── College / Tenant ─────────────────────────────────────────────────────────
  COLLEGE_CREATED:         'COLLEGE_CREATED',
  COLLEGE_ACTIVATED:       'COLLEGE_ACTIVATED',
  COLLEGE_DEACTIVATED:     'COLLEGE_DEACTIVATED',
  COLLEGE_SUSPENDED:       'COLLEGE_SUSPENDED',
  COLLEGE_UPDATED:         'COLLEGE_UPDATED',

  // ── Department ────────────────────────────────────────────────────────────────
  DEPARTMENT_CREATED:      'DEPARTMENT_CREATED',
  DEPARTMENT_UPDATED:      'DEPARTMENT_UPDATED',
  DEPARTMENT_DELETED:      'DEPARTMENT_DELETED',
  DEPARTMENT_ADMIN_ASSIGNED: 'DEPARTMENT_ADMIN_ASSIGNED',

  // ── Content Moderation ────────────────────────────────────────────────────────
  NOTE_DELETED:            'NOTE_DELETED',
  NOTE_RESTORED:           'NOTE_RESTORED',
  JOB_DELETED:             'JOB_DELETED',
  EVENT_DELETED:           'EVENT_DELETED',
  MESSAGE_DELETED:         'MESSAGE_DELETED',
  SESSION_CANCELLED:       'SESSION_CANCELLED',
};

// ── Main Schema ───────────────────────────────────────────────────────────────
const AuditLogSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    // null for Owner-level actions (college creation, cross-tenant suspension)
    collegeId: {
      type:    Schema.Types.ObjectId,
      ref:     'College',
      default: null,
    },

    // ── Action ────────────────────────────────────────────────────────────────
    action: {
      type:     String,
      enum:     {
        values:  Object.values(AUDIT_ACTIONS),
        message: 'Invalid audit action',
      },
      required: [true, 'action is required'],
    },

    // ── Actor ─────────────────────────────────────────────────────────────────
    // Who performed this action (null for system/cron actions)
    performedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    // Snapshot of actor's role at time of action (role may change later)
    performedByRole: {
      type:    String,
      default: null,
    },

    // Actor IP address at time of action
    ipAddress: {
      type:    String,
      default: null,
    },

    userAgent: {
      type:    String,
      default: null,
    },

    // ── Target ────────────────────────────────────────────────────────────────
    // The document that was affected
    targetId: {
      type:    Schema.Types.ObjectId,
      default: null,
    },

    // Model name of the affected document (for dynamic population if needed)
    targetModel: {
      type:    String,
      enum:    ['College', 'User', 'Subscription', 'Department',
                'Event', 'Note', 'Job', 'MentorshipSession', 'Message', null],
      default: null,
    },

    // ── Change Diff ───────────────────────────────────────────────────────────
    // Before/after snapshot for mutating actions (role change, status change)
    diff: {
      before: { type: Schema.Types.Mixed, default: null },
      after:  { type: Schema.Types.Mixed, default: null },
    },

    // ── Additional Context ────────────────────────────────────────────────────
    metadata: {
      type:    Schema.Types.Mixed,
      default: {},
      // Free-form JSON — e.g. { planType: '1y', amount: 49900, reason: 'Upgraded' }
    },

    // Success or failure of the action
    outcome: {
      type:    String,
      enum:    ['success', 'failure'],
      default: 'success',
    },

    // Error message if outcome is failure
    errorMessage: {
      type:    String,
      default: null,
    },
  },
  {
    // No updatedAt — audit logs are write-once
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_logs',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary: tenant audit feed (College Admin, Owner)
AuditLogSchema.index({ collegeId: 1, createdAt: -1 });

// Filter by action type within a college
AuditLogSchema.index({ collegeId: 1, action: 1, createdAt: -1 });

// Actor history — what has this user done?
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });

// Entity history — what happened to this document?
AuditLogSchema.index({ targetId: 1, targetModel: 1, createdAt: -1 });

// Global Owner cross-tenant feed
AuditLogSchema.index({ createdAt: -1 });

// Subscription-specific audit trail
AuditLogSchema.index({ collegeId: 1, action: 1 }, {
  partialFilterExpression: {
    action: {
      $in: [
        'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_ACTIVATED',
        'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_EXPIRED',
        'SUBSCRIPTION_CANCELLED',
      ],
    },
  },
});

// ── Immutability Guard ────────────────────────────────────────────────────────

// Block any updates to existing audit log documents
AuditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  return next(new Error('AuditLog documents are immutable and cannot be updated'));
});

AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('AuditLog documents are immutable and cannot be modified'));
  }
  next();
});

// ── Static Factory Methods ────────────────────────────────────────────────────

/**
 * Primary way to create audit log entries.
 * Usage:
 *   await AuditLog.record({
 *     action:         AUDIT_ACTIONS.USER_ROLE_CHANGED,
 *     collegeId:      req.user.collegeId,
 *     performedBy:    req.user._id,
 *     performedByRole: req.user.role,
 *     targetId:       targetUser._id,
 *     targetModel:    'User',
 *     diff:           { before: { role: 'student' }, after: { role: 'faculty' } },
 *     metadata:       { reason: 'Department admin promoted them' },
 *     ipAddress:      req.ip,
 *   });
 */
AuditLogSchema.statics.record = async function (entry) {
  try {
    return await this.create(entry);
  } catch (err) {
    // Audit log failure should NOT break the main operation — log to console
    console.error('[AuditLog] Failed to write audit entry:', err.message, entry);
    return null;
  }
};

// Convenience: log a subscription event
AuditLogSchema.statics.logSubscription = function ({
  action, collegeId, performedBy, performedByRole,
  subscriptionId, planType, amount, ipAddress,
}) {
  return this.record({
    action,
    collegeId,
    performedBy,
    performedByRole,
    targetId:    subscriptionId,
    targetModel: 'Subscription',
    metadata:    { planType, amount },
    ipAddress,
  });
};

// ── Model export ─────────────────────────────────────────────────────────────
const AuditLog = model('AuditLog', AuditLogSchema);
export default AuditLog;
