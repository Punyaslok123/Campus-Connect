import { Link }                        from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery }                    from '@tanstack/react-query';
import { plansService }                from '../../services/index.js';
import {
  BookOpen, Users, Briefcase, GraduationCap, Building2,
  CheckCircle, Shield, Zap, Lock, CreditCard,
  ChevronRight, ArrowRight, Sparkles, TrendingUp, Calendar,
} from 'lucide-react';

function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ── Static data ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: BookOpen,
    title: 'Notes & Study Material',
    desc: 'Students share and access verified notes across all semesters. Faculty review ensures quality.',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    icon: Briefcase,
    title: 'Jobs & Internships',
    desc: 'Alumni post real opportunities directly to their college network. Students apply with one click.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    icon: GraduationCap,
    title: 'Alumni Mentorship',
    desc: 'Live sessions hosted by alumni. Students connect with professionals from their own college.',
    color: '#818CF8',
    bg: 'rgba(129,140,248,0.12)',
  },
  {
    icon: Calendar,
    title: 'Events & Announcements',
    desc: 'College-wide and department-level events posted in one place. Never miss what matters.',
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.12)',
  },
  {
    icon: Users,
    title: 'Department Management',
    desc: 'Create departments, assign admins, manage faculty and student rosters from one dashboard.',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.12)',
  },
  {
    icon: Shield,
    title: 'Isolated & Secure',
    desc: 'Every college gets its own isolated environment. No data is ever shared across institutions.',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
  },
];

const ROLES = [
  { icon: GraduationCap, label: 'Students',       desc: 'Notes, jobs, mentorship & events' },
  { icon: Users,         label: 'Faculty',         desc: 'Moderate content & host sessions'  },
  { icon: Building2,     label: 'College Admins',  desc: 'Full platform control'             },
  { icon: Briefcase,     label: 'Alumni',          desc: 'Give back and stay connected'      },
];

const STEPS = [
  { n: '01', icon: Building2,  title: 'Register Your College', desc: 'Fill in your college details and create an admin account in under 2 minutes.' },
  { n: '02', icon: CreditCard, title: 'Choose a Plan',         desc: 'Pick a subscription that fits your size and budget. Pay securely via Razorpay.' },
  { n: '03', icon: Users,      title: 'Set Up Departments',    desc: 'Create departments and assign admins to manage each one independently.' },
  { n: '04', icon: Sparkles,   title: 'Invite Your Community', desc: "Students, faculty, and alumni self-register using your college's unique slug." },
];

const TRUST = [
  { icon: Shield,     label: 'Data isolation'   },
  { icon: Zap,        label: 'Live in minutes'   },
  { icon: Lock,       label: 'Razorpay secure'   },
  { icon: TrendingUp, label: 'Role-based access' },
];

// ── Small atoms ────────────────────────────────────────────────────────────────
const Chip = ({ children, light = false }) => (
  <div className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[10px] font-bold
                   uppercase tracking-[0.1em] mb-5
                   ${light
                     ? 'bg-white/10 border border-white/20 text-white/70'
                     : 'border text-gold-600'}`}
    style={light ? {} : { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }}>
    <span className={`w-1.5 h-1.5 rounded-full ${light ? 'bg-white/60' : 'bg-gold-500'}`} />
    {children}
  </div>
);

const MagBtn = ({ children, className = '', ...props }) => {
  const ref = useRef(null);
  const onMove = e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.15}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = 'translate(0,0)'; };
  return (
    <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      className={`inline-block transition-transform duration-300 ease-out ${className}`} {...props}>
      {children}
    </span>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const HomePage = () => {
  const [heroRef,    heroVisible]    = useReveal(0.04);
  const [featRef,    featVisible]    = useReveal(0.06);
  const [rolesRef,   rolesVisible]   = useReveal(0.1);
  const [stepsRef,   stepsVisible]   = useReveal(0.08);
  const [pricingRef, pricingVisible] = useReveal(0.06);
  const [ctaRef,     ctaVisible]     = useReveal(0.12);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn:  plansService.listPublic,
    select:   r => r.data?.plans ?? [],
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen font-sans overflow-x-hidden"
      style={{ background: '#0E0E11', color: '#E8E6E1' }}>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b' : ''
      }`} style={scrolled ? {
        background: 'rgba(14,14,17,0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.07)',
      } : { background: 'transparent' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #2A2A2E 0%, #1A1A1E 100%)',
                boxShadow: '0 0 0 1.5px rgba(245,158,11,0.5), 0 2px 12px rgba(0,0,0,0.5)',
              }}>
              <img src="/CC.png" alt="Campus Connect"
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(1.15) contrast(1.05)' }} />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Campus Connect
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = ''; }}>
              Sign In
            </Link>
            <MagBtn>
              <Link to="/register-college"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl
                           transition-all duration-200 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #C96B08, #A85207)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(180,83,9,0.4)',
                }}>
                Get Started <ChevronRight size={13} />
              </Link>
            </MagBtn>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">

        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base gradient */}
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% -10%, rgba(180,83,9,0.18) 0%, transparent 60%)' }} />
          {/* Subtle grid */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
            }} />
          {/* Glow orbs */}
          <div className="absolute rounded-full"
            style={{
              top: '-15%', left: '60%',
              width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(180,83,9,0.12) 0%, transparent 65%)',
              animation: 'blobSpin 32s linear infinite',
            }} />
          <div className="absolute rounded-full"
            style={{
              bottom: '-10%', left: '-5%',
              width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(120,53,15,0.1) 0%, transparent 65%)',
              animation: 'blobSpin 44s linear infinite reverse',
            }} />
        </div>

        <div ref={heroRef} className="relative max-w-4xl mx-auto px-6 text-center">

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Chip>Multi-tenant platform for Indian Colleges</Chip>
          </div>

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(32px)',
            transition: 'opacity 0.8s ease 80ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) 80ms',
          }}>
            <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight mb-5 text-white">
              One platform.
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #E8A020 0%, #D97706 40%, #C96B08 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Your entire campus.
              </span>
            </h1>
          </div>

          <div style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.75s ease 170ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) 170ms',
          }}>
            <p className="text-lg max-w-xl mx-auto mb-10 leading-relaxed"
              style={{ color: 'rgba(232,230,225,0.55)' }}>
              Notes, jobs, mentorship, events, and messaging — tailored for every member of your college community.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(16px)',
            transition: 'opacity 0.75s ease 250ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) 250ms',
          }}>
            <MagBtn>
              <Link to="/register-college"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5
                           text-white font-semibold rounded-xl text-sm
                           hover:scale-[1.02] transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #C96B08, #A85207)',
                  boxShadow: '0 4px 24px rgba(180,83,9,0.5)',
                }}>
                Register Your College
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </MagBtn>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5
                         font-semibold rounded-xl text-sm transition-all duration-200
                         hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.75)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
              Sign In
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium"
            style={{
              color: 'rgba(232,230,225,0.35)',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity 0.9s ease 450ms',
            }}>
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={11} style={{ color: '#C96B08' }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{
            opacity: heroVisible ? 0.25 : 0,
            transition: 'opacity 1.2s ease 1s',
            animation: 'float 3s ease-in-out infinite',
          }}>
          <div className="w-5 h-8 rounded-full border flex items-start justify-center p-1.5"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="w-1 h-1.5 rounded-full bg-white/40"
              style={{ animation: 'float 1.8s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ── Role strip ────────────────────────────────────────────────────── */}
      <section ref={rolesRef} className="py-16 border-y"
        style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-10"
            style={{
              color: 'rgba(232,230,225,0.3)',
              opacity: rolesVisible ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}>
            Built for every member of your institution
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ROLES.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={r.label}
                  className="rounded-2xl p-5 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    opacity: rolesVisible ? 1 : 0,
                    transform: rolesVisible ? 'none' : 'translateY(20px)',
                    transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(201,107,8,0.15)', border: '1px solid rgba(201,107,8,0.2)' }}>
                    <Icon size={17} style={{ color: '#D97706' }} />
                  </div>
                  <div className="text-sm font-semibold text-white mb-0.5">{r.label}</div>
                  <div className="text-xs" style={{ color: 'rgba(232,230,225,0.4)' }}>{r.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section ref={featRef} className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14" style={{
            opacity: featVisible ? 1 : 0,
            transform: featVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Chip>Platform capabilities</Chip>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              Everything your college needs
            </h2>
            <p className="mt-3 text-base max-w-lg mx-auto" style={{ color: 'rgba(232,230,225,0.45)' }}>
              One subscription. All roles. No feature limits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className="group rounded-2xl p-6 cursor-default transition-all duration-300
                             hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    opacity: featVisible ? 1 : 0,
                    transform: featVisible ? 'none' : 'translateY(28px)',
                    transition: `opacity 0.55s ease ${i * 60}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, box-shadow 0.3s`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,107,8,0.25)'; e.currentTarget.style.background = 'rgba(201,107,8,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: f.bg, border: `1px solid ${f.color}22` }}>
                    <Icon size={17} style={{ color: f.color }} />
                  </div>
                  <div className="font-semibold text-sm text-white mb-2">{f.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'rgba(232,230,225,0.45)' }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section ref={stepsRef} className="py-24 border-y"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14" style={{
            opacity: stepsVisible ? 1 : 0,
            transform: stepsVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Chip>Setup</Chip>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              Live in{' '}
              <span style={{
                background: 'linear-gradient(135deg, #E8A020, #D97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>4 steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <div key={step.n}
                  className="group rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    opacity: stepsVisible ? 1 : 0,
                    transform: stepsVisible ? 'none' : 'translateY(32px)',
                    transition: `opacity 0.65s ease ${100 + i * 100}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${100 + i * 100}ms`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,107,8,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                  <div className="absolute top-4 right-4 text-6xl font-black leading-none select-none pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.04)' }}>{step.n}</div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'linear-gradient(135deg, #C96B08, #8B4000)' }}>
                    <StepIcon size={17} className="text-white" />
                  </div>
                  <div className="font-semibold text-sm text-white mb-2">{step.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'rgba(232,230,225,0.45)' }}>{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section ref={pricingRef} id="pricing" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14" style={{
            opacity: pricingVisible ? 1 : 0,
            transform: pricingVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.65s ease, transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <Chip>Pricing</Chip>
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-white">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-base max-w-md mx-auto" style={{ color: 'rgba(232,230,225,0.45)' }}>
              One flat fee per college. Unlimited departments and users.
            </p>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="rounded-2xl p-6 space-y-4 animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                  <div className="h-10 w-28 rounded-xl bg-white/10" />
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="space-y-2.5">{[1,2,3].map(j => <div key={j} className="h-3 rounded-full bg-white/10" />)}</div>
                  <div className="h-10 rounded-xl bg-white/10" />
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-medium" style={{ color: 'rgba(232,230,225,0.5)' }}>Pricing plans coming soon.</p>
            </div>
          ) : (
            <div className={`grid gap-4 items-start ${
              plans.length <= 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto'
                : plans.length === 3
                  ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto'
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            }`}>
              {plans.map((plan, i) => {
                const perMonth = plan.durationMonths > 0
                  ? Math.round(plan.priceINR / plan.durationMonths)
                  : plan.priceINR;
                return (
                  <div key={plan.key}
                    className="rounded-2xl flex flex-col overflow-hidden relative transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: plan.highlight
                        ? 'linear-gradient(160deg, rgba(201,107,8,0.18) 0%, rgba(120,53,9,0.08) 100%)'
                        : 'rgba(255,255,255,0.04)',
                      border: plan.highlight ? '1px solid rgba(201,107,8,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: plan.highlight ? '0 8px 32px rgba(180,83,9,0.2)' : 'none',
                      opacity: pricingVisible ? 1 : 0,
                      transform: pricingVisible ? 'none' : 'translateY(32px)',
                      transition: `opacity 0.6s ease ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                    }}>
                    {plan.highlight && (
                      <div className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, #C96B08, #E8A020, #C96B08)' }} />
                    )}
                    {plan.highlight && (
                      <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                        style={{ background: 'linear-gradient(135deg, #C96B08, #A85207)', color: '#fff' }}>
                        Popular
                      </div>
                    )}

                    <div className="p-6 flex flex-col flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-4"
                        style={{ color: 'rgba(232,230,225,0.35)' }}>
                        {plan.label}
                      </div>

                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-sm" style={{ color: 'rgba(232,230,225,0.5)' }}>₹</span>
                        <span className="text-4xl font-black text-white tabular-nums">
                          {plan.priceINR.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-xs mb-6" style={{ color: 'rgba(232,230,225,0.35)' }}>
                        ₹{perMonth.toLocaleString('en-IN')}/mo · billed upfront
                      </div>

                      <ul className="space-y-2.5 flex-1 mb-6">
                        {[
                          'All core features',
                          'Unlimited departments',
                          'Unlimited users',
                          ...(plan.durationMonths >= 12 ? ['Analytics dashboard'] : []),
                          plan.durationMonths >= 6 ? 'Priority support' : 'Email support',
                        ].map(perk => (
                          <li key={perk} className="flex items-center gap-2 text-xs"
                            style={{ color: 'rgba(232,230,225,0.6)' }}>
                            <CheckCircle size={12} style={{ color: plan.highlight ? '#D97706' : '#34d399', flexShrink: 0 }} />
                            {perk}
                          </li>
                        ))}
                      </ul>

                      <Link to="/register-college"
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                                   font-semibold text-sm transition-all duration-200
                                   hover:scale-[1.02] active:scale-[0.98]"
                        style={plan.highlight ? {
                          background: 'linear-gradient(135deg, #C96B08, #A85207)',
                          color: '#fff',
                          boxShadow: '0 4px 16px rgba(180,83,9,0.4)',
                        } : {
                          background: 'rgba(255,255,255,0.07)',
                          color: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}>
                        Get Started <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs mt-8" style={{ color: 'rgba(232,230,225,0.3)' }}>
            All plans include the full feature set. Secure payments via Razorpay.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #1A0E00 0%, #120A00 50%, #0E0E11 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(180,83,9,0.14) 0%, transparent 65%)' }} />
        <div className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: '56px 56px',
          }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,107,8,0.5), transparent)' }} />

        <div ref={ctaRef} className="relative max-w-2xl mx-auto px-6 text-center" style={{
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.75s ease, transform 0.75s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <Chip light>Get started today</Chip>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-5 leading-[1.08] tracking-tight">
            Ready to transform your
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #E8A020, #D97706)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>campus experience?</span>
          </h2>
          <p className="text-base mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Register your college and go live in minutes. No hidden fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <MagBtn>
              <Link to="/register-college"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5
                           text-white font-semibold rounded-xl text-sm
                           hover:scale-[1.03] transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #C96B08, #A85207)',
                  boxShadow: '0 6px 28px rgba(180,83,9,0.55)',
                }}>
                Register Your College
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </MagBtn>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5
                         font-semibold rounded-xl text-sm transition-all duration-200
                         hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
              Already registered? Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-10" style={{
        background: '#0C0C0E',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0"
              style={{
                background: 'linear-gradient(135deg, #2A2A2E, #1A1A1E)',
                boxShadow: '0 0 0 1px rgba(245,158,11,0.3)',
              }}>
              <img src="/CC.png" alt="Campus Connect" className="w-full h-full object-cover"
                style={{ filter: 'brightness(1.1)' }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Campus Connect
            </span>
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} Campus Connect. All rights reserved.
          </div>
          <div className="flex gap-5 text-xs">
            {[
              { to: '/login', label: 'Sign In' },
              { to: '/register-college', label: 'Register' },
            ].map(({ to, label }) => (
              <Link key={to} to={to}
                className="transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
