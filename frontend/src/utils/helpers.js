/**
 * utils/helpers.js
 * Reusable pure utility functions for the frontend.
 */

// ── Date formatting ───────────────────────────────────────────────────────────
export const formatDate = (date, opts = {}) =>
  date ? new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts,
  }) : '—';

export const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(date);
};

// ── File helpers ──────────────────────────────────────────────────────────────
export const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

export const getFileIcon = (format) => {
  if (!format) return '📄';
  const map = { pdf:'📕', doc:'📘', docx:'📘', ppt:'📙', pptx:'📙', txt:'📝' };
  return map[format.toLowerCase()] ?? '📄';
};

// ── Role display ──────────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  owner:       'Super Admin',
  collegeAdmin:'College Admin',
  deptAdmin:   'HOD',
  student:     'Student',
  faculty:     'Faculty',
  alumni:      'Alumni',
};

export const ROLE_BADGE_VARIANTS = {
  owner:       'primary',
  collegeAdmin:'primary',
  deptAdmin:   'secondary',
  student:     'success',
  faculty:     'warning',
  alumni:      'secondary',
};

// ── Currency formatting ───────────────────────────────────────────────────────
export const formatINR = (paise) =>
  (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

// ── String helpers ────────────────────────────────────────────────────────────
export const initials = (firstName = '', lastName = '') =>
  `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

export const truncate = (str, n = 60) =>
  str?.length > n ? str.slice(0, n) + '…' : str ?? '';

// ── Array helpers ─────────────────────────────────────────────────────────────
export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] = acc[k] ?? []).push(item);
    return acc;
  }, {});
