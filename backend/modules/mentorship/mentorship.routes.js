import { Router }        from 'express';
import { asyncHandler }  from '../../utils/asyncHandler.js';
import authenticate      from '../../middlewares/authenticate.js';
import checkRole         from '../../middlewares/checkRole.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import * as ctrl         from './mentorship.controller.js';

const router = Router();
router.use(authenticate, checkSubscription);

const ALL_ROLES = ['student', 'faculty', 'alumni', 'deptAdmin', 'collegeAdmin'];

// Alumni: host + manage own sessions
router.post('/',                checkRole(['alumni']),    asyncHandler(ctrl.create));
router.get('/my',               checkRole(['alumni']),    asyncHandler(ctrl.myHosted));
router.put('/:id',              checkRole(['alumni']),    asyncHandler(ctrl.update));
router.delete('/:id',           checkRole(['alumni']),    asyncHandler(ctrl.remove));

// Students: register / unregister
router.post('/:id/register',    checkRole(['student']),   asyncHandler(ctrl.register));
router.post('/:id/unregister',  checkRole(['student']),   asyncHandler(ctrl.unregister));

// All roles: browse
router.get('/',     checkRole(ALL_ROLES), asyncHandler(ctrl.list));
router.get('/:id',  checkRole(ALL_ROLES), asyncHandler(ctrl.getOne));

export default router;
