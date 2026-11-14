import { Router }            from 'express';
import { body }              from 'express-validator';
import { asyncHandler }      from '../../utils/asyncHandler.js';
import authenticate          from '../../middlewares/authenticate.js';
import checkRole             from '../../middlewares/checkRole.js';
import checkSubscription     from '../../middlewares/checkSubscription.js';
import validateBody          from '../../middlewares/validateBody.js';
import { uploadCoverImage }  from '../../utils/cloudinaryUpload.js';
import * as ctrl             from './events.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkSubscription);

const createValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('scheduledAt').optional().isISO8601().withMessage('scheduledAt must be a valid date'),
  body('endsAt').optional().isISO8601().withMessage('endsAt must be a valid date'),
];

// POST /api/events — collegeAdmin creates college-wide; deptAdmin creates department-level
router.post(
  '/',
  checkRole(['collegeAdmin', 'deptAdmin']),
  uploadCoverImage.single('coverImage'),
  validateBody(createValidator),
  asyncHandler(ctrl.create)
);

// GET /api/events — list events (scoped by role in controller)
router.get('/', checkRole(['collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni']), asyncHandler(ctrl.list));

// GET /api/events/:id
router.get('/:id', checkRole(['collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni']), asyncHandler(ctrl.getOne));

// PUT /api/events/:id — both admins can edit their own events
router.put(
  '/:id',
  checkRole(['collegeAdmin', 'deptAdmin']),
  uploadCoverImage.single('coverImage'),
  asyncHandler(ctrl.update)
);

// DELETE /api/events/:id — both admins can delete their own events
router.delete('/:id', checkRole(['collegeAdmin', 'deptAdmin']), asyncHandler(ctrl.remove));

export default router;
