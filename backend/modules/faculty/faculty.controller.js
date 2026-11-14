import * as svc from './faculty.service.js';
import { sendSuccess } from '../../utils/response.js';

export const getStats = async (req, res) => {
  const stats = await svc.getFacultyStats({
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId,
  });
  return sendSuccess(res, 200, 'Faculty stats fetched', { stats });
};
