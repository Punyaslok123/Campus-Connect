/**
 * utils/cloudinaryUpload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Multer + Cloudinary stream uploader.
 *
 * Files go: Client → Express (memory buffer) → Cloudinary stream → URL stored in DB
 * No temp disk writes. Cloudinary public_id is stored for future deletion.
 *
 * Usage in a controller:
 *   const result = await uploadToCloudinary(req.file.buffer, {
 *     folder:   `campus-connect/${collegeId}/notes`,
 *     resource_type: 'raw',   // for PDFs, DOCX
 *   });
 *   // result: { url, publicId, format, bytes }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import multer         from 'multer';
import streamifier    from 'streamifier';
import cloudinary     from '../config/cloudinary.js';
import { ValidationError } from './AppError.js';

// ── Multer config: memory storage (no disk writes) ────────────────────────────

const ALLOWED_IMAGE_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FILE_TYPES   = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

const MAX_IMAGE_SIZE = 5  * 1024 * 1024;    //  5 MB
const MAX_FILE_SIZE  = 50 * 1024 * 1024;    // 50 MB

// Generic memory storage — file type filtering done per-route upload config
const storage = multer.memoryStorage();

// ── Named upload configs ──────────────────────────────────────────────────────

/** Upload config for cover images (JPEG/PNG/WEBP, max 5MB) */
export const uploadCoverImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ValidationError(`Image must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`));
  },
});

/** Upload config for academic files (PDF, DOCX, PPT, TXT, max 50MB) */
export const uploadAcademicFile = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ValidationError(`File must be a PDF, Word, PowerPoint, or text document`));
  },
});

/** Upload config for profile images */
export const uploadProfileImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ValidationError(`Profile image must be JPEG, PNG, or WebP`));
  },
});

// ── Cloudinary stream uploader ────────────────────────────────────────────────

/**
 * Upload a file buffer to Cloudinary via a stream (no disk I/O).
 *
 * @param {Buffer} buffer          - file buffer from multer memoryStorage
 * @param {object} options         - Cloudinary upload options
 * @param {string} options.folder  - Cloudinary folder path
 * @param {string} [options.resource_type='auto'] - 'image' | 'raw' | 'auto'
 * @param {string} [options.public_id]  - optional custom public_id
 * @returns {{ url: string, publicId: string, format: string, bytes: number }}
 */
export const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        use_filename:  false,
        unique_filename: true,
        overwrite:     false,
        ...options,
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({
          url:      result.secure_url,
          publicId: result.public_id,
          format:   result.format,
          bytes:    result.bytes,
          pages:    result.pages ?? null,
        });
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete a resource from Cloudinary by publicId.
 * Called when a note is hard-deleted or a cover image is replaced.
 *
 * @param {string} publicId
 * @param {string} [resourceType='image']
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    // Don't throw — Cloudinary deletion failure shouldn't break the main flow
    console.error(`[Cloudinary] Failed to delete ${publicId}:`, err.message);
    return null;
  }
};
