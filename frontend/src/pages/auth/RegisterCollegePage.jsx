import { useState }             from 'react';
import { Link }                 from 'react-router-dom';
import { Building2, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRegisterCollege }   from '../../hooks/useAuth.js';

const INITIAL = {
  collegeName: '', collegeDomain: '', contactEmail: '', address: '',
  adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
};

const STEPS = [
  { n: '01', t: 'Register your college', d: 'Name, domain and your admin account' },
  { n: '02', t: 'Subscribe to a plan',   d: 'Choose monthly, 6-month or annual billing' },
  { n: '03', t: 'Set up departments',    d: 'Create departments and assign admins' },
  { n: '04', t: 'Go live!',              d: 'Users self-register with your domain' },
];

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="field-label">
      {label}
      {hint && <span className="font-normal ml-1" style={{ color: '#A8A29E' }}>{hint}</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const RegisterCollegePage = () => {
  const [form, setForm]     = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const { mutate: register, isPending } = useRegisterCollege();

  const set = k => e => {
    const val = e.target.value;
    setForm(f => ({
      ...f,
      [k]: k === 'collegeDomain' ? val.toLowerCase().replace(/[^a-z0-9-]/g, '') : val,
    }));
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.collegeName.trim())    e.collegeName    = 'College name is required';
    if (!form.collegeDomain.trim())  e.collegeDomain  = 'Domain is required';
    if (!form.adminFirstName.trim()) e.adminFirstName = 'First name is required';
    if (!form.adminLastName.trim())  e.adminLastName  = 'Last name is required';
    if (!form.adminEmail.trim())     e.adminEmail     = 'Email is required';
    if (form.adminPassword.length < 8) e.adminPassword = 'Minimum 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.adminPassword))
      e.adminPassword = 'Must contain uppercase, lowercase, and a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...form };
    if (!payload.contactEmail) delete payload.contactEmail;
    if (!payload.address)      delete payload.address;
    register(payload);
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF9' }}>

      {/* ── Left info panel ── */}
      <div className="hidden lg:flex flex-col justify-between p-14 w-[40%] relative overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #1A1A1F 45%, #1E1E24 100%)' }}>

        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />

        {/* Logo */}
        <Link to="/" className="relative z-10 flex items-center gap-3 no-underline">
          <div className="rounded-xl overflow-hidden shrink-0 p-0.5"
            style={{
              width: '3.25rem', height: '3.25rem',
              background: 'linear-gradient(135deg, #F0EEE8, #D6D3CE)',
              boxShadow: '0 0 0 1.5px rgba(245,158,11,0.45), 0 4px 14px rgba(0,0,0,0.55)',
            }}>
            <img src="/CC.png" alt="Campus Connect"
              className="w-full h-full object-cover rounded-lg" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Campus Connect</span>
        </Link>

        {/* Headline + steps */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight mb-3"
              style={{ color: '#F5F5F4', letterSpacing: '-0.03em' }}>
              Bring your college<br />
              <span style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>online in minutes.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>
              Register your college, set up departments, and give everyone one place to connect.
            </p>
          </div>

          <div className="space-y-4">
            {STEPS.map(s => (
              <div key={s.n} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                  {s.n}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{s.t}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Trusted by colleges across India
        </div>
      </div>

      {/* ── Right form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8 no-underline">
            <div className="rounded-xl overflow-hidden shrink-0 p-0.5"
              style={{
                width: '2.75rem', height: '2.75rem',
                background: 'linear-gradient(135deg, #F0EEE8, #D6D3CE)',
                boxShadow: '0 0 0 1.5px rgba(217,119,6,0.35), 0 2px 8px rgba(0,0,0,0.12)',
              }}>
              <img src="/CC.png" alt="Campus Connect" className="w-full h-full object-cover rounded-lg" />
            </div>
            <span className="font-bold text-lg" style={{ color: '#18181B' }}>Campus Connect</span>
          </Link>

          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#18181B', letterSpacing: '-0.025em' }}>
              Register Your College
            </h1>
            <p className="text-sm" style={{ color: '#78716C' }}>
              Already registered?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#D97706' }}>
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={submit} className="space-y-7" noValidate>

            {/* College Details */}
            <div className="bg-white rounded-2xl p-6 space-y-4"
              style={{ border: '1px solid #E7E5E4', boxShadow: '0 2px 8px rgba(12,12,14,0.04)' }}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-surface-200">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #D97706, #B45309)' }}>
                  <Building2 size={13} className="text-white" />
                </div>
                <span className="text-[13.5px] font-semibold" style={{ color: '#18181B' }}>College Details</span>
              </div>

              <div className="space-y-4">
                <Field label="College Name" error={errors.collegeName}>
                  <input className={`input ${errors.collegeName ? 'error' : ''}`}
                    placeholder="e.g. MIT Pune" value={form.collegeName} onChange={set('collegeName')} required />
                </Field>

                <Field label="College Domain" hint="(unique slug for your college)" error={errors.collegeDomain}>
                  <div className="flex items-center">
                    <input className={`input rounded-r-none border-r-0 flex-1 ${errors.collegeDomain ? 'error' : ''}`}
                      placeholder="mitpune" value={form.collegeDomain} onChange={set('collegeDomain')} required />
                    <span className="h-[38px] px-3 flex items-center rounded-r-[10px] text-xs whitespace-nowrap"
                      style={{ background: '#F5F5F4', border: '1.5px solid #E7E5E4', borderLeft: 'none', color: '#78716C' }}>
                      .campusconnect.io
                    </span>
                  </div>
                  {!errors.collegeDomain && (
                    <p className="text-[11px] mt-1" style={{ color: '#A8A29E' }}>
                      Lowercase letters, numbers, hyphens only. Cannot be changed later.
                    </p>
                  )}
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Contact Email" hint="(optional)" error={errors.contactEmail}>
                    <input className="input" type="email" placeholder="info@college.edu"
                      value={form.contactEmail} onChange={set('contactEmail')} />
                  </Field>
                  <Field label="Address" hint="(optional)" error={errors.address}>
                    <input className="input" placeholder="City, State"
                      value={form.address} onChange={set('address')} />
                  </Field>
                </div>
              </div>
            </div>

            {/* Admin Account */}
            <div className="bg-white rounded-2xl p-6 space-y-4"
              style={{ border: '1px solid #E7E5E4', boxShadow: '0 2px 8px rgba(12,12,14,0.04)' }}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-surface-200">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#27272D' }}>
                  <User size={13} className="text-white" />
                </div>
                <span className="text-[13.5px] font-semibold" style={{ color: '#18181B' }}>Your Admin Account</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" error={errors.adminFirstName}>
                    <input className={`input ${errors.adminFirstName ? 'error' : ''}`}
                      placeholder="Rahul" value={form.adminFirstName} onChange={set('adminFirstName')} required />
                  </Field>
                  <Field label="Last Name" error={errors.adminLastName}>
                    <input className={`input ${errors.adminLastName ? 'error' : ''}`}
                      placeholder="Sharma" value={form.adminLastName} onChange={set('adminLastName')} required />
                  </Field>
                </div>

                <Field label="Admin Email" error={errors.adminEmail}>
                  <input className={`input ${errors.adminEmail ? 'error' : ''}`}
                    type="email" placeholder="admin@college.edu"
                    value={form.adminEmail} onChange={set('adminEmail')} required />
                </Field>

                <Field label="Password" hint="(min 8 chars, upper + lower + number)" error={errors.adminPassword}>
                  <input className={`input ${errors.adminPassword ? 'error' : ''}`}
                    type="password" placeholder="••••••••"
                    value={form.adminPassword} onChange={set('adminPassword')} required />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={isPending}
              className="btn btn-primary w-full justify-center gap-2"
              style={{ padding: '11px 22px', fontSize: '14px', borderRadius: '12px' }}>
              {isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating your college…
                  </span>
                : <><CheckCircle2 size={15} /><span>Register College & Continue to Billing</span></>
              }
            </button>

            <p className="text-xs text-center" style={{ color: '#A8A29E' }}>
              By registering you agree to our Terms of Service and Privacy Policy.
              Your college will be live once you complete the subscription.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterCollegePage;
