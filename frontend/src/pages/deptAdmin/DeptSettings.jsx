import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Save, Lock, User } from 'lucide-react';
import { settingsService } from '../../services/index.js';
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

const DeptSettings = () => {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const [profile,        setProfile]        = useState({ firstName: '', lastName: '', phone: '', bio: '' });
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
        firstName: profileData.firstName ?? '',
        lastName:  profileData.lastName  ?? '',
        phone:     profileData.phone     ?? '',
        bio:       profileData.bio       ?? '',
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
          profileImage: updated.profileImage,
        });
      }
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const { mutate: changePassword, isPending: changingPwd } = useMutation({
    mutationFn: () => settingsService.changePassword({
      currentPassword: pwd.currentPassword,
      newPassword:     pwd.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
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
          <p className="page-subtitle">Manage your profile and account settings.</p>
        </div>
      </div>

      {/* Profile */}
      <FormSection title="My Profile" icon={Camera}>
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
          <p className="text-sm text-surface-400">Click the camera icon to change your profile photo.</p>
        </div>

        <div>
          <label className="field-label">Email</label>
          <input
            className="input bg-surface-50 text-surface-500"
            value={user?.email ?? ''}
            readOnly
            title="Email cannot be changed"
          />
        </div>

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

        <div>
          <label className="field-label">Phone</label>
          <input
            className="input"
            value={profile.phone}
            placeholder="Optional"
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
          />
        </div>

        <div>
          <label className="field-label">Bio</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={profile.bio}
            placeholder="A short bio…"
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
            value={pwd.newPassword}
            placeholder="Min 8 characters"
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

export default DeptSettings;
