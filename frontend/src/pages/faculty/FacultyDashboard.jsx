import { useQuery }  from '@tanstack/react-query';
import { Link }       from 'react-router-dom';
import {
  BookOpen, Calendar, Megaphone, MessageSquare,
  Users, Award, ArrowRight, FileText,
} from 'lucide-react';
import {
  facultyService, eventsService, announcementsService, notesService,
} from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

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

const FacultyDashboard = () => {
  const { user } = useAuthStore();
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['faculty-stats'],
    queryFn:  facultyService.getStats,
    select:   r => r.data?.stats,
    staleTime: 60_000,
  });

  const { data: recentNotes = [] } = useQuery({
    queryKey: ['faculty-notes-recent'],
    queryFn:  () => notesService.list({ limit: 4 }),
    select:   r  => r.data?.notes ?? [],
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['faculty-events-recent'],
    queryFn:  () => eventsService.list({ limit: 4 }),
    select:   r  => r.data?.events ?? [],
  });

  const { data: recentAnnouncements = [] } = useQuery({
    queryKey: ['faculty-announcements-recent'],
    queryFn:  () => announcementsService.list({ limit: 3 }),
    select:   r  => r.data?.announcements ?? [],
  });

  return (
    <div className="space-y-6">

      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900" style={{ letterSpacing: '-0.025em' }}>
            {greeting}, {user?.firstName ?? 'Faculty'}&nbsp;
            <span className="inline-block animate-[pulseSoft_3s_ease-in-out_infinite]">👋</span>
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {user?.departmentId?.name
              ? `${user.departmentId.name} · Faculty`
              : 'Here\'s what\'s happening in your department today.'}
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-xs text-surface-400">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}    label="Students"      value={stats?.studentCount ?? 0}  gradient="blue"   to="/faculty/messages" />
          <StatCard icon={BookOpen} label="Dept Notes"    value={stats?.notesCount ?? 0}    gradient="green"  to="/faculty/notes" />
          <StatCard icon={Calendar} label="Events"        value={stats?.eventsCount ?? 0}   gradient="purple" to="/faculty/events" />
          <StatCard icon={Award}    label="Announcements" value={stats?.announcementsCount ?? 0} gradient="amber" to="/faculty/announcements" />
        </div>
      )}

      {/* Two-column feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Notes */}
        <div className="card flex flex-col gap-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <BookOpen size={14} className="text-green-600" strokeWidth={2} />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Recent Notes</span>
            </div>
            <Link to="/faculty/notes"
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1">
            {recentNotes.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon"><BookOpen size={20} className="text-surface-400" /></div>
                <p className="empty-title">No notes yet</p>
                <p className="empty-body">Department notes will appear here.</p>
              </div>
            ) : recentNotes.map(note => (
              <div key={note._id}
                   className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  {note.coverImage?.url
                    ? <img src={note.coverImage.url} className="w-full h-full rounded-lg object-cover" alt="" />
                    : <FileText size={13} className="text-blue-500" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-surface-800 truncate">{note.title}</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">
                    {note.subject}{note.semester ? ` · Sem ${note.semester}` : ''}
                  </div>
                </div>
                <span className="text-[10px] text-surface-300 shrink-0">{fmt(note.createdAt)}</span>
              </div>
            ))}
          </div>
          <Link to="/faculty/notes" className="mt-4 btn btn-sm btn-secondary w-full">
            <BookOpen size={12} /> Manage Notes
          </Link>
        </div>

        {/* Right column: Events + Announcements stacked */}
        <div className="flex flex-col gap-5">

          {/* Recent Events */}
          <div className="card flex flex-col gap-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar size={14} className="text-blue-600" strokeWidth={2} />
                </div>
                <span className="font-semibold text-surface-800 text-[13.5px]">Upcoming Events</span>
              </div>
              <Link to="/faculty/events"
                className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-1">
              {recentEvents.length === 0 ? (
                <p className="text-[12px] text-surface-400 px-3 py-2">No upcoming events.</p>
              ) : recentEvents.map(ev => (
                <div key={ev._id}
                     className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ev.status === 'published' ? 'bg-emerald-400' : 'bg-surface-300'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-surface-800 truncate">{ev.title}</div>
                    <div className="text-[11px] text-surface-400">{fmt(ev.scheduledAt)}</div>
                  </div>
                  <span className={`badge shrink-0 text-[10px] ${ev.organizerType === 'college' ? 'badge-info' : 'badge-secondary'}`}>
                    {ev.organizerType === 'college' ? 'College' : 'Dept'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="card flex flex-col gap-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Megaphone size={14} className="text-purple-600" strokeWidth={2} />
                </div>
                <span className="font-semibold text-surface-800 text-[13.5px]">Announcements</span>
              </div>
              <Link to="/faculty/announcements"
                className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="space-y-1">
              {recentAnnouncements.length === 0 ? (
                <p className="text-[12px] text-surface-400 px-3 py-2">No announcements.</p>
              ) : recentAnnouncements.map(ann => (
                <div key={ann._id}
                     className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-surface-800 truncate">{ann.title}</div>
                    <div className="text-[11px] text-surface-400">{fmt(ann.createdAt)}</div>
                  </div>
                  {ann.isPinned && <span className="badge badge-warning text-[10px] shrink-0">Pinned</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/faculty/notes',         icon: BookOpen,      label: 'Notes',         bg: 'bg-green-50',  text: 'text-green-600'  },
          { to: '/faculty/events',         icon: Calendar,      label: 'Events',        bg: 'bg-blue-50',   text: 'text-blue-600'   },
          { to: '/faculty/messages',       icon: MessageSquare, label: 'Messages',      bg: 'bg-violet-50', text: 'text-violet-600' },
          { to: '/faculty/announcements',  icon: Megaphone,     label: 'Announcements', bg: 'bg-amber-50',  text: 'text-amber-600'  },
        ].map(({ to, icon: Icon, label, bg, text }) => (
          <Link key={to} to={to}
            className="card flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center
                             group-hover:scale-110 transition-transform duration-200`}>
              <Icon size={18} className={text} />
            </div>
            <span className="text-[12px] font-semibold text-surface-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default FacultyDashboard;
