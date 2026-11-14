import { Subject, Department } from '../../models/index.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/AppError.js';

export const createSubject = async ({ collegeId, departmentId, name, code, semester }) => {
  const dept = await Department.findOne({ _id: departmentId, collegeId, isActive: true }).lean();
  if (!dept) throw new NotFoundError('Department not found.');

  const existing = await Subject.findOne({
    collegeId, departmentId, semester,
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
  }).lean();
  if (existing) throw new ValidationError('A subject with this name already exists for this semester.');

  return Subject.create({ collegeId, departmentId, name: name.trim(), code: code?.trim() || null, semester });
};

export const listSubjects = async ({ collegeId, departmentId, semester }) => {
  const filter = { collegeId, isActive: true };
  if (departmentId) filter.departmentId = departmentId;
  if (semester)     filter.semester     = semester;
  return Subject.find(filter).sort({ semester: 1, name: 1 }).lean();
};

export const deleteSubject = async ({ subjectId, collegeId }) => {
  const subject = await Subject.findOne({ _id: subjectId, collegeId });
  if (!subject) throw new NotFoundError('Subject not found.');
  subject.isActive = false;
  await subject.save();
  return { subjectId: subject._id };
};

export const assignSubjectsToFaculty = async ({ facultyUser, subjects }) => {
  // subjects: [{ name, code, semester }]
  facultyUser.assignedSubjects = subjects.map(s => ({
    name:     s.name.trim(),
    code:     s.code?.trim() || null,
    semester: Number(s.semester),
  }));
  await facultyUser.save();
  return facultyUser.assignedSubjects;
};
