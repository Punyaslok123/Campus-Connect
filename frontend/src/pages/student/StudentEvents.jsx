import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Video, Building2, BookOpen, Clock } from 'lucide-react';
import { eventsService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const TYPE_TABS = [
  { key: 'all',        label: 'All Events',   icon: Calendar  },
  { key: 'college',    label: 'College-wide', icon: Building2 },
  { key: 'department', label: 'Department',   icon: BookOpen  },
];

const EventCard = ({ event }) => {
  const isCollege = event.organizerType === 'college';
  return (
    <div className="card group hover:shadow-md transition-shadow">
      {event.coverImage?.url ? (
        <img
          src={event.coverImage.url}
          alt={event.title}
          className="w-full h-36 object-cover rounded-xl mb-4 -mt-1"
        />
      ) : (
        <div className={`w-full h-36 rounded-xl mb-4 flex items-center justify-center
          ${isCollege ? 'bg-blue-50' : 'bg-purple-50'}`}>
          {isCollege
            ? <Building2 size={32} className="text-blue-300" />
            : <BookOpen size={32} className="text-purple-300" />
          }
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-surface-800 text-sm leading-snug">{event.title}</h3>
        <span className={`badge shrink-0 ${isCollege ? 'badge-info' : 'badge-secondary'}`}>
          {isCollege ? 'College' : 'Dept'}
        </span>
      </div>

      {event.description && (
        <p className="text-xs text-surface-400 line-clamp-2 mb-3">{event.description}</p>
      )}

      <div className="space-y-1.5 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <Clock size={11} className="shrink-0" />
          <span>{fmt(event.scheduledAt)} {fmtTime(event.scheduledAt) && `· ${fmtTime(event.scheduledAt)}`}</span>
        </div>
        {event.venue && !event.isOnline && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        )}
        {event.isOnline && event.meetingLink && (
          <div className="flex items-center gap-1.5 text-xs text-primary-600">
            <Video size={11} className="shrink-0" />
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline">
              Join Online
            </a>
          </div>
        )}
      </div>

      {event.status === 'live' && (
        <div className="mt-3 pt-3 border-t border-surface-100 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600">Live Now</span>
        </div>
      )}
    </div>
  );
};

const StudentEvents = () => {
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['student-events', typeFilter],
    queryFn:  () => eventsService.list({ limit: 50 }),
    select:   r  => r.data?.events ?? [],
  });

  const events = (data ?? []).filter(ev => {
    if (typeFilter === 'all')        return true;
    if (typeFilter === 'college')    return ev.organizerType === 'college';
    if (typeFilter === 'department') return ev.organizerType === 'department';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">Stay updated with college and department events.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 w-fit">
        {TYPE_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold
              transition-colors
              ${typeFilter === key
                ? 'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'}`}>
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="card">
          <div className="empty-state py-16">
            <div className="empty-icon"><Calendar size={22} className="text-surface-400" /></div>
            <p className="empty-title">No events found</p>
            <p className="empty-body">Check back later for upcoming events.</p>
          </div>
        </div>
      )}

      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => <EventCard key={ev._id} event={ev} />)}
        </div>
      )}
    </div>
  );
};

export default StudentEvents;
