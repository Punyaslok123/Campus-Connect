import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Building2, BookOpen, Pin } from 'lucide-react';
import { announcementsService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TYPE_TABS = [
  { key: 'all',        label: 'All',          icon: Megaphone  },
  { key: 'college',    label: 'College-wide', icon: Building2  },
  { key: 'department', label: 'Department',   icon: BookOpen   },
];

const AnnouncementCard = ({ ann }) => {
  const isCollege = ann.audience === 'college' || !ann.departmentId;
  return (
    <div className={`card border-l-4 ${isCollege ? 'border-l-blue-400' : 'border-l-purple-400'}
                     ${ann.isPinned ? 'bg-amber-50/40 border-amber-200' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {ann.isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700
                             px-2 py-0.5 rounded-full font-semibold shrink-0">
              <Pin size={9} /> Pinned
            </span>
          )}
          <h3 className="font-semibold text-surface-800 text-sm leading-snug">{ann.title}</h3>
        </div>
        <span className={`badge shrink-0 ${isCollege ? 'badge-info' : 'badge-secondary'}`}>
          {isCollege ? 'College' : 'Dept'}
        </span>
      </div>

      <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-wrap mb-3">{ann.body}</p>

      <div className="flex items-center justify-between text-[11px] text-surface-400 pt-2 border-t border-surface-100">
        <span>
          {ann.postedBy?.firstName} {ann.postedBy?.lastName}
        </span>
        <span>{fmt(ann.createdAt)}</span>
      </div>
    </div>
  );
};

const FacultyAnnouncements = () => {
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['faculty-announcements'],
    queryFn:  () => announcementsService.list({ limit: 100 }),
    select:   r  => r.data?.announcements ?? [],
  });

  const announcements = (data ?? []).filter(a => {
    if (typeFilter === 'all')        return true;
    if (typeFilter === 'college')    return a.audience === 'college' || !a.departmentId;
    if (typeFilter === 'department') return a.audience === 'department' && !!a.departmentId;
    return true;
  });

  const pinned   = announcements.filter(a => a.isPinned);
  const unpinned = announcements.filter(a => !a.isPinned);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Updates from your college and department.</p>
        </div>
        {announcements.length > 0 && (
          <div className="text-[12px] font-semibold text-surface-500 shrink-0">
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
          </div>
        )}
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

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && announcements.length === 0 && (
        <div className="card">
          <div className="empty-state py-16">
            <div className="empty-icon"><Megaphone size={22} className="text-surface-400" /></div>
            <p className="empty-title">No announcements</p>
            <p className="empty-body">
              {typeFilter !== 'all'
                ? 'No announcements match this filter.'
                : 'College and department announcements will appear here.'}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && announcements.length > 0 && (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <Pin size={12} /> Pinned
              </div>
              {pinned.map(a => <AnnouncementCard key={a._id} ann={a} />)}
            </div>
          )}
          {unpinned.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <div className="text-xs font-semibold text-surface-400">All Announcements</div>
              )}
              {unpinned.map(a => <AnnouncementCard key={a._id} ann={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAnnouncements;
