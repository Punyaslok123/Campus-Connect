import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Briefcase, GraduationCap, MessageCircle, User, ListOrdered } from 'lucide-react';
import NavItem      from '../components/shared/NavItem.jsx';
import Topbar       from '../components/shared/Topbar.jsx';
import useUIStore   from '../store/uiStore.js';
import useAuthStore from '../store/authStore.js';

const GIVE_BACK = [
  { to: '/alumni',              icon: LayoutDashboard, label: 'Dashboard',            end: true },
  { to: '/alumni/post-job',     icon: Briefcase,       label: 'Post Job / Internship' },
  { to: '/alumni/my-postings',  icon: ListOrdered,     label: 'My Postings'           },
  { to: '/alumni/host-session', icon: GraduationCap,   label: 'Host Mentorship'       },
  { to: '/alumni/sessions',     icon: GraduationCap,   label: 'My Sessions'           },
];

const CONNECT = [
  { to: '/alumni/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/alumni/profile',  icon: User,          label: 'Profile'  },
];

const AlumniLayout = () => {
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
              <div className="sidebar-brand-role">Alumni</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {!sidebarCollapsed && <div className="nav-section-label">Give Back</div>}
          {GIVE_BACK.map(item => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
          {!sidebarCollapsed && <div className="nav-section-label">Connect</div>}
          {CONNECT.map(item => <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />)}
        </nav>
      </aside>

      <Topbar title="Alumni Portal" />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default AlumniLayout;
