/**
 * User.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified user document for all 6 roles. Role-specific data (graduation year,
 * faculty designation, etc.) lives in sparse optional fields to avoid separate
 * collections while keeping the schema clean.
 *
 * SECURITY NOTES:
 *   - passwordHash is never returned in API responses (select: false)
 *   - refreshToken is stored hashed, also excluded from default selects
 *   - email is unique PER college (two colleges can have same email address)
 *
 * Indexes:
 *   { email, collegeId }    — compound unique: tenant-scoped login
 *   { collegeId, role }     — scoped role lookups (list all students of a college)
 *   { collegeId, departmentId } — department member queries
 *   { collegeId, isVerified }   — pending verification queue
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose  from 'mongoose';
import bcrypt    from 'bcryptjs';

const { Schema, model } = mongoose;

const ROLES = ['owner', 'collegeAdmin', 'deptAdmin', 'student', 'faculty', 'alumni'];

// ── Sub-schema: Cloudinary profile image ─────────────────────────────────────
const CloudinaryAssetSchema = new Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

// ── Main Schema ───────────────────────────────────────────────────────────────
const UserSchema = new Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    firstName: {
      type:      String,
      required:  [true, 'First name is required'],
      trim:      true,
      maxlength: 50,
    },

    lastName: {
      type:      String,
      required:  [true, 'Last name is required'],
      trim:      true,
      maxlength: 50,
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },

    // Never returned in queries — must use .select('+passwordHash') explicitly
    passwordHash: {
      type:     String,
      required: [true, 'Password is required'],
      select:   false,
    },

    // ── Role & Tenant ─────────────────────────────────────────────────────────
    role: {
      type:     String,
      enum:     { values: ROLES, message: 'Invalid role' },
      required: [true, 'Role is required'],
    },

    // Null ONLY for the Owner (SaaS super-admin) who is cross-tenant
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      default:  null,
      // Required for all non-owner roles — enforced in pre-save hook
    },

    // Null for roles not scoped to a department (Owner, CollegeAdmin, Alumni)
    departmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Department',
      default: null,
    },

    // ── Profile ───────────────────────────────────────────────────────────────
    profileImage: {
      type:    CloudinaryAssetSchema,
      default: null,
    },

    phone: {
      type:    String,
      trim:    true,
      default: null,
    },

    bio: {
      type:      String,
      maxlength: 500,
      default:   null,
    },

    // ── Verification & Status ─────────────────────────────────────────────────
    isVerified: {
      type:    Boolean,
      default: false,
      // Students/Faculty/Alumni are false until Dept Admin approves
      // CollegeAdmin is true after subscription activation
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    // ── Auth Tokens ───────────────────────────────────────────────────────────
    // Stored as hash — rotated on every refresh
    refreshToken: {
      type:   String,
      select: false,
      default: null,
    },

    // For email verification and password reset flows
    emailVerificationToken:   { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date,   select: false, default: null },
    passwordResetToken:       { type: String, select: false, default: null },
    passwordResetExpires:     { type: Date,   select: false, default: null },

    lastLoginAt: {
      type:    Date,
      default: null,
    },

    // ── Role-specific optional fields (sparse — only populated when relevant) ─

    // Student fields
    semester: {
      type: Number,
      min:  1,
      max:  8,
      default: null,
    },

    rollNumber: {
      type:    String,
      trim:    true,
      default: null,
    },

    // Alumni fields
    graduationYear: {
      type:    Number,
      min:     1950,
      max:     new Date().getFullYear() + 5,
      default: null,
    },

    currentCompany: {
      type:    String,
      trim:    true,
      default: null,
    },

    currentRole: {
      type:    String,
      trim:    true,
      default: null,
    },

    linkedInUrl: {
      type:    String,
      trim:    true,
      default: null,
    },

    // Faculty fields
    designation: {
      type:    String,
      trim:    true,
      default: null,
    },

    // Faculty assigned subjects — array of { name, code, semester }
    assignedSubjects: {
      type:    [{
        name:     { type: String, trim: true, required: true },
        code:     { type: String, trim: true, default: null },
        semester: { type: Number, min: 1, max: 8, required: true },
        _id:      false,
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary lookup — tenant-scoped unique email
UserSchema.index({ email: 1, collegeId: 1 }, { unique: true });

// Role-based queries within a college
UserSchema.index({ collegeId: 1, role: 1 });

// Department member queries
UserSchema.index({ collegeId: 1, departmentId: 1 });

// Pending verification queue (Dept Admin dashboard)
UserSchema.index({ collegeId: 1, isVerified: 1, role: 1 });

// Active users filter
UserSchema.index({ collegeId: 1, isActive: 1 });

// Owner cross-tenant queries (no collegeId filter)
UserSchema.index({ role: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual('avatarUrl').get(function () {
  return this.profileImage?.url ?? null;
});

// ── Pre-save Hooks ────────────────────────────────────────────────────────────

// 1. Hash password on create or modification
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// 2. Enforce collegeId requirement for all non-owner roles
UserSchema.pre('save', function (next) {
  if (this.role !== 'owner' && !this.collegeId) {
    return next(new Error(`collegeId is required for role: ${this.role}`));
  }
  next();
});

// 3. Enforce departmentId for dept-scoped roles
UserSchema.pre('save', function (next) {
  const deptRoles = ['deptAdmin', 'student', 'faculty'];
  if (deptRoles.includes(this.role) && !this.departmentId) {
    return next(new Error(`departmentId is required for role: ${this.role}`));
  }
  next();
});

// ── Instance Methods ──────────────────────────────────────────────────────────

// Compare plain password against stored hash
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Safe object for API responses — strips all sensitive fields
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ── Model export ─────────────────────────────────────────────────────────────
const User = model('User', UserSchema);
export default User;
