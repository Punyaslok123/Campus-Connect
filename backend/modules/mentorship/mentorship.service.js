import { MentorshipSession, User } from '../../models/index.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/AppError.js';

export const createSession = async ({ collegeId, hostId, data }) => {
  const session = await MentorshipSession.create({ collegeId, hostId, ...data });
  return session;
};

export const listSessions = async ({ collegeId, departmentId, status, skip = 0, limit = 20 }) => {
  const filter = { collegeId };
  if (status) filter.status = status;

  // Show college-wide sessions + sessions for user's department
  if (departmentId) {
    filter.$or = [{ departmentId: null }, { departmentId }];
  }

  const [sessions, total] = await Promise.all([
    MentorshipSession.find(filter)
      .sort({ scheduledAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('hostId', 'firstName lastName profileImage currentCompany currentRole')
      .lean({ virtuals: true }),
    MentorshipSession.countDocuments(filter),
  ]);

  return { sessions, total };
};

export const getSessionById = async ({ id, collegeId }) => {
  const session = await MentorshipSession.findOne({ _id: id, collegeId })
    .populate('hostId', 'firstName lastName profileImage currentCompany currentRole linkedInUrl bio')
    .lean({ virtuals: true });
  if (!session) throw new NotFoundError('Session not found.');
  return session;
};

export const registerForSession = async ({ id, collegeId, userId }) => {
  const session = await MentorshipSession.findOne({ _id: id, collegeId });
  if (!session) throw new NotFoundError('Session not found.');
  await session.registerAttendee(userId);
  return session;
};

export const unregisterFromSession = async ({ id, collegeId, userId }) => {
  const session = await MentorshipSession.findOne({ _id: id, collegeId });
  if (!session) throw new NotFoundError('Session not found.');
  await session.unregisterAttendee(userId);
  return session;
};

export const updateSession = async ({ id, collegeId, hostId, updates }) => {
  const session = await MentorshipSession.findOne({ _id: id, collegeId });
  if (!session) throw new NotFoundError('Session not found.');
  if (session.hostId.toString() !== hostId.toString()) throw new ForbiddenError('Not your session.');
  Object.assign(session, updates);
  await session.save();
  return session;
};

export const deleteSession = async ({ id, collegeId, hostId }) => {
  const session = await MentorshipSession.findOne({ _id: id, collegeId });
  if (!session) throw new NotFoundError('Session not found.');
  if (session.hostId.toString() !== hostId.toString()) throw new ForbiddenError('Not your session.');
  await session.softDelete(hostId);
  return { deleted: true };
};

export const myHostedSessions = async ({ collegeId, hostId, skip = 0, limit = 20 }) => {
  const filter = { collegeId, hostId };
  const [sessions, total] = await Promise.all([
    MentorshipSession.find(filter)
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    MentorshipSession.countDocuments(filter),
  ]);
  return { sessions, total };
};
