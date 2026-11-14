import { Job, AuditLog, AUDIT_ACTIONS } from '../../models/index.js';
import { NotFoundError, ForbiddenError } from '../../utils/AppError.js';

export const createJob = async ({ collegeId, postedBy, data }) => {
  const job = await Job.create({ collegeId, postedBy, ...data });
  return job;
};

export const listJobs = async ({ collegeId, type, search, skip = 0, limit = 20 }) => {
  const filter = { collegeId, status: 'active' };
  if (type) filter.type = type;

  let query;
  if (search) {
    query = Job.find({ ...filter, $text: { $search: search } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } });
  } else {
    query = Job.find(filter).sort({ createdAt: -1 });
  }

  const [jobs, total] = await Promise.all([
    query.skip(skip).limit(limit)
      .populate('postedBy', 'firstName lastName profileImage currentCompany currentRole')
      .lean({ virtuals: true }),
    Job.countDocuments(filter),
  ]);

  return { jobs, total };
};

export const getJobById = async ({ id, collegeId }) => {
  const job = await Job.findOne({ _id: id, collegeId })
    .populate('postedBy', 'firstName lastName profileImage currentCompany currentRole linkedInUrl')
    .lean({ virtuals: true });
  if (!job) throw new NotFoundError('Job not found.');
  Job.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();
  return job;
};

export const updateJob = async ({ id, collegeId, postedBy, updates }) => {
  const job = await Job.findOne({ _id: id, collegeId });
  if (!job) throw new NotFoundError('Job not found.');
  if (job.postedBy.toString() !== postedBy.toString()) throw new ForbiddenError('Not your posting.');
  Object.assign(job, updates);
  await job.save();
  return job;
};

export const deleteJob = async ({ id, collegeId, postedBy }) => {
  const job = await Job.findOne({ _id: id, collegeId });
  if (!job) throw new NotFoundError('Job not found.');
  if (job.postedBy.toString() !== postedBy.toString()) throw new ForbiddenError('Not your posting.');
  await job.softDelete(postedBy);
  return { deleted: true };
};

export const myJobs = async ({ collegeId, postedBy, skip = 0, limit = 20 }) => {
  const filter = { collegeId, postedBy };
  const [jobs, total] = await Promise.all([
    Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean({ virtuals: true }),
    Job.countDocuments(filter),
  ]);
  return { jobs, total };
};
