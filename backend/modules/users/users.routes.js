import { Router }       from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import authenticate     from '../../middlewares/authenticate.js';
import checkRole        from '../../middlewares/checkRole.js';
import * as ctrl        from './users.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/pending
router.get('/pending',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.pending)
);

// GET /api/users/blocked — rejected OR deactivated users
router.get('/blocked',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.blocked)
);

// GET /api/users
router.get('/',
  checkRole(['collegeAdmin', 'deptAdmin', 'owner']),
  asyncHandler(ctrl.list)
);

// GET /api/users/:id
router.get('/:id',
  checkRole(['collegeAdmin', 'deptAdmin', 'owner']),
  asyncHandler(ctrl.getOne)
);

// PATCH /api/users/:id/verify
router.patch('/:id/verify',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.verify)
);

// PATCH /api/users/:id/reject
router.patch('/:id/reject',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.reject)
);

// PATCH /api/users/:id/deactivate — deptAdmin can deactivate dept members (not themselves)
router.patch('/:id/deactivate',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.deactivate)
);

// PATCH /api/users/:id/reactivate — college/dept admin can reactivate a blocked user
router.patch('/:id/reactivate',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.reactivate)
);

// DELETE /api/users/:id — permanently remove a blocked user
router.delete('/:id',
  checkRole(['collegeAdmin', 'deptAdmin']),
  asyncHandler(ctrl.permanentRemove)
);

export default router;
