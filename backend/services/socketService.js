/**
 * services/socketService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton Socket.io emitter service.
 *
 * WHY A SINGLETON:
 *   The `io` instance lives in server.js. Controllers and cron jobs run
 *   in completely separate module scopes. Passing `io` through every function
 *   call creates tight coupling and makes testing hard.
 *
 *   This service holds the single reference to `io` after it is initialised
 *   in server.js, and exposes typed emit methods that controllers can call
 *   without knowing anything about Socket.io internals.
 *
 * USAGE IN CONTROLLERS:
 *   import { socketService } from '../../services/socketService.js';
 *
 *   // After saving a note:
 *   socketService.emitNoteDeleted(collegeId, { noteId, title, deletedBy });
 *
 *   // After a new message is persisted:
 *   socketService.emitNewMessage(receiverId, messagePayload);
 *
 * USAGE IN CRON JOBS:
 *   socketService.emitSubscriptionExpired(collegeId, subscriptionPayload);
 *
 * SAFE BEFORE INIT:
 *   All emit methods are no-ops if called before init() — useful in tests
 *   and CLI scripts that don't spin up a socket server.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Rooms } from '../config/socket.js';

// ── Event name constants ──────────────────────────────────────────────────────
// Single source of truth — frontend must use the same names
export const SOCKET_EVENTS = {
  // Notifications
  NOTIFICATION_NEW:         'notification:new',

  // Messages
  MESSAGE_RECEIVE:          'message:receive',
  MESSAGE_STATUS:           'message:status',

  // College broadcasts
  EVENT_PUBLISHED:          'event:published',
  JOB_POSTED:               'job:posted',
  MENTORSHIP_NEW:           'mentorship:new',
  NOTE_DELETED:             'note:deleted',

  // Subscription
  SUBSCRIPTION_EXPIRED:     'subscription:expired',
  SUBSCRIPTION_WARNING:     'subscription:warning',    // 14-day expiry warning
  SUBSCRIPTION_RENEWED:     'subscription:renewed',

  // System
  COLLEGE_DEACTIVATED:      'college:deactivated',
  FORCE_LOGOUT:             'auth:force_logout',        // Owner deactivates user
};

// ── Singleton class ───────────────────────────────────────────────────────────

class SocketService {
  constructor() {
    /** @type {import('socket.io').Server | null} */
    this._io = null;
  }

  /**
   * Must be called once in server.js after Socket.io is initialised.
   * @param {import('socket.io').Server} io
   */
  init(io) {
    if (this._io) {
      console.warn('[SocketService] init() called more than once — ignored');
      return;
    }
    this._io = io;
  }

  /**
   * Whether the service is ready to emit.
   */
  get isReady() {
    return this._io !== null;
  }

  /**
   * Core internal emitter. All public methods go through this.
   * Silent no-op if io is not yet initialised (prevents crashes in tests/CLI).
   *
   * @param {string} room    - target room string
   * @param {string} event   - SOCKET_EVENTS value
   * @param {object} payload - serialisable event data
   */
  _emit(room, event, payload) {
    if (!this._io) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[SocketService] Not initialised. Dropped event: ${event} → ${room}`);
      }
      return;
    }
    this._io.to(room).emit(event, {
      ...payload,
      _ts: Date.now(),   // client can use for latency measurement
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Notification events ──────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Push a new notification to a specific user's room.
   * Called after Notification.create() in any service.
   *
   * @param {string} userId
   * @param {{ _id, type, title, message, refId?, refModel?, actionUrl?, priority }} notification
   */
  emitNotification(userId, notification) {
    this._emit(
      Rooms.user(userId),
      SOCKET_EVENTS.NOTIFICATION_NEW,
      { notification }
    );
  }

  /**
   * Push notifications to multiple users at once.
   * Used after Notification.bulkNotify().
   *
   * @param {string[]} userIds
   * @param {object}   notification
   */
  emitNotificationBulk(userIds, notification) {
    if (!Array.isArray(userIds)) return;
    userIds.forEach(userId => this.emitNotification(userId, notification));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Message events ───────────────────────────════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Deliver a new persisted message to the receiver.
   * Called after Message.create() in message.service.js.
   *
   * @param {string} receiverId
   * @param {{ _id, senderId, content, messageType, createdAt, conversationKey }} message
   */
  emitNewMessage(receiverId, message) {
    this._emit(
      Rooms.user(receiverId),
      SOCKET_EVENTS.MESSAGE_RECEIVE,
      { message }
    );
  }

  /**
   * Update message delivery/read status for the sender.
   *
   * @param {string} senderId
   * @param {{ messageId: string, status: 'delivered'|'read' }} update
   */
  emitMessageStatus(senderId, update) {
    this._emit(
      Rooms.user(senderId),
      SOCKET_EVENTS.MESSAGE_STATUS,
      update
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── College broadcast events ─────────────────────────════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Broadcast a new event to all college members.
   * Called after Event.create() in event.service.js.
   *
   * @param {string} collegeId
   * @param {{ _id, title, organizerType, scheduledAt, coverImageUrl }} event
   */
  emitEventPublished(collegeId, event) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.EVENT_PUBLISHED,
      { event }
    );
  }

  /**
   * Broadcast a new job/internship posting to all college members.
   *
   * @param {string} collegeId
   * @param {{ _id, title, company, type, deadline }} job
   */
  emitJobPosted(collegeId, job) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.JOB_POSTED,
      { job }
    );
  }

  /**
   * Broadcast a new mentorship session to the college (or department).
   *
   * @param {string} collegeId
   * @param {{ _id, title, hostId, scheduledAt }} session
   */
  emitMentorshipNew(collegeId, session) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.MENTORSHIP_NEW,
      { session }
    );
  }

  /**
   * Notify college members that a note was deleted by faculty/admin.
   * (Students who had it open get a tombstone UI.)
   *
   * @param {string} collegeId
   * @param {{ noteId: string, title: string, deletedBy: string }} data
   */
  emitNoteDeleted(collegeId, data) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.NOTE_DELETED,
      data
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Subscription events ──────────────────────────────────════════════════
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Push subscription expiry alert to the college room.
   * Called by the subscription expiry cron job.
   * All members see a UI banner; College Admin gets a modal CTA.
   *
   * @param {string} collegeId
   * @param {{ subscriptionId: string, endDate: string, planType: string }} data
   */
  emitSubscriptionExpired(collegeId, data) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.SUBSCRIPTION_EXPIRED,
      data
    );
  }

  /**
   * Push a 14-day expiry warning to the college room.
   * Called by the cron job when daysRemaining <= 14.
   *
   * @param {string} collegeId
   * @param {{ daysRemaining: number, endDate: string }} data
   */
  emitSubscriptionWarning(collegeId, data) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.SUBSCRIPTION_WARNING,
      data
    );
  }

  /**
   * Broadcast subscription renewal confirmation.
   * Called after verifyPayment() activates the new subscription.
   *
   * @param {string} collegeId
   * @param {{ planType: string, endDate: string }} data
   */
  emitSubscriptionRenewed(collegeId, data) {
    this._emit(
      Rooms.college(collegeId),
      SOCKET_EVENTS.SUBSCRIPTION_RENEWED,
      data
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── System / Admin events ────────────────────────────════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Force a specific user to log out (Owner deactivates their account).
   * Client must clear tokens and redirect to login.
   *
   * @param {string} userId
   * @param {{ reason?: string }} data
   */
  emitForceLogout(userId, data = {}) {
    this._emit(
      Rooms.user(userId),
      SOCKET_EVENTS.FORCE_LOGOUT,
      data
    );
  }

  /**
   * Notify all connected Owner sockets of a college deactivation.
   *
   * @param {{ collegeId: string, collegeName: string, reason?: string }} data
   */
  emitCollegeDeactivated(data) {
    this._emit(
      Rooms.owner(),
      SOCKET_EVENTS.COLLEGE_DEACTIVATED,
      data
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── Diagnostics ──────────────────────────────────────────════════════════
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Return current connection counts (dev/monitoring use only).
   */
  async getStats() {
    if (!this._io) return null;
    const sockets = await this._io.fetchSockets();
    return {
      totalConnections: sockets.length,
      rooms:            [...this._io.sockets.adapter.rooms.keys()]
        .filter(r => r.startsWith('room:'))
        .length,
    };
  }
}

// Export the singleton instance — imported everywhere by name
export const socketService = new SocketService();
