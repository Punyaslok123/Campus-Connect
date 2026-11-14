import { Router }    from 'express';
import { body }      from 'express-validator';
import { asyncHandler } from '../../utils/asyncHandler.js';
import authenticate  from '../../middlewares/authenticate.js';
import checkRole     from '../../middlewares/checkRole.js';
import validateBody  from '../../middlewares/validateBody.js';
import * as ctrl     from './support.controller.js';

const router = Router();
router.use(authenticate);

const ticketValidator = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 5000 }),
];

const replyValidator = [
  body('body').trim().notEmpty().withMessage('Reply body is required').isLength({ max: 5000 }),
];

const statusValidator = [
  body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
];

// Owner-only: must be before /:id
router.get('/admin/all',
  checkRole(['owner']),
  asyncHandler(ctrl.listAll)
);

// College Admin routes
router.post('/',
  checkRole(['collegeAdmin']),
  validateBody(ticketValidator),
  asyncHandler(ctrl.create)
);

router.get('/',
  checkRole(['collegeAdmin']),
  asyncHandler(ctrl.list)
);

router.get('/:id',
  checkRole(['collegeAdmin', 'owner']),
  asyncHandler(ctrl.getOne)
);

router.post('/:id/reply',
  checkRole(['collegeAdmin', 'owner']),
  validateBody(replyValidator),
  asyncHandler(ctrl.reply)
);

router.patch('/:id/status',
  checkRole(['owner']),
  validateBody(statusValidator),
  asyncHandler(ctrl.updateStatus)
);

export default router;
