import { Router }            from 'express';
import { body }              from 'express-validator';
import multer                from 'multer';
import { asyncHandler }      from '../../utils/asyncHandler.js';
import authenticate          from '../../middlewares/authenticate.js';
import checkRole             from '../../middlewares/checkRole.js';
import validateBody          from '../../middlewares/validateBody.js';
import { uploadProfileImage } from '../../utils/cloudinaryUpload.js';
import * as ctrl             from './settings.controller.js';

const router = Router();

// Multer for college branding (logo + coverImage in one request)
const storage    = multer.memoryStorage();
const brandingUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Image must be JPEG, PNG, or WebP'), ok);
  },
}).fields([
  { name: 'logo',        maxCount: 1 },
  { name: 'coverImage',  maxCount: 1 },
]);

const passwordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

// Profile + password — accessible to all authenticated roles
router.get('/profile',  authenticate, asyncHandler(ctrl.getProfile));
router.put('/profile',  authenticate, uploadProfileImage.single('profileImage'), asyncHandler(ctrl.updateProfile));
router.put('/password', authenticate, validateBody(passwordValidator), asyncHandler(ctrl.changePassword));

// College settings — collegeAdmin only
router.get('/college', authenticate, checkRole(['collegeAdmin']), asyncHandler(ctrl.getCollegeSettings));
router.put('/college', authenticate, checkRole(['collegeAdmin']), brandingUpload, asyncHandler(ctrl.updateCollegeSettings));

export default router;
