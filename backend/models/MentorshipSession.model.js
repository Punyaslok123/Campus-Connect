/**
 * MentorshipSession.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Alumni-hosted mentorship sessions. Each session has a meeting link
 * (Zoom, Google Meet, Teams, etc.) and can target a specific department
 * or be available college-wide.
 *
 * Participants register via the UI — tracked in the attendees array
 * (capped to maxAttendees to prevent overloading).
 *
 * Indexes:
 *   { collegeId, scheduledAt }            — upcoming sessions feed
 *   { collegeId, hostId }                 — alumni's sessions
 *   { collegeId, departmentId, status }   — dept sessions page
 *   { collegeId, status, scheduledAt }    — active upcoming sessions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Registered attendee sub-document
const AttendeeSchema = new Schema(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MentorshipSessionSchema = new Schema(
  {
    // ── Tenant ────────────────────────────────────────────────────────────────
    collegeId: {
      type:     Schema.Types.ObjectId,
      ref:      'College',
      required: [true, 'collegeId is required'],
    },

    // ── Targeting ─────────────────────────────────────────────────────────────
    // null = open to all college students; ObjectId = one department only
    departmentId: {
      type:    Schema.Types.ObjectId,
      ref:     'Department',
      default: null,
    },

    // ── Host ──────────────────────────────────────────────────────────────────
    hostId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',   // must be role: 'alumni'
      required: [true, 'hostId is required'],
    },

    // ── Session Content ───────────────────────────────────────────────────────
    title: {
      type:      String,
      required:  [true, 'Session title is required'],
      trim:      true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
      default:   null,
    },

    // Topics covered — displayed as chips on session card
    topics: {
      type:    [String],
      default: [],
    },

    // ── Meeting ───────────────────────────────────────────────────────────────
    // Full URL — Zoom, Meet, Teams, etc.
    meetingLink: {
      type:     String,
      required: [true, 'meetingLink is required'],
      trim:     true,
    },

    meetingPlatform: {
      type:    String,
      enum:    ['zoom', 'google_meet', 'ms_teams', 'webex', 'other'],
      default: 'other',
    },

    // Meeting passcode if required (stored, shown to registered attendees only)
    meetingPasscode: {
      type:    String,
      select:  false,   // not exposed unless explicitly selected
      default: null,
    },

    // ── Schedule ──────────────────────────────────────────────────────────────
    scheduledAt: {
      type:     Date,
      required: [true, 'scheduledAt is required'],
    },

    durationMinutes: {
      type:    Number,
      default: 60,
      min:     15,
      max:     480,
    },

    // ── Capacity ──────────────────────────────────────────────────────────────
    maxAttendees: {
      type:    Number,
      default: 50,
      min:     1,
    },

    attendees: {
      type:    [AttendeeSchema],
      default: [],
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
    },

    // Recording link (alumni can add post-session)
    recordingLink: {
      type:    String,
      trim:    true,
      default: null,
    },

    // Alumni notes / resources shared post-session
    sessionNotes: {
      type:    String,
      trim:    true,
      default: null,
    },

    cancelledAt:     { type: Date,   default: null },
    cancellationNote:{ type: String, default: null },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, select: false },
    deletedAt:  { type: Date,                  default: null, select: false },
    deletedBy:  { type: Schema.Types.ObjectId, default: null, select: false },
  },
  {
    timestamps: true,
    collection: 'mentorship_sessions',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Upcoming sessions feed — most common student query
MentorshipSessionSchema.index({ collegeId: 1, scheduledAt: 1, status: 1 });

// Alumni's hosted sessions list
MentorshipSessionSchema.index({ hostId: 1, collegeId: 1, scheduledAt: -1 });

// Department-targeted sessions
MentorshipSessionSchema.index({ collegeId: 1, departmentId: 1, status: 1, scheduledAt: 1 });

// Active sessions only
MentorshipSessionSchema.index({ collegeId: 1, status: 1, scheduledAt: 1 });

// Attendee lookup — "is this user registered for this session?"
MentorshipSessionSchema.index({ 'attendees.userId': 1 });

// ── Pre-save Hooks ────────────────────────────────────────────────────────────

// Auto-complete past sessions
MentorshipSessionSchema.pre('save', function (next) {
  if (this.status === 'scheduled' && this.scheduledAt) {
    const sessionEnd = new Date(this.scheduledAt);
    sessionEnd.setMinutes(sessionEnd.getMinutes() + (this.durationMinutes || 60));
    if (sessionEnd < new Date()) {
      this.status = 'completed';
    }
  }
  next();
});

// Normalize topics
MentorshipSessionSchema.pre('save', function (next) {
  if (this.isModified('topics')) {
    this.topics = [...new Set(this.topics.map(t => t.trim()).filter(Boolean))];
  }
  next();
});

// Exclude deleted
MentorshipSessionSchema.pre(/^find/, function (next) {
  if (!this.getOptions().withDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Virtuals ──────────────────────────────────────────────────────────────────

MentorshipSessionSchema.virtual('attendeeCount').get(function () {
  return this.attendees?.length ?? 0;
});

MentorshipSessionSchema.virtual('spotsRemaining').get(function () {
  return Math.max(0, this.maxAttendees - (this.attendees?.length ?? 0));
});

MentorshipSessionSchema.virtual('isFull').get(function () {
  return (this.attendees?.length ?? 0) >= this.maxAttendees;
});

MentorshipSessionSchema.virtual('isUpcoming').get(function () {
  return this.scheduledAt > new Date() && this.status === 'scheduled';
});

MentorshipSessionSchema.virtual('endsAt').get(function () {
  if (!this.scheduledAt) return null;
  const end = new Date(this.scheduledAt);
  end.setMinutes(end.getMinutes() + this.durationMinutes);
  return end;
});

// ── Instance Methods ──────────────────────────────────────────────────────────

// Register a student for the session
MentorshipSessionSchema.methods.registerAttendee = async function (userId) {
  const alreadyRegistered = this.attendees.some(
    a => a.userId.toString() === userId.toString()
  );
  if (alreadyRegistered) throw new Error('Already registered for this session');
  if (this.isFull)       throw new Error('Session is full');
  if (!this.isUpcoming)  throw new Error('Session is not available for registration');

  this.attendees.push({ userId, registeredAt: new Date() });
  return this.save();
};

// Remove a student from the session
MentorshipSessionSchema.methods.unregisterAttendee = async function (userId) {
  this.attendees = this.attendees.filter(
    a => a.userId.toString() !== userId.toString()
  );
  return this.save();
};

MentorshipSessionSchema.methods.softDelete = async function (deletedByUserId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedByUserId;
  this.status    = 'cancelled';
  return this.save();
};

// ── Model export ─────────────────────────────────────────────────────────────
const MentorshipSession = model('MentorshipSession', MentorshipSessionSchema);
export default MentorshipSession;
