import { Router }        from 'express';
import { body }          from 'express-validator';
import { asyncHandler }  from '../../utils/asyncHandler.js';
import authenticate      from '../../middlewares/authenticate.js';
import checkRole         from '../../middlewares/checkRole.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import validateBody      from '../../middlewares/validateBody.js';
import * as ctrl         from './messages.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkSubscription);

const ALL_MSG_ROLES = ['collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni'];

const msgValidator = [
  body('content').trim().notEmpty().withMessage('Message content is required'),
];

// GET  /api/messages/inbox
router.get('/inbox', checkRole(ALL_MSG_ROLES), asyncHandler(ctrl.inbox));

// GET  /api/messages/dept-admins — for collegeAdmin to list deptAdmins
router.get('/dept-admins', checkRole(['collegeAdmin']), asyncHandler(ctrl.listAdmins));

// GET  /api/messages/college-admins — for deptAdmin/faculty to list collegeAdmins
router.get('/college-admins', checkRole(['deptAdmin', 'faculty']), asyncHandler(ctrl.listCollegeAdmins));

// GET  /api/messages/dept-members?role=student|faculty|alumni|deptAdmin
router.get('/dept-members', checkRole(['deptAdmin', 'faculty']), asyncHandler(ctrl.listDeptMembers));

// GET  /api/messages/contacts — for student/faculty/alumni: list messageable people
router.get('/contacts', checkRole(['student', 'faculty', 'alumni']), asyncHandler(ctrl.listContacts));

// POST /api/messages/broadcast — collegeAdmin broadcasts to all deptAdmins
router.post('/broadcast',
  checkRole(['collegeAdmin']),
  validateBody(msgValidator),
  asyncHandler(ctrl.broadcast)
);

// POST /api/messages — send a direct message (all roles)
router.post('/',
  checkRole(ALL_MSG_ROLES),
  validateBody([
    body('receiverId').notEmpty().withMessage('receiverId is required'),
    ...msgValidator,
  ]),
  asyncHandler(ctrl.send)
);

// GET  /api/messages/:userId — thread with a specific user
router.get('/:userId', checkRole(ALL_MSG_ROLES), asyncHandler(ctrl.thread));

export default router;
