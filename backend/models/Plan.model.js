/**
 * Plan.model.js
 *
 * Each document is one subscription plan the Owner has configured.
 * Prices are stored in both paise (for Razorpay) and INR display.
 *
 * KEY DESIGN NOTE:
 *   Subscriptions lock the price at purchase time by copying planLabel,
 *   durationMonths, and amount from the Plan at the moment of purchase.
 *   Later edits to a Plan never touch existing Subscriptions.
 */

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const PlanSchema = new Schema(
  {
    // Human-readable identifier, e.g. '1m', '6m', '1y', '5y'
    key: {
      type:      String,
      required:  [true, 'Plan key is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^[a-z0-9_-]+$/, 'Plan key may only contain lowercase letters, numbers, hyphens, underscores'],
    },

    // Display label shown to users, e.g. '1 Month', '1 Year'
    label: {
      type:      String,
      required:  [true, 'Plan label is required'],
      trim:      true,
      maxlength: [80, 'Label cannot exceed 80 characters'],
    },

    // Duration in calendar months (1, 6, 12, 60, …)
    durationMonths: {
      type:     Number,
      required: [true, 'Duration in months is required'],
      min:      [1, 'Duration must be at least 1 month'],
    },

    // Price in INR (whole rupees) — displayed to users
    priceINR: {
      type:     Number,
      required: [true, 'Price in INR is required'],
      min:      [1, 'Price must be at least ₹1'],
    },

    // Price in paise (priceINR × 100) — sent to Razorpay
    pricePaise: {
      type:     Number,
      required: [true, 'Price in paise is required'],
      min:      [100, 'Price must be at least 100 paise (₹1)'],
    },

    // Whether this plan appears to College Admins on the billing page
    isActive: {
      type:    Boolean,
      default: true,
    },

    // Highlighted in UI as "Best Value" or similar
    highlight: {
      type:    Boolean,
      default: false,
    },

    // Display order in plan picker (lower = shown first)
    sortOrder: {
      type:    Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'plans',
  }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });

// Keep pricePaise in sync with priceINR before every save
PlanSchema.pre('save', function (next) {
  this.pricePaise = Math.round(this.priceINR * 100);
  next();
});

const Plan = model('Plan', PlanSchema);
export default Plan;
