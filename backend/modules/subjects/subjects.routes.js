import { Router }         from 'express';
import { body, query, param } from 'express-validator';
import { asyncHandler }   from '../../utils/asyncHandler.js';
import authenticate       from '../../middlewares/authenticate.js';
import checkRole          from '../../middlewares/checkRole.js';
import checkSubscription  from '../../middlewares/checkSubscription.js';
import validateBody       from '../../middlewares/validateBody.js';
import * as ctrl          from './subjects.controller.js';

const router = Router();
router.use(authenticate);
router.use(checkSubscription);

const subjectValidator = [
  body('name').trim().notEmpty().withMessage('Subject name is required').isLength({ max: 120 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('semester').notEmpty().isInt({ min: 1, max: 8 }).withMessage('Semester 1-8 required').toInt(),
  body('departmentId').notEmpty().isMongoId().withMessage('Valid departmentId required'),
];

// GET  /api/subjects?departmentId=&semester= — all authenticated roles can list subjects
router.get('/', checkRole(['student', 'faculty', 'deptAdmin', 'collegeAdmin']),
  validateBody([
    query('departmentId').optional().isMongoId(),
    query('semester').optional().isInt({ min: 1, max: 8 }).toInt(),
  ]),
  asyncHandler(ctrl.listSubjects)
);

// POST /api/subjects — deptAdmin creates subject
router.post('/',
  checkRole(['deptAdmin']),
  validateBody(subjectValidator),
  asyncHandler(ctrl.createSubject)
);

// DELETE /api/subjects/:id — deptAdmin removes subject
router.delete('/:id',
  checkRole(['deptAdmin']),
  validateBody([param('id').isMongoId()]),
  asyncHandler(ctrl.deleteSubject)
);

// PATCH /api/subjects/my-subjects — faculty updates own subjects
// MUST be defined BEFORE /:facultyId/assign to avoid route collision
router.patch('/my-subjects',
  checkRole(['faculty']),
  validateBody([
    body('subjects').isArray().withMessage('subjects must be an array'),
    body('subjects.*.name').if(body('subjects').isArray({ min: 1 })).notEmpty().trim(),
    body('subjects.*.semester').if(body('subjects').isArray({ min: 1 }))
      .custom(v => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 8) throw new Error('Semester must be 1–8');
        return true;
      }),
  ]),
  asyncHandler(ctrl.updateMySubjects)
);

// PATCH /api/subjects/faculty/:facultyId/assign — deptAdmin assigns subjects to faculty
router.patch('/faculty/:facultyId/assign',
  checkRole(['deptAdmin']),
  validateBody([
    param('facultyId').isMongoId(),
    body('subjects').isArray().withMessage('subjects must be an array'),
    body('subjects.*.name').if(body('subjects').isArray({ min: 1 })).notEmpty().trim(),
    body('subjects.*.semester').if(body('subjects').isArray({ min: 1 }))
      .custom(v => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 8) throw new Error('Semester must be 1–8');
        return true;
      }),
  ]),
  asyncHandler(ctrl.assignToFaculty)
);

export default router;
