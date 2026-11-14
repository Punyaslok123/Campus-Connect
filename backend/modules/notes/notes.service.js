/**
 * modules/notes/notes.service.js
 */

import {
  Note,
  Department,
  AuditLog,
  AUDIT_ACTIONS,
}                             from '../../models/index.js';
import {
  uploadToCloudinary,
  deleteFromCloudinary,
}                             from '../../utils/cloudinaryUpload.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
}                             from '../../utils/AppError.js';

// ── uploadNote ────────────────────────────────────────────────────────────────

export const uploadNote = async ({
  fileBuffer,
  fileMimetype,
  fileOriginalName,
  coverBuffer,
  noteData,
  uploadedBy,
  uploaderRole,
  collegeId,
}) => {
  const {
    title, subject, subjectCode, semester, departmentId,
    description, tags, units,
  } = noteData;

  const department = await Department.findOne({ _id: departmentId, collegeId, isActive: true }).lean();
  if (!department) throw new NotFoundError('Department not found or does not belong to your college.');

  const resourceType = (
    fileMimetype === 'application/pdf' ||
    fileMimetype.includes('word') ||
    fileMimetype.includes('presentation') ||
    fileMimetype === 'text/plain'
  ) ? 'raw' : 'auto';

  const fileResult = await uploadToCloudinary(fileBuffer, {
    folder:        `campus-connect/${collegeId}/notes/files`,
    resource_type: resourceType,
    use_filename:  false,
  });

  let coverResult = null;
  if (coverBuffer) {
    coverResult = await uploadToCloudinary(coverBuffer, {
      folder:        `campus-connect/${collegeId}/notes/covers`,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 450, crop: 'fill', gravity: 'auto' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
  }

  const note = await Note.create({
    title,
    subject,
    subjectCode:  subjectCode?.trim() || null,
    semester:     parseInt(semester, 10),
    departmentId,
    collegeId,
    uploadedBy,
    uploaderRole: uploaderRole ?? 'student',
    description:  description ?? null,
    tags:         tags        ?? [],
    units:        units       ?? [],
    fileUrl: {
      url:          fileResult.url,
      publicId:     fileResult.publicId,
      format:       fileResult.format,
      bytes:        fileResult.bytes,
      pages:        fileResult.pages,
      resourceType,
      originalName: fileOriginalName ?? null,
      mimetype:     fileMimetype,
    },
    coverImage: coverResult ? {
      url:      coverResult.url,
      publicId: coverResult.publicId,
      format:   coverResult.format,
      bytes:    coverResult.bytes,
    } : null,
  });

  return note;
};

// ── listNotes ─────────────────────────────────────────────────────────────────

export const listNotes = async ({
  collegeId,
  departmentId,
  semester,
  subject,
  subjectCode,
  uploaderRole,
  search,
  uploadedBy,
  assignedSubjects,  // faculty scope: [{ name, code, semester }]
  skip,
  limit,
}) => {
  const filter = { collegeId };

  if (departmentId) filter.departmentId = departmentId;
  if (semester)     filter.semester     = Number(semester);
  if (uploadedBy)   filter.uploadedBy   = uploadedBy;
  if (uploaderRole) filter.uploaderRole = uploaderRole;

  if (subject) {
    filter.subject = { $regex: new RegExp(subject, 'i') };
  }
  if (subjectCode) {
    filter.subjectCode = { $regex: new RegExp(subjectCode, 'i') };
  }

  // Faculty subject scope: restrict to notes whose subject matches assigned subjects
  if (assignedSubjects?.length) {
    const names = assignedSubjects.map(s => s.name);
    filter.subject = { $in: names };
  }

  let query;
  if (search) {
    query = Note.find({ ...filter, $text: { $search: search } }, {
      score: { $meta: 'textScore' },
    }).sort({ score: { $meta: 'textScore' } });
  } else {
    query = Note.find(filter).sort({ createdAt: -1 });
  }

  const [notes, total] = await Promise.all([
    query
      .skip(skip)
      .limit(limit)
      .populate('uploadedBy',   'firstName lastName profileImage')
      .populate('departmentId', 'name code')
      .lean({ virtuals: true }),

    Note.countDocuments(filter),
  ]);

  return { notes, total };
};

// ── getNoteById ───────────────────────────────────────────────────────────────

export const getNoteById = async (noteId, collegeId) => {
  const note = await Note.findOne({ _id: noteId, collegeId })
    .populate('uploadedBy',   'firstName lastName profileImage semester')
    .populate('departmentId', 'name code')
    .lean({ virtuals: true });

  if (!note) throw new NotFoundError('Note not found or does not belong to your college.');

  Note.findByIdAndUpdate(noteId, { $inc: { viewCount: 1 } }).exec();

  return note;
};

// ── downloadNote ──────────────────────────────────────────────────────────────

/**
 * Proxy the Cloudinary file through the backend so the browser receives
 * proper Content-Type and Content-Disposition headers.
 * Increments downloadCount.
 */
export const downloadNote = async (noteId, collegeId) => {
  const note = await Note.findOne({ _id: noteId, collegeId }).lean();
  if (!note) throw new NotFoundError('Note not found.');

  // Increment download count (fire-and-forget)
  Note.findByIdAndUpdate(noteId, { $inc: { downloadCount: 1 } }).exec();

  return {
    url:          note.fileUrl.url,
    mimetype:     note.fileUrl.mimetype ?? 'application/octet-stream',
    originalName: note.fileUrl.originalName ?? `${note.title}.${note.fileUrl.format ?? 'bin'}`,
    resourceType: note.fileUrl.resourceType ?? 'raw',
  };
};

// ── deleteNote ────────────────────────────────────────────────────────────────

export const deleteNote = async ({
  noteId,
  collegeId,
  deletedBy,
  deletedByRole,
  departmentId,     // faculty scope: note must be in faculty's dept
  assignedSubjects, // faculty scope: [{ name, code, semester }]
  reason,
  ipAddress,
}) => {
  const note = await Note.findOne({ _id: noteId, collegeId }).setOptions({ showDeleted: true });

  if (!note) throw new NotFoundError('Note not found or does not belong to your college.');
  if (note.isDeleted) throw new ValidationError('Note has already been deleted.');

  if (deletedByRole === 'faculty') {
    // 1. Note must be in the faculty's own department
    const noteDept    = note.departmentId?.toString();
    const facultyDept = departmentId?.toString();
    if (!facultyDept || noteDept !== facultyDept) {
      throw new ForbiddenError('You can only delete notes from your own department.');
    }

    // 2. Faculty must have at least one assigned subject, and the note's subject
    //    must match. Match by subjectCode first (both come from the same subject
    //    registry when the picker is used), then fall back to case-insensitive name.
    //    An empty assignedSubjects list means no subjects assigned → no deletes allowed.
    if (!assignedSubjects?.length) {
      throw new ForbiddenError('You have no assigned subjects. Contact your department admin.');
    }

    const noteCode = note.subjectCode?.trim().toLowerCase();
    const noteName = note.subject?.trim().toLowerCase();

    const allowed = assignedSubjects.some(s => {
      const aCode = s.code?.trim().toLowerCase();
      const aName = s.name?.trim().toLowerCase();
      if (noteCode && aCode) return noteCode === aCode;
      return noteName === aName;
    });

    if (!allowed) throw new ForbiddenError('You can only delete notes for your assigned subjects.');
  }

  note.isDeleted      = true;
  note.deletedAt      = new Date();
  note.deletedBy      = deletedBy;
  note.deletionReason = reason ?? null;
  await note.save();

  await AuditLog.record({
    action:          AUDIT_ACTIONS.NOTE_DELETED,
    collegeId,
    performedBy:     deletedBy,
    performedByRole: deletedByRole,
    targetId:        note._id,
    targetModel:     'Note',
    metadata: {
      title:      note.title,
      subject:    note.subject,
      semester:   note.semester,
      uploadedBy: note.uploadedBy,
      reason:     reason ?? null,
    },
    ipAddress,
  });

  return { noteId: note._id, deleted: true };
};
