import { body, query, param } from 'express-validator';

export const uploadNoteValidator = [
  body('title')
    .trim().notEmpty().withMessage('Note title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('subject')
    .trim().notEmpty().withMessage('Subject is required')
    .isLength({ max: 120 }).withMessage('Subject cannot exceed 120 characters'),

  body('subjectCode')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }).withMessage('Subject code cannot exceed 20 characters'),

  body('semester')
    .notEmpty().withMessage('Semester is required')
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8')
    .toInt(),

  body('departmentId')
    .optional()
    .isMongoId().withMessage('Invalid department ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('tags')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); }
        catch { return value.split(',').map(t => t.trim()); }
      }
      return value;
    })
    .isArray().withMessage('Tags must be an array'),

  body('units')
    .optional()
    .customSanitizer(value => {
      if (typeof value === 'string') {
        try { return JSON.parse(value); }
        catch { return value.split(',').map(u => u.trim()); }
      }
      return value;
    })
    .isArray().withMessage('Units must be an array'),
];

export const listNotesValidator = [
  query('departmentId').optional().isMongoId().withMessage('Invalid department ID'),
  query('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be 1-8').toInt(),
  query('subject').optional().trim().isLength({ max: 120 }),
  query('subjectCode').optional().trim().isLength({ max: 20 }),
  query('uploaderRole').optional().isIn(['student', 'faculty', 'deptAdmin']).withMessage('Invalid uploaderRole'),
  query('search').optional().trim().isLength({ max: 200 }),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100').toInt(),
];

export const noteIdParamValidator = [
  param('id').isMongoId().withMessage('Invalid note ID'),
];

export const deleteNoteValidator = [
  param('id').isMongoId().withMessage('Invalid note ID'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Deletion reason cannot exceed 500 characters'),
];
