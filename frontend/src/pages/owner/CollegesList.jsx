import { useState }                            from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast                                     from 'react-hot-toast';
import {
  Building2, Search, CheckCircle, XCircle,
  RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { collegesService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ status }) => {
  const map = {
    active:    'badge-success',
    inactive:  'badge-warning',
    suspended: 'badge-danger',
  };
  return <span className={`badge ${map[status] ?? 'badge-warning'}`}>{status}</span>;
};

const DeactivateModal = ({ college, onConfirm, onCancel, isPending }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 animate-fade-in">
        <div className="font-semibold text-surface-800 mb-1">Suspend {college.name}?</div>
        <p className="text-sm text-surface-500 mb-4">
          Users at this college will lose access. You can reactivate at any time.
        </p>
        <div className="mb-4">
          <label className="field-label">Reason (optional)</label>
          <input
            className="input"
            placeholder="e.g. Payment overdue"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => onConfirm(reason)} disabled={isPending}>
            {isPending ? 'Suspending…' : 'Suspend'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CollegesList = () => {
  const qc = useQueryClient();
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);
  const [deactivating, setDeactivating] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['colleges-list', { search, status, page }],
    queryFn:  () => collegesService.list({ search, status: status || undefined, page, limit: 20 }),
    select:   r => r.data,
    keepPreviousData: true,
  });

  const colleges = data?.colleges ?? [];
  const pages    = data?.pages ?? 1;

  const { mutate: activate, isPending: activating } = useMutation({
    mutationFn: (id) => collegesService.activate(id),
    onSuccess: (_, id) => {
      toast.success('College activated');
      qc.invalidateQueries({ queryKey: ['colleges-list'] });
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to activate'),
  });

  const { mutate: deactivate, isPending: deactivatePending } = useMutation({
    mutationFn: ({ id, reason }) => collegesService.deactivate(id, { reason }),
    onSuccess: () => {
      toast.success('College suspended');
      setDeactivating(null);
      qc.invalidateQueries({ queryKey: ['colleges-list'] });
      qc.invalidateQueries({ queryKey: ['owner-stats'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to suspend'),
  });

  return (
    <div className="space-y-6">
      {deactivating && (
        <DeactivateModal
          college={deactivating}
          onConfirm={(reason) => deactivate({ id: deactivating._id, reason })}
          onCancel={() => setDeactivating(null)}
          isPending={deactivatePending}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">All Colleges</h1>
          <p className="page-subtitle">Manage college status and subscription data.</p>
        </div>
        <button onClick={() => refetch()} className="btn btn-ghost btn-sm gap-1">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search by college name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-40 text-sm"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
          </div>
        ) : colleges.length === 0 ? (
          <div className="empty-state py-16">
            <div className="empty-icon"><Building2 size={22} className="text-surface-400" /></div>
            <p className="empty-title">No colleges found</p>
            <p className="empty-body">Try adjusting the search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-surface-400 uppercase tracking-wide border-b border-surface-100 bg-surface-50">
                  <th className="px-4 py-3 text-left">College</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Domain</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Plan</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Expires</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Days Left</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {colleges.map(c => (
                  <tr key={c._id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-800">{c.name}</div>
                      {c.admin && (
                        <div className="text-[11px] text-surface-400">
                          {c.admin.firstName} {c.admin.lastName} · {c.admin.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-500 font-mono text-xs hidden sm:table-cell">
                      {c.domain}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                      {c.statusReason && (
                        <div className="text-[10px] text-surface-400 mt-0.5 max-w-[120px] truncate"
                             title={c.statusReason}>
                          {c.statusReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs hidden md:table-cell">
                      {c.subscription?.planLabel ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs hidden md:table-cell">
                      {fmt(c.subscription?.endDate)}
                    </td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">
                      {c.daysRemaining > 0
                        ? <span className={c.daysRemaining <= 30 ? 'text-amber-600 font-semibold' : 'text-green-600'}>
                            {c.daysRemaining}d
                          </span>
                        : <span className="text-surface-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== 'active' ? (
                        <button
                          onClick={() => activate(c._id)}
                          disabled={activating}
                          className="btn btn-ghost btn-sm gap-1 text-green-600 hover:bg-green-50">
                          <CheckCircle size={13} /> Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeactivating(c)}
                          className="btn btn-ghost btn-sm gap-1 text-red-500 hover:bg-red-50">
                          <XCircle size={13} /> Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-surface-400">
            Page {page} of {pages} · {data?.total ?? 0} colleges
          </span>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm gap-1"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button
              className="btn btn-ghost btn-sm gap-1"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegesList;
