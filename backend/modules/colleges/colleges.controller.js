/**
 * modules/colleges/colleges.controller.js
 */

import { sendSuccess }   from '../../utils/response.js';
import * as svc          from './colleges.service.js';

export const listColleges = async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await svc.listColleges({
    page:   parseInt(page)  || 1,
    limit:  parseInt(limit) || 50,
    status: status || undefined,
    search: search || undefined,
  });
  return sendSuccess(res, 200, 'Colleges retrieved', result);
};

export const getCollegeById = async (req, res) => {
  const college = await svc.getCollegeById(req.params.id);
  return sendSuccess(res, 200, 'College retrieved', { college });
};

export const activateCollege = async (req, res) => {
  const college = await svc.activateCollege(req.params.id);
  return sendSuccess(res, 200, 'College activated', { college });
};

export const deactivateCollege = async (req, res) => {
  const { reason } = req.body;
  const college = await svc.deactivateCollege(req.params.id, { reason });
  return sendSuccess(res, 200, 'College deactivated', { college });
};

export const getDashboardStats = async (_req, res) => {
  const stats = await svc.getDashboardStats();
  return sendSuccess(res, 200, 'Dashboard stats retrieved', stats);
};
