import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  GraduationCap, Calendar, Clock, Users, Video, CheckCircle,
  XCircle, UserPlus, UserMinus, Link,
} from 'lucide-react';
import { mentorshipService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const PLATFORM_LABELS = {
  zoom:        'Zoom',
  google_meet: 'Google Meet',
  ms_teams:    'Microsoft Teams',
  webex:       'Webex',
  other:       'Online',
};

const SessionCard = ({ session, myId }) => {
  const qc = useQueryClient();

  const isRegistered = session.attendees?.some(a =>
    (a.userId?._id ?? a.userId)?.toString() === myId?.toString()
  );
  const isUpcoming   = session.scheduledAt && new Date(session.scheduledAt) > new Date();
  const isFull       = (session.attendees?.length ?? 0) >= session.maxAttendees;

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () => mentorshipService.register(session._id),
    onSuccess:  () => {
      toast.success('Registered for session!');
      qc.invalidateQueries({ queryKey: ['student-mentorship'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Registration failed'),
  });

  const { mutate: unregister, isPending: unregistering } = useMutation({
    mutationFn: () => mentorshipService.unregister(session._id),
    onSuccess:  () => {
      toast.success('Unregistered from session');
      qc.invalidateQueries({ queryKey: ['student-mentorship'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to unregister'),
  });

  const pending = registering || unregistering;
  const platform = PLATFORM_LABELS[session.meetingPlatform] ?? 'Online';

  return (
    <div className="card hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-surface-800 text-sm leading-snug">{session.title}</h3>
          <div className="text-xs text-surface-500 mt-1">
            by {session.hostId?.firstName} {session.hostId?.lastName}
            {session.hostId?.currentCompany && ` · ${session.hostId.currentCompany}`}
          </div>
        </div>
        <span className={`badge shrink-0 ${
          session.status === 'live'      ? 'badge-success' :
          session.status === 'completed' ? 'badge-neutral' :
          session.status === 'cancelled' ? 'badge-error'   : 'badge-info'
        }`}>
          {session.status === 'live' ? '🔴 Live' : session.status}
        </span>
      </div>

      {session.description && (
        <p className="text-xs text-surface-400 line-clamp-2 mb-3">{session.description}</p>
      )}

      {/* Topics */}
      {session.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {session.topics.slice(0, 4).map(t => (
            <span key={t}
              className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-medium rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="space-y-1.5 mb-4 text-xs text-surface-500">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="shrink-0" />
          <span>{fmt(session.scheduledAt)} · {fmtTime(session.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="shrink-0" />
          <span>{session.durationMinutes} minutes · {platform}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={11} className="shrink-0" />
          <span>
            {session.attendees?.length ?? 0} / {session.maxAttendees} registered
            {isFull && !isRegistered && <span className="text-red-400 ml-1">(Full)</span>}
          </span>
        </div>
      </div>

      {/* Registration */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-100 gap-2">
        {isRegistered ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle size={13} />
              You're registered
            </div>
            <div className="flex items-center gap-2">
              {session.meetingLink && session.status !== 'cancelled' && (
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm gap-1">
                  <Video size={11} /> Join
                </a>
              )}
              {isUpcoming && (
                <button
                  className="btn btn-ghost btn-sm gap-1 text-red-500 hover:bg-red-50"
                  disabled={pending}
                  onClick={() => unregister()}>
                  <UserMinus size={11} />
                  Unregister
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11px] text-surface-400">
              {session.spotsRemaining > 0 ? `${session.spotsRemaining} spots left` : 'Session full'}
            </div>
            {isUpcoming && !isFull && session.status === 'scheduled' && (
              <button
                className="btn btn-primary btn-sm gap-1"
                disabled={pending}
                onClick={() => register()}>
                <UserPlus size={11} />
                {pending ? 'Processing…' : 'Register'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StudentMentorship = () => {
  const { user }            = useAuthStore();
  const [status, setStatus] = useState('');

  const STATUS_TABS = [
    { key: '',           label: 'All'       },
    { key: 'scheduled',  label: 'Upcoming'  },
    { key: 'live',       label: 'Live Now'  },
    { key: 'completed',  label: 'Past'      },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['student-mentorship', status],
    queryFn:  () => mentorshipService.list({ limit: 50, ...(status ? { status } : {}) }),
    select:   r  => r.data?.sessions ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mentorship</h1>
          <p className="page-subtitle">Connect with alumni mentors and join live sessions.</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
              ${status === key
                ? 'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && (data ?? []).length === 0 && (
        <div className="card">
          <div className="empty-state py-16">
            <div className="empty-icon"><GraduationCap size={22} className="text-surface-400" /></div>
            <p className="empty-title">No sessions available</p>
            <p className="empty-body">
              {status
                ? 'No sessions match this filter.'
                : 'Alumni mentorship sessions will appear here once available.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && (data ?? []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map(s => (
            <SessionCard key={s._id} session={s} myId={user?._id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentMentorship;
