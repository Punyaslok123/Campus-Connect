import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, MapPin, ExternalLink, Search, Building2, Clock, Tag,
} from 'lucide-react';
import { jobsService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

const TYPE_TABS = [
  { key: '',           label: 'All'         },
  { key: 'job',        label: 'Jobs'        },
  { key: 'internship', label: 'Internships' },
];

const JobCard = ({ job }) => {
  const isInternship = job.type === 'internship';
  const deadline     = fmt(job.deadline);
  const isExpired    = job.deadline && new Date(job.deadline) < new Date();

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 overflow-hidden">
          {job.companyLogoUrl
            ? <img src={job.companyLogoUrl} className="w-full h-full object-cover" alt="" />
            : <Building2 size={18} className="text-surface-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-surface-800 text-sm leading-snug">{job.title}</h3>
            <span className={`badge shrink-0 ${isInternship ? 'badge-secondary' : 'badge-primary'}`}>
              {job.type}
            </span>
          </div>
          <div className="text-xs text-surface-500 mt-0.5">{job.company}</div>
        </div>
      </div>

      {job.description && (
        <p className="text-xs text-surface-400 line-clamp-2 mb-3">{job.description}</p>
      )}

      <div className="space-y-1.5 mb-4">
        {job.location && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <MapPin size={11} className="shrink-0" />
            <span>{job.isRemote ? 'Remote' : job.location}</span>
          </div>
        )}
        {isInternship && job.duration && (
          <div className="flex items-center gap-1.5 text-xs text-surface-500">
            <Clock size={11} className="shrink-0" />
            <span>{job.duration}</span>
          </div>
        )}
        {deadline && (
          <div className={`flex items-center gap-1.5 text-xs ${isExpired ? 'text-red-400' : 'text-surface-500'}`}>
            <Clock size={11} className="shrink-0" />
            <span>{isExpired ? 'Deadline passed' : `Apply by ${deadline}`}</span>
          </div>
        )}
      </div>

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {job.skills.slice(0, 4).map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-100
                                     text-surface-600 text-[10px] font-medium rounded-full">
              {s}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-surface-100 text-surface-400 text-[10px] rounded-full">
              +{job.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-surface-100">
        <div className="text-[11px] text-surface-400">
          Posted by {job.postedBy?.firstName} {job.postedBy?.lastName}
          {job.postedBy?.currentCompany && ` · ${job.postedBy.currentCompany}`}
        </div>
        {job.applyLink && !isExpired && (
          <a
            href={job.applyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm gap-1">
            Apply <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
};

const StudentJobs = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]         = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', typeFilter, search],
    queryFn:  () => jobsService.list({
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(search     ? { search }           : {}),
      limit: 50,
    }),
    select: r => r.data?.jobs ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Opportunities</h1>
          <p className="page-subtitle">Jobs and internships posted by alumni.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50">
          {TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
                ${typeFilter === key
                  ? 'bg-white text-surface-800 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-7 text-sm w-full"
            placeholder="Search by title, company, skills…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && (data ?? []).length === 0 && (
        <div className="card">
          <div className="empty-state py-16">
            <div className="empty-icon"><Briefcase size={22} className="text-surface-400" /></div>
            <p className="empty-title">No opportunities yet</p>
            <p className="empty-body">Alumni-posted jobs and internships will appear here.</p>
          </div>
        </div>
      )}

      {!isLoading && (data ?? []).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data ?? []).map(job => <JobCard key={job._id} job={job} />)}
        </div>
      )}
    </div>
  );
};

export default StudentJobs;
