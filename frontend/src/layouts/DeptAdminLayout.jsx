import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UserCheck, Users, Calendar,
  BookOpen, Megaphone, MessageSquare, Settings,
} from 'lucide-react';
import NavItem      from '../components/shared/NavItem.jsx';
import Topbar       from '../components/shared/Topbar.jsx';
import useUIStore   from '../store/uiStore.js';
import useAuthStore from '../store/authStore.js';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../services/index.js';

const NAV = [
  { to: '/dept-admin',               icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/dept-admin/validation',    icon: UserCheck,       label: 'Validation',    end: false },
  { to: '/dept-admin/notes',         icon: BookOpen,        label: 'Notes',         end: false },
  { to: '/dept-admin/events',        icon: Calendar,        label: 'Events',        end: false },
  { to: '/dept-admin/announcements', icon: Megaphone,       label: 'Announcements', end: false },
  { to: '/dept-admin/users',         icon: Users,           label: 'Users',         end: false },
  { to: '/dept-admin/messages',      icon: MessageSquare,   label: 'Messages',      end: false },
  { to: '/dept-admin/settings',      icon: Settings,        label: 'Settings',      end: false },
];

const DeptAdminLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  const { user }             = useAuthStore();
  const location             = useLocation();

  const { data: pendingCount = 0 } = useQuery({
    queryKey:        ['dept-pending-count'],
    queryFn:         () => usersService.pending({ limit: 1 }),
    select:          r  => r.data?.pagination?.total ?? 0,
    refetchInterval: 30_000,
  });

  const current   = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));
  const pageTitle = current?.label ?? 'Department';
  const collegeName = user?.collegeId?.name ?? (user?.departmentId?.name ?? 'Department');

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
              <div className="sidebar-brand-role">HOD</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV.map(item => (
            <NavItem
              key={item.to}
              {...item}
              collapsed={sidebarCollapsed}
              badge={item.to === '/dept-admin/validation' ? pendingCount : undefined}
            />
          ))}
        </nav>
      </aside>

      <Topbar title={pageTitle} />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default DeptAdminLayout;
