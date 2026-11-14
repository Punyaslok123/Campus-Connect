/**
 * modules/deptAdmin/deptAdmin.service.js
 * Department-scoped aggregation and stats for the Department Admin dashboard.
 */

import { User, Note, Event, Announcement } from '../../models/index.js';

/**
 * Return key stats scoped strictly to one department within a college.
 */
export const getDeptStats = async ({ collegeId, departmentId }) => {
  const scope = { collegeId, departmentId };

  const [
    studentCount,
    facultyCount,
    alumniCount,
    pendingCount,
    notesCount,
    eventsCount,
    announcementsCount,
  ] = await Promise.all([
    User.countDocuments({ ...scope, role: 'student',  isActive: true, isVerified: true }),
    User.countDocuments({ ...scope, role: 'faculty',  isActive: true, isVerified: true }),
    User.countDocuments({ ...scope, role: 'alumni',   isActive: true, isVerified: true }),
    User.countDocuments({
      ...scope,
      role:       { $in: ['student', 'faculty', 'alumni'] },
      isVerified: false,
      isActive:   true,
    }),
    Note.countDocuments({ ...scope }),
    Event.countDocuments({ collegeId, departmentId, isDeleted: { $ne: true } }),
    Announcement.countDocuments({ collegeId, departmentId, isDeleted: { $ne: true } }),
  ]);

  return {
    studentCount,
    facultyCount,
    alumniCount,
    pendingCount,
    notesCount,
    eventsCount,
    announcementsCount,
    totalMembers: studentCount + facultyCount + alumniCount,
  };
};
