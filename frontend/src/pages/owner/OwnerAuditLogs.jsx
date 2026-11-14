import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.js';

const OwnerAuditLogs = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn:  () => api.get('/audit-logs').then(r => r.data),
    select: r => r.data?.logs ?? [],
  });

  const ACTION_COLORS = {
    SUBSCRIPTION_ACTIVATED: 'badge-success',
    SUBSCRIPTION_EXPIRED:   'badge-danger',
    USER_ROLE_CHANGED:      'badge-warning',
    NOTE_DELETED:           'badge-danger',
    USER_VERIFIED:          'badge-success',
    USER_DEACTIVATED:       'badge-neutral',
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-surface-800 mb-6">Audit Logs</h1>
      <div className="card">
        {isLoading ? (
          <div className="text-sm text-surface-400 py-8 text-center">Loading audit logs…</div>
        ) : (
          <div className="flex flex-col divide-y divide-surface-100">
            {(data ?? []).map(log => (
              <div key={log._id} className="py-3 flex items-start gap-3">
                <span className={`badge ${ACTION_COLORS[log.action] ?? 'badge-neutral'} shrink-0 mt-0.5`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-600 truncate">
                    {log.performedByRole} · {log.targetModel ?? 'System'}
                  </div>
                  <div className="text-[11px] text-surface-400 font-mono">{log.ipAddress}</div>
                </div>
                <div className="text-[11px] text-surface-400 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
            {!data?.length && <div className="py-8 text-center text-sm text-surface-400">No audit logs found</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerAuditLogs;
