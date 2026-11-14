import { useQuery }  from '@tanstack/react-query';
import { Link }       from 'react-router-dom';
import {
  GraduationCap, Users, Star, UserCheck,
  BookOpen, Calendar, Megaphone, ArrowRight,
} from 'lucide-react';
import { deptAdminService, eventsService, announcementsService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

// ── Stat card (matches AdminDashboard pattern) ────────────────────────────────

const GRAD = {
  blue:   'from-blue-500 to-blue-600',
  purple: 'from-violet-500 to-purple-600',
  amber:  'from-amber-400 to-orange-500',
  green:  'from-emerald-400 to-teal-500',
  red:    'from-red-500 to-rose-500',
  indigo: 'from-indigo-500 to-indigo-600',
};

const StatCard = ({ icon: Icon, label, value, sub, gradient = 'blue', to }) => {
  const g = GRAD[gradient] ?? GRAD.blue;
  const inner = (
    <div className="stat-card group">
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${g}`} />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="stat-value">{value ?? '—'}</div>
          <div className="stat-label">{label}</div>
          {sub && <div className="text-[11px] text-surface-400 mt-1.5 font-medium">{sub}</div>}
        </div>
        <div className={`stat-icon bg-gradient-to-br ${g} shadow-md`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
      </div>
      {to && (
        <div className="mt-4 pt-3 border-t border-surface-100 flex items-center gap-1
                        text-[12px] font-semibold text-primary-600 opacity-0 group-hover:opacity-100
                        transition-opacity duration-200">
          View <ArrowRight size={11} />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

// ── Dashboard ─────────────────────────────────────────────────────────────────

const DeptDashboard = () => {
  const { user } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dept-stats'],
    queryFn:  deptAdminService.getStats,
    select:   r => r.data?.stats,
    staleTime: 60_000,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['dept-events-recent'],
    queryFn:  () => eventsService.list({ limit: 4 }),
    select:   r => r.data?.events ?? [],
  });

  const { data: recentAnnouncements = [] } = useQuery({
    queryKey: ['dept-announcements-recent'],
    queryFn:  () => announcementsService.list({ limit: 4 }),
    select:   r => r.data?.announcements ?? [],
  });

  return (
    <div className="space-y-6">

      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900" style={{ letterSpacing: '-0.025em' }}>
            Welcome back, {user?.firstName ?? 'Admin'}&nbsp;
            <span className="inline-block animate-[pulseSoft_3s_ease-in-out_infinite]">👋</span>
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Here's what's happening in your department today.
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-xs text-surface-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Pending alert ── */}
      {(stats?.pendingCount ?? 0) > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <UserCheck size={17} className="text-amber-600" strokeWidth={2} />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-800">
                {stats.pendingCount} user{stats.pendingCount !== 1 ? 's' : ''} awaiting verification
              </div>
              <div className="text-xs text-surface-500 mt-0.5">Review and approve new department members.</div>
            </div>
          </div>
          <Link to="/dept-admin/validation" className="btn btn-sm btn-primary shrink-0">
            Review Now
          </Link>
        </div>
      )}

      {/* ── Stats grid ── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={GraduationCap} label="Students"      value={stats?.studentCount ?? 0}  gradient="blue"   to="/dept-admin/users" />
          <StatCard icon={Users}         label="Faculty"       value={stats?.facultyCount ?? 0}  gradient="purple" to="/dept-admin/users" />
          <StatCard icon={Star}          label="Alumni"        value={stats?.alumniCount ?? 0}   gradient="indigo" to="/dept-admin/users" />
          <StatCard
            icon={UserCheck}
            label="Pending"
            value={stats?.pendingCount ?? 0}
            gradient={(stats?.pendingCount ?? 0) > 0 ? 'amber' : 'green'}
            sub={(stats?.pendingCount ?? 0) > 0 ? 'Need verification' : 'All caught up'}
            to="/dept-admin/validation"
          />
          <StatCard icon={BookOpen}  label="Notes Uploaded"  value={stats?.notesCount ?? 0}   gradient="green" to="/dept-admin/notes" />
          <StatCard icon={Calendar}  label="Events Created"  value={stats?.eventsCount ?? 0}  gradient="red"   to="/dept-admin/events" />
        </div>
      )}

      {/* ── Two-column feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Events */}
        <div className="card flex flex-col gap-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar size={14} className="text-blue-600" strokeWidth={2} />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Recent Events</span>
            </div>
            <Link to="/dept-admin/events"
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1">
            {recentEvents.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon"><Calendar size={20} className="text-surface-400" /></div>
                <p className="empty-title">No events yet</p>
                <p className="empty-body">Create your first department event to get started.</p>
              </div>
            ) : recentEvents.map(ev => (
              <div key={ev._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ev.status === 'published' ? 'bg-emerald-400' : 'bg-surface-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-surface-800 truncate">{ev.title}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">{ev.scheduledAt ? fmt(ev.scheduledAt) : 'No date'}</div>
                </div>
                <span className={`badge shrink-0 ${ev.status === 'published' ? 'badge-success' : 'badge-neutral'}`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
          <Link to="/dept-admin/events" className="mt-4 btn btn-sm btn-secondary w-full">
            <Calendar size={12} /> Create Event
          </Link>
        </div>

        {/* Recent Announcements */}
        <div className="card flex flex-col gap-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                <Megaphone size={14} className="text-purple-600" strokeWidth={2} />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Announcements</span>
            </div>
            <Link to="/dept-admin/announcements"
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1">
            {recentAnnouncements.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon"><Megaphone size={20} className="text-surface-400" /></div>
                <p className="empty-title">No announcements</p>
                <p className="empty-body">Post updates to keep your department informed.</p>
              </div>
            ) : recentAnnouncements.map(ann => (
              <div key={ann._id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-surface-800 truncate">{ann.title}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">{fmt(ann.createdAt)}</div>
                </div>
                {ann.isPinned && <span className="badge badge-warning shrink-0">Pinned</span>}
              </div>
            ))}
          </div>
          <Link to="/dept-admin/announcements" className="mt-4 btn btn-sm btn-secondary w-full">
            <Megaphone size={12} /> Post Announcement
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DeptDashboard;
