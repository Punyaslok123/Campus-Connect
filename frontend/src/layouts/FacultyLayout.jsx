import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Award, Calendar,
  Megaphone, MessageSquare, Settings,
} from 'lucide-react';
import NavItem      from '../components/shared/NavItem.jsx';
import Topbar       from '../components/shared/Topbar.jsx';
import useUIStore   from '../store/uiStore.js';
import useAuthStore from '../store/authStore.js';

const NAV = [
  { to: '/faculty',               icon: LayoutDashboard, label: 'Dashboard',       end: true  },
  { to: '/faculty/notes',         icon: BookOpen,        label: 'Notes & Validation', end: false },
  { to: '/faculty/results',       icon: Award,           label: 'Results',          end: false },
  { to: '/faculty/events',        icon: Calendar,        label: 'Events',           end: false },
  { to: '/faculty/announcements', icon: Megaphone,       label: 'Announcements',    end: false },
  { to: '/faculty/messages',      icon: MessageSquare,   label: 'Messages',         end: false },
  { to: '/faculty/settings',      icon: Settings,        label: 'Settings',         end: false },
];

const FacultyLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  const { user }             = useAuthStore();
  const location             = useLocation();

  const current   = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));
  const pageTitle = current?.label ?? 'Faculty';
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
              <div className="sidebar-brand-role">Faculty</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV.map(item => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
        </nav>
      </aside>

      <Topbar title={pageTitle} />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default FacultyLayout;
