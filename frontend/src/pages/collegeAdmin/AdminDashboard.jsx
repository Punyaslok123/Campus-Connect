import { useQuery } from '@tanstack/react-query';
import { Link }      from 'react-router-dom';
import {
  Users, Building2, Calendar, CreditCard,
  Megaphone, AlertTriangle, ArrowRight, UserCheck,
  TrendingUp, Pin,
} from 'lucide-react';
import {
  departmentsService, subscriptionService,
  usersService, announcementsService, eventsService,
} from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

// ── Stat card ─────────────────────────────────────────────────────────────────

const ICON_GRADIENTS = {
  blue:   'from-blue-500 to-blue-600',
  purple: 'from-violet-500 to-purple-600',
  amber:  'from-amber-400 to-orange-500',
  green:  'from-emerald-400 to-teal-500',
  red:    'from-red-500 to-rose-600',
  indigo: 'from-indigo-500 to-accent-600',
};

const StatCard = ({ icon: Icon, label, value, sub, gradient = 'blue', to }) => {
  const grad = ICON_GRADIENTS[gradient] ?? ICON_GRADIENTS.blue;
  const inner = (
    <div className="stat-card group">
      {/* Subtle top gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${grad}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="stat-value">{value ?? '—'}</div>
          <div className="stat-label">{label}</div>
          {sub && (
            <div className="text-[11px] text-surface-400 mt-1.5 font-medium">{sub}</div>
          )}
        </div>
        <div className={`stat-icon bg-gradient-to-br ${grad} shadow-md`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {to && (
        <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-1
                        text-[12px] font-semibold text-primary-600 opacity-0 group-hover:opacity-100
                        transition-opacity duration-200">
          View details <ArrowRight size={11} />
        </div>
      )}
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
};

// ── Format date ───────────────────────────────────────────────────────────────

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Dashboard ─────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuthStore();

  const { data: depts } = useQuery({
    queryKey: ['departments'],
    queryFn:  departmentsService.list,
    select:   r => r.data?.departments ?? [],
  });

  const { data: subData } = useQuery({
    queryKey: ['subscription'],
    queryFn:  subscriptionService.getStatus,
    select:   r => r.data,
    staleTime: 60_000,
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-users'],
    queryFn:  () => usersService.pending({ limit: 1 }),
    select:   r => r.data?.pagination?.total ?? 0,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-count'],
    queryFn:  () => usersService.list({ limit: 1 }),
    select:   r => r.data?.pagination?.total ?? 0,
  });

  const { data: recentEvents } = useQuery({
    queryKey: ['events-recent'],
    queryFn:  () => eventsService.list({ limit: 4 }),
    select:   r => r.data?.events ?? [],
  });

  const { data: recentAnnouncements } = useQuery({
    queryKey: ['announcements-recent'],
    queryFn:  () => announcementsService.list({ limit: 4 }),
    select:   r => r.data?.announcements ?? [],
  });

  const sub  = subData?.subscription;
  const days = sub?.daysRemaining ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Subscription alert banner ── */}
      {sub && days <= 14 && (
        <div className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4
          ${days <= 0
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              ${days <= 0 ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle size={17} className={days <= 0 ? 'text-red-600' : 'text-amber-600'} strokeWidth={2} />
            </div>
            <div>
              <div className={`text-sm font-semibold ${days <= 0 ? 'text-red-700' : 'text-amber-800'}`}>
                {days <= 0
                  ? 'Your subscription has expired'
                  : `Subscription expires in ${days} day${days === 1 ? '' : 's'}`}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">
                Renew to keep uninterrupted access for your college.
              </div>
            </div>
          </div>
          <Link
            to="/admin/billing"
            className={`btn btn-sm shrink-0 ${days <= 0 ? 'btn-danger' : 'btn-primary'}`}>
            Renew Now
          </Link>
        </div>
      )}

      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900" style={{ letterSpacing: '-0.025em' }}>
            Welcome back, {user?.firstName ?? 'Admin'}&nbsp;
            <span className="inline-block animate-[pulseSoft_3s_ease-in-out_infinite]">👋</span>
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Here's what's happening across your college today.
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-xs text-surface-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2} label="Departments" value={depts?.length ?? 0}
          gradient="blue" to="/admin/departments"
        />
        <StatCard
          icon={Users} label="Total Users" value={allUsers ?? 0}
          sub="Students, faculty & alumni" gradient="purple"
        />
        <StatCard
          icon={UserCheck}
          label="Pending Verification"
          value={pendingCount ?? 0}
          gradient={pendingCount > 0 ? 'amber' : 'green'}
          sub={pendingCount > 0 ? 'Needs attention' : 'All caught up'}
        />
        <StatCard
          icon={CreditCard}
          label="Subscription"
          value={days > 0 ? `${days}d` : 'Expired'}
          sub={sub?.planLabel ?? 'No active plan'}
          gradient={days > 14 ? 'green' : days > 0 ? 'amber' : 'red'}
          to="/admin/billing"
        />
      </div>

      {/* ── Two-column feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent events */}
        <div className="card flex flex-col gap-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar size={14} className="text-blue-600" strokeWidth={2} />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Recent Events</span>
            </div>
            <Link to="/admin/events"
                  className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-1">
            {(recentEvents ?? []).length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon">
                  <Calendar size={20} className="text-surface-400" />
                </div>
                <p className="empty-title">No events yet</p>
                <p className="empty-body">Create your first college event to get started.</p>
              </div>
            ) : (recentEvents ?? []).map(ev => (
              <div key={ev._id}
                   className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0
                  ${ev.status === 'published' ? 'bg-emerald-400' : 'bg-surface-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-surface-800 truncate">{ev.title}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">
                    {ev.scheduledAt ? fmt(ev.scheduledAt) : 'No date'}{ev.venue ? ` · ${ev.venue}` : ''}
                  </div>
                </div>
                <span className={`badge shrink-0 ${ev.status === 'published' ? 'badge-success' : 'badge-neutral'}`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>

          <Link to="/admin/events"
                className="mt-4 btn btn-sm btn-secondary w-full">
            <TrendingUp size={12} /> Create Event
          </Link>
        </div>

        {/* Recent announcements */}
        <div className="card flex flex-col gap-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Megaphone size={14} className="text-purple-600" strokeWidth={2} />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Announcements</span>
            </div>
            <Link to="/admin/announcements"
                  className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="space-y-1">
            {(recentAnnouncements ?? []).length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon">
                  <Megaphone size={20} className="text-surface-400" />
                </div>
                <p className="empty-title">No announcements yet</p>
                <p className="empty-body">Post announcements to keep your college informed.</p>
              </div>
            ) : (recentAnnouncements ?? []).map(ann => (
              <div key={ann._id}
                   className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                {ann.isPinned && (
                  <Pin size={12} className="text-amber-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-surface-800 truncate">{ann.title}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">{fmt(ann.createdAt)}</div>
                </div>
                {ann.isPinned && (
                  <span className="badge badge-warning shrink-0">Pinned</span>
                )}
              </div>
            ))}
          </div>

          <Link to="/admin/announcements"
                className="mt-4 btn btn-sm btn-secondary w-full">
            <Megaphone size={12} /> Post Announcement
          </Link>
        </div>
      </div>

      {/* ── Departments quick view ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Building2 size={14} className="text-indigo-600" strokeWidth={2} />
            </div>
            <span className="font-semibold text-surface-800 text-[13.5px]">Departments</span>
          </div>
          <Link to="/admin/departments"
                className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Manage all <ArrowRight size={11} />
          </Link>
        </div>

        {(depts ?? []).length === 0 ? (
          <div className="empty-state py-8">
            <div className="empty-icon">
              <Building2 size={20} className="text-surface-400" />
            </div>
            <p className="empty-title">No departments yet</p>
            <Link to="/admin/departments" className="text-[12px] text-primary-600 font-semibold mt-1 hover:underline">
              Create your first department →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(depts ?? []).map(d => (
              <Link
                key={d._id}
                to={`/admin/departments/${d._id}`}
                className="group flex items-center gap-3 rounded-xl border border-surface-100
                           p-3.5 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-150">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600
                                flex items-center justify-center shrink-0">
                  <Building2 size={15} className="text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-surface-800 truncate">{d.name}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">
                    {d.code ? `${d.code} · ` : ''}{d.memberCount ?? 0} members
                  </div>
                </div>
                <span className={`badge shrink-0 ${d.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {d.isActive ? 'Active' : 'Off'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default AdminDashboard;
