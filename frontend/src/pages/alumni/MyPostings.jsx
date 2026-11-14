import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Briefcase, Plus, Trash2, ExternalLink, Calendar,
  MapPin, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jobsService } from '../../services/index.js';

const MyPostings = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all'); // all | job | internship

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['my-jobs'],
    queryFn:  jobsService.myPosts,
    select:   r => r.data?.jobs ?? [],
  });

  const { mutate: deleteJob, isPending: deleting } = useMutation({
    mutationFn: (id) => jobsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Posting deleted successfully');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to delete posting'),
  });

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, status }) => jobsService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Posting status updated');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to update status'),
  });

  const filteredJobs = jobs.filter(j => filter === 'all' || j.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-800">My Postings</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage all jobs and internships you have posted for students.
          </p>
        </div>
        <Link to="/alumni/post-job" className="btn btn-primary btn-sm gap-1.5">
          <Plus size={15} />
          <span>Post Opportunity</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: `All (${jobs.length})` },
          { key: 'job', label: `Jobs (${jobs.filter(j => j.type === 'job').length})` },
          { key: 'internship', label: `Internships (${jobs.filter(j => j.type === 'internship').length})` },
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
      ) : filteredJobs.length === 0 ? (
        <div className="card text-center py-12">
          <Briefcase size={36} className="mx-auto mb-3 text-surface-300" />
          <h3 className="text-sm font-semibold text-surface-700">No postings yet</h3>
          <p className="text-xs text-surface-400 mt-1 max-w-sm mx-auto">
            {filter === 'all'
              ? 'You have not created any job or internship postings yet.'
              : `No ${filter} postings found.`}
          </p>
          <Link to="/alumni/post-job" className="btn btn-primary btn-sm gap-1.5 mt-4 inline-flex">
            <Plus size={14} />
            <span>Create your first posting</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map(job => (
            <div key={job._id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-surface-800 text-sm">{job.title}</h3>
                  <span className={`badge ${job.type === 'job' ? 'badge-primary' : 'badge-secondary'}`}>
                    {job.type}
                  </span>
                  <span className={`badge ${job.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                    {job.status}
                  </span>
                  {job.isRemote && (
                    <span className="text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                      Remote
                    </span>
                  )}
                </div>

                <div className="text-xs text-surface-500 font-medium mt-1">
                  {job.company}
                </div>

                <p className="text-xs text-surface-400 mt-1.5 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center gap-4 mt-3 text-[11px] text-surface-400 flex-wrap">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {job.location}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Deadline: {new Date(job.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Posted: {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                {job.applyLink && (
                  <a
                    href={job.applyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors"
                    title="Open Apply Link"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  onClick={() => toggleStatus({
                    id: job._id,
                    status: job.status === 'active' ? 'closed' : 'active',
                  })}
                  className="btn btn-ghost btn-sm text-xs"
                  title="Toggle status"
                >
                  {job.status === 'active' ? 'Close' : 'Reactivate'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this posting?')) {
                      deleteJob(job._id);
                    }
                  }}
                  disabled={deleting}
                  className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                  title="Delete posting"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPostings;
