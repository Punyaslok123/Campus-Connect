import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Plus, Trash2, ExternalLink, Calendar,
  Clock, Users, Video, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mentorshipService } from '../../services/index.js';

const MySessions = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all'); // all | upcoming | past

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['my-sessions'],
    queryFn:  mentorshipService.myHosted,
    select:   r => r.data?.sessions ?? [],
  });

  const { mutate: deleteSession, isPending: deleting } = useMutation({
    mutationFn: (id) => mentorshipService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-sessions'] });
      toast.success('Session deleted successfully');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to delete session'),
  });

  const now = new Date();
  const filteredSessions = sessions.filter(s => {
    if (filter === 'upcoming') return new Date(s.scheduledAt) >= now;
    if (filter === 'past') return new Date(s.scheduledAt) < now;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-800">My Mentorship Sessions</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage your scheduled and past mentorship sessions with students.
          </p>
        </div>
        <Link to="/alumni/host-session" className="btn btn-primary btn-sm gap-1.5">
          <Plus size={15} />
          <span>Host New Session</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: `All (${sessions.length})` },
          { key: 'upcoming', label: `Upcoming (${sessions.filter(s => new Date(s.scheduledAt) >= now).length})` },
          { key: 'past', label: `Past (${sessions.filter(s => new Date(s.scheduledAt) < now).length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t.key
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card text-center py-12">
          <GraduationCap size={36} className="mx-auto mb-3 text-surface-300" />
          <h3 className="text-sm font-semibold text-surface-700">No mentorship sessions yet</h3>
          <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto">
            {filter === 'all'
              ? 'You have not scheduled any mentorship sessions yet.'
              : `No ${filter} mentorship sessions found.`}
          </p>
          <Link to="/alumni/host-session" className="btn btn-primary btn-sm gap-1.5 mt-4 inline-flex">
            <Plus size={14} />
            <span>Host your first session</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map(sess => {
            const isPast = new Date(sess.scheduledAt) < now;
            const attendeeCount = sess.attendees?.length ?? 0;

            return (
              <div key={sess._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-surface-800 text-sm">{sess.title}</h3>
                    <span className={`badge ${
                      isPast ? 'badge-neutral' : sess.status === 'cancelled' ? 'badge-danger' : 'badge-success'
                    }`}>
                      {sess.status === 'cancelled' ? 'Cancelled' : isPast ? 'Completed' : 'Upcoming'}
                    </span>
                    <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium capitalize">
                      {sess.meetingPlatform?.replace('_', ' ') || 'Online'}
                    </span>
                  </div>

                  {sess.description && (
                    <p className="text-xs text-surface-500 mt-1.5 line-clamp-2">
                      {sess.description}
                    </p>
                  )}

                  {sess.topics && sess.topics.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {sess.topics.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-surface-100 text-surface-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Tag size={10} />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-[11px] text-surface-400 flex-wrap">
                    <span className="flex items-center gap-1 text-surface-600 font-medium">
                      <Calendar size={12} />
                      {new Date(sess.scheduledAt).toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {sess.durationMinutes || 60} mins
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {attendeeCount} / {sess.maxAttendees || '∞'} registered
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  {sess.meetingLink && !isPast && (
                    <a
                      href={sess.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm gap-1 text-xs"
                      title="Join Meeting Link"
                    >
                      <Video size={13} />
                      <span>Join Call</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this session?')) {
                        deleteSession(sess._id);
                      }
                    }}
                    disabled={deleting}
                    className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MySessions;
