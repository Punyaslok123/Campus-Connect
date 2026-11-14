import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircle, XCircle, UserCheck, GraduationCap,
  Users, BookOpen, AlertCircle, Search, ChevronDown,
  Mail, Phone, Hash, Calendar, Briefcase, Award,
} from 'lucide-react';
import { usersService } from '../../services/index.js';

const ROLE_META = {
  student: { label: 'Student', icon: GraduationCap, badge: 'badge-info',      color: 'text-blue-600',   bg: 'bg-blue-50'   },
  faculty: { label: 'Faculty', icon: BookOpen,       badge: 'badge-warning',   color: 'text-amber-600',  bg: 'bg-amber-50'  },
  alumni:  { label: 'Alumni',  icon: Users,          badge: 'badge-secondary', color: 'text-purple-600', bg: 'bg-purple-50' },
};

const initials = (u) =>
  ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Detail field row ──────────────────────────────────────────────────────────
const Detail = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-surface-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-[10px] text-surface-400 uppercase tracking-wide font-medium">{label}</div>
        <div className="text-[12.5px] text-surface-700 font-medium">{value}</div>
      </div>
    </div>
  );
};

// ── User card with expandable details ─────────────────────────────────────────
const UserRow = ({ u, onApprove, onReject, approving }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = ROLE_META[u.role] ?? ROLE_META.student;
  const Icon = meta.icon;

  return (
    <div className="border-b border-surface-50 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50/60 transition-colors">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                        flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {initials(u)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-semibold text-surface-800">
              {u.firstName} {u.lastName}
            </span>
            <span className={`badge ${meta.badge} flex items-center gap-1`}>
              <Icon size={9} /> {meta.label}
            </span>
            {u.rollNumber && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-surface-100
                               text-surface-500 px-2 py-0.5 rounded-full font-mono font-medium">
                <Hash size={8} /> {u.rollNumber}
              </span>
            )}
          </div>
          <div className="text-[12px] text-surface-400 mt-0.5 truncate">{u.email}</div>
          {/* Quick preview for students */}
          {u.role === 'student' && u.semester && (
            <div className="text-[11px] text-surface-300 mt-0.5">Semester {u.semester}</div>
          )}
          {u.role === 'faculty' && u.designation && (
            <div className="text-[11px] text-surface-300 mt-0.5">{u.designation}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className={`p-1.5 rounded-lg transition-colors text-surface-400
              hover:bg-surface-100 hover:text-surface-600 ${expanded ? 'bg-surface-100 text-surface-600' : ''}`}
            title="View details">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button
            className="btn btn-sm btn-primary gap-1"
            disabled={approving}
            onClick={() => onApprove(u._id)}>
            <CheckCircle size={12} strokeWidth={2.5} />
            Approve
          </button>
          <button
            className="btn btn-sm btn-danger gap-1"
            onClick={() => onReject(u._id)}>
            <XCircle size={12} strokeWidth={2.5} />
            Reject
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className={`mx-5 mb-4 rounded-xl border border-surface-100 p-4 ${meta.bg}/40`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Common fields */}
            <Detail icon={Mail}     label="Email"        value={u.email} />
            <Detail icon={Phone}    label="Phone"        value={u.phone} />
            <Detail icon={Hash}     label={u.role === 'faculty' ? 'Employee No.' : 'Roll Number'} value={u.rollNumber} />
            <Detail icon={Calendar} label="Registered"   value={fmt(u.createdAt)} />

            {/* Student-only */}
            {u.role === 'student' && (
              <Detail icon={BookOpen} label="Semester" value={u.semester ? `Semester ${u.semester}` : null} />
            )}

            {/* Faculty-only */}
            {u.role === 'faculty' && (
              <Detail icon={Award} label="Designation" value={u.designation} />
            )}

            {/* Alumni-only */}
            {u.role === 'alumni' && (
              <>
                <Detail icon={Calendar}  label="Graduation Year" value={u.graduationYear?.toString()} />
                <Detail icon={Briefcase} label="Current Company" value={u.currentCompany} />
                <Detail icon={Award}     label="Current Role"    value={u.currentRole} />
              </>
            )}
          </div>

          {/* Bio */}
          {u.bio && (
            <div className="mt-3 pt-3 border-t border-surface-100">
              <div className="text-[10px] text-surface-400 uppercase tracking-wide font-medium mb-1">Bio</div>
              <p className="text-[12.5px] text-surface-600 leading-relaxed">{u.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const DeptValidation = () => {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [rejectId,   setRejectId]   = useState(null);
  const [reason,     setReason]     = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['dept-pending-users'],
    queryFn:  () => usersService.pending({ limit: 100 }),
    select:   r  => r.data?.users ?? [],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dept-pending-users'] });
    qc.invalidateQueries({ queryKey: ['dept-pending-count'] });
    qc.invalidateQueries({ queryKey: ['dept-stats'] });
  };

  const verify = useMutation({
    mutationFn: (id) => usersService.verify(id),
    onSuccess:  ()  => { invalidate(); toast.success('User verified successfully'); },
    onError:    e   => toast.error(e.response?.data?.message ?? 'Verification failed'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }) => usersService.reject(id, { reason }),
    onSuccess:  ()  => {
      invalidate();
      toast('User rejected');
      setRejectId(null);
      setReason('');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Rejection failed'),
  });

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchSearch = !search ||
      `${u.firstName} ${u.lastName} ${u.email} ${u.rollNumber ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = {
    all:     users.length,
    student: users.filter(u => u.role === 'student').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    alumni:  users.filter(u => u.role === 'alumni').length,
  };

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Validation</h1>
          <p className="page-subtitle">Review and approve new members joining your department.</p>
        </div>
        {users.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">{users.length} pending</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-8 text-sm"
            placeholder="Search by name, email or roll number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 shrink-0">
          {['all', 'student', 'faculty', 'alumni'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-colors
                ${roleFilter === role
                  ? 'bg-white text-surface-800 shadow-sm'
                  : 'text-surface-500 hover:text-surface-700'}`}>
              {role === 'all' ? 'All' : role}
              <span className="ml-1.5 text-[10px] tabular-nums">({counts[role] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="card space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-48" />
                <div className="skeleton h-3 w-36" />
              </div>
              <div className="skeleton h-7 w-7 rounded-lg" />
              <div className="skeleton h-7 w-20 rounded-lg" />
              <div className="skeleton h-7 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state py-14">
            <div className="empty-icon">
              <UserCheck size={22} className="text-emerald-500" />
            </div>
            <p className="empty-title">
              {users.length === 0 ? 'All caught up!' : 'No results found'}
            </p>
            <p className="empty-body">
              {users.length === 0
                ? 'No pending verifications. Check back later.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-surface-50">
            {filtered.map(u => (
              <UserRow
                key={u._id}
                u={u}
                approving={verify.isPending}
                onApprove={(id) => verify.mutate(id)}
                onReject={(id) => { setRejectId(id); setReason(''); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setRejectId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <XCircle size={18} className="text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-surface-800 text-[14px]">Reject User</div>
                <div className="text-xs text-surface-400">Provide a reason (optional)</div>
              </div>
            </div>
            <textarea
              className="input min-h-[80px] resize-none text-sm"
              placeholder="Reason for rejection…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm flex-1" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm flex-1 gap-1"
                disabled={reject.isPending}
                onClick={() => reject.mutate({ id: rejectId, reason: reason.trim() || 'Rejected by dept admin' })}>
                <XCircle size={12} />
                {reject.isPending ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptValidation;
