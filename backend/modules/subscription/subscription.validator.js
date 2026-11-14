/**
 * modules/subscription/subscription.validator.js
 *
 * planType is validated dynamically against the Plan collection at the
 * service layer, so we only do a basic non-empty check here.
 */

import { body } from 'express-validator';

export const createOrderValidator = [
  body('planType')
    .trim()
    .notEmpty().withMessage('Plan type is required'),
];

export const verifyPaymentValidator = [
  body('razorpayOrderId')
    .trim()
    .notEmpty().withMessage('Razorpay order ID is required'),

  body('razorpayPaymentId')
    .trim()
    .notEmpty().withMessage('Razorpay payment ID is required'),

  body('razorpaySignature')
    .trim()
    .notEmpty().withMessage('Razorpay signature is required'),

  body('planType')
    .trim()
    .notEmpty().withMessage('Plan type is required'),
];

export const createPlanValidator = [
  body('key')
    .trim()
    .notEmpty().withMessage('Plan key is required')
    .matches(/^[a-z0-9_-]+$/).withMessage('Key may only contain lowercase letters, numbers, hyphens, underscores'),

  body('label')
    .trim()
    .notEmpty().withMessage('Plan label is required')
    .isLength({ max: 80 }).withMessage('Label cannot exceed 80 characters'),

  body('durationMonths')
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),

  body('priceINR')
    .isInt({ min: 1 }).withMessage('Price must be at least ₹1'),
];

export const updatePlanValidator = [
  body('label')
    .optional().trim()
    .notEmpty().withMessage('Label cannot be empty')
    .isLength({ max: 80 }).withMessage('Label cannot exceed 80 characters'),

  body('durationMonths')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),

  body('priceINR')
    .optional()
    .isInt({ min: 1 }).withMessage('Price must be at least ₹1'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('highlight')
    .optional()
    .isBoolean().withMessage('highlight must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer'),
];
