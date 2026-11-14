/**
 * modules/deptAdmin/deptAdmin.controller.js
 */

import * as svc        from './deptAdmin.service.js';
import { sendSuccess } from '../../utils/response.js';

// GET /api/dept-admin/stats
export const getStats = async (req, res) => {
  const stats = await svc.getDeptStats({
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId,
  });
  return sendSuccess(res, 200, 'Department stats fetched', { stats });
};
