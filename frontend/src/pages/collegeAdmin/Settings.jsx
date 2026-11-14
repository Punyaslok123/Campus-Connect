import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Camera, Save, Lock, Building2, Image as ImageIcon, User } from 'lucide-react';
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

const Settings = () => {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile]               = useState({ firstName: '', lastName: '', phone: '', bio: '' });
  const [profileImg, setProfileImg]         = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const profileRef                          = useRef();

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const [college, setCollege]             = useState({ name: '', contactEmail: '', address: '' });
  const [logoFile, setLogoFile]           = useState(null);
  const [logoPreview, setLogoPreview]     = useState(null);
  const logoRef                           = useRef();

  const { data: profileData } = useQuery({
    queryKey: ['settings-profile'],
    queryFn:  settingsService.getProfile,
    select:   r => r.data?.user,
  });

  const { data: collegeData } = useQuery({
    queryKey: ['settings-college'],
    queryFn:  settingsService.getCollegeSettings,
    select:   r => r.data?.college,
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

  useEffect(() => {
    if (collegeData) {
      setCollege({
        name:         collegeData.name         ?? '',
        contactEmail: collegeData.contactEmail ?? '',
        address:      collegeData.address      ?? '',
      });
      setLogoPreview(collegeData.logo?.url ?? null);
    }
  }, [collegeData]);

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

  const { mutate: saveCollege, isPending: savingCollege } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(college).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (logoFile) fd.append('logo', logoFile);
      return settingsService.updateCollegeSettings(fd);
    },
    onSuccess: (res) => {
      toast.success('College settings updated');
      qc.invalidateQueries({ queryKey: ['settings-college'] });
      // Sync the updated college branding into authStore so all UI reflects changes immediately
      const updatedCollege = res.data?.college;
      if (updatedCollege) {
        updateUser({ collegeId: updatedCollege });
      }
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const handleProfileImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setProfileImg(f);
    setProfilePreview(URL.createObjectURL(f));
  };

  const handleLogo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const pwdValid = pwd.newPassword.length >= 8 && pwd.newPassword === pwd.confirm && pwd.currentPassword;

  return (
    <div className="max-w-2xl space-y-6">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile and college configuration.</p>
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
            <input className="input" value={profile.firstName}
              onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input className="input" value={profile.lastName}
              onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input className="input" value={profile.phone} placeholder="Optional"
            onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">Bio</label>
          <textarea className="input min-h-[80px] resize-none" value={profile.bio} placeholder="A short bio…"
            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
        </div>
        <div className="flex justify-end pt-1">
          <button className="btn btn-primary btn-sm gap-1" disabled={savingProfile} onClick={() => saveProfile()}>
            <Save size={13} /> {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </FormSection>

      {/* Password */}
      <FormSection title="Change Password" icon={Lock}>
        <div>
          <label className="field-label">Current password</label>
          <input type="password" className="input" value={pwd.currentPassword}
            onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">New password</label>
          <input type="password" className="input" value={pwd.newPassword} placeholder="Min 8 characters"
            onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">Confirm new password</label>
          <input type="password" className="input" value={pwd.confirm}
            onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} />
          {pwd.confirm && pwd.newPassword !== pwd.confirm && (
            <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
          )}
        </div>
        <div className="flex justify-end pt-1">
          <button className="btn btn-primary btn-sm gap-1" disabled={!pwdValid || changingPwd}
            onClick={() => changePassword()}>
            <Lock size={13} /> {changingPwd ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </FormSection>

      {/* College settings */}
      <FormSection title="College Settings" icon={Building2}>
        {/* Logo */}
        <div>
          <label className="field-label">College Logo</label>
          <div className="flex items-center gap-4 mt-1">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 flex items-center
                         justify-center cursor-pointer hover:border-primary-300 overflow-hidden transition-colors">
              {logoPreview
                ? <img src={logoPreview} className="w-full h-full object-cover" alt="" />
                : <ImageIcon size={20} className="text-surface-300" />
              }
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            <p className="text-xs text-surface-400">PNG, JPG or WebP · Max 5 MB</p>
          </div>
        </div>

        <div>
          <label className="field-label">College name</label>
          <input className="input" value={college.name}
            onChange={e => setCollege(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">Contact email</label>
          <input type="email" className="input" value={college.contactEmail}
            onChange={e => setCollege(p => ({ ...p, contactEmail: e.target.value }))} />
        </div>
        <div>
          <label className="field-label">Address</label>
          <textarea className="input resize-none min-h-[70px]" value={college.address}
            onChange={e => setCollege(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="flex justify-end pt-1">
          <button className="btn btn-primary btn-sm gap-1" disabled={savingCollege} onClick={() => saveCollege()}>
            <Save size={13} /> {savingCollege ? 'Saving…' : 'Save College Settings'}
          </button>
        </div>
      </FormSection>
    </div>
  );
};

export default Settings;
