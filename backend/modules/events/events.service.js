import mongoose                           from 'mongoose';
import { Event, AuditLog, AUDIT_ACTIONS } from '../../models/index.js';
import { NotFoundError }                  from '../../utils/AppError.js';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../../utils/cloudinaryUpload.js';

export const createEvent = async ({
  title, description, scheduledAt, endsAt, venue, meetingLink,
  isOnline, collegeId, departmentId, organizerType, organizerId,
  createdBy, coverImageBuffer, ipAddress,
}) => {
  let coverImage = null;
  if (coverImageBuffer) {
    const uploaded = await uploadToCloudinary(coverImageBuffer, {
      folder:        `campus-connect/${collegeId}/events`,
      resource_type: 'image',
    });
    coverImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  const event = await Event.create({
    title, description,
    scheduledAt:   scheduledAt   || null,
    endsAt:        endsAt        || null,
    venue:         venue         || null,
    meetingLink:   meetingLink   || null,
    isOnline:      isOnline      ?? false,
    collegeId,
    departmentId:  departmentId  || null,
    organizerType: organizerType || 'college',
    organizerId:   organizerId   || collegeId,
    createdBy,
    status: 'published',
    coverImage,
  });

  await AuditLog.record({
    action:          AUDIT_ACTIONS.COLLEGE_UPDATED,
    collegeId,
    performedBy:     createdBy,
    performedByRole: organizerType === 'department' ? 'deptAdmin' : 'collegeAdmin',
    targetId:        event._id,
    targetModel:     'Event',
    metadata:        { title, departmentId },
    ipAddress,
  });

  return event;
};

/**
 * List events — strict role-based visibility:
 *
 * collegeAdmin → ONLY college-wide events (organizerType:'college', departmentId:null)
 *                Never sees department events.
 *
 * deptAdmin    → BOTH:
 *                  1. College-wide events (organizerType:'college')
 *                  2. Their own department's events (organizerType:'department', departmentId === theirs)
 *                Returns them merged, sorted by date.
 *
 * student/faculty/alumni → same as deptAdmin (their dept + college-wide)
 *
 * Data rule:
 *   College events  → departmentId is null,  organizerType = 'college'
 *   Dept events     → departmentId is set,   organizerType = 'department'
 */
export const listEvents = async ({
  collegeId,
  role,
  departmentId,   // only meaningful when role is deptAdmin/student/faculty/alumni
  userId,         // used to recover orphaned dept events created before JWT fix
  status,
  skip = 0,
  limit = 20,
  meta,
}) => {
  let filter;

  if (role === 'collegeAdmin') {
    // Strict: only college-wide events
    filter = {
      collegeId,
      organizerType: 'college',
      departmentId:  null,
      isDeleted:     { $ne: true },
    };
  } else {
    // deptAdmin / student / faculty / alumni:
    // college-wide events  OR  this department's events
    const deptClauses = [
      { organizerType: 'college', departmentId: null },
    ];

    if (departmentId) {
      const deptObjId = mongoose.Types.ObjectId.isValid(departmentId)
        ? new mongoose.Types.ObjectId(departmentId)
        : departmentId;
      // Match dept events with the correct departmentId set
      deptClauses.push({ organizerType: 'department', departmentId: deptObjId });
      // Also recover dept events that were saved with departmentId:null due to a stale
      // token at creation time — they are scoped to the college so tenant-safe.
      deptClauses.push({ organizerType: 'department', departmentId: null });
    }

    filter = {
      collegeId,
      isDeleted: { $ne: true },
      $or: deptClauses,
    };
  }

  if (status) filter.status = status;

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ scheduledAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return { events, total, pagination: meta ? meta(total) : undefined };
};

export const getEvent = async ({ id, collegeId }) => {
  const event = await Event.findOne({ _id: id, collegeId, isDeleted: { $ne: true } }).lean();
  if (!event) throw new NotFoundError('Event not found.');
  return event;
};

/**
 * Update an event.
 * - collegeAdmin: can ONLY update college-wide events (organizerType:'college')
 * - deptAdmin:    can ONLY update their own department's events (organizerType:'department')
 */
export const updateEvent = async ({ id, collegeId, departmentId, role, updates, coverImageBuffer, performedBy }) => {
  const filter = { _id: id, collegeId, isDeleted: { $ne: true } };

  if (role === 'deptAdmin') {
    filter.departmentId  = departmentId;
    filter.organizerType = 'department';
  } else if (role === 'collegeAdmin') {
    filter.organizerType = 'college';
    filter.departmentId  = null;
  }

  const event = await Event.findOne(filter);
  if (!event) throw new NotFoundError('Event not found or you are not authorized to edit it.');

  if (coverImageBuffer) {
    if (event.coverImage?.publicId) {
      await deleteFromCloudinary(event.coverImage.publicId, 'image');
    }
    const uploaded = await uploadToCloudinary(coverImageBuffer, {
      folder:        `campus-connect/${collegeId}/events`,
      resource_type: 'image',
    });
    updates.coverImage = { url: uploaded.url, publicId: uploaded.publicId };
  }

  Object.assign(event, updates);
  await event.save();
  return event;
};

/**
 * Delete an event.
 * - collegeAdmin: can ONLY delete college-wide events
 * - deptAdmin:    can ONLY delete their own department's events
 */
export const deleteEvent = async ({ id, collegeId, departmentId, role, performedBy, ipAddress }) => {
  const filter = { _id: id, collegeId, isDeleted: { $ne: true } };

  if (role === 'deptAdmin') {
    filter.departmentId  = departmentId;
    filter.organizerType = 'department';
  } else if (role === 'collegeAdmin') {
    filter.organizerType = 'college';
    filter.departmentId  = null;
  }

  const event = await Event.findOne(filter);
  if (!event) throw new NotFoundError('Event not found or you are not authorized to delete it.');

  await event.softDelete(performedBy);

  await AuditLog.record({
    action:          AUDIT_ACTIONS.EVENT_DELETED,
    collegeId,
    performedBy,
    performedByRole: role,
    targetId:        event._id,
    targetModel:     'Event',
    metadata:        { title: event.title },
    ipAddress,
  });
};
