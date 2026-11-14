/**
 * College.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Root tenant document. This IS the tenant — it carries no collegeId itself.
 * Every other model references this via collegeId.
 *
 * Indexes:
 *   domain    — unique, used for tenant resolution on login/signup
 *   status    — filtered on Owner dashboard queries (active colleges only)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// ── Sub-schema: Cloudinary media asset ───────────────────────────────────────
const CloudinaryAssetSchema = new Schema(
  {
    url:       { type: String, required: true },   // secure_url from Cloudinary
    publicId:  { type: String, required: true },   // for deletion / transforms
  },
  { _id: false }
);

// ── Main Schema ───────────────────────────────────────────────────────────────
const CollegeSchema = new Schema(
  {
    name: {
      type:      String,
      required:  [true, 'College name is required'],
      trim:      true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },

    // Unique subdomain / domain slug — used for tenant identification
    // e.g.  "mit" → mit.campusconnect.io  OR  full custom domain
    domain: {
      type:      String,
      required:  [true, 'Domain slug is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^[a-z0-9-]+$/, 'Domain may only contain lowercase letters, numbers, and hyphens'],
    },

    logo: {
      type:     CloudinaryAssetSchema,
      default:  null,
    },

    coverImage: {
      type:    CloudinaryAssetSchema,
      default: null,
    },

    // Contact email for the college (not the admin user's email)
    contactEmail: {
      type:  String,
      trim:  true,
      lowercase: true,
    },

    address: {
      type:  String,
      trim:  true,
    },

    status: {
      type:    String,
      enum:    {
        values:  ['active', 'inactive', 'suspended'],
        message: 'Status must be active, inactive, or suspended',
      },
      default: 'inactive',  // Owner must explicitly activate after subscription
    },

    // Soft deactivation reason (Owner can log why suspended)
    statusReason: {
      type:    String,
      default: null,
    },

    // Cached reference to the active subscription — avoids joins on every API call.
    // Updated by the subscription service on every plan change.
    activeSubscriptionId: {
      type:    Schema.Types.ObjectId,
      ref:     'Subscription',
      default: null,
    },

    // Feature flags per tenant (future extensibility)
    features: {
      messaging:    { type: Boolean, default: true },
      jobBoard:     { type: Boolean, default: true },
      mentorship:   { type: Boolean, default: true },
      analytics:    { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,   // adds createdAt, updatedAt
    collection: 'colleges',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
CollegeSchema.index({ status: 1 });
CollegeSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

// Full logo URL shortcut
CollegeSchema.virtual('logoUrl').get(function () {
  return this.logo?.url ?? null;
});

// ── Pre-save hooks ────────────────────────────────────────────────────────────

// Normalize domain slug on every save
CollegeSchema.pre('save', function (next) {
  if (this.isModified('domain')) {
    this.domain = this.domain.toLowerCase().trim();
  }
  next();
});

// ── Model export ─────────────────────────────────────────────────────────────
const College = model('College', CollegeSchema);
export default College;
