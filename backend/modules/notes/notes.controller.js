/**
 * modules/notes/notes.controller.js
 */

import https                              from 'https';
import http                               from 'http';
import * as notesService                  from './notes.service.js';
import { sendSuccess }                    from '../../utils/response.js';
import { paginate }                       from '../../utils/pagination.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/AppError.js';
import { Note }                           from '../../models/index.js';

// ── POST /api/notes/upload ────────────────────────────────────────────────────
export const uploadNote = async (req, res) => {
  const noteFile  = req.files?.file?.[0];
  const coverFile = req.files?.coverImage?.[0];

  if (!noteFile) throw new ValidationError('Academic file is required (PDF, DOCX, PPT, or TXT)');

  const { role } = req.user;
  const uploaderRole = (role === 'faculty' || role === 'deptAdmin') ? role : 'student';

  // Faculty can only upload for their assigned subjects
  if (role === 'faculty') {
    const assigned = req.user.assignedSubjects ?? [];
    if (!assigned.length) {
      throw new ForbiddenError('You have no assigned subjects. Contact your department admin.');
    }
    const subjectCode = req.body.subjectCode?.trim().toLowerCase();
    const subjectName = req.body.subject?.trim().toLowerCase();
    const allowed = assigned.some(s => {
      const aCode = s.code?.trim().toLowerCase();
      const aName = s.name?.trim().toLowerCase();
      if (subjectCode && aCode) return subjectCode === aCode;
      return subjectName === aName;
    });
    if (!allowed) {
      throw new ForbiddenError('You can only upload notes for your assigned subjects.');
    }
  }

  const note = await notesService.uploadNote({
    fileBuffer:      noteFile.buffer,
    fileMimetype:    noteFile.mimetype,
    fileOriginalName: noteFile.originalname,
    coverBuffer:     coverFile?.buffer ?? null,
    noteData: {
      title:        req.body.title,
      subject:      req.body.subject,
      subjectCode:  req.body.subjectCode,
      semester:     req.body.semester,
      departmentId: req.body.departmentId || req.user.departmentId,
      description:  req.body.description,
      tags:         req.body.tags,
      units:        req.body.units,
    },
    uploadedBy:  req.user._id,
    uploaderRole,
    collegeId:   req.user.collegeId,
  });

  return sendSuccess(res, 201, 'Note uploaded successfully', { note });
};

// ── GET /api/notes ────────────────────────────────────────────────────────────
export const listNotes = async (req, res) => {
  const { departmentId, semester, subject, subjectCode, uploaderRole, search } = req.query;
  const { skip, limit, meta } = paginate(req.query);

  const { notes, total } = await notesService.listNotes({
    collegeId:        req.user.collegeId,
    departmentId:     departmentId ?? null,
    semester:         semester     ? parseInt(semester, 10) : null,
    subject:          subject      ?? null,
    subjectCode:      subjectCode  ?? null,
    uploaderRole:     uploaderRole ?? null,
    search:           search       ?? null,
    uploadedBy:       null,
    assignedSubjects: null,   // no server-side subject scoping — faculty can see all dept notes
    skip,
    limit,
  });

  return sendSuccess(res, 200, 'Notes fetched successfully', { notes, pagination: meta(total) });
};

// ── GET /api/notes/my ─────────────────────────────────────────────────────────
export const myNotes = async (req, res) => {
  const { skip, limit, meta } = paginate(req.query);

  const { notes, total } = await notesService.listNotes({
    collegeId:  req.user.collegeId,
    uploadedBy: req.user._id,
    skip,
    limit,
  });

  return sendSuccess(res, 200, 'Your notes fetched', { notes, pagination: meta(total) });
};

// ── GET /api/notes/:id ────────────────────────────────────────────────────────
export const getNoteById = async (req, res) => {
  const note = await notesService.getNoteById(req.params.id, req.user.collegeId);
  return sendSuccess(res, 200, 'Note fetched successfully', { note });
};

// ── GET /api/notes/:id/download ───────────────────────────────────────────────
export const downloadNote = async (req, res) => {
  const { url, mimetype, originalName } = await notesService.downloadNote(
    req.params.id,
    req.user.collegeId
  );

  const safeName = originalName.replace(/[^\w.\-]/g, '_');
  res.setHeader('Content-Type', mimetype);
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  // Proxy the Cloudinary URL through backend so browser gets proper headers
  const transport = url.startsWith('https') ? https : http;
  transport.get(url, (upstream) => {
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    upstream.pipe(res);
  }).on('error', (err) => {
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Download failed' });
  });
};

// ── DELETE /api/notes/my/:id ─────────────────────────────────────────────────
export const deleteOwnNote = async (req, res) => {
  const note = await Note.findOne({
    _id:        req.params.id,
    collegeId:  req.user.collegeId,
    uploadedBy: req.user._id,
  });

  if (!note) throw new NotFoundError('Note not found or you did not upload this note.');

  note.isDeleted = true;
  note.deletedAt = new Date();
  note.deletedBy = req.user._id;
  await note.save();

  return sendSuccess(res, 200, 'Note deleted', { noteId: note._id });
};

// ── DELETE /api/notes/:id ─────────────────────────────────────────────────────
export const deleteNote = async (req, res) => {
  const result = await notesService.deleteNote({
    noteId:           req.params.id,
    collegeId:        req.user.collegeId,
    deletedBy:        req.user._id,
    deletedByRole:    req.user.role,
    departmentId:     req.user.departmentId,
    assignedSubjects: req.user.assignedSubjects ?? [],
    reason:           req.body.reason ?? null,
    ipAddress:        req.ip,
  });

  return sendSuccess(res, 200, 'Note deleted successfully', result);
};
