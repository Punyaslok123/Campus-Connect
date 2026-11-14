import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Save, Lock, User, Briefcase, GraduationCap } from 'lucide-react';
import { settingsService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const AlumniProfile = () => {
  const { user: authUser, setUser } = useAuthStore();
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    currentCompany: '',
    currentRole: '',
    graduationYear: '',
  });

  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['alumni-profile'],
    queryFn:  settingsService.getProfile,
    select:   r => r.data?.user,
  });

  useEffect(() => {
    if (profileData) {
      setForm({
        firstName:      profileData.firstName ?? '',
        lastName:       profileData.lastName ?? '',
        phone:          profileData.phone ?? '',
        bio:            profileData.bio ?? '',
        currentCompany: profileData.currentCompany ?? '',
        currentRole:    profileData.currentRole ?? '',
        graduationYear: profileData.graduationYear ?? '',
      });
      if (profileData.profileImage?.url) {
        setAvatarPreview(profileData.profileImage.url);
      }
    }
  }, [profileData]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: (formData) => settingsService.updateProfile(formData),
    onSuccess: (res) => {
      const updated = res.data?.user;
      if (updated) {
        setUser({ ...authUser, ...updated });
      }
      toast.success('Profile updated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to update profile');
    },
  });

  const { mutate: changePassword, isPending: changingPwd } = useMutation({
    mutationFn: (data) => settingsService.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message ?? 'Failed to change password');
    },
  });

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, v);
    });
    if (avatarFile) {
      fd.append('profileImage', avatarFile);
    }
    updateProfile(fd);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwd.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePassword({
      currentPassword: pwd.currentPassword,
      newPassword:     pwd.newPassword,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-surface-800">Alumni Profile</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Manage your personal details, alumni background, and security settings.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="card animate-pulse h-48" />
          <div className="card animate-pulse h-48" />
        </div>
      ) : (
        <>
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="card space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                <User size={14} className="text-primary-600" />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Personal & Career Info</span>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-surface-100 border-2 border-surface-200 overflow-hidden flex items-center justify-center text-surface-400 font-semibold text-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    form.firstName?.[0] || 'A'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full shadow hover:bg-primary-700 transition-colors"
                  title="Upload profile picture"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-surface-800">Profile Photo</div>
                <div className="text-[11px] text-surface-400 mt-0.5">JPEG, PNG or WebP, up to 5MB</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">First Name</label>
                <input
                  className="input text-xs"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Last Name</label>
                <input
                  className="input text-xs"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
                <input
                  className="input text-xs bg-surface-50 text-surface-400 cursor-not-allowed"
                  value={profileData?.email ?? ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Phone</label>
                <input
                  className="input text-xs"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Current Company</label>
                <input
                  className="input text-xs"
                  placeholder="e.g. Google, Microsoft"
                  value={form.currentCompany}
                  onChange={e => setForm(f => ({ ...f, currentCompany: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Current Role / Job Title</label>
                <input
                  className="input text-xs"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.currentRole}
                  onChange={e => setForm(f => ({ ...f, currentRole: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-surface-600 mb-1">Graduation Year</label>
                <input
                  className="input text-xs w-36"
                  type="number"
                  placeholder="e.g. 2022"
                  value={form.graduationYear}
                  onChange={e => setForm(f => ({ ...f, graduationYear: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-surface-600 mb-1">Bio / About You</label>
                <textarea
                  className="input text-xs h-20 resize-none py-2"
                  placeholder="Briefly introduce yourself and what you're passionate about…"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn btn-primary btn-sm gap-1.5"
              >
                <Save size={14} />
                <span>{savingProfile ? 'Saving…' : 'Save Profile'}</span>
              </button>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="card space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-100">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                <Lock size={14} className="text-primary-600" />
              </div>
              <span className="font-semibold text-surface-800 text-[13.5px]">Security & Password</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Current Password</label>
                <input
                  type="password"
                  className="input text-xs"
                  placeholder="••••••••"
                  value={pwd.currentPassword}
                  onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">New Password</label>
                <input
                  type="password"
                  className="input text-xs"
                  placeholder="At least 8 characters"
                  value={pwd.newPassword}
                  onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className="input text-xs"
                  placeholder="Re-enter password"
                  value={pwd.confirmPassword}
                  onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPwd}
                className="btn btn-secondary btn-sm gap-1.5"
              >
                <Lock size={13} />
                <span>{changingPwd ? 'Updating…' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default AlumniProfile;
