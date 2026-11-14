/**
 * Job.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Alumni-posted job and internship listings scoped to a college tenant.
 * Optionally targeted to a specific department, or broadcast college-wide.
 *
 * Indexes:
 *   { collegeId, type, deadline }          — active jobs/internships feed
 *   { collegeId, departmentId, deadline }  — dept-specific opportunities
 *   { postedBy }                           — alumni's own postings
 *   { collegeId, status, deadline }        — active listings filter
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const JobSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Targeting ─────────────────────────────────────────────────────────────
    // null = college-wide visibility; ObjectId = targeted to one department
    departmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Department',
      default: null,
    },

    // ── Author ────────────────────────────────────────────────────────────────
    postedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',   // must be role: 'alumni'
      required: [true, 'postedBy is required'],
    },

    // ── Listing Content ───────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  [true, 'Job title is required'],
      trim:      true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type:      String,
      required:  [true, 'Description is required'],
      trim:      true,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },

    company: {
      type:      String,
      required:  [true, 'Company name is required'],
      trim:      true,
      maxlength: 150,
    },

    companyLogoUrl: {
      type:    String,
      default: null,
    },

    type: {
      type:     String,
      enum:     {
        values:  ['job', 'internship'],
        message: 'Type must be job or internship',
      },
      required: [true, 'Type is required'],
    },

    // ── Role Details ──────────────────────────────────────────────────────────
    location: {
      type:    String,
      trim:    true,
      default: null,
    },

    isRemote: {
      type:    Boolean,
      default: false,
    },

    // Salary / stipend range
    salaryRange: {
      min:      { type: Number, default: null },
      max:      { type: Number, default: null },
      currency: { type: String, default: 'INR', uppercase: true },
      period:   {
        type:    String,
        enum:    ['monthly', 'annually', 'fixed'],
        default: 'monthly',
      },
    },

    // Skills/qualifications required
    skills: {
      type:    [String],
      default: [],
    },

    // External application / redirect link
    applyLink: {
      type:    String,
      trim:    true,
      default: null,
    },

    // ── Internship-specific ───────────────────────────────────────────────────
    duration: {
      type:    String,  // e.g. "3 months", "6 months"
      trim:    true,
      default: null,
    },

    // ── Deadline & Status ─────────────────────────────────────────────────────
    deadline: {
      type:    Date,
      default: null,
    },

    status: {
      type:    String,
      enum:    ['active', 'closed', 'draft'],
      default: 'active',
    },

    // ── Engagement ────────────────────────────────────────────────────────────
    viewCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    isDeleted: {
      type:    Boolean,
      default: false,
      select:  false,
    },

    deletedAt:  { type: Date,                  default: null, select: false },
    deletedBy:  { type: Schema.Types.ObjectId, default: null, select: false },
  },
  {
    timestamps: true,
    collection: 'jobs',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Active listings feed — student home page
JobSchema.index({ collegeId: 1, type: 1, status: 1, deadline: 1 });

// Department-targeted listings
JobSchema.index({ collegeId: 1, departmentId: 1, status: 1, deadline: 1 });

// Alumni's own postings
JobSchema.index({ postedBy: 1, collegeId: 1, createdAt: -1 });

// College-wide active jobs board
JobSchema.index({ collegeId: 1, status: 1, createdAt: -1 });

// Expiry cron job: find past-deadline active listings
JobSchema.index({ status: 1, deadline: 1 });

// Text search
JobSchema.index(
  { title: 'text', description: 'text', company: 'text', skills: 'text' },
  { weights: { title: 10, company: 7, skills: 5, description: 2 }, name: 'jobs_text_search' }
);

// ── Pre-save Hooks ────────────────────────────────────────────────────────────

// Normalize skills
JobSchema.pre('save', function (next) {
  if (this.isModified('skills')) {
    this.skills = [...new Set(this.skills.map(s => s.trim()).filter(Boolean))];
  }
  next();
});

// Auto-close past deadline listings
JobSchema.pre('save', function (next) {
  if (this.deadline && this.deadline < new Date() && this.status === 'active') {
    this.status = 'closed';
  }
  next();
});

// Exclude deleted
JobSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

JobSchema.virtual('isExpired').get(function () {
  return this.deadline ? this.deadline < new Date() : false;
});

JobSchema.virtual('daysUntilDeadline').get(function () {
  if (!this.deadline) return null;
  const diff = this.deadline - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ── Instance Methods ──────────────────────────────────────────────────────────

JobSchema.methods.softDelete = async function (deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  this.status    = 'closed';
  return this.save();
};

// ── Model export ─────────────────────────────────────────────────────────────
const Job = model('Job', JobSchema);
export default Job;
