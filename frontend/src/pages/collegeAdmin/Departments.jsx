import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Info, AlertTriangle, X,
  Building2, UserCog, ChevronDown, ChevronUp,
  Search, Sparkles, PenLine, Check,
} from 'lucide-react';
import { departmentsService } from '../../services/index.js';

// ── Department templates ───────────────────────────────────────────────────────
const DEPT_TEMPLATES = [
  // Engineering
  { name: 'Computer Science & Engineering', code: 'CSE', description: 'Covers computation, programming, algorithms, and software systems.', category: 'Engineering' },
  { name: 'Information Technology',         code: 'IT',  description: 'Focuses on the use of computers and software to manage information.', category: 'Engineering' },
  { name: 'Mechanical Engineering',         code: 'ME',  description: 'Study of mechanical systems, thermodynamics, and manufacturing processes.', category: 'Engineering' },
  { name: 'Electrical Engineering',         code: 'EE',  description: 'Study of electrical systems, circuits, power, and control systems.', category: 'Engineering' },
  { name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Covers electronics, signal processing, and communication systems.', category: 'Engineering' },
  { name: 'Civil Engineering',              code: 'CE',  description: 'Design and construction of infrastructure like bridges, roads, and buildings.', category: 'Engineering' },
  { name: 'Chemical Engineering',           code: 'CHE', description: 'Application of chemistry and physics to large-scale industrial processes.', category: 'Engineering' },
  { name: 'Aerospace Engineering',          code: 'AE',  description: 'Design and development of aircraft and spacecraft.', category: 'Engineering' },
  { name: 'Biotechnology Engineering',      code: 'BT',  description: 'Application of biological systems to engineering and technology.', category: 'Engineering' },
  { name: 'Data Science & AI',              code: 'DS',  description: 'Machine learning, data analysis, and artificial intelligence systems.', category: 'Engineering' },
  // Commerce & Management
  { name: 'Business Administration',        code: 'MBA', description: 'Management principles, business strategy, and organizational leadership.', category: 'Commerce' },
  { name: 'Commerce',                       code: 'COM', description: 'Study of trade, accounting, economics, and financial systems.', category: 'Commerce' },
  { name: 'Finance & Accounting',           code: 'FIN', description: 'Financial management, accounting principles, and investment strategies.', category: 'Commerce' },
  { name: 'Marketing Management',           code: 'MKT', description: 'Consumer behaviour, branding, market research, and advertising.', category: 'Commerce' },
  { name: 'Human Resource Management',      code: 'HRM', description: 'People management, recruitment, training, and organizational behaviour.', category: 'Commerce' },
  // Science
  { name: 'Physics',                        code: 'PHY', description: 'Study of matter, energy, and the fundamental forces of the universe.', category: 'Science' },
  { name: 'Chemistry',                      code: 'CHM', description: 'Study of substances, their properties, reactions, and transformations.', category: 'Science' },
  { name: 'Mathematics',                    code: 'MTH', description: 'Pure and applied mathematics, statistics, and quantitative analysis.', category: 'Science' },
  { name: 'Biology',                        code: 'BIO', description: 'Study of living organisms, genetics, ecology, and life sciences.', category: 'Science' },
  { name: 'Environmental Science',          code: 'EVS', description: 'Study of the environment, ecology, and sustainable practices.', category: 'Science' },
  // Arts & Humanities
  { name: 'Arts',                           code: 'ART', description: 'Visual arts, fine arts, creative expression, and aesthetics.', category: 'Arts' },
  { name: 'English Literature',             code: 'ENG', description: 'Language, literature, writing, and critical analysis.', category: 'Arts' },
  { name: 'History',                        code: 'HIS', description: 'Study of past events, civilizations, and cultural heritage.', category: 'Arts' },
  { name: 'Psychology',                     code: 'PSY', description: 'Human behaviour, mental processes, and psychological research.', category: 'Arts' },
  { name: 'Sociology',                      code: 'SOC', description: 'Study of society, social behaviour, and human relationships.', category: 'Arts' },
  { name: 'Political Science',              code: 'POL', description: 'Government systems, political theory, and public policy.', category: 'Arts' },
  // Medical & Health
  { name: 'Medicine (MBBS)',                code: 'MBBS', description: 'Medical sciences, clinical training, and patient care.', category: 'Medical' },
  { name: 'Pharmacy',                       code: 'PHARM', description: 'Pharmaceutical sciences, drug development, and clinical pharmacy.', category: 'Medical' },
  { name: 'Nursing',                        code: 'NUR', description: 'Patient care, health management, and clinical nursing practice.', category: 'Medical' },
  { name: 'Dentistry',                      code: 'BDS', description: 'Oral health, dental surgery, and clinical dentistry.', category: 'Medical' },
  { name: 'Physiotherapy',                  code: 'PT',  description: 'Rehabilitation, movement science, and physical therapy.', category: 'Medical' },
  // Design & Architecture
  { name: 'Architecture',                   code: 'ARCH', description: 'Design of buildings, urban spaces, and built environments.', category: 'Others' },
  { name: 'Interior Design',                code: 'INT', description: 'Spatial design, aesthetics, and functional interior environments.', category: 'Others' },
  { name: 'Fashion Design',                 code: 'FD',  description: 'Textile, garment design, and fashion industry management.', category: 'Others' },
  { name: 'Law (LLB)',                      code: 'LAW', description: 'Legal studies, jurisprudence, and legal practice.', category: 'Others' },
  { name: 'Education (B.Ed)',               code: 'BED', description: 'Teaching methodologies, educational psychology, and pedagogy.', category: 'Others' },
];

const CATEGORIES = ['All', 'Engineering', 'Commerce', 'Science', 'Arts', 'Medical', 'Others'];

const CATEGORY_COLORS = {
  Engineering: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  Commerce:    { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  Science:     { bg: '#F0FDF4', text: '#166534', dot: '#22C55E' },
  Arts:        { bg: '#FDF4FF', text: '#7E22CE', dot: '#A855F7' },
  Medical:     { bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
  Others:      { bg: '#F8FAFC', text: '#475569', dot: '#94A3B8' },
};

// ── Delete modal ───────────────────────────────────────────────────────────────
const DeleteModal = ({ dept, onConfirm, onCancel, isPending }) => (
  <div className="modal-overlay">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 animate-[fadeIn_0.15s_ease]">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-red-600" />
        </div>
        <div>
          <div className="font-semibold text-surface-800 text-base">Delete "{dept.name}"?</div>
          <p className="text-sm text-surface-500 mt-1">
            This will permanently remove the department and{' '}
            <span className="font-medium text-red-600">all associated data</span>:
          </p>
          <ul className="mt-2 text-sm text-surface-600 list-disc list-inside space-y-0.5">
            <li>Department HOD account</li>
            <li>All students, faculty, and alumni in this department</li>
            <li>All notes uploaded by department members</li>
            <li>All department events</li>
          </ul>
          <p className="text-sm font-semibold text-red-600 mt-3">This action cannot be undone.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending}>Cancel</button>
        <button className="btn btn-danger btn-sm gap-1" onClick={onConfirm} disabled={isPending}>
          <Trash2 size={13} /> {isPending ? 'Deleting…' : 'Delete Department'}
        </button>
      </div>
    </div>
  </div>
);

// ── Template picker modal ──────────────────────────────────────────────────────
const TemplatePicker = ({ onSelect, onCustom, existingNames }) => {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');
  const searchRef               = useRef(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const existingSet = new Set((existingNames ?? []).map(n => n.toLowerCase()));

  const filtered = DEPT_TEMPLATES.filter(t => {
    const matchCat    = category === 'All' || t.category === category;
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '5vh' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-[fadeIn_0.15s_ease] flex flex-col"
        style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-surface-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                <Sparkles size={14} className="text-primary-600" />
              </div>
              <span className="font-semibold text-surface-800 text-[14px]">Choose a Department Template</span>
            </div>
            <button
              onClick={onCustom}
              className="text-[12px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5
                         px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
              <PenLine size={12} /> Custom department
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
            <input
              ref={searchRef}
              className="input pl-9 text-sm"
              placeholder="Search by name or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLORS[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all duration-150"
                  style={active && cat !== 'All'
                    ? { background: c.bg, color: c.text, border: `1.5px solid ${c.dot}33` }
                    : active
                      ? { background: '#27272D', color: '#F5F5F4' }
                      : { background: '#F5F5F4', color: '#78716C' }
                  }>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Search size={28} className="mx-auto mb-2 text-surface-300" />
              <p className="text-sm text-surface-400">No departments match "{search}"</p>
              <button
                onClick={onCustom}
                className="btn btn-primary btn-sm mt-4 gap-1">
                <PenLine size={12} /> Create custom department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(t => {
                const c       = CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.Others;
                const exists  = existingSet.has(t.name.toLowerCase());
                return (
                  <button
                    key={t.code}
                    onClick={() => !exists && onSelect(t)}
                    disabled={exists}
                    className={`text-left p-3.5 rounded-xl border transition-all duration-150 group
                      ${exists
                        ? 'opacity-50 cursor-not-allowed border-surface-100 bg-surface-50'
                        : 'border-surface-200 hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-sm cursor-pointer'
                      }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-surface-800 leading-snug">
                          {t.name}
                        </div>
                        <div className="text-[10.5px] text-surface-400 mt-1.5 leading-relaxed line-clamp-2">
                          {t.description}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: c.bg, color: c.text }}>
                          {t.code}
                        </span>
                        {exists && (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                            <Check size={10} /> Added
                          </span>
                        )}
                      </div>
                    </div>
                    {!exists && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.text, borderRadius: 999 }}>
                          {t.category}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-surface-100 flex items-center justify-between">
          <p className="text-[11px] text-surface-400">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''} available
            {filtered.filter(t => existingSet.has(t.name.toLowerCase())).length > 0
              ? ` · ${filtered.filter(t => existingSet.has(t.name.toLowerCase())).length} already added`
              : ''}
          </p>
          <button className="btn btn-ghost btn-sm" onClick={onCustom}>
            Skip — enter manually
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Create form ────────────────────────────────────────────────────────────────
const EMPTY_FORM  = { name: '', code: '', description: '' };
const EMPTY_ADMIN = { firstName: '', lastName: '', email: '', password: '' };

const CreateForm = ({ onClose, existingNames, onCreated }) => {
  const qc = useQueryClient();
  const [step, setStep]           = useState('pick');   // 'pick' | 'form'
  const [form, setForm]           = useState(EMPTY_FORM);
  const [admin, setAdmin]         = useState(EMPTY_ADMIN);
  const [showAdmin, setShowAdmin] = useState(false);

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (showAdmin && admin.email) {
        payload.adminFirstName = admin.firstName;
        payload.adminLastName  = admin.lastName;
        payload.adminEmail     = admin.email;
        payload.adminPassword  = admin.password;
      }
      return departmentsService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
      onCreated();
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to create'),
  });

  const adminValid = !showAdmin || !admin.email || (
    admin.firstName && admin.email && admin.password.length >= 8
  );

  const handleSelect = (template) => {
    setForm({ name: template.name, code: template.code, description: template.description });
    setStep('form');
  };

  const handleCustom = () => {
    setForm(EMPTY_FORM);
    setStep('form');
  };

  if (step === 'pick') {
    return (
      <TemplatePicker
        onSelect={handleSelect}
        onCustom={handleCustom}
        existingNames={existingNames}
      />
    );
  }

  // step === 'form'
  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '8vh' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-[fadeIn_0.15s_ease]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('pick')}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100
                         text-surface-400 hover:text-surface-600 transition-colors">
              <ChevronDown size={15} className="rotate-90" />
            </button>
            <span className="font-semibold text-surface-800 text-[14px]">
              {form.name ? 'Confirm Details' : 'New Department'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Pre-filled notice */}
          {form.name && (
            <div className="flex items-center gap-2 text-[12px] text-primary-700 bg-primary-50
                            border border-primary-100 rounded-xl px-3.5 py-2.5">
              <Sparkles size={13} className="text-primary-500 shrink-0" />
              Fields pre-filled from template — review and edit before creating.
            </div>
          )}

          {/* Name + Code */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="field-label">Department Name *</label>
              <input
                className="input"
                placeholder="e.g. Computer Science & Engineering"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="w-28">
              <label className="field-label">Code</label>
              <input
                className="input font-mono"
                placeholder="e.g. CSE"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="field-label">Description <span className="font-normal text-surface-400">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Brief description of this department"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* HOD toggle */}
          <button
            type="button"
            onClick={() => setShowAdmin(s => !s)}
            className="flex items-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors">
            <UserCog size={14} />
            {showAdmin ? 'Remove HOD setup' : 'Add HOD account (optional)'}
            {showAdmin ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdmin && (
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 space-y-3">
              <p className="text-xs text-surface-500">
                Create a Head of Department (HOD) account for this department.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First Name *</label>
                  <input className="input" placeholder="First name"
                    value={admin.firstName} onChange={e => setAdmin(a => ({ ...a, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Last Name</label>
                  <input className="input" placeholder="Last name"
                    value={admin.lastName} onChange={e => setAdmin(a => ({ ...a, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="field-label">Email *</label>
                <input className="input" type="email" placeholder="hod@college.edu"
                  value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Password *</label>
                <input className="input" type="password" placeholder="Min 8 characters"
                  value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary btn-sm gap-1"
              disabled={creating || !form.name.trim() || !adminValid}
              onClick={() => create()}>
              {creating
                ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</>
                : <><Plus size={13} /> Create Department</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const Departments = () => {
  const [open, setOpen]           = useState(false);
  const [delTarget, setDelTarget] = useState(null);

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn:  departmentsService.list,
    select:   r => r.data?.departments ?? [],
  });

  const qc = useQueryClient();

  const { mutate: remove, isPending: deleting } = useMutation({
    mutationFn: (id) => departmentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
      setDelTarget(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to delete'),
  });

  const existingNames = depts.map(d => d.name);

  return (
    <div className="max-w-3xl">
      {delTarget && (
        <DeleteModal
          dept={delTarget}
          onConfirm={() => remove(delTarget._id)}
          onCancel={() => setDelTarget(null)}
          isPending={deleting}
        />
      )}

      {open && (
        <CreateForm
          onClose={() => setOpen(false)}
          existingNames={existingNames}
          onCreated={() => setOpen(false)}
        />
      )}

      {/* Page header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage departments and their Heads of Department (HODs).</p>
        </div>
        <button className="btn btn-primary btn-sm gap-1" onClick={() => setOpen(true)}>
          <Plus size={14} strokeWidth={2.5} /> Add Department
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading && (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="card space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-10 h-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {!isLoading && depts.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">
                <Building2 size={22} className="text-surface-400" />
              </div>
              <p className="empty-title">No departments yet</p>
              <p className="empty-body">Create your first department to get started.</p>
              <button className="btn btn-primary btn-sm mt-4 gap-1" onClick={() => setOpen(true)}>
                <Plus size={13} /> Add Department
              </button>
            </div>
          </div>
        )}

        {depts.map(d => {
          const catColor = (() => {
            const match = DEPT_TEMPLATES.find(t => t.name === d.name);
            return match ? CATEGORY_COLORS[match.category] ?? CATEGORY_COLORS.Others : null;
          })();

          return (
            <div key={d._id} className="card group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={catColor
                      ? { background: catColor.bg, border: `1.5px solid ${catColor.dot}33` }
                      : { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }
                    }>
                    <Building2 size={16} strokeWidth={2}
                      style={{ color: catColor ? catColor.text : '#fff' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-surface-800 text-[13.5px]">{d.name}</div>
                      {d.code && (
                        <span className="text-[10px] bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full font-mono font-medium">
                          {d.code}
                        </span>
                      )}
                      <span className={`badge text-[10px] ${d.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {d.description && (
                      <p className="text-[11px] text-surface-400 mt-0.5 truncate">{d.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <UserCog size={11} className="text-surface-400 shrink-0" />
                      {d.adminUserId ? (
                        <span className="text-[11px] text-surface-500">
                          {typeof d.adminUserId === 'object'
                            ? `${d.adminUserId.firstName} ${d.adminUserId.lastName}`
                            : 'HOD assigned'
                          } · {d.memberCount ?? 0} members
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">No HOD assigned</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/departments/${d._id}`}
                    className="btn btn-ghost btn-sm gap-1 text-surface-500 hover:text-surface-700">
                    <Info size={13} /> Manage
                  </Link>
                  <button
                    onClick={() => setDelTarget(d)}
                    className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50
                               transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Departments;
