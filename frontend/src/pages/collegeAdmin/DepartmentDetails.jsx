import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users, GraduationCap, BookOpen, UserCog,
  ArrowLeft, Plus, RefreshCw, CheckCircle, Trash2,
  AlertTriangle, Clock, UserMinus, UserCheck, ChevronDown, ChevronUp,
  History, ShieldAlert,
} from 'lucide-react';
import { departmentsService } from '../../services/index.js';
import { ROLE_LABELS } from '../../utils/helpers.js';

// ── Reusable sub-components ───────────────────────────────────────────────────

const CountCard = ({ icon: Icon, label, value, gradient }) => (
  <div className="stat-card">
    <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: gradient }} />
    <div className="flex items-center gap-3">
      <div className="stat-icon" style={{ background: gradient }}>
        <Icon size={18} className="text-white" strokeWidth={2} />
      </div>
      <div>
        <div className="stat-value">{value ?? 0}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  </div>
);

const ConfirmModal = ({ title, body, confirmLabel, danger = false, onConfirm, onCancel, isPending }) => (
  <div className="modal-overlay">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4 animate-fade-in">
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle size={16} className={danger ? 'text-red-600' : 'text-amber-600'} />
        </div>
        <div>
          <div className="font-semibold text-surface-800">{title}</div>
          <p className="text-sm text-surface-500 mt-1">{body}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>Cancel</button>
        <button
          className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={isPending}>
          {isPending ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// Avatar initials bubble
const Avatar = ({ user, size = 'md' }) => {
  const dim = size === 'lg' ? 'w-12 h-12 text-sm' : 'w-9 h-9 text-xs';
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                     flex items-center justify-center text-white font-semibold shrink-0`}>
      {user?.profileImage?.url
        ? <img src={user.profileImage.url} className="w-full h-full object-cover rounded-full" alt="" />
        : initials
      }
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const DepartmentDetails = () => {
  const { id } = useParams();
  const qc = useQueryClient();

  // Panel state
  const [panel, setPanel] = useState(null); // null | 'assign' | 'create'
  const [showPrevious, setShowPrevious] = useState(false);

  // Form state
  const [assignUserId, setAssignUserId] = useState('');
  const [newAdmin, setNewAdmin] = useState({ firstName: '', lastName: '', email: '', password: '' });

  // Confirm modal state
  const [confirmAction, setConfirmAction] = useState(null);
  // { type: 'remove' | 'permanentDelete', userId?, userName? }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dept-details', id] });
    qc.invalidateQueries({ queryKey: ['dept-faculty', id] });
  };

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: dept, isLoading } = useQuery({
    queryKey: ['dept-details', id],
    queryFn:  () => departmentsService.getDetails(id),
    select:   r  => r.data?.department,
  });

  const { data: facultyData } = useQuery({
    queryKey: ['dept-faculty', id],
    queryFn:  () => departmentsService.listFaculty(id),
    select:   r  => r.data,
    enabled:  panel === 'assign',
  });

  const faculty      = facultyData?.users      ?? [];
  const previousHODs = facultyData?.previousHODs ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: () => departmentsService.assignAdmin(id, { userId: assignUserId }),
    onSuccess: () => {
      toast.success('HOD assigned successfully');
      invalidate();
      setPanel(null);
      setAssignUserId('');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to assign HOD'),
  });

  const { mutate: createAdmin, isPending: creating } = useMutation({
    mutationFn: () => departmentsService.createAdmin(id, newAdmin),
    onSuccess: () => {
      toast.success('HOD account created and assigned');
      invalidate();
      setPanel(null);
      setNewAdmin({ firstName: '', lastName: '', email: '', password: '' });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to create HOD'),
  });

  // Unlinks current HOD → kept as faculty in the college
  const { mutate: removeAdmin, isPending: removing } = useMutation({
    mutationFn: () => departmentsService.removeAdmin(id),
    onSuccess: () => {
      toast.success('HOD unlinked — account preserved as faculty');
      invalidate();
      setConfirmAction(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to remove HOD'),
  });

  // Hard-deletes a previous HOD account permanently
  const { mutate: permanentDelete, isPending: deleting } = useMutation({
    mutationFn: (userId) => departmentsService.permanentlyRemoveAdmin(id, userId),
    onSuccess: () => {
      toast.success('Previous HOD account permanently deleted');
      invalidate();
      setConfirmAction(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to delete account'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────────

  const adminName = dept?.admin
    ? `${dept.admin.firstName} ${dept.admin.lastName}`
    : '';

  const previousAdmins = dept?.previousAdmins ?? [];

  const createValid =
    newAdmin.firstName.trim() &&
    newAdmin.email.trim() &&
    newAdmin.password.length >= 8;

  // ── Render ────────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="space-y-4 max-w-4xl">
      <div className="skeleton h-10 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-56 rounded-2xl" />
    </div>
  );

  if (!dept) return (
    <div className="card max-w-4xl">
      <div className="empty-state">
        <p className="empty-title text-red-500">Department not found</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">

      {/* ── Confirm modal ── */}
      {confirmAction?.type === 'remove' && (
        <ConfirmModal
          title={`Unlink ${adminName} as HOD?`}
          body="Their HOD role will be removed and they'll be downgraded to faculty. Their account, department data, and all member records remain fully intact. You can re-assign them anytime."
          confirmLabel="Unlink HOD"
          onConfirm={() => removeAdmin()}
          onCancel={() => setConfirmAction(null)}
          isPending={removing}
        />
      )}

      {confirmAction?.type === 'permanentDelete' && (
        <ConfirmModal
          title={`Permanently delete ${confirmAction.userName}?`}
          body="This will permanently delete their account. Department data (students, notes, events) will not be affected. This cannot be undone."
          confirmLabel="Delete Account"
          danger
          onConfirm={() => permanentDelete(confirmAction.userId)}
          onCancel={() => setConfirmAction(null)}
          isPending={deleting}
        />
      )}

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Link to="/admin/departments"
          className="p-2 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-500 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="page-title">{dept.name}</h1>
          <p className="page-subtitle">
            {dept.code ?? 'No code'}{dept.description ? ` · ${dept.description}` : ''}
          </p>
        </div>
        <span className={`badge text-xs shrink-0 ${dept.isActive ? 'badge-success' : 'badge-danger'}`}>
          {dept.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <CountCard icon={Users}        label="Students" value={dept.studentCount} gradient="linear-gradient(135deg, #1D4ED8, #3B82F6)" />
        <CountCard icon={BookOpen}     label="Faculty"  value={dept.facultyCount} gradient="linear-gradient(135deg, #27272D, #52525C)" />
        <CountCard icon={GraduationCap}label="Alumni"   value={dept.alumniCount}  gradient="linear-gradient(135deg, #D97706, #FCD34D)" />
      </div>

      {/* ── HOD card ── */}
      <div className="card space-y-4">

        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
              <UserCog size={14} className="text-primary-600" />
            </div>
            <span className="font-semibold text-surface-800 text-[13.5px]">Head of Department (HOD)</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {dept.admin && (
              <button
                onClick={() => setConfirmAction({ type: 'remove' })}
                className="btn btn-ghost btn-sm gap-1 text-amber-600 hover:bg-amber-50 border border-amber-200">
                <UserMinus size={13} /> Unlink HOD
              </button>
            )}
            <button
              onClick={() => setPanel(panel === 'assign' ? null : 'assign')}
              className="btn btn-ghost btn-sm gap-1 text-surface-600">
              <RefreshCw size={13} /> {dept.admin ? 'Reassign' : 'Assign HOD'}
            </button>
            <button
              onClick={() => setPanel(panel === 'create' ? null : 'create')}
              className="btn btn-primary btn-sm gap-1">
              <Plus size={13} /> Create New HOD
            </button>
          </div>
        </div>

        {/* Current HOD display */}
        {dept.admin ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-50 border border-surface-100">
            <Avatar user={dept.admin} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-surface-800 text-[13.5px]">{adminName}</div>
              <div className="text-[11px] text-surface-400">{dept.admin.email}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CheckCircle size={15} className="text-green-500" />
              <span className="text-[11px] font-semibold text-green-600">Active HOD</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/40 text-center">
            <UserCog size={20} className="mx-auto mb-1 text-amber-400" />
            <p className="text-sm text-amber-700 font-semibold">No HOD assigned</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Department members can still log in. Assign a HOD to re-enable validation and management.
            </p>
          </div>
        )}

        {/* ── Assign panel ── */}
        {panel === 'assign' && (
          <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-4">
            <div className="text-sm font-semibold text-surface-700">Assign Existing Person as HOD</div>

            {/* Previous HODs of this department */}
            {previousHODs.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-2">
                  Previous HODs of this department
                </p>
                <div className="space-y-2">
                  {previousHODs.map(u => (
                    <button
                      key={u._id}
                      onClick={() => setAssignUserId(u._id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                        ${assignUserId === u._id
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-surface-200 hover:border-primary-200 hover:bg-surface-50'}`}>
                      <Avatar user={u} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-surface-800">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-[11px] text-surface-400">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <History size={12} className="text-surface-400" />
                        <span className="text-[10px] text-surface-400">Previous HOD</span>
                      </div>
                      {assignUserId === u._id && (
                        <CheckCircle size={15} className="text-primary-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {faculty.length > 0 && (
                  <div className="h-px bg-surface-200 my-3" />
                )}
              </div>
            )}

            {/* Faculty list */}
            {faculty.length > 0 ? (
              <div>
                {previousHODs.length > 0 && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-2">
                    Faculty &amp; Staff
                  </p>
                )}
                <select
                  className="input text-sm"
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}>
                  <option value="">— Select a person —</option>
                  {faculty.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} — {u.email}
                      {u.role === 'deptAdmin' ? ' (current HOD of another dept)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : previousHODs.length === 0 && (
              <p className="text-sm text-surface-400">
                No eligible faculty found. Create a new HOD account instead.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost btn-sm" onClick={() => { setPanel(null); setAssignUserId(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm gap-1"
                disabled={!assignUserId || assigning}
                onClick={() => assign()}>
                {assigning
                  ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Assigning…</>
                  : <><UserCheck size={13} /> Assign as HOD</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Create panel ── */}
        {panel === 'create' && (
          <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3">
            <div>
              <div className="text-sm font-semibold text-surface-700">Create New HOD Account</div>
              <p className="text-[11px] text-surface-400 mt-0.5">
                A new account will be created with HOD access for this department.
                {dept.admin && ' The current HOD will be downgraded to faculty.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">First Name *</label>
                <input className="input" placeholder="First name"
                  value={newAdmin.firstName}
                  onChange={e => setNewAdmin(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Last Name</label>
                <input className="input" placeholder="Last name"
                  value={newAdmin.lastName}
                  onChange={e => setNewAdmin(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="field-label">Email *</label>
              <input className="input" type="email" placeholder="hod@college.edu"
                value={newAdmin.email}
                onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Password *</label>
              <input className="input" type="password" placeholder="Min 8 characters"
                value={newAdmin.password}
                onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setPanel(null); setNewAdmin({ firstName: '', lastName: '', email: '', password: '' }); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm gap-1"
                disabled={!createValid || creating}
                onClick={() => createAdmin()}>
                {creating
                  ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</>
                  : <><Plus size={13} /> Create HOD</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Previous HODs section ── */}
      {previousAdmins.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowPrevious(v => !v)}
            className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center">
                <History size={14} className="text-surface-500" />
              </div>
              <span className="font-semibold text-surface-700 text-[13.5px]">
                Previous HODs
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                {previousAdmins.length}
              </span>
            </div>
            {showPrevious
              ? <ChevronUp size={15} className="text-surface-400" />
              : <ChevronDown size={15} className="text-surface-400" />
            }
          </button>

          {showPrevious && (
            <div className="mt-4 space-y-2">
              <p className="text-[11.5px] text-surface-400 mb-3">
                These accounts are preserved as faculty. You can reassign them as HOD anytime,
                or permanently delete their accounts if no longer needed.
                Department data is never affected.
              </p>

              {previousAdmins.map((entry, idx) => {
                const u = entry.userId;
                if (!u || typeof u !== 'object') return null;
                const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
                const isReassigned = entry.reason === 'reassigned';

                return (
                  <div key={u._id ?? idx}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-50 border border-surface-100">
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-surface-800">{name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-surface-100 text-surface-400'
                        }`}>
                          {u.isActive ? ROLE_LABELS[u.role] ?? u.role : 'Inactive'}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          isReassigned
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {isReassigned ? 'Reassigned' : 'Removed'}
                        </span>
                      </div>
                      <div className="text-[11px] text-surface-400 mt-0.5">{u.email}</div>
                      {entry.removedAt && (
                        <div className="flex items-center gap-1 text-[10px] text-surface-300 mt-0.5">
                          <Clock size={9} />
                          {new Date(entry.removedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Re-assign shortcut */}
                      <button
                        onClick={() => { setAssignUserId(u._id); setPanel('assign'); }}
                        className="btn btn-ghost btn-sm gap-1 text-primary-600 hover:bg-primary-50 text-[11px]">
                        <RefreshCw size={11} /> Reassign
                      </button>
                      {/* Permanent delete */}
                      <button
                        onClick={() => setConfirmAction({ type: 'permanentDelete', userId: u._id, userName: name })}
                        className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Permanently delete account">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Data safety notice */}
              <div className="flex items-start gap-2.5 mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <ShieldAlert size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-blue-700 leading-relaxed">
                  <strong>Data safety:</strong> Removing or changing a HOD never affects students,
                  faculty, notes, events, or any department records. All data belongs to the
                  department, not to any individual HOD.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentDetails;
