/**
 * Note.model.js
 * Unified notes for both students and faculty.
 * Files stored on Cloudinary (PDF/DOCX/PPT/TXT).
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CloudinaryAssetSchema = new Schema(
  {
    url:         { type: String, required: true },
    publicId:    { type: String, required: true },
    format:      { type: String, default: null },
    bytes:       { type: Number, default: null },
    pages:       { type: Number, default: null },
    resourceType:{ type: String, default: 'raw' }, // 'raw' | 'image' | 'auto'
    originalName:{ type: String, default: null },  // original filename for download
    mimetype:    { type: String, default: null },  // stored for correct Content-Type on download
  },
  { _id: false }
);

const NoteSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    departmentId: {
      type:     Schema.Types.ObjectId,
      ref:      'Department',
      required: [true, 'departmentId is required'],
    },

    // ── Subject linkage ───────────────────────────────────────────────────────
    subject: {
      type:      String,
      required:  [true, 'Subject name is required'],
      trim:      true,
      maxlength: 120,
    },

    subjectCode: {
      type:    String,
      trim:    true,
      default: null,
      maxlength: 20,
    },

    semester: {
      type:     Number,
      required: [true, 'Semester is required'],
      min:      1,
      max:      8,
    },

    // ── Content ───────────────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  [true, 'Note title is required'],
      trim:      true,
      maxlength: 200,
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: 1000,
      default:   null,
    },

    // Faculty-specific: list of units/topics covered
    units: {
      type:    [String],
      default: [],
    },

    tags: {
      type:    [String],
      default: [],
    },

    // ── Files ─────────────────────────────────────────────────────────────────
    fileUrl: {
      type:     CloudinaryAssetSchema,
      required: [true, 'File is required'],
    },

    coverImage: {
      type:    CloudinaryAssetSchema,
      default: null,
    },

    // ── Author ────────────────────────────────────────────────────────────────
    uploadedBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'uploadedBy is required'],
    },

    // 'student' | 'faculty' | 'deptAdmin' — used for type-based filtering
    uploaderRole: {
      type:    String,
      enum:    ['student', 'faculty', 'deptAdmin'],
      default: 'student',
    },

    // ── Engagement ────────────────────────────────────────────────────────────
    downloadCount: { type: Number, default: 0, min: 0 },
    viewCount:     { type: Number, default: 0, min: 0 },

    // ── Moderation / Soft-delete ──────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date,    default: null  },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletionReason: { type: String, trim: true, default: null },

    // ── Approval ──────────────────────────────────────────────────────────────
    isApproved:  { type: Boolean, default: true },
    approvedBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:  { type: Date, default: null },
  },
  { timestamps: true, collection: 'notes' }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
NoteSchema.index({ collegeId: 1, departmentId: 1, semester: 1 });
NoteSchema.index({ collegeId: 1, departmentId: 1, isDeleted: 1 });
NoteSchema.index({ collegeId: 1, departmentId: 1, uploaderRole: 1 });
NoteSchema.index({ uploadedBy: 1, collegeId: 1 });
NoteSchema.index({ collegeId: 1, subject: 1 });
NoteSchema.index({ collegeId: 1, subjectCode: 1 });
NoteSchema.index(
  { title: 'text', subject: 'text', subjectCode: 'text', description: 'text', tags: 'text' },
  { weights: { title: 10, subject: 8, subjectCode: 6, tags: 5, description: 3 }, name: 'notes_text_search' }
);

// ── Default query: exclude deleted notes ──────────────────────────────────────
NoteSchema.pre(/^find/, function (next) {
  if (this.getFilter().isDeleted === undefined && !this.getOptions().showDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// ── Normalize tags + units ────────────────────────────────────────────────────
NoteSchema.pre('save', function (next) {
  if (this.isModified('tags')) {
    this.tags = [...new Set(this.tags.map(t => t.toLowerCase().trim()).filter(Boolean))];
  }
  if (this.isModified('units')) {
    this.units = this.units.map(u => u.trim()).filter(Boolean);
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────
NoteSchema.virtual('fileDownloadUrl').get(function () { return this.fileUrl?.url ?? null; });
NoteSchema.virtual('fileSizeKB').get(function () {
  if (!this.fileUrl?.bytes) return null;
  return Math.round(this.fileUrl.bytes / 1024);
});

// ── Instance Methods ──────────────────────────────────────────────────────────
NoteSchema.methods.softDelete = async function (deletedByUserId, reason = null) {
  this.isDeleted      = true;
  this.deletedAt      = new Date();
  this.deletedBy      = deletedByUserId;
  this.deletionReason = reason;
  return this.save();
};

NoteSchema.methods.incrementDownload = function () {
  return this.constructor.findByIdAndUpdate(
    this._id, { $inc: { downloadCount: 1 } }, { new: true }
  );
};

const Note = model('Note', NoteSchema);
export default Note;
