import * as svc from './announcements.service.js';
import { sendSuccess } from '../../utils/response.js';
import { paginate } from '../../utils/pagination.js';

export const create = async (req, res) => {
  const { title, body, isPinned } = req.body;
  const isDeptAdmin = req.user.role === 'deptAdmin';

  const deptId = isDeptAdmin ? req.user.departmentId : null;
  if (isDeptAdmin && !deptId) {
    const { ValidationError } = await import('../../utils/AppError.js');
    throw new ValidationError('Your department could not be determined. Please log in again.');
  }

  const ann = await svc.createAnnouncement({
    title,
    body,
    audience:     isDeptAdmin ? 'department' : 'college',
    departmentId: deptId,
    isPinned:     isPinned ?? false,
    collegeId:    req.user.collegeId,
    postedBy:     req.user._id,
  });
  return sendSuccess(res, 201, 'Announcement posted', { announcement: ann });
};

export const list = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);
  const role = req.user.role;

  // Pass role and departmentId — service decides what each role can see
  const result = await svc.listAnnouncements({
    collegeId:    req.user.collegeId,
    role,
    departmentId: req.user.departmentId ?? null,
    userId:       req.user._id,
    skip,
    limit,
    meta,
  });
  return sendSuccess(res, 200, 'Announcements fetched', result);
};

export const getOne = async (req, res) => {
  const ann = await svc.getAnnouncement({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Announcement fetched', { announcement: ann });
};

export const update = async (req, res) => {
  const { title, body, isPinned } = req.body;
  const updates = {};
  if (title    !== undefined) updates.title    = title;
  if (body     !== undefined) updates.body     = body;
  if (isPinned !== undefined) updates.isPinned = isPinned;

  const ann = await svc.updateAnnouncement({
    id:           req.params.id,
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId ?? null,
    role:         req.user.role,
    updates,
  });
  return sendSuccess(res, 200, 'Announcement updated', { announcement: ann });
};

export const remove = async (req, res) => {
  await svc.deleteAnnouncement({
    id:           req.params.id,
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId ?? null,
    role:         req.user.role,
  });
  return sendSuccess(res, 200, 'Announcement deleted', null);
};
