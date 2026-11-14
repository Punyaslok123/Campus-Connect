import { useQuery }       from '@tanstack/react-query';
import { Link }           from 'react-router-dom';
import {
  Building2, CreditCard, AlertTriangle, TrendingUp,
  Clock, IndianRupee, ChevronRight,
} from 'lucide-react';
import { collegesService } from '../../services/index.js';

const StatCard = ({ icon: Icon, label, value, color, loading }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-2">
      <span className="stat-label">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.bg}`}>
        <Icon size={15} className={color.text} />
      </div>
    </div>
    {loading
      ? <div className="skeleton h-7 w-16 mt-1" />
      : <div className={`stat-value ${color.text}`}>{value ?? 0}</div>
    }
  </div>
);

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const OwnerDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['owner-stats'],
    queryFn:  collegesService.stats,
    select:   r => r.data,
  });

  const { data: collegesData, isLoading: collegesLoading } = useQuery({
    queryKey: ['colleges-list', { limit: 10 }],
    queryFn:  () => collegesService.list({ limit: 10 }),
    select:   r => r.data,
  });

  const colleges = collegesData?.colleges ?? [];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="page-subtitle">Real-time snapshot of all colleges on Campus Connect.</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Building2}     label="Total Colleges"
          value={stats?.total} loading={statsLoading}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
        />
        <StatCard
          icon={TrendingUp}    label="Active"
          value={stats?.active} loading={statsLoading}
          color={{ bg: 'bg-green-50', text: 'text-green-600' }}
        />
        <StatCard
          icon={AlertTriangle} label="Inactive"
          value={stats?.inactive} loading={statsLoading}
          color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
        />
        <StatCard
          icon={AlertTriangle} label="Suspended"
          value={stats?.suspended} loading={statsLoading}
          color={{ bg: 'bg-red-50', text: 'text-red-600' }}
        />
        <StatCard
          icon={Clock}         label="Expiring ≤30d"
          value={stats?.expiringSoon} loading={statsLoading}
          color={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
        />
        <StatCard
          icon={IndianRupee}   label="Total Revenue"
          value={stats?.revenueINR != null ? `₹${stats.revenueINR.toLocaleString('en-IN')}` : '—'}
          loading={statsLoading}
          color={{ bg: 'bg-purple-50', text: 'text-purple-600' }}
        />
      </div>

      {/* Recent colleges */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-surface-800">Recent Colleges</div>
          <Link to="/owner/colleges" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {collegesLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : colleges.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Building2 size={22} className="text-surface-400" /></div>
            <p className="empty-title">No colleges yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-surface-400 uppercase tracking-wide border-b border-surface-100">
                  <th className="pb-3 text-left">College</th>
                  <th className="pb-3 text-left hidden sm:table-cell">Domain</th>
                  <th className="pb-3 text-left">Status</th>
                  <th className="pb-3 text-left hidden md:table-cell">Plan</th>
                  <th className="pb-3 text-left hidden md:table-cell">Expires</th>
                  <th className="pb-3 text-left hidden lg:table-cell">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map(c => (
                  <tr key={c._id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="py-3">
                      <Link to={`/owner/colleges`} className="font-medium text-surface-800 hover:text-primary-600 transition-colors">
                        {c.name}
                      </Link>
                      {c.admin && (
                        <div className="text-[11px] text-surface-400">{c.admin.email}</div>
                      )}
                    </td>
                    <td className="py-3 text-surface-500 font-mono text-xs hidden sm:table-cell">{c.domain}</td>
                    <td className="py-3">
                      <span className={`badge ${
                        c.status === 'active'    ? 'badge-success' :
                        c.status === 'suspended' ? 'badge-danger'  : 'badge-warning'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-surface-500 text-xs hidden md:table-cell">
                      {c.subscription?.planLabel ?? '—'}
                    </td>
                    <td className="py-3 text-surface-500 text-xs hidden md:table-cell">
                      {fmt(c.subscription?.endDate)}
                    </td>
                    <td className="py-3 text-xs hidden lg:table-cell">
                      {c.daysRemaining > 0
                        ? <span className={c.daysRemaining <= 30 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                            {c.daysRemaining}d
                          </span>
                        : <span className="text-surface-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
