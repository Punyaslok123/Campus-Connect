/**
 * models/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central barrel export for all Mongoose models.
 * Import from here throughout the codebase — never import model files directly.
 *
 * Usage:
 *   import { User, College, Note, AuditLog, AUDIT_ACTIONS } from '../models/index.js';
 *
 * Models must be imported (and thus registered with Mongoose) before any
 * query that uses populate() with a model name string.
 * Importing this file in app.js / server.js ensures all models are registered.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export { default as College }            from './College.model.js';
export { default as Plan }               from './Plan.model.js';
export { default as User }               from './User.model.js';
export { default as Subscription,
         PLAN_CONFIG }                   from './Subscription.model.js';
export { default as Department }         from './Department.model.js';
export { default as Event }              from './Event.model.js';
export { default as Note }               from './Note.model.js';
export { default as Message }            from './Message.model.js';
export { default as Job }                from './Job.model.js';
export { default as MentorshipSession }  from './MentorshipSession.model.js';
export { default as AuditLog,
         AUDIT_ACTIONS }                 from './AuditLog.model.js';
export { default as Notification,
         NOTIFICATION_TYPES }            from './Notification.model.js';
export { default as Announcement }      from './Announcement.model.js';
export { default as SupportTicket }    from './SupportTicket.model.js';
export { default as Subject }          from './Subject.model.js';
