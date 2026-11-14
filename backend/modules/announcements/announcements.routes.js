import { Router }        from 'express';
import { body }          from 'express-validator';
import { asyncHandler }  from '../../utils/asyncHandler.js';
import authenticate      from '../../middlewares/authenticate.js';
import checkRole         from '../../middlewares/checkRole.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import validateBody      from '../../middlewares/validateBody.js';
import * as ctrl         from './announcements.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkSubscription);

const ALL_COLLEGE_ROLES = ['collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni'];

const createValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('body').trim().notEmpty().withMessage('Body is required'),
];

// POST /api/announcements — collegeAdmin: college-wide; deptAdmin: department-scoped
router.post('/',      checkRole(['collegeAdmin', 'deptAdmin']), validateBody(createValidator), asyncHandler(ctrl.create));

// GET  /api/announcements
router.get('/',       checkRole(ALL_COLLEGE_ROLES), asyncHandler(ctrl.list));

// GET  /api/announcements/:id
router.get('/:id',    checkRole(ALL_COLLEGE_ROLES), asyncHandler(ctrl.getOne));

// PUT  /api/announcements/:id
router.put('/:id',    checkRole(['collegeAdmin', 'deptAdmin']), asyncHandler(ctrl.update));

// DELETE /api/announcements/:id
router.delete('/:id', checkRole(['collegeAdmin', 'deptAdmin']), asyncHandler(ctrl.remove));

export default router;
