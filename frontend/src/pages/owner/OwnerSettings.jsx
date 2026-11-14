import { useState }                     from 'react';
import { useMutation }                  from '@tanstack/react-query';
import toast                            from 'react-hot-toast';
import { User, Lock, Save }             from 'lucide-react';
import { settingsService }              from '../../services/index.js';
import useAuthStore                     from '../../store/authStore.js';

const OwnerSettings = () => {
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('firstName', profile.firstName);
      fd.append('lastName',  profile.lastName);
      return settingsService.updateProfile(fd);
    },
    onSuccess: (res) => {
      toast.success('Profile updated');
      const u = res.data?.user;
      if (u) updateUser({ firstName: u.firstName, lastName: u.lastName });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to update profile'),
  });

  const { mutate: changePassword, isPending: changingPassword } = useMutation({
    mutationFn: () => settingsService.changePassword({
      currentPassword: passwords.currentPassword,
      newPassword:     passwords.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to change password'),
  });

  const handlePasswordChange = () => {
    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changePassword();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your owner account details.</p>
        </div>
      </div>

      {/* Profile */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
            <User size={14} className="text-primary-600" />
          </div>
          <span className="font-semibold text-surface-800 text-[13.5px]">Profile</span>
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
          <div className="col-span-2">
            <label className="field-label">Email</label>
            <input className="input bg-surface-50 text-surface-400 cursor-not-allowed" value={profile.email} disabled />
            <p className="text-xs text-surface-400 mt-1">Email cannot be changed for the owner account.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="btn btn-primary btn-sm gap-1"
            disabled={savingProfile || !profile.firstName.trim()}
            onClick={() => saveProfile()}>
            <Save size={13} /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
            <Lock size={14} className="text-primary-600" />
          </div>
          <span className="font-semibold text-surface-800 text-[13.5px]">Change Password</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="field-label">Current password</label>
            <input
              className="input"
              type="password"
              value={passwords.currentPassword}
              onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">New password</label>
            <input
              className="input"
              type="password"
              placeholder="Min. 8 characters"
              value={passwords.newPassword}
              onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Confirm new password</label>
            <input
              className="input"
              type="password"
              value={passwords.confirmPassword}
              onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="btn btn-primary btn-sm gap-1"
            disabled={
              changingPassword ||
              !passwords.currentPassword ||
              !passwords.newPassword ||
              !passwords.confirmPassword
            }
            onClick={handlePasswordChange}>
            <Lock size={13} /> {changingPassword ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerSettings;
