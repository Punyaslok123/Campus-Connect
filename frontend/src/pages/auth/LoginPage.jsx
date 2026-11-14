import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { useLogin, useOwnerLogin } from '../../hooks/useAuth.js';
import { BookOpen, Users, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: BookOpen,      text: 'Notes sharing & faculty moderation' },
  { icon: Users,         text: 'Multi-tenant college management'    },
  { icon: Briefcase,     text: 'Alumni job board & mentorship'      },
  { icon: GraduationCap, text: 'Real-time messaging & notifications'},
];

const LoginPage = () => {
  const [tab, setTab] = useState('owner');

  const [ownerForm,   setOwnerForm]   = useState({ email: '', password: '' });
  const [collegeForm, setCollegeForm] = useState({ email: '', password: '', collegeDomain: '' });

  const { mutate: ownerLogin,   isPending: ownerPending   } = useOwnerLogin();
  const { mutate: collegeLogin, isPending: collegePending  } = useLogin();

  const setOwner   = k => e => setOwnerForm(f  => ({ ...f, [k]: e.target.value }));
  const setCollege = k => e => setCollegeForm(f => ({ ...f, [k]: e.target.value }));

  const submitOwner   = e => { e.preventDefault(); ownerLogin(ownerForm); };
  const submitCollege = e => { e.preventDefault(); collegeLogin(collegeForm); };

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF9' }}>

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between p-14 w-[44%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #1A1A1F 45%, #1E1E24 100%)' }}>

        {/* Background texture circles */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />

        {/* Top — logo + name */}
        <Link to="/" className="relative z-10 flex items-center gap-3 no-underline">
          <div className="w-13 h-13 rounded-xl overflow-hidden shrink-0 p-0.5"
            style={{
              width: '3.25rem', height: '3.25rem',
              background: 'linear-gradient(135deg, #F0EEE8, #D6D3CE)',
              boxShadow: '0 0 0 1.5px rgba(245,158,11,0.45), 0 4px 14px rgba(0,0,0,0.55)',
            }}>
            <img src="/CC.png" alt="Campus Connect"
              className="w-full h-full object-cover rounded-lg" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Campus Connect</span>
        </Link>

        {/* Middle — headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-3" style={{ color: '#F5F5F4', letterSpacing: '-0.03em' }}>
              The campus platform<br />
              <span style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>built for everyone.</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Connecting students, faculty, and alumni through one unified platform.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Icon size={14} style={{ color: '#F59E0B' }} strokeWidth={1.8} />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — tagline */}
        <div className="relative z-10">
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Trusted by colleges across India
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-[360px]">

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

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#18181B', letterSpacing: '-0.03em' }}>
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: '#78716C' }}>Sign in to your account to continue</p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-7"
            style={{ background: '#F0EFEE', border: '1px solid #E7E5E4' }}>
            {[
              { key: 'owner',   label: 'Platform Owner' },
              { key: 'college', label: 'College User'   },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all duration-150 ${
                  tab === t.key
                    ? 'bg-white shadow-sm'
                    : 'hover:text-ink-800'
                }`}
                style={{
                  color: tab === t.key ? '#18181B' : '#78716C',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Owner form */}
          {tab === 'owner' && (
            <form onSubmit={submitOwner} className="flex flex-col gap-4">
              <div>
                <label className="field-label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="owner@campusconnect.dev"
                  value={ownerForm.email}
                  onChange={setOwner('email')}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={ownerForm.password}
                  onChange={setOwner('password')}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={ownerPending}
                className="btn btn-primary w-full justify-center mt-1 gap-2">
                {ownerPending
                  ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Signing in…</span>
                  : <><span>Sign in as Owner</span><ArrowRight size={14} /></>
                }
              </button>
            </form>
          )}

          {/* College user form */}
          {tab === 'college' && (
            <form onSubmit={submitCollege} className="flex flex-col gap-4">
              <div>
                <label className="field-label">College Domain</label>
                <input
                  className="input"
                  placeholder="e.g. mit, iit, nit"
                  value={collegeForm.collegeDomain}
                  onChange={setCollege('collegeDomain')}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="field-label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@college.edu"
                  value={collegeForm.email}
                  onChange={setCollege('email')}
                  required
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={collegeForm.password}
                  onChange={setCollege('password')}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={collegePending}
                className="btn btn-primary w-full justify-center mt-1 gap-2">
                {collegePending
                  ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Signing in…</span>
                  : <><span>Sign In</span><ArrowRight size={14} /></>
                }
              </button>
            </form>
          )}

          {/* Register link */}
          {tab === 'college' && (
            <p className="text-center text-sm mt-6" style={{ color: '#78716C' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#D97706' }}>
                Register
              </Link>
            </p>
          )}

          {/* College admin CTA */}
          <div className="mt-7 pt-6 border-t border-surface-200 text-center">
            <p className="text-xs mb-2" style={{ color: '#A8A29E' }}>
              Representing a college?
            </p>
            <Link to="/register-college"
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: '#D97706' }}>
              Register your college <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
