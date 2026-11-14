import { Menu, LogOut, ChevronDown, Building2 } from 'lucide-react';
import { useState }    from 'react';
import useAuthStore    from '../../store/authStore.js';
import useUIStore      from '../../store/uiStore.js';
import { useLogout }   from '../../hooks/useAuth.js';

const ROLE_LABELS = {
  owner:        'Super Admin',
  collegeAdmin: 'College Admin',
  deptAdmin:    'HOD',
  student:      'Student',
  faculty:      'Faculty',
  alumni:       'Alumni',
};

const ROLE_COLORS = {
  owner:        { bg: '#27272D', text: '#F5F5F4' },
  collegeAdmin: { bg: '#FEF3C7', text: '#92400E' },
  deptAdmin:    { bg: '#EDE9FE', text: '#5B21B6' },
  student:      { bg: '#D1FAE5', text: '#065F46' },
  faculty:      { bg: '#E0F2FE', text: '#075985' },
  alumni:       { bg: '#F3E8FF', text: '#6B21A8' },
};

const Topbar = ({ title, actions }) => {
  const { user }                            = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { mutate: logout }                  = useLogout();
  const [dropOpen, setDropOpen]             = useState(false);

  const fullName  = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? '';
  const roleColor = ROLE_COLORS[user?.role] ?? { bg: '#F5F5F4', text: '#57534E' };
  const hasPhoto  = !!user?.profileImage?.url;
  const collegeName = user?.collegeId?.name ?? '';

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className={`topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── Left ── */}
      <div className="flex items-center gap-3 flex-1 min-w-0 px-4">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     text-surface-400 hover:text-ink-800 hover:bg-surface-100
                     transition-colors duration-150 shrink-0">
          <Menu size={17} strokeWidth={1.9} />
        </button>

        <div className="h-4 w-px bg-surface-200 shrink-0" />

        <h1 className="topbar-title">{title}</h1>

        {actions && <div className="ml-2 shrink-0">{actions}</div>}
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2 px-4 relative shrink-0">

        {/* College identity chip — logo + full name, visible on sm+ */}
        {collegeName && user?.role !== 'owner' && (
          <div
            className="hidden sm:flex items-center gap-2 mr-1 px-2.5 py-1.5 rounded-xl
                       bg-surface-50 border border-surface-200"
            style={{ maxWidth: 'clamp(140px, 20vw, 280px)' }}
            title={collegeName}>
            {user.collegeId?.logo?.url ? (
              <img
                src={user.collegeId.logo.url}
                className="rounded-lg object-cover shrink-0"
                style={{ width: 22, height: 22 }}
                alt=""
              />
            ) : (
              <div className="rounded-lg bg-surface-200 flex items-center justify-center shrink-0"
                style={{ width: 22, height: 22 }}>
                <Building2 size={13} className="text-surface-500" />
              </div>
            )}
            <span className="text-[12px] font-semibold text-surface-700 truncate min-w-0">
              {collegeName}
            </span>
          </div>
        )}

        {/* Profile dropdown button */}
        <button
          onClick={() => setDropOpen(v => !v)}
          className="topbar-avatar-btn">

          <div className="topbar-avatar">
            {hasPhoto
              ? <img src={user.profileImage.url} className="w-full h-full object-cover rounded-full" alt={fullName} />
              : <span className="text-[11px] font-bold" style={{ color: '#92400E' }}>{initials}</span>
            }
          </div>

          <div className="hidden sm:flex flex-col items-start leading-none gap-0.5 min-w-0 max-w-[130px]">
            <span className="text-[13px] font-semibold truncate w-full" style={{ color: '#18181B' }}
              title={fullName}>
              {fullName}
            </span>
            <span
              className="text-[9.5px] font-bold tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: roleColor.bg, color: roleColor.text }}>
              {roleLabel}
            </span>
          </div>

          <ChevronDown
            size={13}
            strokeWidth={2.2}
            className={`text-surface-400 transition-transform duration-200 shrink-0 ${dropOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {dropOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropOpen(false)} />
            <div className="topbar-dropdown z-20">
              {/* User info */}
              <div className="px-4 py-4 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <div className="topbar-avatar w-10 h-10 shrink-0">
                    {hasPhoto
                      ? <img src={user.profileImage.url} className="w-full h-full object-cover rounded-full" alt="" />
                      : <span className="text-[12px] font-bold" style={{ color: '#92400E' }}>{initials}</span>
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate" style={{ color: '#18181B' }}
                      title={fullName}>{fullName}</div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: '#78716C' }}>{user?.email}</div>
                    {collegeName && user?.role !== 'owner' && (
                      <div className="text-[10.5px] truncate mt-0.5 font-medium" style={{ color: '#A8A29E' }}
                        title={collegeName}>{collegeName}</div>
                    )}
                  </div>
                </div>
                <div className="mt-2.5">
                  <span
                    className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: roleColor.bg, color: roleColor.text }}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-1.5">
                <button
                  onClick={() => { logout(); setDropOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px]
                             font-semibold text-red-600 hover:bg-red-50 transition-colors duration-150">
                  <LogOut size={14} strokeWidth={2} />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
