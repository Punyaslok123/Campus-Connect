/**
 * modules/colleges/colleges.routes.js
 * All routes are owner-only.
 */

import { Router }        from 'express';
import { asyncHandler }  from '../../utils/asyncHandler.js';
import authenticate      from '../../middlewares/authenticate.js';
import checkRole         from '../../middlewares/checkRole.js';
import * as ctrl         from './colleges.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkRole(['owner']));

router.get('/stats',       asyncHandler(ctrl.getDashboardStats));
router.get('/',            asyncHandler(ctrl.listColleges));
router.get('/:id',         asyncHandler(ctrl.getCollegeById));
router.patch('/:id/activate',   asyncHandler(ctrl.activateCollege));
router.patch('/:id/deactivate', asyncHandler(ctrl.deactivateCollege));

export default router;
