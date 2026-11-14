import { Router }        from 'express';
import { asyncHandler }  from '../../utils/asyncHandler.js';
import authenticate      from '../../middlewares/authenticate.js';
import checkRole         from '../../middlewares/checkRole.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import * as ctrl         from './jobs.controller.js';

const router = Router();
router.use(authenticate, checkSubscription);

// Alumni: post + manage own jobs
router.post('/',        checkRole(['alumni']),                                    asyncHandler(ctrl.create));
router.get('/my',       checkRole(['alumni']),                                    asyncHandler(ctrl.myPosts));
router.put('/:id',      checkRole(['alumni']),                                    asyncHandler(ctrl.update));
router.delete('/:id',   checkRole(['alumni']),                                    asyncHandler(ctrl.remove));

// All roles: browse
router.get('/',         checkRole(['student','faculty','alumni','deptAdmin','collegeAdmin']), asyncHandler(ctrl.list));
router.get('/:id',      checkRole(['student','faculty','alumni','deptAdmin','collegeAdmin']), asyncHandler(ctrl.getOne));

export default router;
