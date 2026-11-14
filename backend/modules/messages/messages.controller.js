import * as svc from './messages.service.js';
import { sendSuccess } from '../../utils/response.js';

export const send = async (req, res) => {
  const { receiverId, content } = req.body;
  const message = await svc.sendMessage({
    senderId:  req.user._id,
    receiverId,
    content,
    collegeId: req.user.collegeId,
  });
  return sendSuccess(res, 201, 'Message sent', { message });
};

export const broadcast = async (req, res) => {
  const { content } = req.body;
  const result = await svc.broadcastToDeptAdmins({
    senderId:  req.user._id,
    content,
    collegeId: req.user.collegeId,
  });
  return sendSuccess(res, 200, `Message sent to ${result.sent} department admins`, result);
};

// For collegeAdmin: list all deptAdmins to message
export const listAdmins = async (req, res) => {
  const admins = await svc.listDeptAdmins(req.user.collegeId);
  return sendSuccess(res, 200, 'Department admins fetched', { admins });
};

// For deptAdmin: list collegeAdmins to message
export const listCollegeAdmins = async (req, res) => {
  const admins = await svc.listCollegeAdmins(req.user.collegeId);
  return sendSuccess(res, 200, 'College admins fetched', { admins });
};

// For deptAdmin: list verified members within their department (students/faculty/alumni)
export const listDeptMembers = async (req, res) => {
  const { role } = req.query;
  const members = await svc.listDeptMembers({
    collegeId:    req.user.collegeId,
    departmentId: req.user.departmentId,
    role:         role ?? null,
  });
  return sendSuccess(res, 200, 'Department members fetched', { members });
};

export const thread = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const result = await svc.getThread({
    userId:      req.user._id,
    otherUserId: req.params.userId,
    collegeId:   req.user.collegeId,
    page:        Number(page),
    limit:       Number(limit),
  });
  return sendSuccess(res, 200, 'Thread fetched', result);
};

export const inbox = async (req, res) => {
  const messages = await svc.getInbox({
    userId:    req.user._id,
    collegeId: req.user.collegeId,
  });
  return sendSuccess(res, 200, 'Inbox fetched', { messages });
};

export const listContacts = async (req, res) => {
  const { role, semester, search } = req.query;
  const contacts = await svc.listContacts({
    collegeId:     req.user.collegeId,
    excludeUserId: req.user._id,
    role:          role     ?? null,
    semester:      semester ?? null,
    search:        search   ?? null,
  });
  return sendSuccess(res, 200, 'Contacts fetched', { contacts });
};
