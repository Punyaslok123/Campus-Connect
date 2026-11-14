import { Award, Construction } from 'lucide-react';

const StudentResults = () => (
  <div className="space-y-6">
    <div className="page-header">
      <div>
        <h1 className="page-title">Results</h1>
        <p className="page-subtitle">Your academic results and grade history.</p>
      </div>
    </div>

    <div className="card">
      <div className="empty-state py-20">
        <div className="empty-icon">
          <Construction size={28} className="text-surface-400" />
        </div>
        <p className="empty-title">Coming Soon</p>
        <p className="empty-body">
          The results section is under development. Check back soon for your academic results.
        </p>
      </div>
    </div>
  </div>
);

export default StudentResults;
