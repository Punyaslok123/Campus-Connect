/**
 * modules/faculty/faculty.service.js
 * Faculty-scoped aggregations for the dashboard.
 */

import { User, Note, Event, Announcement } from '../../models/index.js';

/**
 * Return key stats scoped to the faculty member's department.
 */
export const getFacultyStats = async ({ collegeId, departmentId }) => {
  const scope = { collegeId, departmentId };

  const [
    studentCount,
    facultyCount,
    notesCount,
    eventsCount,
    announcementsCount,
  ] = await Promise.all([
    User.countDocuments({ ...scope, role: 'student',  isActive: true, isVerified: true }),
    User.countDocuments({ ...scope, role: 'faculty',  isActive: true, isVerified: true }),
    Note.countDocuments({ ...scope, isDeleted: { $ne: true } }),
    Event.countDocuments({
      $or: [
        { collegeId, departmentId, isDeleted: { $ne: true } },
        { collegeId, organizerType: 'college', isDeleted: { $ne: true } },
      ],
    }),
    Announcement.countDocuments({
      $or: [
        { collegeId, departmentId, isDeleted: { $ne: true } },
        { collegeId, audience: 'college', isDeleted: { $ne: true } },
      ],
    }),
  ]);

  return {
    studentCount,
    facultyCount,
    notesCount,
    eventsCount,
    announcementsCount,
  };
};
