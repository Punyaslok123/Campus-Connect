import * as svc from './departments.service.js';
import { sendSuccess } from '../../utils/response.js';

export const create = async (req, res) => {
  const { name, code, description,
          adminFirstName, adminLastName, adminEmail, adminPassword } = req.body;
  const result = await svc.createDepartment({
    name, code, description,
    adminFirstName, adminLastName, adminEmail, adminPassword,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 201, 'Department created successfully', result);
};

export const list = async (req, res) => {
  const result = await svc.listDepartments({ collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Departments fetched', result);
};

export const getOne = async (req, res) => {
  const dept = await svc.getDepartment({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Department fetched', { department: dept });
};

export const getDetails = async (req, res) => {
  const details = await svc.getDepartmentDetails({ id: req.params.id, collegeId: req.user.collegeId });
  return sendSuccess(res, 200, 'Department details fetched', { department: details });
};

export const update = async (req, res) => {
  const { name, code, description, isActive } = req.body;
  const updates = {};
  if (name        !== undefined) updates.name        = name;
  if (code        !== undefined) updates.code        = code;
  if (description !== undefined) updates.description = description;
  if (isActive    !== undefined) updates.isActive    = isActive;

  const dept = await svc.updateDepartment({
    id: req.params.id,
    collegeId:   req.user.collegeId,
    updates,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 200, 'Department updated', { department: dept });
};

export const remove = async (req, res) => {
  await svc.deleteDepartment({
    id:          req.params.id,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 200, 'Department and all associated data deleted', null);
};

export const assignAdmin = async (req, res) => {
  const { userId } = req.body;
  const result = await svc.assignDeptAdmin({
    deptId:      req.params.id,
    userId,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 200, 'HOD assigned', { department: result });
};

export const createAdmin = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const result = await svc.createDeptAdmin({
    deptId:      req.params.id,
    firstName, lastName, email, password,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 201, 'HOD created and assigned', result);
};

// Unlinks HOD, downgrades to faculty, preserves account
export const removeAdmin = async (req, res) => {
  const result = await svc.removeDeptAdmin({
    deptId:      req.params.id,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 200, 'HOD removed (account preserved as faculty)', { department: result });
};

// Hard-deletes a previous HOD account permanently
export const permanentlyRemoveAdmin = async (req, res) => {
  await svc.permanentlyRemoveAdmin({
    deptId:      req.params.id,
    userId:      req.params.userId,
    collegeId:   req.user.collegeId,
    performedBy: req.user._id,
    ipAddress:   req.ip,
  });
  return sendSuccess(res, 200, 'Previous HOD account permanently deleted', null);
};

export const listFaculty = async (req, res) => {
  const result = await svc.listAssignableFaculty({
    collegeId: req.user.collegeId,
    deptId:    req.query.deptId,
  });
  return sendSuccess(res, 200, 'Assignable faculty fetched', result);
};

export const listPreviousAdmins = async (req, res) => {
  const list = await svc.getPreviousAdmins({
    deptId:    req.params.id,
    collegeId: req.user.collegeId,
  });
  return sendSuccess(res, 200, 'Previous HODs fetched', { previousAdmins: list });
};
