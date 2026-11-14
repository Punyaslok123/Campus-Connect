import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Save, Lock, User, Briefcase, BookOpen, Plus, Trash2, X } from 'lucide-react';
import { settingsService, subjectsService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const FormSection = ({ title, icon: Icon, children }) => (
  <div className="card space-y-4">
    <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
        <Icon size={14} className="text-primary-600" />
      </div>
      <span className="font-semibold text-surface-800 text-[13.5px]">{title}</span>
    </div>
    {children}
  </div>
);

// ── Assigned Subjects section ─────────────────────────────────────────────────
const SEMESTERS = [1,2,3,4,5,6,7,8];

const AssignedSubjectsSection = ({ user, updateUser }) => {
  const qc  = useQueryClient();
  const deptId = user?.departmentId?._id ?? user?.departmentId ?? '';

  const [subjects, setSubjects]     = useState([]);
  const [adding, setAdding]         = useState(false);
  const [newSubj, setNewSubj]       = useState({ name: '', code: '', semester: '' });
  const [initialized, setInitialized] = useState(false);

  // Fetch fresh profile data to get the latest assignedSubjects from DB
  const { data: profileData } = useQuery({
    queryKey:  ['settings-profile'],
    queryFn:   settingsService.getProfile,
    select:    r => r.data?.user,
    staleTime: 0,
  });

  // Initialize subjects from fresh profile data (runs once after data loads)
  useEffect(() => {
    if (profileData && !initialized) {
      setSubjects(profileData.assignedSubjects ?? []);
      setInitialized(true);
    }
  }, [profileData, initialized]);

  // Load dept subjects for autocomplete
  const { data: deptSubjects } = useQuery({
    queryKey:  ['subjects', deptId],
    queryFn:   () => subjectsService.list({ departmentId: deptId }),
    select:    r  => r.data?.subjects ?? [],
    enabled:   !!deptId,
    staleTime: 60_000,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (list) => subjectsService.updateMySubjects(list),
    onSuccess: (res) => {
      // res = { success, message, data: { assignedSubjects } } after unwrap
      const updated = res?.data?.assignedSubjects ?? res?.assignedSubjects ?? subjects;
      toast.success('Subjects saved');
      setSubjects(updated);
      setInitialized(true);
      updateUser({ assignedSubjects: updated });
      qc.invalidateQueries({ queryKey: ['settings-profile'] });
    },
    onError: (e) => {
      const msg = e.response?.data?.message
        ?? e.response?.data?.error?.details?.[0]?.message
        ?? 'Failed to save subjects';
      toast.error(msg);
    },
  });

  const addSubject = () => {
    if (!newSubj.name.trim() || !newSubj.semester) { toast.error('Subject name and semester are required'); return; }
    setSubjects(s => [...s, { name: newSubj.name.trim(), code: newSubj.code.trim() || null, semester: Number(newSubj.semester) }]);
    setNewSubj({ name: '', code: '', semester: '' });
    setAdding(false);
  };

  const selectDeptSubject = s => {
    if (subjects.some(x => x.name === s.name && x.semester === s.semester)) {
      toast('Already in your list', { icon: 'ℹ️' }); return;
    }
    setSubjects(prev => [...prev, { name: s.name, code: s.code, semester: s.semester }]);
  };

  const remove = idx => setSubjects(s => s.filter((_, i) => i !== idx));

  return (
    <FormSection title="My Assigned Subjects" icon={BookOpen}>
      <p className="text-[11px] text-surface-400 -mt-2">
        These subjects control which notes appear in your Notes view by default.
      </p>

      {/* Dept subjects picker */}
      {deptSubjects?.length > 0 && (
        <div>
          <label className="field-label">Add from department subjects</label>
          <div className="flex flex-wrap gap-1.5">
            {deptSubjects.map(s => (
              <button key={s._id} type="button" onClick={() => selectDeptSubject(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${subjects.some(x => x.name === s.name)
                    ? 'border-primary-400 bg-primary-50 text-primary-700 cursor-default'
                    : 'border-surface-200 text-surface-600 hover:border-primary-300 hover:bg-surface-50'}`}>
                {s.name}{s.code ? ` (${s.code})` : ''} · Sem {s.semester}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current list */}
      {subjects.length > 0 && (
        <div className="space-y-1.5">
          {subjects.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 border border-surface-100">
              <span className="flex-1 text-sm text-surface-700 font-medium">{s.name}</span>
              {s.code && <span className="text-xs font-mono text-surface-500 bg-surface-100 px-1.5 py-0.5 rounded">{s.code}</span>}
              <span className="text-xs text-surface-400">Sem {s.semester}</span>
              <button onClick={() => remove(i)} className="text-surface-300 hover:text-red-500 ml-1"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {subjects.length === 0 && !adding && (
        <p className="text-xs text-surface-400 italic">No subjects assigned yet. Add subjects to filter your notes view.</p>
      )}

      {/* Add custom */}
      {adding ? (
        <div className="rounded-xl border border-surface-200 p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input className="input text-sm" placeholder="Subject name *" value={newSubj.name}
                onChange={e => setNewSubj(n => ({ ...n, name: e.target.value }))} />
            </div>
            <input className="input text-sm font-mono" placeholder="Code (optional)" value={newSubj.code}
              onChange={e => setNewSubj(n => ({ ...n, code: e.target.value }))} />
            <select className="input text-sm" value={newSubj.semester}
              onChange={e => setNewSubj(n => ({ ...n, semester: e.target.value }))}>
              <option value="">Semester *</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm flex-1" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm flex-1 gap-1" onClick={addSubject}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm gap-1 text-surface-500 w-fit"
          onClick={() => setAdding(true)}>
          <Plus size={13} /> Add custom subject
        </button>
      )}

      <div className="flex justify-end pt-1">
        <button className="btn btn-primary btn-sm gap-1" disabled={isPending} onClick={() => save(subjects)}>
          <Save size={13} /> {isPending ? 'Saving…' : 'Save Subjects'}
        </button>
      </div>
    </FormSection>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const FacultySettings = () => {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName:   '',
    lastName:    '',
    phone:       '',
    bio:         '',
    designation: '',
  });
  const [profileImg,     setProfileImg]     = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const profileRef                          = useRef();

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const { data: profileData } = useQuery({
    queryKey: ['settings-profile'],
    queryFn:  settingsService.getProfile,
    select:   r => r.data?.user,
  });

  useEffect(() => {
    if (profileData) {
      setProfile({
        firstName:   profileData.firstName   ?? '',
        lastName:    profileData.lastName    ?? '',
        phone:       profileData.phone       ?? '',
        bio:         profileData.bio         ?? '',
        designation: profileData.designation ?? '',
      });
      setProfilePreview(profileData.profileImage?.url ?? null);
    }
  }, [profileData]);

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(profile).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (profileImg) fd.append('profileImage', profileImg);
      return settingsService.updateProfile(fd);
    },
    onSuccess: (res) => {
      toast.success('Profile updated');
      qc.invalidateQueries({ queryKey: ['settings-profile'] });
      const updated = res.data?.user;
      if (updated) {
        updateUser({
          firstName:    updated.firstName,
          lastName:     updated.lastName,
          phone:        updated.phone,
          bio:          updated.bio,
          designation:  updated.designation,
          profileImage: updated.profileImage,
        });
      }
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to save'),
  });

  const { mutate: changePassword, isPending: changingPwd } = useMutation({
    mutationFn: () => settingsService.changePassword({
      currentPassword: pwd.currentPassword,
      newPassword:     pwd.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to change password'),
  });

  const handleProfileImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setProfileImg(f);
    setProfilePreview(URL.createObjectURL(f));
  };

  const pwdValid =
    pwd.newPassword.length >= 8 &&
    pwd.newPassword === pwd.confirm &&
    pwd.currentPassword;

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your faculty profile and account settings.</p>
        </div>
      </div>

      {/* Profile */}
      <FormSection title="My Profile" icon={Camera}>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center
                            ring-2 ring-primary-100">
              {profilePreview
                ? <img src={profilePreview} className="w-full h-full object-cover" alt="" />
                : <User size={24} className="text-primary-500" />
              }
            </div>
            <button
              onClick={() => profileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-600 text-white
                         flex items-center justify-center shadow-md hover:bg-primary-700 transition-colors">
              <Camera size={11} />
            </button>
            <input ref={profileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImg} />
          </div>
          <div>
            <p className="text-sm font-medium text-surface-700">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-surface-400 mt-0.5">Click camera icon to update photo</p>
          </div>
        </div>

        {/* Email — read-only */}
        <div>
          <label className="field-label">Email</label>
          <input
            className="input bg-surface-50 text-surface-500"
            value={user?.email ?? ''}
            readOnly
            title="Email cannot be changed"
          />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">First name</label>
            <input
              className="input"
              value={profile.firstName}
              onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input
              className="input"
              value={profile.lastName}
              onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
            />
          </div>
        </div>

        {/* Designation */}
        <div>
          <label className="field-label">Designation</label>
          <input
            className="input"
            placeholder="e.g. Assistant Professor, Lecturer…"
            value={profile.designation}
            onChange={e => setProfile(p => ({ ...p, designation: e.target.value }))}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="field-label">Phone</label>
          <input
            className="input"
            placeholder="Optional"
            value={profile.phone}
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="field-label">Bio</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="A short bio about yourself…"
            value={profile.bio}
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            className="btn btn-primary btn-sm gap-1"
            disabled={savingProfile}
            onClick={() => saveProfile()}>
            <Save size={13} />
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </FormSection>

      {/* Department info — read-only */}
      <FormSection title="Department Info" icon={Briefcase}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Department</label>
            <input
              className="input bg-surface-50 text-surface-500"
              value={user?.departmentId?.name ?? '—'}
              readOnly
            />
          </div>
          <div>
            <label className="field-label">College</label>
            <input
              className="input bg-surface-50 text-surface-500"
              value={user?.collegeId?.name ?? '—'}
              readOnly
            />
          </div>
        </div>
        <p className="text-[11px] text-surface-400">
          Contact your HOD or College Admin to update department assignment.
        </p>
      </FormSection>

      {/* Assigned Subjects */}
      <AssignedSubjectsSection user={user} updateUser={updateUser} />

      {/* Password */}
      <FormSection title="Change Password" icon={Lock}>
        <div>
          <label className="field-label">Current password</label>
          <input
            type="password"
            className="input"
            value={pwd.currentPassword}
            onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">New password</label>
          <input
            type="password"
            className="input"
            placeholder="Min 8 characters"
            value={pwd.newPassword}
            onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
          />
        </div>
        <div>
          <label className="field-label">Confirm new password</label>
          <input
            type="password"
            className="input"
            value={pwd.confirm}
            onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
          />
          {pwd.confirm && pwd.newPassword !== pwd.confirm && (
            <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <button
            className="btn btn-primary btn-sm gap-1"
            disabled={!pwdValid || changingPwd}
            onClick={() => changePassword()}>
            <Lock size={13} />
            {changingPwd ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </FormSection>
    </div>
  );
};

export default FacultySettings;
