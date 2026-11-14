import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, LifeBuoy, Settings, ScrollText } from 'lucide-react';
import NavItem    from '../components/shared/NavItem.jsx';
import Topbar     from '../components/shared/Topbar.jsx';
import useUIStore from '../store/uiStore.js';

const NAV_ITEMS = [
  { to: '/owner',               icon: LayoutDashboard, label: 'Overview',      end: true },
  { to: '/owner/colleges',      icon: Building2,       label: 'All Colleges'             },
  { to: '/owner/subscriptions', icon: CreditCard,      label: 'Subscriptions'            },
  { to: '/owner/queries',       icon: LifeBuoy,        label: 'Queries'                  },
  { to: '/owner/audit',         icon: ScrollText,      label: 'Audit Logs'               },
  { to: '/owner/settings',      icon: Settings,        label: 'Settings'                 },
];

const OwnerLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  return (
    <div>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{ background: 'linear-gradient(180deg, #0C0C0E 0%, #111114 50%, #18181B 100%)' }}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo-wrap"><img src="/CC.png" alt="Campus Connect" /></div>
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-name">Campus Connect</div>
              <div className="sidebar-brand-role">Super Admin</div>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="nav-section-label">Platform</div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="mx-3 mb-4 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: 'rgba(245,158,11,0.6)' }}>Owner Access</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Full platform control
            </div>
          </div>
        )}
      </aside>

      <Topbar title="Owner Dashboard" />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default OwnerLayout;
