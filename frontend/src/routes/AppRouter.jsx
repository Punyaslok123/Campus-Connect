/**
 * routes/AppRouter.jsx
 * Centralised routing with role-based guards.
 * Route structure:
 *   /login, /register              → public (redirect to dashboard if authed)
 *   /owner/*                       → Owner only
 *   /admin/*                       → collegeAdmin only
 *   /dept-admin/*                  → deptAdmin only
 *   /student/*                     → student only
 *   /faculty/*                     → faculty only
 *   /alumni/*                      → alumni only
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

// Public pages
import HomePage             from '../pages/public/HomePage.jsx';

// Auth pages
import LoginPage            from '../pages/auth/LoginPage.jsx';
import RegisterPage         from '../pages/auth/RegisterPage.jsx';
import RegisterCollegePage  from '../pages/auth/RegisterCollegePage.jsx';

// Layouts
import OwnerLayout      from '../layouts/OwnerLayout.jsx';
import AdminLayout      from '../layouts/AdminLayout.jsx';
import DeptAdminLayout  from '../layouts/DeptAdminLayout.jsx';
import StudentLayout    from '../layouts/StudentLayout.jsx';
import FacultyLayout    from '../layouts/FacultyLayout.jsx';
import AlumniLayout     from '../layouts/AlumniLayout.jsx';

// Owner pages
import OwnerDashboard      from '../pages/owner/OwnerDashboard.jsx';
import CollegesList        from '../pages/owner/CollegesList.jsx';
import OwnerSubscriptions  from '../pages/owner/OwnerSubscriptions.jsx';
import OwnerQueries        from '../pages/owner/OwnerQueries.jsx';
import OwnerSettings       from '../pages/owner/OwnerSettings.jsx';
import OwnerAuditLogs      from '../pages/owner/OwnerAuditLogs.jsx';

// College Admin pages
import AdminDashboard     from '../pages/collegeAdmin/AdminDashboard.jsx';
import Departments        from '../pages/collegeAdmin/Departments.jsx';
import DepartmentDetails  from '../pages/collegeAdmin/DepartmentDetails.jsx';
import BillingPage        from '../pages/collegeAdmin/BillingPage.jsx';
import Events             from '../pages/collegeAdmin/Events.jsx';
import Announcements      from '../pages/collegeAdmin/Announcements.jsx';
import AdminSettings      from '../pages/collegeAdmin/Settings.jsx';
import Messages           from '../pages/collegeAdmin/Messages.jsx';
import HelpSupport        from '../pages/collegeAdmin/HelpSupport.jsx';

// Dept Admin pages
import DeptDashboard      from '../pages/deptAdmin/DeptDashboard.jsx';
import DeptValidation     from '../pages/deptAdmin/DeptValidation.jsx';
import DeptNotes          from '../pages/deptAdmin/DeptNotes.jsx';
import DeptEvents         from '../pages/deptAdmin/DeptEvents.jsx';
import DeptAnnouncements  from '../pages/deptAdmin/DeptAnnouncements.jsx';
import DeptUsers          from '../pages/deptAdmin/DeptUsers.jsx';
import DeptMessages       from '../pages/deptAdmin/DeptMessages.jsx';
import DeptSettings       from '../pages/deptAdmin/DeptSettings.jsx';

// Student pages
import StudentDashboard  from '../pages/student/StudentDashboard.jsx';
import BrowseNotes       from '../pages/student/BrowseNotes.jsx';
import UploadNote        from '../pages/student/UploadNote.jsx';
import StudentEvents     from '../pages/student/StudentEvents.jsx';
import StudentMessages   from '../pages/student/StudentMessages.jsx';
import StudentJobs       from '../pages/student/StudentJobs.jsx';
import StudentMentorship from '../pages/student/StudentMentorship.jsx';
import StudentResults        from '../pages/student/StudentResults.jsx';
import StudentAnnouncements from '../pages/student/StudentAnnouncements.jsx';

// Faculty pages
import FacultyDashboard      from '../pages/faculty/FacultyDashboard.jsx';
import FacultyNotes          from '../pages/faculty/FacultyNotes.jsx';
import FacultyResults        from '../pages/faculty/FacultyResults.jsx';
import FacultyEvents         from '../pages/faculty/FacultyEvents.jsx';
import FacultyAnnouncements  from '../pages/faculty/FacultyAnnouncements.jsx';
import FacultyMessages       from '../pages/faculty/FacultyMessages.jsx';
import FacultySettings       from '../pages/faculty/FacultySettings.jsx';

// Alumni pages
import AlumniDashboard  from '../pages/alumni/AlumniDashboard.jsx';
import PostJob          from '../pages/alumni/PostJob.jsx';
import MyPostings       from '../pages/alumni/MyPostings.jsx';
import HostSession      from '../pages/alumni/HostSession.jsx';
import MySessions       from '../pages/alumni/MySessions.jsx';
import AlumniMessages   from '../pages/alumni/AlumniMessages.jsx';
import AlumniProfile    from '../pages/alumni/AlumniProfile.jsx';

// ── Guards ────────────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuth, user } = useAuthStore();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuth, user } = useAuthStore();
  const ROLE_ROUTES = {
    owner: '/owner', collegeAdmin: '/admin', deptAdmin: '/dept-admin',
    student: '/student', faculty: '/faculty', alumni: '/alumni',
  };
  if (isAuth && user?.role) return <Navigate to={ROLE_ROUTES[user.role] ?? '/'} replace />;
  return children;
};

// ── Router ────────────────────────────────────────────────────────────────────
const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public — accessible to everyone */}
      <Route path="/"                  element={<HomePage />} />
      <Route path="/login"             element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"          element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/register-college"  element={<PublicRoute><RegisterCollegePage /></PublicRoute>} />

      {/* Owner */}
      <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerLayout /></ProtectedRoute>}>
        <Route index                 element={<OwnerDashboard />} />
        <Route path="colleges"       element={<CollegesList />} />
        <Route path="subscriptions"  element={<OwnerSubscriptions />} />
        <Route path="queries"        element={<OwnerQueries />} />
        <Route path="settings"       element={<OwnerSettings />} />
        <Route path="audit"          element={<OwnerAuditLogs />} />
      </Route>

      {/* College Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['collegeAdmin']}><AdminLayout /></ProtectedRoute>}>
        <Route index                    element={<AdminDashboard />} />
        <Route path="departments"         element={<Departments />} />
        <Route path="departments/:id"     element={<DepartmentDetails />} />
        <Route path="events"            element={<Events />} />
        <Route path="announcements"     element={<Announcements />} />
        <Route path="billing"           element={<BillingPage />} />
        <Route path="settings"          element={<AdminSettings />} />
        <Route path="messages"          element={<Messages />} />
        <Route path="help"              element={<HelpSupport />} />
      </Route>

      {/* Dept Admin */}
      <Route path="/dept-admin" element={<ProtectedRoute allowedRoles={['deptAdmin']}><DeptAdminLayout /></ProtectedRoute>}>
        <Route index                   element={<DeptDashboard />} />
        <Route path="validation"       element={<DeptValidation />} />
        <Route path="notes"            element={<DeptNotes />} />
        <Route path="events"           element={<DeptEvents />} />
        <Route path="announcements"    element={<DeptAnnouncements />} />
        <Route path="users"            element={<DeptUsers />} />
        <Route path="messages"         element={<DeptMessages />} />
        <Route path="settings"         element={<DeptSettings />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
        <Route index              element={<StudentDashboard />} />
        <Route path="notes"       element={<BrowseNotes />} />
        <Route path="upload"      element={<UploadNote />} />
        <Route path="events"      element={<StudentEvents />} />
        <Route path="messages"    element={<StudentMessages />} />
        <Route path="jobs"        element={<StudentJobs />} />
        <Route path="mentorship"  element={<StudentMentorship />} />
        <Route path="results"        element={<StudentResults />} />
        <Route path="announcements"  element={<StudentAnnouncements />} />
      </Route>

      {/* Faculty */}
      <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyLayout /></ProtectedRoute>}>
        <Route index                   element={<FacultyDashboard />} />
        <Route path="notes"            element={<FacultyNotes />} />
        <Route path="results"          element={<FacultyResults />} />
        <Route path="events"           element={<FacultyEvents />} />
        <Route path="announcements"    element={<FacultyAnnouncements />} />
        <Route path="messages"         element={<FacultyMessages />} />
        <Route path="settings"         element={<FacultySettings />} />
      </Route>

      {/* Alumni */}
      <Route path="/alumni" element={<ProtectedRoute allowedRoles={['alumni']}><AlumniLayout /></ProtectedRoute>}>
        <Route index              element={<AlumniDashboard />} />
        <Route path="post-job"    element={<PostJob />} />
        <Route path="my-postings" element={<MyPostings />} />
        <Route path="host-session"element={<HostSession />} />
        <Route path="sessions"    element={<MySessions />} />
        <Route path="messages"    element={<AlumniMessages />} />
        <Route path="profile"     element={<AlumniProfile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
