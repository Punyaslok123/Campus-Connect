import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Calendar,
  Megaphone, CreditCard, Settings, MessageSquare, LifeBuoy,
  AlertOctagon,
} from 'lucide-react';
import NavItem      from '../components/shared/NavItem.jsx';
import Topbar       from '../components/shared/Topbar.jsx';
import useUIStore   from '../store/uiStore.js';
import useAuthStore from '../store/authStore.js';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '../services/index.js';

const NAV = [
  { to: '/admin',               icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/admin/departments',   icon: Building2,       label: 'Departments',   end: false },
  { to: '/admin/events',        icon: Calendar,        label: 'Events',        end: false },
  { to: '/admin/announcements', icon: Megaphone,       label: 'Announcements', end: false },
  { to: '/admin/messages',      icon: MessageSquare,   label: 'Messages',      end: false },
  { to: '/admin/billing',       icon: CreditCard,      label: 'Billing',       end: false },
  { to: '/admin/settings',      icon: Settings,        label: 'Settings',      end: false },
  { to: '/admin/help',          icon: LifeBuoy,        label: 'Help & Support',end: false },
];

const SuspendedScreen = ({ reason }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-4"
    style={{ background: '#FAFAF9' }}>
    <div className="max-w-md w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto
                      border border-red-200">
        <AlertOctagon size={28} className="text-red-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#18181B', letterSpacing: '-0.025em' }}>
          Account Suspended
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#78716C' }}>
          Your college account has been suspended by the platform administrator
          and cannot access any features at this time.
        </p>
        {reason && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-left">
            <span className="font-semibold">Reason: </span>{reason}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-surface-200 bg-white p-5 text-left space-y-2">
        <div className="font-semibold text-sm" style={{ color: '#18181B' }}>What can you do?</div>
        <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: '#57534E' }}>
          <li>Contact our support team to appeal this decision</li>
          <li>Ensure all outstanding payments are settled</li>
          <li>Review your account for any policy violations</li>
        </ul>
      </div>
      <Link to="/admin/help" className="btn btn-primary gap-2 w-full justify-center">
        <LifeBuoy size={16} /> Contact Help &amp; Support
      </Link>
    </div>
  </div>
);

const AdminLayout = () => {
  const { sidebarCollapsed } = useUIStore();
  const { user }             = useAuthStore();
  const location             = useLocation();

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn:  subscriptionService.getStatus,
    select:   r => r.data,
    staleTime: 60_000,
  });

  const collegeInfo   = subData?.college;
  const isSuspended   = collegeInfo?.isSuspended ?? false;
  const suspendReason = collegeInfo?.statusReason ?? null;

  const sub  = subData?.subscription;
  const days = sub?.daysRemaining ?? 0;
  const subStatus =
    !sub        ? { label: 'No subscription', dotClass: 'danger',  pulse: true  } :
    days <= 0   ? { label: 'Expired',         dotClass: 'danger',  pulse: true  } :
    days <= 3   ? { label: `${days}d left`,   dotClass: 'danger',  pulse: true  } :
    days <= 14  ? { label: `${days}d left`,   dotClass: 'warning', pulse: false } :
                  { label: `${days}d left`,   dotClass: 'active',  pulse: false };

  const current    = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));
  const pageTitle  = current?.label ?? 'Dashboard';
  const collegeName = user?.collegeId?.name ?? 'Campus Connect';

  if (isSuspended) {
    const isHelpRoute = location.pathname.startsWith('/admin/help');
    if (!isHelpRoute) return <SuspendedScreen reason={suspendReason} />;
    return (
      <div>
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo-wrap"><img src="/CC.png" alt="Campus Connect" /></div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text">
                <div className="sidebar-brand-name" title={collegeName}>{collegeName}</div>
                <div className="sidebar-brand-role" style={{ color: '#f87171' }}>Suspended</div>
              </div>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto py-3">
            <NavItem to="/admin/help" icon={LifeBuoy} label="Help & Support" collapsed={sidebarCollapsed} />
          </nav>
        </aside>
        <Topbar title="Help & Support" />
        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="content-inner"><Outlet /></div>
        </main>
      </div>
    );
  }

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
              <div className="sidebar-brand-role">College Admin</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV.map(item => (
            <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-sub-footer">
            <div className="flex items-center gap-2">
              <span className={`status-dot ${subStatus.dotClass} ${subStatus.pulse ? 'animate-[pulseSoft_2s_ease-in-out_infinite]' : ''}`} />
              <span className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {subStatus.label}
              </span>
              {(!sub || days <= 14) && (
                <a href="/admin/billing"
                  className="ml-auto text-[10px] font-bold shrink-0 underline underline-offset-2"
                  style={{ color: '#F59E0B' }}>
                  Renew
                </a>
              )}
            </div>
          </div>
        )}
      </aside>

      <Topbar title={pageTitle} />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-inner"><Outlet /></div>
      </main>
    </div>
  );
};

export default AdminLayout;
