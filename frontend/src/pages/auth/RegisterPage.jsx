import { useState, useRef, useEffect } from 'react';
import { Link }       from 'react-router-dom';
import { useQuery }   from '@tanstack/react-query';
import { ChevronDown, Search, X, Check, Loader2, ArrowRight } from 'lucide-react';
import { useRegister } from '../../hooks/useAuth.js';
import { authService } from '../../services/index.js';

// ── Searchable dropdown ────────────────────────────────────────────────────────
const SearchableSelect = ({
  label, placeholder, value, onChange, options = [],
  loading = false, disabled = false, error,
  displayKey = 'name', valueKey = '_id', subKey,
}) => {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef();

  const selected = options.find(o => o[valueKey] === value);
  const filtered = query.trim()
    ? options.filter(o =>
        o[displayKey].toLowerCase().includes(query.toLowerCase()) ||
        (subKey && o[subKey]?.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = opt => { onChange(opt[valueKey], opt); setOpen(false); setQuery(''); };
  const clear  = e   => { e.stopPropagation(); onChange('', null); setQuery(''); };

  return (
    <div ref={ref} className="relative">
      <label className="field-label">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(o => !o); }}
        className={`input text-left flex items-center justify-between gap-2 pr-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'error' : ''}
          ${!selected ? '' : ''}`}
        style={{ color: selected ? '#18181B' : '#A8A29E' }}
      >
        <span className="truncate flex-1 text-[13px]">
          {loading
            ? 'Loading…'
            : selected
              ? subKey && selected[subKey]
                ? `${selected[displayKey]} (${selected[subKey]})`
                : selected[displayKey]
              : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span onClick={clear}
              className="p-0.5 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-600">
              <X size={12} />
            </span>
          )}
          {loading
            ? <Loader2 size={14} className="animate-spin text-surface-400" />
            : <ChevronDown size={14} className={`text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </span>
      </button>

      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl overflow-hidden animate-fade-in"
          style={{ border: '1px solid #E7E5E4', boxShadow: '0 12px 32px rgba(12,12,14,0.12)' }}>
          <div className="p-2 border-b border-surface-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                autoFocus
                className="w-full pl-7 pr-3 py-1.5 text-[12px] bg-surface-50 rounded-lg outline-none"
                style={{ border: '1px solid #E7E5E4' }}
                placeholder="Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-[12px] text-center py-4" style={{ color: '#A8A29E' }}>
                  {query ? 'No results found' : 'No options available'}
                </p>
              : filtered.map(opt => (
                  <button
                    key={opt[valueKey]}
                    type="button"
                    onClick={() => select(opt)}
                    className="w-full text-left px-3 py-2 text-[12.5px] flex items-center
                      justify-between gap-2 transition-colors"
                    style={{
                      background: opt[valueKey] === value ? '#FFFBEB' : undefined,
                      color: opt[valueKey] === value ? '#92400E' : '#44403C',
                    }}
                    onMouseEnter={e => { if (opt[valueKey] !== value) e.currentTarget.style.background = '#FAFAF9'; }}
                    onMouseLeave={e => { if (opt[valueKey] !== value) e.currentTarget.style.background = ''; }}
                  >
                    <span>
                      {opt[displayKey]}
                      {subKey && opt[subKey] && (
                        <span className="ml-1 font-normal" style={{ color: '#A8A29E' }}>({opt[subKey]})</span>
                      )}
                    </span>
                    {opt[valueKey] === value && <Check size={12} style={{ color: '#D97706' }} className="shrink-0" />}
                  </button>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const EMPTY = {
  firstName: '', lastName: '', email: '', password: '',
  collegeDomain: '', role: 'student', departmentId: '',
  semester: '', rollNumber: '',
};

const RegisterPage = () => {
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const { mutate: register, isPending } = useRegister();

  const { data: collegesData, isLoading: loadingColleges } = useQuery({
    queryKey: ['public-colleges'],
    queryFn:  authService.listColleges,
    select:   r => r.data?.colleges ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const colleges = collegesData ?? [];

  const { data: deptsData, isLoading: loadingDepts } = useQuery({
    queryKey: ['public-depts', form.collegeDomain],
    queryFn:  () => authService.listDeptsByDomain(form.collegeDomain),
    select:   r => r.data?.departments ?? [],
    enabled:  !!form.collegeDomain,
    staleTime: 5 * 60 * 1000,
  });
  const depts = deptsData ?? [];

  const handleCollegeChange = (_, opt) => {
    setForm(f => ({ ...f, collegeDomain: opt?.domain ?? '', departmentId: '' }));
    setErrors(e => ({ ...e, collegeDomain: '', departmentId: '' }));
  };
  const handleDeptChange = id => {
    set('departmentId', id);
    setErrors(e => ({ ...e, departmentId: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim())  e.firstName    = 'First name is required';
    if (!form.lastName.trim())   e.lastName     = 'Last name is required';
    if (!form.email.trim())      e.email        = 'Email is required';
    if (!form.password)          e.password     = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = 'Must include uppercase, lowercase and a number';
    if (!form.collegeDomain)     e.collegeDomain = 'Select your college';
    if (!form.departmentId)      e.departmentId  = 'Select your department';
    if (form.role === 'student' && !form.semester) e.semester = 'Select your semester';
    if (!form.rollNumber.trim()) e.rollNumber = 'Roll / employee number is required';
    return e;
  };

  const submit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      email: form.email.trim(), password: form.password,
      collegeDomain: form.collegeDomain, role: form.role, departmentId: form.departmentId,
    };
    if (form.role === 'student') payload.semester = Number(form.semester);
    if (form.rollNumber.trim()) payload.rollNumber = form.rollNumber.trim();
    register(payload);
  };

  const collegeValue = colleges.find(c => c.domain === form.collegeDomain)?._id ?? '';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAFAF9' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 mb-7">
          <img src="/CC.png" alt="Campus Connect" className="w-9 h-9 rounded-xl object-contain" />
          <span className="font-bold text-lg" style={{ color: '#18181B' }}>Campus Connect</span>
        </div>

        <div className="bg-white rounded-2xl p-7"
          style={{ border: '1px solid #E7E5E4', boxShadow: '0 4px 20px rgba(12,12,14,0.07)' }}>

          <div className="mb-6">
            <h1 className="text-xl font-bold mb-1" style={{ color: '#18181B', letterSpacing: '-0.02em' }}>
              Create your account
            </h1>
            <p className="text-sm" style={{ color: '#78716C' }}>Join your college on Campus Connect</p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">First Name</label>
                <input className={`input ${errors.firstName ? 'error' : ''}`} placeholder="John"
                  value={form.firstName}
                  onChange={e => { set('firstName', e.target.value); setErrors(v => ({ ...v, firstName: '' })); }} />
                {errors.firstName && <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="field-label">Last Name</label>
                <input className={`input ${errors.lastName ? 'error' : ''}`} placeholder="Doe"
                  value={form.lastName}
                  onChange={e => { set('lastName', e.target.value); setErrors(v => ({ ...v, lastName: '' })); }} />
                {errors.lastName && <p className="text-red-500 text-[11px] mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <SearchableSelect
              label="College *" placeholder="Search and select your college…"
              options={colleges.map(c => ({ ...c, _id: c._id }))}
              value={collegeValue} onChange={handleCollegeChange} loading={loadingColleges}
              displayKey="name" valueKey="_id" subKey="domain" error={errors.collegeDomain}
            />

            <SearchableSelect
              label="Department *"
              placeholder={form.collegeDomain ? 'Search and select your department…' : 'Select a college first'}
              options={depts} value={form.departmentId} onChange={handleDeptChange}
              loading={loadingDepts} disabled={!form.collegeDomain}
              displayKey="name" valueKey="_id" subKey="code" error={errors.departmentId}
            />

            <div>
              <label className="field-label">Email</label>
              <input className={`input ${errors.email ? 'error' : ''}`} type="email" placeholder="you@example.com"
                value={form.email}
                onChange={e => { set('email', e.target.value); setErrors(v => ({ ...v, email: '' })); }} />
              {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="field-label">Password</label>
              <input className={`input ${errors.password ? 'error' : ''}`} type="password"
                placeholder="Min 8 chars, upper + lower + number"
                value={form.password}
                onChange={e => { set('password', e.target.value); setErrors(v => ({ ...v, password: '' })); }} />
              {errors.password && <p className="text-red-500 text-[11px] mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="field-label">Role</label>
              <select className="input" value={form.role}
                onChange={e => { setForm(f => ({ ...f, role: e.target.value, semester: '' })); setErrors(v => ({ ...v, semester: '' })); }}
                style={{ cursor: 'pointer' }}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            <div>
              <label className="field-label">
                {form.role === 'student' ? 'Roll Number *' : form.role === 'faculty' ? 'Employee Number *' : 'Alumni / Roll Number *'}
              </label>
              <input className={`input ${errors.rollNumber ? 'error' : ''}`}
                placeholder={form.role === 'student' ? 'e.g. CS2021001' : form.role === 'faculty' ? 'e.g. EMP-0042' : 'e.g. AL-2019-007'}
                value={form.rollNumber}
                onChange={e => { set('rollNumber', e.target.value); setErrors(v => ({ ...v, rollNumber: '' })); }} />
              {errors.rollNumber && <p className="text-red-500 text-[11px] mt-1">{errors.rollNumber}</p>}
            </div>

            {form.role === 'student' && (
              <div>
                <label className="field-label">Semester *</label>
                <select className={`input ${errors.semester ? 'error' : ''}`} value={form.semester}
                  onChange={e => { set('semester', e.target.value); setErrors(v => ({ ...v, semester: '' })); }}
                  style={{ cursor: 'pointer' }}>
                  <option value="">Select semester</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
                {errors.semester && <p className="text-red-500 text-[11px] mt-1">{errors.semester}</p>}
              </div>
            )}

            <div className="rounded-xl px-4 py-3 text-[12px]"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
              After registration, your account will be <strong>pending approval</strong> by your
              HOD (Head of Department) before you can access the platform.
            </div>

            <button type="submit" disabled={isPending}
              className="btn btn-primary w-full justify-center mt-1 gap-2">
              {isPending
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating account…
                  </span>
                : <><span>Create Account</span><ArrowRight size={14} /></>
              }
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#78716C' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: '#D97706' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
