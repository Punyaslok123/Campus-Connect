import * as svc from './events.service.js';
import { sendSuccess } from '../../utils/response.js';
import { paginate } from '../../utils/pagination.js';

export const create = async (req, res) => {
  const { title, description, scheduledAt, endsAt, venue, meetingLink, isOnline } = req.body;
  const isDeptAdmin = req.user.role === 'deptAdmin';

  // departmentId is always resolved from DB in authenticate.js for deptAdmin,
  // but guard here as well so a corrupt token never saves a dept event with null deptId.
  const deptId = isDeptAdmin ? req.user.departmentId : null;
  if (isDeptAdmin && !deptId) {
    const { ValidationError } = await import('../../utils/AppError.js');
    throw new ValidationError('Your department could not be determined. Please log in again.');
  }

  const event = await svc.createEvent({
    title, description, scheduledAt, endsAt, venue, meetingLink,
    isOnline:         isOnline === 'true' || isOnline === true,
    collegeId:        req.user.collegeId,
    departmentId:     deptId,
    organizerType:    isDeptAdmin ? 'department' : 'college',
    organizerId:      isDeptAdmin ? deptId : req.user.collegeId,
    createdBy:        req.user._id,
    coverImageBuffer: req.file?.buffer ?? null,
    ipAddress:        req.ip,
  });
  return sendSuccess(res, 201, 'Event created', { event });
};

export const list = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);
  const { status } = req.query;
  const role = req.user.role;

  // Pass role and departmentId — service decides what each role can see
  const result = await svc.listEvents({
    collegeId:    req.user.collegeId,
    role,
    departmentId: req.user.departmentId ?? null,
    userId:       req.user._id,
    status:       status ?? null,
    skip,
    limit,
    meta,
  });
  return sendSuccess(res, 200, 'Events fetched', result);
};

export const getOne = async (req, res) => {
  const event = await svc.getEvent({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Event fetched', { event });
};

export const update = async (req, res) => {
  const { title, description, scheduledAt, endsAt, venue, meetingLink, isOnline, status } = req.body;
  const updates = {};
  if (title       !== undefined) updates.title       = title;
  if (description !== undefined) updates.description = description;
  if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt;
  if (endsAt      !== undefined) updates.endsAt      = endsAt;
  if (venue       !== undefined) updates.venue       = venue;
  if (meetingLink !== undefined) updates.meetingLink = meetingLink;
  if (isOnline    !== undefined) updates.isOnline    = isOnline === 'true' || isOnline === true;
  if (status      !== undefined) updates.status      = status;

  const event = await svc.updateEvent({
    id:               req.params.id,
    collegeId:        req.user.collegeId,
    departmentId:     req.user.departmentId ?? null,
    role:             req.user.role,
    updates,
    coverImageBuffer: req.file?.buffer ?? null,
    performedBy:      req.user._id,
  });
  return sendSuccess(res, 200, 'Event updated', { event });
};

export const remove = async (req, res) => {
  await svc.deleteEvent({
    id:           req.params.id,
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId ?? null,
    role:         req.user.role,
    performedBy:  req.user._id,
    ipAddress:    req.ip,
  });
  return sendSuccess(res, 200, 'Event deleted', null);
};
