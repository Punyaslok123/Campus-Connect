import { Award, Construction, Clock } from 'lucide-react';

const UPCOMING = [
  { label: 'View semester-wise results',       status: 'planned'  },
  { label: 'Grade distribution charts',        status: 'planned'  },
  { label: 'Student performance tracking',     status: 'planned'  },
  { label: 'Export results to PDF / Excel',    status: 'planned'  },
];

const FacultyResults = () => (
  <div className="space-y-6">
    <div className="page-header">
      <div>
        <h1 className="page-title">Results</h1>
        <p className="page-subtitle">Academic results and grade management for your department.</p>
      </div>
    </div>

    <div className="card">
      <div className="empty-state py-16">
        <div className="empty-icon">
          <Construction size={28} className="text-surface-400" />
        </div>
        <p className="empty-title">Coming Soon</p>
        <p className="empty-body max-w-sm">
          The results module is under development. Faculty will be able to manage and review
          department results once this feature is live.
        </p>
      </div>
    </div>

    {/* Roadmap preview */}
    <div className="card space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
          <Clock size={14} className="text-amber-600" />
        </div>
        <span className="font-semibold text-surface-800 text-[13.5px]">Planned Features</span>
      </div>
      <div className="space-y-2.5">
        {UPCOMING.map(item => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-surface-300 shrink-0
                            flex items-center justify-center">
              <Award size={9} className="text-surface-300" />
            </div>
            <span className="text-[13px] text-surface-500">{item.label}</span>
            <span className="ml-auto text-[10px] bg-surface-100 text-surface-400 px-2 py-0.5 rounded-full font-medium">
              Planned
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default FacultyResults;
