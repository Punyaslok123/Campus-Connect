/**
 * services/index.js — All API service functions grouped by domain.
 */
import api from './api.js';

const unwrap = (res) => res.data;
const stripEmpty = (params) => {
  if (!params) return params;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
};

// ── Dept Admin ────────────────────────────────────────────────────────────────
export const deptAdminService = {
  getStats: () => api.get('/dept-admin/stats').then(unwrap),
};

// ── Faculty ───────────────────────────────────────────────────────────────────
export const facultyService = {
  getStats: () => api.get('/faculty/stats').then(unwrap),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authService = {
  register:           (data)   => api.post('/auth/register', data).then(unwrap),
  registerCollege:    (data)   => api.post('/auth/register-college', data).then(unwrap),
  login:              (data)   => api.post('/auth/login', data).then(unwrap),
  ownerLogin:         (data)   => api.post('/auth/owner-login', data).then(unwrap),
  logout:             ()       => api.post('/auth/logout').then(unwrap),
  refresh:            ()       => api.post('/auth/refresh').then(unwrap),
  me:                 ()       => api.get('/auth/me').then(unwrap),
  // Public — no auth required, used during registration
  listColleges:       ()       => api.get('/auth/colleges').then(unwrap),
  listDeptsByDomain:  (domain) => api.get(`/auth/colleges/${domain}/departments`).then(unwrap),
};

// ── Subscription ──────────────────────────────────────────────────────────────
export const subscriptionService = {
  createOrder:   (data)   => api.post('/subscription/create-order', data).then(unwrap),
  verifyPayment: (data)   => api.post('/subscription/verify-payment', data).then(unwrap),
  getStatus:     ()       => api.get('/subscription/status').then(unwrap),
  getHistory:    (params) => api.get('/subscription/history', { params }).then(unwrap),
};

// ── Notes ─────────────────────────────────────────────────────────────────────
export const notesService = {
  upload:    (formData) => api.post('/notes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  list:      (params)   => api.get('/notes', { params: stripEmpty(params) }).then(unwrap),
  myNotes:   (params)   => api.get('/notes/my', { params: stripEmpty(params) }).then(unwrap),
  getById:   (id)       => api.get(`/notes/${id}`).then(unwrap),
  // Download via backend proxy — returns blob with proper Content-Type
  download:  (id)       => api.get(`/notes/${id}/download`, { responseType: 'blob' }),
  delete:    (id, data) => api.delete(`/notes/${id}`, { data }).then(unwrap),
  deleteOwn: (id)       => api.delete(`/notes/my/${id}`).then(unwrap),
};

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectsService = {
  list:           (params)             => api.get('/subjects', { params: stripEmpty(params) }).then(unwrap),
  create:         (data)               => api.post('/subjects', data).then(unwrap),
  delete:         (id)                 => api.delete(`/subjects/${id}`).then(unwrap),
  assignToFaculty:(facultyId, subjects) => api.patch(`/subjects/faculty/${facultyId}/assign`, { subjects }).then(unwrap),
  updateMySubjects:(subjects)          => api.patch('/subjects/my-subjects', { subjects }).then(unwrap),
};

// ── Events ────────────────────────────────────────────────────────────────────
export const eventsService = {
  create:  (formData) => api.post('/events', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  list:    (params)   => api.get('/events', { params: stripEmpty(params) }).then(unwrap),
  getById: (id)       => api.get(`/events/${id}`).then(unwrap),
  update:  (id, data) => api.put(`/events/${id}`, data).then(unwrap),
  delete:  (id)       => api.delete(`/events/${id}`).then(unwrap),
};

// ── Announcements ─────────────────────────────────────────────────────────────
export const announcementsService = {
  create:  (data)     => api.post('/announcements', data).then(unwrap),
  list:    (params)   => api.get('/announcements', { params }).then(unwrap),
  getById: (id)       => api.get(`/announcements/${id}`).then(unwrap),
  update:  (id, data) => api.put(`/announcements/${id}`, data).then(unwrap),
  delete:  (id)       => api.delete(`/announcements/${id}`).then(unwrap),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsService = {
  getProfile:            ()       => api.get('/settings/profile').then(unwrap),
  updateProfile:         (fd)     => api.put('/settings/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
  changePassword:        (data)   => api.put('/settings/password', data).then(unwrap),
  getCollegeSettings:    ()       => api.get('/settings/college').then(unwrap),
  updateCollegeSettings: (fd)     => api.put('/settings/college', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesService = {
  send:              (data)            => api.post('/messages', data).then(unwrap),
  broadcast:         (data)            => api.post('/messages/broadcast', data).then(unwrap),
  listDeptAdmins:    ()                => api.get('/messages/dept-admins').then(unwrap),
  listCollegeAdmins: ()                => api.get('/messages/college-admins').then(unwrap),
  listDeptMembers:   (params)          => api.get('/messages/dept-members', { params }).then(unwrap),
  listContacts:      (params)          => api.get('/messages/contacts', { params }).then(unwrap),
  getThread:         (userId, params)  => api.get(`/messages/${userId}`, { params }).then(unwrap),
  inbox:             ()                => api.get('/messages/inbox').then(unwrap),
};

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentsService = {
  create:                (data)           => api.post('/departments', data).then(unwrap),
  list:                  (params)         => api.get('/departments', { params }).then(unwrap),
  getById:               (id)             => api.get(`/departments/${id}`).then(unwrap),
  getDetails:            (id)             => api.get(`/departments/${id}/details`).then(unwrap),
  update:                (id, data)       => api.put(`/departments/${id}`, data).then(unwrap),
  delete:                (id)             => api.delete(`/departments/${id}`).then(unwrap),
  assignAdmin:           (id, data)       => api.post(`/departments/${id}/assign-admin`, data).then(unwrap),
  createAdmin:           (id, data)       => api.post(`/departments/${id}/create-admin`, data).then(unwrap),
  // Unlinks HOD → downgrades to faculty, account preserved
  removeAdmin:           (id)             => api.delete(`/departments/${id}/admin`).then(unwrap),
  // Hard-deletes a previous HOD account permanently
  permanentlyRemoveAdmin:(id, userId)     => api.delete(`/departments/${id}/previous-admins/${userId}`).then(unwrap),
  // Pass deptId so backend can filter multi-dept HODs correctly
  listFaculty:           (deptId)         => api.get('/departments/faculty', { params: { deptId } }).then(unwrap),
  listPreviousAdmins:    (id)             => api.get(`/departments/${id}/previous-admins`).then(unwrap),
};

// ── Users (admin operations) ──────────────────────────────────────────────────
export const usersService = {
  list:            (params)   => api.get('/users', { params }).then(unwrap),
  blocked:         (params)   => api.get('/users/blocked', { params }).then(unwrap),
  getById:         (id)       => api.get(`/users/${id}`).then(unwrap),
  verify:          (id)       => api.patch(`/users/${id}/verify`).then(unwrap),
  reject:          (id, data) => api.patch(`/users/${id}/reject`, data).then(unwrap),
  deactivate:      (id)       => api.patch(`/users/${id}/deactivate`).then(unwrap),
  reactivate:      (id)       => api.patch(`/users/${id}/reactivate`).then(unwrap),
  permanentRemove: (id)       => api.delete(`/users/${id}`).then(unwrap),
  changeRole:      (id, data) => api.patch(`/users/${id}/role`, data).then(unwrap),
  pending:         (params)   => api.get('/users/pending', { params }).then(unwrap),
};

// ── Colleges (Owner only) ─────────────────────────────────────────────────────
export const collegesService = {
  stats:      ()         => api.get('/colleges/stats').then(unwrap),
  list:       (params)   => api.get('/colleges', { params }).then(unwrap),
  getById:    (id)       => api.get(`/colleges/${id}`).then(unwrap),
  activate:   (id)       => api.patch(`/colleges/${id}/activate`).then(unwrap),
  deactivate: (id, data) => api.patch(`/colleges/${id}/deactivate`, data).then(unwrap),
};

// ── Subscription Plans (list = all roles; write = Owner only) ─────────────────
export const plansService = {
  listPublic: ()           => api.get('/subscription/plans/public').then(unwrap),
  list:       ()           => api.get('/subscription/plans').then(unwrap),
  create:     (data)       => api.post('/subscription/plans', data).then(unwrap),
  update:     (key, data)  => api.put(`/subscription/plans/${key}`, data).then(unwrap),
  remove:     (key)        => api.delete(`/subscription/plans/${key}`).then(unwrap),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsService = {
  create:  (data)     => api.post('/jobs', data).then(unwrap),
  list:    (params)   => api.get('/jobs', { params }).then(unwrap),
  getById: (id)       => api.get(`/jobs/${id}`).then(unwrap),
  update:  (id, data) => api.put(`/jobs/${id}`, data).then(unwrap),
  delete:  (id)       => api.delete(`/jobs/${id}`).then(unwrap),
  myPosts: (params)   => api.get('/jobs/my', { params }).then(unwrap),
};

// ── Mentorship ────────────────────────────────────────────────────────────────
export const mentorshipService = {
  create:     (data)   => api.post('/mentorship', data).then(unwrap),
  list:       (params) => api.get('/mentorship', { params }).then(unwrap),
  getById:    (id)     => api.get(`/mentorship/${id}`).then(unwrap),
  register:   (id)     => api.post(`/mentorship/${id}/register`).then(unwrap),
  unregister: (id)     => api.post(`/mentorship/${id}/unregister`).then(unwrap),
  update:     (id, data) => api.put(`/mentorship/${id}`, data).then(unwrap),
  delete:     (id)     => api.delete(`/mentorship/${id}`).then(unwrap),
  myHosted:   (params) => api.get('/mentorship/my', { params }).then(unwrap),
};

// ── Support Tickets ───────────────────────────────────────────────────────────
export const supportService = {
  create:       (data)         => api.post('/support', data).then(unwrap),
  list:         (params)       => api.get('/support', { params }).then(unwrap),
  getById:      (id)           => api.get(`/support/${id}`).then(unwrap),
  reply:        (id, data)     => api.post(`/support/${id}/reply`, data).then(unwrap),
  updateStatus: (id, data)     => api.patch(`/support/${id}/status`, data).then(unwrap),
  listAll:      (params)       => api.get('/support/admin/all', { params }).then(unwrap),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsService = {
  list:        (params) => api.get('/notifications', { params }).then(unwrap),
  unreadCount: ()       => api.get('/notifications/unread-count').then(unwrap),
  markRead:    (id)     => api.patch(`/notifications/${id}/read`).then(unwrap),
  markAllRead: ()       => api.patch('/notifications/read-all').then(unwrap),
};
