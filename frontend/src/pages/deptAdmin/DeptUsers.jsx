import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  GraduationCap, Users, BookOpen, Search,
  UserX, UserCheck, Trash2, ShieldOff, Clock, UserCog,
} from 'lucide-react';
import { usersService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';
import { ROLE_LABELS } from '../../utils/helpers.js';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'all',     label: 'All Active', icon: Users,        color: null       },
  { key: 'student', label: 'Students',   icon: GraduationCap, color: null      },
  { key: 'faculty', label: 'Faculty',    icon: BookOpen,      color: null      },
  { key: 'alumni',  label: 'Alumni',     icon: UserCog,       color: null      },
  { key: 'pending', label: 'Pending',    icon: Clock,         color: 'amber'   },
  { key: 'blocked', label: 'Blocked',    icon: ShieldOff,     color: 'red'     },
];

const ROLE_BADGE = {
  student: 'badge-info',
  faculty: 'badge-warning',
  alumni:  'badge-secondary',
};

// ── Status badge — purely driven by isActive ──────────────────────────────────
const StatusBadge = ({ user }) => {
  // Pending: not yet verified (never approved)
  if (!user.isVerified && user.isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
        bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Pending
      </span>
    );
  }
  // Blocked: deactivated (isActive:false)
  if (!user.isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
        bg-red-50 text-red-600 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Blocked
      </span>
    );
  }
  // Active: verified + active
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0
      bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
};

const initials = (u) =>
  ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Component ─────────────────────────────────────────────────────────────────
const DeptUsers = () => {
  const qc           = useQueryClient();
  const { user: me } = useAuthStore();
  const [tab,    setTab]    = useState('all');
  const [search, setSearch] = useState('');

  const isPending = tab === 'pending';
  const isBlocked = tab === 'blocked';
  const isSpecial = isPending || isBlocked;

  // Active members (isVerified:true, isActive:true), optional role filter
  const activeParams = (!isSpecial && tab !== 'all') ? { role: tab } : {};

  const { data: activeData, isLoading: activeLoading } = useQuery({
    queryKey: ['dept-users-active', tab],
    queryFn:  () => usersService.list(activeParams),
    select:   r  => r.data ?? { users: [], pagination: {} },
    enabled:  !isSpecial,
  });

  // Pending: isVerified:false AND isActive:true (registered, awaiting approval)
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['dept-users-pending'],
    queryFn:  () => usersService.pending(),
    select:   r  => r.data ?? { users: [], pagination: {} },
    enabled:  isPending,
  });

  // Blocked: isActive:false (deactivated after approval)
  const { data: blockedData, isLoading: blockedLoading } = useQuery({
    queryKey: ['dept-users-blocked'],
    queryFn:  () => usersService.blocked(),
    select:   r  => r.data ?? { users: [], pagination: {} },
    enabled:  isBlocked,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  // Approve a pending user → sets isVerified:true (isActive stays true)
  const { mutate: approve } = useMutation({
    mutationFn: (id) => usersService.verify(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-users-pending'] });
      qc.invalidateQueries({ queryKey: ['dept-users-active'] });
      toast.success('User approved — they can now log in');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to approve'),
  });

  // Unblock a blocked user → sets isActive:true (isVerified unchanged)
  const { mutate: unblock } = useMutation({
    mutationFn: (id) => usersService.reactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-users-blocked'] });
      qc.invalidateQueries({ queryKey: ['dept-users-active'] });
      toast.success('User unblocked — they can now log in again');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to unblock'),
  });

  // Block an active user → sets isActive:false
  const { mutate: block } = useMutation({
    mutationFn: (id) => usersService.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-users-active'] });
      qc.invalidateQueries({ queryKey: ['dept-users-blocked'] });
      toast.success('User blocked');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to block'),
  });

  // Permanently remove (pending or blocked only) + cascade delete
  const { mutate: remove } = useMutation({
    mutationFn: (id) => usersService.permanentRemove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-users-pending'] });
      qc.invalidateQueries({ queryKey: ['dept-users-blocked'] });
      toast.success('User and all associated data permanently removed');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to remove'),
  });

  // ── Derived state ───────────────────────────────────────────────────────────
  const rawUsers = isPending
    ? (pendingData?.users ?? [])
    : isBlocked
      ? (blockedData?.users ?? [])
      : (activeData?.users ?? []);

  const users = rawUsers.filter(u => {
    if (!search) return true;
    const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.rollNumber ?? ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const isLoading  = isPending ? pendingLoading : isBlocked ? blockedLoading : activeLoading;
  const totalCount = isPending
    ? (pendingData?.pagination?.total ?? 0)
    : isBlocked
      ? (blockedData?.pagination?.total ?? 0)
      : (activeData?.pagination?.total  ?? 0);

  const currentTab = TABS.find(t => t.key === tab);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">
            {isPending
              ? 'Registered users awaiting approval — approve or remove permanently.'
              : isBlocked
                ? 'Deactivated users — unblock to restore access or remove permanently.'
                : 'Active, verified members in your department.'}
          </p>
        </div>
        {totalCount > 0 && (
          <div className="text-[12px] font-semibold text-surface-400 shrink-0">
            {totalCount} {isPending ? 'pending' : isBlocked ? 'blocked' : 'members'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 w-fit">
        {TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold
              transition-colors
              ${tab === key
                ? color === 'red'   ? 'bg-red-500 text-white shadow-sm'
                : color === 'amber' ? 'bg-amber-500 text-white shadow-sm'
                :                    'bg-white text-surface-800 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'}`}>
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          className="input pl-8 text-sm max-w-sm"
          placeholder={`Search ${currentTab?.label.toLowerCase() ?? 'members'}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="card space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="skeleton w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3.5 w-44" />
                <div className="skeleton h-3 w-32" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && users.length === 0 && (
        <div className="card">
          <div className="empty-state py-14">
            <div className="empty-icon">
              {isPending ? <Clock size={22} className="text-surface-400" />
                : isBlocked ? <ShieldOff size={22} className="text-surface-400" />
                : <Users size={22} className="text-surface-400" />}
            </div>
            <p className="empty-title">
              {isPending ? 'No pending users'
                : isBlocked ? 'No blocked users'
                : `No ${tab === 'all' ? 'active members' : tab + 's'} found`}
            </p>
            <p className="empty-body">
              {search
                ? 'Try a different search term.'
                : isPending ? 'New registrations awaiting approval will appear here.'
                : isBlocked ? 'Deactivated users will appear here.'
                : 'No active, verified members in your department yet.'}
            </p>
          </div>
        </div>
      )}

      {/* User list */}
      {!isLoading && users.length > 0 && (
        <div className="card p-0 overflow-hidden">
          {/* Banner for special tabs */}
          {isPending && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">
                {users.length} user{users.length !== 1 ? 's' : ''} awaiting approval
              </span>
            </div>
          )}
          {isBlocked && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
              <ShieldOff size={14} className="text-red-500" />
              <span className="text-xs font-semibold text-red-700">
                {users.length} blocked user{users.length !== 1 ? 's' : ''} — unblock to restore or remove permanently
              </span>
            </div>
          )}

          <div className="divide-y divide-surface-50">
            {users.map(u => (
              <div
                key={u._id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-50 transition-colors group">

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                                flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                  {u.profileImage?.url
                    ? <img src={u.profileImage.url} className="w-full h-full object-cover" alt="" />
                    : initials(u)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-surface-800 truncate">
                    {u.firstName} {u.lastName}
                  </div>
                  <div className="text-[12px] text-surface-400 truncate">{u.email}</div>
                  {u.rollNumber && (
                    <div className="text-[11px] text-surface-300">Roll: {u.rollNumber}</div>
                  )}
                </div>

                {/* Role badge */}
                <span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-neutral'} shrink-0`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>

                {/* Semester */}
                {u.semester && (
                  <span className="text-[11px] text-surface-400 shrink-0 hidden sm:block">
                    Sem {u.semester}
                  </span>
                )}

                {/* Status badge */}
                <StatusBadge user={u} />

                {/* Joined date */}
                <div className="text-[11px] text-surface-300 shrink-0 hidden md:block">
                  {fmt(u.createdAt)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isPending && (
                    <>
                      <button
                        title="Approve user"
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                        onClick={() => {
                          if (window.confirm(`Approve ${u.firstName} ${u.lastName}? They will be able to log in.`))
                            approve(u._id);
                        }}>
                        <UserCheck size={15} />
                      </button>
                      <button
                        title="Remove permanently"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        onClick={() => {
                          if (window.confirm(`Permanently remove ${u.firstName} ${u.lastName}? All their data will be deleted. This cannot be undone.`))
                            remove(u._id);
                        }}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}

                  {isBlocked && (
                    <>
                      <button
                        title="Unblock user"
                        className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                        onClick={() => {
                          if (window.confirm(`Unblock ${u.firstName} ${u.lastName}? They will be able to log in again.`))
                            unblock(u._id);
                        }}>
                        <UserCheck size={15} />
                      </button>
                      <button
                        title="Remove permanently"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                        onClick={() => {
                          if (window.confirm(`Permanently remove ${u.firstName} ${u.lastName}? All their data will be deleted. This cannot be undone.`))
                            remove(u._id);
                        }}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}

                  {!isSpecial && u._id !== me?._id && (
                    <button
                      title="Block user"
                      className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50
                                 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        if (window.confirm(`Block ${u.firstName} ${u.lastName}? They will not be able to log in.`))
                          block(u._id);
                      }}>
                      <UserX size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeptUsers;
