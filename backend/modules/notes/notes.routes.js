/**
 * modules/notes/notes.routes.js
 */

import { Router }              from 'express';
import { asyncHandler }        from '../../utils/asyncHandler.js';
import authenticate            from '../../middlewares/authenticate.js';
import checkRole               from '../../middlewares/checkRole.js';
import checkSubscription       from '../../middlewares/checkSubscription.js';
import validateBody            from '../../middlewares/validateBody.js';
import * as notesController    from './notes.controller.js';
import {
  uploadNoteValidator,
  listNotesValidator,
  noteIdParamValidator,
  deleteNoteValidator,
}                              from './notes.validator.js';
import multer                  from 'multer';

const router = Router();

const MAX_FILE_SIZE  = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE =  5 * 1024 * 1024;

const ALLOWED_FILE_TYPES  = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const noteUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'file') {
      if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        return cb(new Error('Academic file must be a PDF, Word, PowerPoint, or text document'));
      }
      return cb(null, true);
    }
    if (file.fieldname === 'coverImage') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(new Error('Cover image must be JPEG, PNG, or WebP'));
      }
      return cb(null, true);
    }
    cb(new Error(`Unexpected field: ${file.fieldname}`));
  },
}).fields([
  { name: 'file',       maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

router.use(authenticate);
router.use(checkSubscription);

// POST /api/notes/upload — students + faculty can upload
router.post(
  '/upload',
  checkRole(['student', 'faculty', 'deptAdmin']),
  noteUploadMiddleware,
  validateBody(uploadNoteValidator),
  asyncHandler(notesController.uploadNote)
);

// GET /api/notes — browse notes
router.get(
  '/',
  checkRole(['student', 'faculty', 'deptAdmin', 'alumni', 'collegeAdmin']),
  validateBody(listNotesValidator),
  asyncHandler(notesController.listNotes)
);

// GET /api/notes/my — own uploads (student + faculty)
router.get(
  '/my',
  checkRole(['student', 'faculty', 'deptAdmin']),
  asyncHandler(notesController.myNotes)
);

// GET /api/notes/:id/download — proxy download with correct headers
router.get(
  '/:id/download',
  checkRole(['student', 'faculty', 'deptAdmin', 'alumni', 'collegeAdmin']),
  validateBody(noteIdParamValidator),
  asyncHandler(notesController.downloadNote)
);

// GET /api/notes/:id
router.get(
  '/:id',
  checkRole(['student', 'faculty', 'deptAdmin', 'alumni', 'collegeAdmin']),
  validateBody(noteIdParamValidator),
  asyncHandler(notesController.getNoteById)
);

// DELETE /api/notes/my/:id — own note deletion (student + faculty)
router.delete(
  '/my/:id',
  checkRole(['student', 'faculty', 'deptAdmin']),
  validateBody(noteIdParamValidator),
  asyncHandler(notesController.deleteOwnNote)
);

// DELETE /api/notes/:id — moderation (faculty + deptAdmin)
router.delete(
  '/:id',
  checkRole(['faculty', 'deptAdmin']),
  validateBody(deleteNoteValidator),
  asyncHandler(notesController.deleteNote)
);

export default router;
