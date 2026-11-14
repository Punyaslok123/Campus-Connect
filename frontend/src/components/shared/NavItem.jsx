import { NavLink } from 'react-router-dom';

const NavItem = ({ to, icon: Icon, label, badge, collapsed, end }) => (
  <NavLink
    to={to}
    end={end}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed-item' : ''}`
    }
  >
    {({ isActive }) => (
      <>
        {Icon && (
          <span className="nav-item-icon">
            <Icon size={16} strokeWidth={isActive ? 2.3 : 1.75} />
          </span>
        )}

        {!collapsed && (
          <span className="flex-1 truncate text-[13px]">{label}</span>
        )}

        {!collapsed && badge > 0 && (
          <span className="ml-auto inline-flex items-center justify-center
                           min-w-[18px] h-[18px] rounded-full px-1
                           text-[9.5px] font-bold"
            style={{
              background: 'rgba(245,158,11,0.2)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

export default NavItem;
