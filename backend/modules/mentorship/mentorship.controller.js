import * as svc from './mentorship.service.js';
import { sendSuccess } from '../../utils/response.js';
import { paginate } from '../../utils/pagination.js';

export const create = async (req, res) => {
  const session = await svc.createSession({
    collegeId: req.user.collegeId,
    hostId:    req.user._id,
    data:      req.body,
  });
  return sendSuccess(res, 201, 'Session created', { session });
};

export const list = async (req, res) => {
  const { status } = req.query;
  const { skip, limit, meta } = paginate(req.query);
  const { sessions, total } = await svc.listSessions({
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId ?? null,
    status:       status ?? null,
    skip,
    limit,
  });
  return sendSuccess(res, 200, 'Sessions fetched', { sessions, pagination: meta(total) });
};

export const getOne = async (req, res) => {
  const session = await svc.getSessionById({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Session fetched', { session });
};

export const register = async (req, res) => {
  const session = await svc.registerForSession({
    id:        req.params.id,
    collegeId: req.user.collegeId,
    userId:    req.user._id,
  });
  return sendSuccess(res, 200, 'Registered for session', { session });
};

export const unregister = async (req, res) => {
  const session = await svc.unregisterFromSession({
    id:        req.params.id,
    collegeId: req.user.collegeId,
    userId:    req.user._id,
  });
  return sendSuccess(res, 200, 'Unregistered from session', { session });
};

export const update = async (req, res) => {
  const session = await svc.updateSession({
    id:        req.params.id,
    collegeId: req.user.collegeId,
    hostId:    req.user._id,
    updates:   req.body,
  });
  return sendSuccess(res, 200, 'Session updated', { session });
};

export const remove = async (req, res) => {
  await svc.deleteSession({ id: req.params.id, collegeId: req.user.collegeId, hostId: req.user._id });
  return sendSuccess(res, 200, 'Session deleted', null);
};

export const myHosted = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);
  const { sessions, total } = await svc.myHostedSessions({
    collegeId: req.user.collegeId,
    hostId:    req.user._id,
    skip,
    limit,
  });
  return sendSuccess(res, 200, 'Your hosted sessions fetched', { sessions, pagination: meta(total) });
};
