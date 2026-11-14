import * as svc from './settings.service.js';
import { sendSuccess } from '../../utils/response.js';

export const getProfile = async (req, res) => {
  const { User } = await import('../../models/index.js');
  const user = await User.findById(req.user._id).lean();
  return sendSuccess(res, 200, 'Profile fetched', { user });
};

export const updateProfile = async (req, res) => {
  const { firstName, lastName, phone, bio, designation } = req.body;
  const user = await svc.updateProfile({
    userId:             req.user._id,
    updates:            { firstName, lastName, phone, bio, designation },
    profileImageBuffer: req.file?.buffer ?? null,
  });
  return sendSuccess(res, 200, 'Profile updated', { user });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await svc.changePassword({ userId: req.user._id, currentPassword, newPassword });
  return sendSuccess(res, 200, 'Password changed successfully', null);
};

export const getCollegeSettings = async (req, res) => {
  const college = await svc.getCollegeSettings(req.user.collegeId);
  return sendSuccess(res, 200, 'College settings fetched', { college });
};

export const updateCollegeSettings = async (req, res) => {
  const { name, contactEmail, address } = req.body;
  const files = req.files ?? {};
  const college = await svc.updateCollegeSettings({
    collegeId:        req.user.collegeId,
    updates:          { name, contactEmail, address },
    logoBuffer:       files.logo?.[0]?.buffer        ?? null,
    coverImageBuffer: files.coverImage?.[0]?.buffer  ?? null,
  });
  return sendSuccess(res, 200, 'College settings updated', { college });
};
