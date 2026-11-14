import * as svc         from './subjects.service.js';
import { User }         from '../../models/index.js';
import { sendSuccess }  from '../../utils/response.js';
import { NotFoundError } from '../../utils/AppError.js';

export const createSubject = async (req, res) => {
  const subject = await svc.createSubject({
    collegeId:    req.user.collegeId,
    departmentId: req.body.departmentId,
    name:         req.body.name,
    code:         req.body.code,
    semester:     req.body.semester,
  });
  return sendSuccess(res, 201, 'Subject created', { subject });
};

export const listSubjects = async (req, res) => {
  const { departmentId, semester } = req.query;
  const subjects = await svc.listSubjects({
    collegeId:    req.user.collegeId,
    departmentId: departmentId || null,
    semester:     semester ? parseInt(semester, 10) : null,
  });
  return sendSuccess(res, 200, 'Subjects fetched', { subjects });
};

export const deleteSubject = async (req, res) => {
  const result = await svc.deleteSubject({
    subjectId: req.params.id,
    collegeId: req.user.collegeId,
  });
  return sendSuccess(res, 200, 'Subject removed', result);
};

// PATCH /api/subjects/faculty/:facultyId/assign — deptAdmin assigns subjects to faculty
export const assignToFaculty = async (req, res) => {
  const faculty = await User.findOne({
    _id:          req.params.facultyId,
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId,
    role:         'faculty',
  });
  if (!faculty) throw new NotFoundError('Faculty member not found in your department.');

  const subjects = await svc.assignSubjectsToFaculty({
    facultyUser: faculty,
    subjects:    req.body.subjects ?? [],
  });
  return sendSuccess(res, 200, 'Subjects assigned', { assignedSubjects: subjects });
};

// PATCH /api/subjects/my-subjects — faculty updates own assigned subjects
export const updateMySubjects = async (req, res) => {
  const faculty = await User.findById(req.user._id);
  if (!faculty) throw new NotFoundError('User not found.');

  const subjects = await svc.assignSubjectsToFaculty({
    facultyUser: faculty,
    subjects:    req.body.subjects ?? [],
  });
  return sendSuccess(res, 200, 'Subjects updated', { assignedSubjects: subjects });
};
