import { useQuery }     from '@tanstack/react-query';
import { Briefcase, GraduationCap } from 'lucide-react';
import { jobsService, mentorshipService } from '../../services/index.js';
import { Link }         from 'react-router-dom';
import useAuthStore     from '../../store/authStore.js';

const AlumniDashboard = () => {
  const { user } = useAuthStore();

  const { data: jobs = [] } = useQuery({
    queryKey: ['my-jobs'],
    queryFn:  jobsService.myPosts,
    select:   r => r.data?.jobs ?? [],
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['my-sessions'],
    queryFn:  mentorshipService.myHosted,
    select:   r => r.data?.sessions ?? [],
  });

  const studentsReached = sessions.reduce((s, sess) => s + (sess.attendees?.length ?? 0), 0);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold mb-0.5" style={{ color: '#18181B', letterSpacing: '-0.025em' }}>
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-sm" style={{ color: '#78716C' }}>
          {user?.currentRole}{user?.currentCompany ? ` at ${user.currentCompany}` : ''}
          {user?.graduationYear ? ` · Class of ${user.graduationYear}` : ''}
        </p>
      </div>

      {/* Hero CTAs */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        <Link to="/alumni/post-job"
          className="rounded-2xl p-6 group relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #141417 0%, #1A1A1F 50%, #1E1E24 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full"
            style={{ background: 'radial-gradient(circle, #F59E0B, transparent)', transform: 'translate(20%, -20%)' }} />
          <Briefcase size={22} className="text-white mb-3 relative z-10" />
          <div className="text-white font-semibold relative z-10">Post a Job or Internship</div>
          <div className="text-sm mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Help students find opportunities
          </div>
        </Link>
        <Link to="/alumni/host-session"
          className="rounded-2xl p-6 group relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }}>
          <GraduationCap size={22} className="text-white mb-3" />
          <div className="text-white font-semibold">Host Mentorship Session</div>
          <div className="text-sm mt-1 text-white/60">Share your experience</div>
        </Link>
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { value: jobs.length,      label: 'Jobs Posted',      color: '#1D4ED8' },
          { value: sessions.length,  label: 'Sessions Hosted',  color: '#D97706' },
          { value: studentsReached,  label: 'Students Reached', color: '#065F46' },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent postings */}
      {jobs.length > 0 && (
        <div className="card">
          <div className="font-semibold text-sm mb-4" style={{ color: '#18181B' }}>My Recent Postings</div>
          <div className="flex flex-col divide-y divide-surface-50">
            {jobs.slice(0, 5).map(j => (
              <div key={j._id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#18181B' }}>{j.title}</div>
                  <div className="text-xs" style={{ color: '#78716C' }}>{j.company}</div>
                </div>
                <span className={`badge ${j.type === 'job' ? 'badge-primary' : 'badge-secondary'}`}>{j.type}</span>
                <span className={`badge ${j.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniDashboard;
