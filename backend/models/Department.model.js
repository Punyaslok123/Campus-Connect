/**
 * Department.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Represents an academic department within a college tenant.
 * A College can have many Departments. Each Department has one adminUser
 * (a User with role: 'deptAdmin').
 *
 * Cascade consideration:
 *   Deleting a Department should soft-delete or re-assign all Users,
 *   Notes, Events scoped to it — handled in DepartmentService, NOT here.
 *
 * Indexes:
 *   { collegeId, name }       — unique dept name per college (no duplicates)
 *   { collegeId }             — list all departments for a college
 *   { collegeId, isActive }   — active departments filter
 *   { adminUserId }           — reverse lookup: which dept does this admin manage
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const DepartmentSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Department name is required'],
      trim:      true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },

    // Short code e.g. "CSE", "ECE", "MECH"
    code: {
      type:      String,
      trim:      true,
      uppercase: true,
      maxlength: 10,
      default:   null,
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: 500,
      default:   null,
    },

    // ── Admin ─────────────────────────────────────────────────────────────────
    // User with role: 'deptAdmin' assigned to manage this department
    adminUserId: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      // nullable: dept can exist without an admin temporarily
    },

    // History of previous HODs — accounts are preserved, not deleted
    previousAdmins: {
      type: [{
        userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
        removedAt:  { type: Date, default: Date.now },
        removedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
        reason:     { type: String, enum: ['reassigned', 'removed'], default: 'removed' },
      }],
      default: [],
    },

    // ── Stats (cached counters — updated by background jobs / service layer) ──
    // Avoids expensive COUNT queries on every dashboard load
    memberCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    isActive: {
      type:    Boolean,
      default: true,
    },

    // Soft-delete support
    isDeleted: {
      type:    Boolean,
      default: false,
      select:  false,   // excluded from default queries
    },

    deletedAt: {
      type:    Date,
      default: null,
      select:  false,
    },

    deletedBy: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      select:  false,
    },
  },
  {
    timestamps: true,
    collection: 'departments',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Unique department name per college — only among non-deleted docs
DepartmentSchema.index(
  { collegeId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// List all departments in a college
DepartmentSchema.index({ collegeId: 1 });

// Active departments only
DepartmentSchema.index({ collegeId: 1, isActive: 1 });

// Which department does this admin manage?
DepartmentSchema.index({ adminUserId: 1 });

// Soft-delete filter (most queries should exclude deleted)
DepartmentSchema.index({ collegeId: 1, isDeleted: 1 });

// ── Default Query Filter ──────────────────────────────────────────────────────
// Automatically exclude soft-deleted documents from all queries
// Opt-out with .find().setOptions({ withDeleted: true })
DepartmentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

DepartmentSchema.virtual('displayName').get(function () {
  return this.code ? `${this.name} (${this.code})` : this.name;
});

// ── Instance Methods ──────────────────────────────────────────────────────────

// Soft-delete — call this instead of .remove()
DepartmentSchema.methods.softDelete = async function (deletedByUserId) {
  this.isDeleted  = true;
  this.deletedAt  = new Date();
  this.deletedBy  = deletedByUserId;
  this.isActive   = false;
  return this.save();
};

// ── Model export ─────────────────────────────────────────────────────────────
const Department = model('Department', DepartmentSchema);
export default Department;
