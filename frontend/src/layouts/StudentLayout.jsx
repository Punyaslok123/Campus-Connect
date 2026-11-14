import { Outlet } from 'react-router-dom';
import {
  Home, BookOpen, Upload, Calendar, MessageCircle,
  Briefcase, GraduationCap, Award, Megaphone,
} from 'lucide-react';
import NavItem      from '../components/shared/NavItem.jsx';
import Topbar       from '../components/shared/Topbar.jsx';
import useUIStore   from '../store/uiStore.js';
import useAuthStore from '../store/authStore.js';

const NAV = [
  { to: '/student',              icon: Home,          label: 'Feed',         end: true },
  { to: '/student/notes',        icon: BookOpen,      label: 'Browse Notes'  },
  { to: '/student/upload',       icon: Upload,        label: 'Upload Note'   },
  { to: '/student/events',       icon: Calendar,      label: 'Events'        },
  { to: '/student/messages',     icon: MessageCircle, label: 'Messages'      },
  { to: '/student/jobs',         icon: Briefcase,     label: 'Opportunities' },
  { to: '/student/mentorship',   icon: GraduationCap, label: 'Mentorship'    },
  { to: '/student/results',      icon: Award,         label: 'Results'       },
  { to: '/student/announcements',icon: Megaphone,     label: 'Announcements' },
];

const StudentLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  const { user }             = useAuthStore();
  const collegeName = user?.collegeId?.name ?? 'Campus Connect';

  return (
    <div>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          {user?.collegeId?.logo?.url
            ? <img src={user.collegeId.logo.url} className="sidebar-brand-logo" alt={collegeName} />
            : <div className="sidebar-brand-logo-wrap"><img src="/CC.png" alt="Campus Connect" /></div>
          }
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-name" title={collegeName}>{collegeName}</div>
              <div className="sidebar-brand-role">Student · Sem {user?.semester ?? '—'}</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV.map(item => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
        </nav>
      </aside>

      <Topbar title="Student Portal" />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default StudentLayout;
