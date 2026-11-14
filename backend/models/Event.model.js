/**
 * Event.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers both college-wide events (organizerType: 'college') and department
 * events (organizerType: 'department'). The organizerId references either
 * a College or a Department depending on organizerType.
 *
 * Design decision: departmentId is denormalized even when organizerType is
 * 'department' so queries can always filter by departmentId without a join.
 *
 * Indexes:
 *   { collegeId, scheduledAt }          — upcoming events feed
 *   { collegeId, organizerType }        — filter college vs dept events
 *   { collegeId, departmentId }         — department events page
 *   { collegeId, status, scheduledAt }  — active future events
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const CloudinaryAssetSchema = new Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const EventSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Content ───────────────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  [true, 'Event title is required'],
      trim:      true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type:      String,
      required:  [true, 'Event description is required'],
      trim:      true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    coverImage: {
      type:    CloudinaryAssetSchema,
      default: null,
    },

    // ── Organizer (polymorphic) ───────────────────────────────────────────────
    organizerType: {
      type:     String,
      enum:     {
        values:  ['college', 'department'],
        message: 'organizerType must be college or department',
      },
      required: [true, 'organizerType is required'],
    },

    // References College._id (when college) or Department._id (when department)
    organizerId: {
      type:     Schema.Types.ObjectId,
      required: [true, 'organizerId is required'],
      refPath:  'organizerModel',   // dynamic ref
    },

    // Mongoose dynamic population helper — derived from organizerType
    organizerModel: {
      type:    String,
      enum:    ['College', 'Department'],
      default: null,
    },

    // Denormalized for efficient filtering (null when organizerType is 'college')
    departmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Department',
      default: null,
    },

    // Who posted this event (CollegeAdmin or DeptAdmin)
    createdBy: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'createdBy is required'],
    },

    // ── Schedule ──────────────────────────────────────────────────────────────
    scheduledAt: {
      type:    Date,
      default: null,
    },

    endsAt: {
      type:    Date,
      default: null,
    },

    venue: {
      type:    String,
      trim:    true,
      default: null,
    },

    // Virtual / online event link
    meetingLink: {
      type:    String,
      trim:    true,
      default: null,
    },

    isOnline: {
      type:    Boolean,
      default: false,
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['draft', 'published', 'cancelled', 'completed'],
      default: 'published',
    },

    // ── Engagement (cached counters) ──────────────────────────────────────────
    viewCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ── Soft delete ───────────────────────────────────────────────────────────
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
    collection: 'events',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Upcoming events feed — most common query
EventSchema.index({ collegeId: 1, scheduledAt: 1 });

// Filter by organizer type
EventSchema.index({ collegeId: 1, organizerType: 1, scheduledAt: 1 });

// Department events page
EventSchema.index({ collegeId: 1, departmentId: 1, scheduledAt: 1 });

// Active published events
EventSchema.index({ collegeId: 1, status: 1, scheduledAt: 1 });

// Created by (admin's own events list)
EventSchema.index({ createdBy: 1, collegeId: 1 });

// ── Pre-save Hooks ────────────────────────────────────────────────────────────

// Sync organizerModel from organizerType for dynamic populate
EventSchema.pre('save', function (next) {
  this.organizerModel = this.organizerType === 'college' ? 'College' : 'Department';

  // If department event, departmentId must equal organizerId
  if (this.organizerType === 'department' && !this.departmentId) {
    this.departmentId = this.organizerId;
  }

  next();
});

// Exclude deleted documents from default queries
EventSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

EventSchema.virtual('isUpcoming').get(function () {
  return this.scheduledAt && this.scheduledAt > new Date();
});

EventSchema.virtual('isPast').get(function () {
  return this.endsAt ? this.endsAt < new Date() : this.scheduledAt < new Date();
});

EventSchema.virtual('coverImageUrl').get(function () {
  return this.coverImage?.url ?? null;
});

// ── Instance Methods ──────────────────────────────────────────────────────────
EventSchema.methods.softDelete = async function (deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  this.status    = 'cancelled';
  return this.save();
};

// ── Model export ─────────────────────────────────────────────────────────────
const Event = model('Event', EventSchema);
export default Event;
