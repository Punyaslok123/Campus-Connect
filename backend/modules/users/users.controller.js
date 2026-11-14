import * as svc from './users.service.js';
import { sendSuccess } from '../../utils/response.js';

export const list = async (req, res) => {
  const result = await svc.listUsers(req);
  return sendSuccess(res, 200, 'Users fetched', result);
};

export const pending = async (req, res) => {
  const result = await svc.listPending(req);
  return sendSuccess(res, 200, 'Pending users fetched', result);
};

export const blocked = async (req, res) => {
  const result = await svc.listBlocked(req);
  return sendSuccess(res, 200, 'Blocked users fetched', result);
};

export const getOne = async (req, res) => {
  const user = await svc.getUser(req.params.id, req);
  return sendSuccess(res, 200, 'User fetched', { user });
};

export const verify = async (req, res) => {
  const user = await svc.verifyUser(req.params.id, req);
  return sendSuccess(res, 200, 'User verified successfully', { user });
};

export const reject = async (req, res) => {
  const reason = req.body?.reason ?? 'Rejected by administrator';
  const user   = await svc.rejectUser(req.params.id, reason, req);
  return sendSuccess(res, 200, 'User rejected', { user });
};

export const deactivate = async (req, res) => {
  const user = await svc.deactivateUser(req.params.id, req);
  return sendSuccess(res, 200, 'User deactivated', { user });
};

export const reactivate = async (req, res) => {
  const user = await svc.reactivateUser(req.params.id, req);
  return sendSuccess(res, 200, 'User reactivated', { user });
};

export const permanentRemove = async (req, res) => {
  const result = await svc.permanentlyRemoveUser(req.params.id, req);
  return sendSuccess(res, 200, 'User permanently removed', result);
};
