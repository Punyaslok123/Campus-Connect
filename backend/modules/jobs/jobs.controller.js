import * as svc from './jobs.service.js';
import { sendSuccess } from '../../utils/response.js';
import { paginate } from '../../utils/pagination.js';

export const create = async (req, res) => {
  const job = await svc.createJob({
    collegeId: req.user.collegeId,
    postedBy:  req.user._id,
    data:      req.body,
  });
  return sendSuccess(res, 201, 'Job posted', { job });
};

export const list = async (req, res) => {
  const { type, search } = req.query;
  const { skip, limit, meta } = paginate(req.query);
  const { jobs, total } = await svc.listJobs({
    collegeId: req.user.collegeId,
    type:      type   ?? null,
    search:    search ?? null,
    skip,
    limit,
  });
  return sendSuccess(res, 200, 'Jobs fetched', { jobs, pagination: meta(total) });
};

export const getOne = async (req, res) => {
  const job = await svc.getJobById({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Job fetched', { job });
};

export const update = async (req, res) => {
  const job = await svc.updateJob({
    id:        req.params.id,
    collegeId: req.user.collegeId,
    postedBy:  req.user._id,
    updates:   req.body,
  });
  return sendSuccess(res, 200, 'Job updated', { job });
};

export const remove = async (req, res) => {
  await svc.deleteJob({ id: req.params.id, collegeId: req.user.collegeId, postedBy: req.user._id });
  return sendSuccess(res, 200, 'Job deleted', null);
};

export const myPosts = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);
  const { jobs, total } = await svc.myJobs({
    collegeId: req.user.collegeId,
    postedBy:  req.user._id,
    skip,
    limit,
  });
  return sendSuccess(res, 200, 'Your jobs fetched', { jobs, pagination: meta(total) });
};
