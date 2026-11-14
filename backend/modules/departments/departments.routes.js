import { Router }       from 'express';
import { body }         from 'express-validator';
import { asyncHandler } from '../../utils/asyncHandler.js';
import authenticate     from '../../middlewares/authenticate.js';
import checkRole        from '../../middlewares/checkRole.js';
import validateBody     from '../../middlewares/validateBody.js';
import * as ctrl        from './departments.controller.js';

const router = Router();

const adminOrOwner = [authenticate, checkRole(['collegeAdmin', 'owner'])];
const adminOnly    = [authenticate, checkRole(['collegeAdmin'])];

const createValidator = [
  body('name').trim().notEmpty().withMessage('Department name is required').isLength({ max: 100 }),
  body('code').optional({ checkFalsy: true }).trim().isLength({ max: 10 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('adminEmail').optional({ checkFalsy: true }).trim().isEmail().withMessage('Valid admin email required'),
  body('adminPassword').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('Admin password min 8 chars'),
  body('adminFirstName').optional({ checkFalsy: true }).trim().notEmpty(),
];

const updateValidator = [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('code').optional({ checkFalsy: true }).trim().isLength({ max: 10 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];

const assignAdminValidator = [
  body('userId').notEmpty().withMessage('userId is required'),
];

const createAdminValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// POST   /api/departments
router.post('/',     ...adminOnly, validateBody(createValidator), asyncHandler(ctrl.create));

// GET    /api/departments
router.get('/',      ...adminOrOwner, asyncHandler(ctrl.list));

// GET    /api/departments/faculty — must be BEFORE /:id
router.get('/faculty', ...adminOnly, asyncHandler(ctrl.listFaculty));

// GET    /api/departments/:id/details
router.get('/:id/details', ...adminOrOwner, asyncHandler(ctrl.getDetails));

// GET    /api/departments/:id/previous-admins
router.get('/:id/previous-admins', ...adminOnly, asyncHandler(ctrl.listPreviousAdmins));

// GET    /api/departments/:id
router.get('/:id',   ...adminOrOwner, asyncHandler(ctrl.getOne));

// PUT    /api/departments/:id
router.put('/:id',   ...adminOnly, validateBody(updateValidator), asyncHandler(ctrl.update));

// DELETE /api/departments/:id
router.delete('/:id', ...adminOnly, asyncHandler(ctrl.remove));

// POST   /api/departments/:id/assign-admin
router.post('/:id/assign-admin', ...adminOnly, validateBody(assignAdminValidator), asyncHandler(ctrl.assignAdmin));

// POST   /api/departments/:id/create-admin
router.post('/:id/create-admin', ...adminOnly, validateBody(createAdminValidator), asyncHandler(ctrl.createAdmin));

// DELETE /api/departments/:id/admin  — unlinks HOD, keeps account as faculty
router.delete('/:id/admin', ...adminOnly, asyncHandler(ctrl.removeAdmin));

// DELETE /api/departments/:id/previous-admins/:userId  — hard-deletes a previous HOD account
router.delete('/:id/previous-admins/:userId', ...adminOnly, asyncHandler(ctrl.permanentlyRemoveAdmin));

export default router;
