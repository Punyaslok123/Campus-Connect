/**
 * modules/auth/auth.validator.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { body } from 'express-validator';

export const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('collegeDomain')
    .trim()
    .notEmpty().withMessage('College domain is required to identify your institution')
    .matches(/^[a-z0-9-]+$/).withMessage('Invalid college domain format'),

  body('role')
    .optional()
    .isIn(['student', 'faculty', 'alumni'])
    .withMessage('Self-registration is only allowed for student, faculty, or alumni roles'),

  body('semester')
    .optional()
    .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),

  body('departmentId')
    .notEmpty().withMessage('Department is required')
    .isMongoId().withMessage('Invalid department ID'),

  body('rollNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Roll number cannot exceed 30 characters'),
];

export const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  body('collegeDomain')
    .trim()
    .notEmpty().withMessage('College domain is required'),
];

export const registerCollegeValidator = [
  body('collegeName')
    .trim().notEmpty().withMessage('College name is required')
    .isLength({ max: 150 }).withMessage('College name cannot exceed 150 characters'),

  body('collegeDomain')
    .trim().notEmpty().withMessage('College domain is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Domain may only contain lowercase letters, numbers, and hyphens')
    .isLength({ max: 63 }).withMessage('Domain too long'),

  body('contactEmail')
    .optional({ checkFalsy: true })
    .trim().isEmail().withMessage('Must be a valid contact email').normalizeEmail(),

  body('address')
    .optional({ checkFalsy: true })
    .trim().isLength({ max: 300 }).withMessage('Address too long'),

  body('adminFirstName')
    .trim().notEmpty().withMessage('Admin first name is required')
    .isLength({ max: 50 }),

  body('adminLastName')
    .trim().notEmpty().withMessage('Admin last name is required')
    .isLength({ max: 50 }),

  body('adminEmail')
    .trim().notEmpty().withMessage('Admin email is required')
    .isEmail().withMessage('Must be a valid email address').normalizeEmail(),

  body('adminPassword')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];

export const ownerLoginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

export const refreshValidator = [
  // No body validation — refresh token comes from httpOnly cookie
  // We just ensure the cookie exists in the service layer
];

export const forgotPasswordValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('Valid email address is required')
    .normalizeEmail(),

  body('collegeDomain')
    .trim()
    .notEmpty().withMessage('College domain is required'),
];

export const resetPasswordValidator = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),

  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];
