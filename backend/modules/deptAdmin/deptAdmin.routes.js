/**
 * modules/deptAdmin/deptAdmin.routes.js
 * Department Admin-only utility endpoints (stats, etc.).
 */

import { Router }          from 'express';
import { asyncHandler }    from '../../utils/asyncHandler.js';
import authenticate        from '../../middlewares/authenticate.js';
import checkRole           from '../../middlewares/checkRole.js';
import checkSubscription   from '../../middlewares/checkSubscription.js';
import * as ctrl           from './deptAdmin.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkSubscription);
router.use(checkRole(['deptAdmin']));

// GET /api/dept-admin/stats
router.get('/stats', asyncHandler(ctrl.getStats));

export default router;
