import { User, College } from '../../models/index.js';
import { NotFoundError } from '../../utils/AppError.js';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../../utils/cloudinaryUpload.js';

// ── Update college admin profile ──────────────────────────────────────────────

export const updateProfile = async ({ userId, updates, profileImageBuffer }) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  const allowed = ['firstName', 'lastName', 'phone', 'bio', 'designation'];
  allowed.forEach(key => {
    if (updates[key] !== undefined) user[key] = updates[key];
  });

  if (profileImageBuffer) {
    if (user.profileImage?.publicId) {
      await deleteFromCloudinary(user.profileImage.publicId, 'image');
    }
    const uploaded = await uploadToCloudinary(profileImageBuffer, {
      folder: `campus-connect/profiles`,
      resource_type: 'image',
    });
    user.profileImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  await user.save({ validateBeforeSave: false });
  return user.toSafeObject();
};

export const changePassword = async ({ userId, currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new NotFoundError('User not found.');

  const { ValidationError } = await import('../../utils/AppError.js');
  const match = await user.comparePassword(currentPassword);
  if (!match) throw new ValidationError('Current password is incorrect.');

  user.passwordHash = newPassword;
  await user.save();
};

// ── Update college settings ───────────────────────────────────────────────────

export const updateCollegeSettings = async ({ collegeId, updates, logoBuffer, coverImageBuffer }) => {
  const college = await College.findById(collegeId);
  if (!college) throw new NotFoundError('College not found.');

  const allowed = ['name', 'contactEmail', 'address'];
  allowed.forEach(key => {
    if (updates[key] !== undefined) college[key] = updates[key];
  });

  if (logoBuffer) {
    if (college.logo?.publicId) {
      await deleteFromCloudinary(college.logo.publicId, 'image');
    }
    const uploaded = await uploadToCloudinary(logoBuffer, {
      folder: `campus-connect/${collegeId}/branding`,
      resource_type: 'image',
    });
    college.logo = { url: uploaded.url, publicId: uploaded.publicId };
  }

  if (coverImageBuffer) {
    if (college.coverImage?.publicId) {
      await deleteFromCloudinary(college.coverImage.publicId, 'image');
    }
    const uploaded = await uploadToCloudinary(coverImageBuffer, {
      folder: `campus-connect/${collegeId}/branding`,
      resource_type: 'image',
    });
    college.coverImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  await college.save();
  return college;
};

export const getCollegeSettings = async (collegeId) => {
  const college = await College.findById(collegeId).lean();
  if (!college) throw new NotFoundError('College not found.');
  return college;
};
