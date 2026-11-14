import {
  User, Note, Message, Notification, MentorshipSession,
  AuditLog, AUDIT_ACTIONS,
} from '../../models/index.js';
import { NotFoundError, ForbiddenError } from '../../utils/AppError.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const buildCollegeFilter = (req) => {
  // deptAdmin: scoped to their department only
  if (req.user.role === 'deptAdmin') {
    return { collegeId: req.user.collegeId, departmentId: req.user.departmentId };
  }
  // collegeAdmin / owner
  return { collegeId: req.user.collegeId };
};

// ── listUsers — active & verified members only ────────────────────────────────

export const listUsers = async (req) => {
  const { role, page = 1, limit = 200 } = req.query;
  const skip   = (Number(page) - 1) * Number(limit);
  const filter = {
    ...buildCollegeFilter(req),
    isActive:   true,
    isVerified: true,
    role: { $in: ['student', 'faculty', 'alumni'] },
  };

  if (role && ['student', 'faculty', 'alumni'].includes(role)) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return { users, pagination: { total, page: Number(page), limit: Number(limit) } };
};

// ── listPending — registered but not yet approved (isVerified:false, isActive:true) ─

export const listPending = async (req) => {
  const { page = 1, limit = 200 } = req.query;
  const skip  = (Number(page) - 1) * Number(limit);
  const filter = {
    ...buildCollegeFilter(req),
    role:       { $in: ['student', 'faculty', 'alumni'] },
    isVerified: false,
    isActive:   true,   // strictly pending: never approved, not yet rejected
  };

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: 1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return { users, pagination: { total, page: Number(page), limit: Number(limit) } };
};

// ── listBlocked — deactivated after approval (isActive:false) ────────────────
// Once approved (isVerified:true), a deactivated user is "blocked", not pending.

export const listBlocked = async (req) => {
  const { page = 1, limit = 200 } = req.query;
  const skip  = (Number(page) - 1) * Number(limit);
  const filter = {
    ...buildCollegeFilter(req),
    role:     { $in: ['student', 'faculty', 'alumni'] },
    isActive: false,     // blocked = explicitly deactivated (regardless of isVerified)
  };

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(filter),
  ]);

  return { users, pagination: { total, page: Number(page), limit: Number(limit) } };
};

// ── getUser ───────────────────────────────────────────────────────────────────

export const getUser = async (id, req) => {
  const filter = { _id: id, ...buildCollegeFilter(req) };
  const user   = await User.findOne(filter).lean();
  if (!user) throw new NotFoundError('User not found.');
  return user;
};

// ── verifyUser — approve a pending user (isVerified:false → true) ────────────

export const verifyUser = async (id, req) => {
  const filter = {
    _id:        id,
    ...buildCollegeFilter(req),
    isVerified: false,
    isActive:   true,
  };
  const user = await User.findOne(filter);
  if (!user) throw new NotFoundError('Pending user not found.');

  user.isVerified = true;
  // isActive stays true — user was never deactivated
  await user.save({ validateBeforeSave: false });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_VERIFIED,
    collegeId:       req.user.collegeId,
    performedBy:     req.user._id,
    performedByRole: req.user.role,
    targetId:        user._id,
    targetModel:     'User',
    metadata:        { email: user.email, role: user.role },
    ipAddress:       req.ip,
  });

  return user.toObject();
};

// ── rejectUser ────────────────────────────────────────────────────────────────

export const rejectUser = async (id, reason, req) => {
  const filter = { _id: id, ...buildCollegeFilter(req), isVerified: false };
  const user   = await User.findOne(filter);
  if (!user) throw new NotFoundError('Pending user not found.');

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_REJECTED,
    collegeId:       req.user.collegeId,
    performedBy:     req.user._id,
    performedByRole: req.user.role,
    targetId:        user._id,
    targetModel:     'User',
    metadata:        { email: user.email, role: user.role, reason },
    ipAddress:       req.ip,
  });

  return user.toObject();
};

// ── deactivateUser ────────────────────────────────────────────────────────────

export const deactivateUser = async (id, req) => {
  const filter = { _id: id, ...buildCollegeFilter(req) };
  const user   = await User.findOne(filter);
  if (!user) throw new NotFoundError('User not found.');
  if (user._id.toString() === req.user._id.toString()) throw new ForbiddenError('You cannot deactivate yourself.');

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_DEACTIVATED,
    collegeId:       req.user.collegeId,
    performedBy:     req.user._id,
    performedByRole: req.user.role,
    targetId:        user._id,
    targetModel:     'User',
    ipAddress:       req.ip,
  });

  return user.toObject();
};

// ── reactivateUser — unblock a deactivated user (isActive:false → true) ──────

export const reactivateUser = async (id, req) => {
  const filter = {
    _id:      id,
    ...buildCollegeFilter(req),
    isActive: false,
  };
  const user = await User.findOne(filter);
  if (!user) throw new NotFoundError('Blocked user not found.');

  user.isActive = true;
  // isVerified unchanged — they were already approved before being blocked
  await user.save({ validateBeforeSave: false });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_VERIFIED,
    collegeId:       req.user.collegeId,
    performedBy:     req.user._id,
    performedByRole: req.user.role,
    targetId:        user._id,
    targetModel:     'User',
    metadata:        { unblocked: true, email: user.email, role: user.role },
    ipAddress:       req.ip,
  });

  return user.toObject();
};

// ── permanentlyRemoveUser — hard delete with cascade ─────────────────────────
// Only blocked (isActive:false) or pending (isVerified:false, isActive:true) users
// can be permanently removed. Active & verified users must be blocked first.

export const permanentlyRemoveUser = async (id, req) => {
  const filter = {
    _id:       id,
    ...buildCollegeFilter(req),
    $or: [{ isActive: false }, { isVerified: false }],
  };
  const user = await User.findOne(filter);
  if (!user) throw new NotFoundError('User not found. Only blocked or pending users can be permanently removed.');

  const userId = user._id;

  // ── Cascade deletes ────────────────────────────────────────────────────────
  await Promise.all([
    // Notes uploaded by this user (soft-delete already; hard-delete on removal)
    Note.deleteMany({ uploadedBy: userId }),

    // All messages sent or received by this user
    Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }),

    // All notifications for this user
    Notification.deleteMany({ userId }),

    // Remove this user from any mentorship session attendee lists
    MentorshipSession.updateMany(
      { 'attendees.userId': userId },
      { $pull: { attendees: { userId } } }
    ),
  ]);

  // Delete the user record
  await User.deleteOne({ _id: userId });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.USER_DEACTIVATED,
    collegeId:       req.user.collegeId,
    performedBy:     req.user._id,
    performedByRole: req.user.role,
    targetId:        userId,
    targetModel:     'User',
    metadata:        { permanentlyRemoved: true, email: user.email, role: user.role },
    ipAddress:       req.ip,
  });

  return { removed: true };
};
