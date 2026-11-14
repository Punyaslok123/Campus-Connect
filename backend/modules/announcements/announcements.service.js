import { Announcement } from '../../models/index.js';
import { NotFoundError } from '../../utils/AppError.js';

export const createAnnouncement = async ({ title, body, audience, departmentId, isPinned, collegeId, postedBy }) => {
  return Announcement.create({
    title, body,
    audience:     audience     || 'college',
    departmentId: departmentId || null,
    isPinned:     isPinned     ?? false,
    collegeId,
    postedBy,
  });
};

/**
 * List announcements — strict role-based visibility:
 *
 * collegeAdmin → ONLY college-wide announcements (audience:'college', departmentId:null)
 *                Never sees department announcements.
 *
 * deptAdmin    → BOTH:
 *                  1. College-wide announcements (audience:'college')
 *                  2. Their own department's announcements (audience:'department', departmentId === theirs)
 *
 * student/faculty/alumni → same as deptAdmin (their dept + college-wide)
 *
 * Data rule:
 *   College announcements → departmentId is null, audience = 'college'
 *   Dept announcements    → departmentId is set,  audience = 'department'
 */
export const listAnnouncements = async ({
  collegeId,
  role,
  departmentId,   // meaningful for deptAdmin/student/faculty/alumni
  userId,         // used to recover orphaned dept announcements created before JWT fix
  skip = 0,
  limit = 30,
  meta,
}) => {
  let filter;

  if (role === 'collegeAdmin') {
    // Strict: only college-wide announcements
    filter = {
      collegeId,
      audience:     'college',
      departmentId: null,
      isDeleted:    { $ne: true },
    };
  } else {
    // deptAdmin / student / faculty / alumni:
    // college-wide  OR  this department's announcements
    const deptClauses = [
      { audience: 'college', departmentId: null },
    ];

    if (departmentId) {
      deptClauses.push({ audience: 'department', departmentId });
      // Recover dept announcements saved with departmentId:null due to stale token at creation.
      deptClauses.push({ audience: 'department', departmentId: null });
    }

    filter = {
      collegeId,
      isDeleted: { $ne: true },
      $or: deptClauses,
    };
  }

  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('postedBy', 'firstName lastName')
      .lean(),
    Announcement.countDocuments(filter),
  ]);
  return { announcements, total, pagination: meta ? meta(total) : undefined };
};

export const getAnnouncement = async ({ id, collegeId }) => {
  const ann = await Announcement.findOne({ _id: id, collegeId, isDeleted: { $ne: true } }).lean();
  if (!ann) throw new NotFoundError('Announcement not found.');
  return ann;
};

/**
 * Update an announcement.
 * - collegeAdmin: can ONLY update college-wide announcements
 * - deptAdmin:    can ONLY update their own department's announcements
 */
export const updateAnnouncement = async ({ id, collegeId, departmentId, role, updates }) => {
  const filter = { _id: id, collegeId, isDeleted: { $ne: true } };

  if (role === 'deptAdmin') {
    filter.departmentId = departmentId;
    filter.audience     = 'department';
  } else if (role === 'collegeAdmin') {
    filter.audience     = 'college';
    filter.departmentId = null;
  }

  const ann = await Announcement.findOne(filter);
  if (!ann) throw new NotFoundError('Announcement not found or you are not authorized to edit it.');
  Object.assign(ann, updates);
  await ann.save();
  return ann;
};

/**
 * Delete an announcement.
 * - collegeAdmin: can ONLY delete college-wide announcements
 * - deptAdmin:    can ONLY delete their own department's announcements
 */
export const deleteAnnouncement = async ({ id, collegeId, departmentId, role }) => {
  const filter = { _id: id, collegeId, isDeleted: { $ne: true } };

  if (role === 'deptAdmin') {
    filter.departmentId = departmentId;
    filter.audience     = 'department';
  } else if (role === 'collegeAdmin') {
    filter.audience     = 'college';
    filter.departmentId = null;
  }

  const ann = await Announcement.findOne(filter);
  if (!ann) throw new NotFoundError('Announcement not found or you are not authorized to delete it.');
  ann.isDeleted = true;
  ann.deletedAt = new Date();
  await ann.save();
};
