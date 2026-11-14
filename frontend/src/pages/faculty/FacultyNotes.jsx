import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BookOpen, Trash2, Download, Search, FileText, X, Upload,
  AlertTriangle, Plus, Image, GraduationCap, User,
} from 'lucide-react';
import { notesService, subjectsService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const SEMESTERS = [1,2,3,4,5,6,7,8];

const bytesToSize = b => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/(1024*1024)).toFixed(1)} MB`;
};

const fmt = iso => iso
  ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

// ── Download helper ────────────────────────────────────────────────────────────
const doDownload = async (note) => {
  try {
    const res  = await notesService.download(note._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] ?? 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = note.fileUrl?.originalName ?? note.title;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Download failed.');
  }
};

// ── Delete modal ───────────────────────────────────────────────────────────────
const DeleteModal = ({ note, onConfirm, onClose, isPending }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <div className="font-semibold text-surface-800">Remove Note</div>
            <div className="text-xs text-surface-400 mt-0.5 truncate max-w-[200px]">{note?.title}</div>
          </div>
        </div>
        <div>
          <label className="field-label">Reason for removal</label>
          <textarea
            className="input min-h-[72px] resize-none py-2 text-sm"
            placeholder="e.g. Inaccurate content, copyright violation…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger btn-sm flex-1 gap-1"
            disabled={isPending || !reason.trim()}
            onClick={() => onConfirm(reason)}>
            <Trash2 size={12} />
            {isPending ? 'Removing…' : 'Remove Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Upload panel ───────────────────────────────────────────────────────────────
const UploadPanel = ({ onClose, deptId, assignedSubjects, onSuccess }) => {
  const fileRef  = useRef();
  const coverRef = useRef();
  const [selectedIdx, setSelectedIdx] = useState('');
  const [form, setForm] = useState({ title: '', description: '', units: '', tags: '' });
  const [file, setFile]               = useState(null);
  const [cover, setCover]             = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // No subjects assigned — show blocker instead of form
  if (!assignedSubjects?.length) {
    return (
      <div className="card border-amber-200 bg-amber-50/40">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-surface-800 text-sm">Upload New Note</div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <BookOpen size={15} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-semibold text-amber-800">No subjects assigned yet</p>
            <p className="text-[11.5px] text-amber-700 mt-0.5">
              You need at least one assigned subject before you can upload notes.
              Go to <strong>Settings → My Assigned Subjects</strong> to add your subjects.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selected = selectedIdx !== '' ? assignedSubjects[Number(selectedIdx)] : null;

  const handleCover = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Cover image must be under 5 MB'); return; }
    setCover(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const { mutate: upload, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('departmentId', deptId);
      fd.append('subject',  selected.name);
      fd.append('semester', selected.semester);
      if (selected.code) fd.append('subjectCode', selected.code);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('file', file);
      if (cover) fd.append('coverImage', cover);
      return notesService.upload(fd);
    },
    onSuccess: () => { toast.success('Note uploaded!'); onSuccess(); onClose(); },
    onError: e => {
      const errs = e.response?.data?.error?.details;
      if (errs) errs.forEach(err => toast.error(err.message));
      else toast.error(e.response?.data?.message ?? 'Upload failed');
    },
  });

  const canSubmit = file && form.title && selected;

  return (
    <div className="card border-primary-200 bg-primary-50/30">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-surface-800 text-sm">Upload New Note</div>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
      </div>

      <div className="space-y-4">
        {/* Subject dropdown — locked to assigned subjects */}
        <div>
          <label className="field-label">Subject *</label>
          <select
            className="input text-sm"
            value={selectedIdx}
            onChange={e => setSelectedIdx(e.target.value)}>
            <option value="">Select a subject…</option>
            {assignedSubjects.map((s, i) => (
              <option key={i} value={i}>
                {s.name}{s.code ? ` (${s.code})` : ''} — Sem {s.semester}
              </option>
            ))}
          </select>
        </div>

        {/* File drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
            ${file ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-primary-300 hover:bg-surface-50'}`}>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
            onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} className="text-primary-600" />
              <span className="text-sm font-medium text-primary-700">{file.name}</span>
              <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-surface-400 hover:text-red-500 ml-1"><X size={13} /></button>
            </div>
          ) : (
            <div>
              <Upload size={20} className="text-surface-300 mx-auto mb-1.5" />
              <div className="text-sm text-surface-500">Click to select PDF, DOCX, PPT, TXT</div>
              <div className="text-xs text-surface-400 mt-0.5">Max 50 MB</div>
            </div>
          )}
        </div>

        {/* Cover image */}
        {coverPreview ? (
          <div className="relative h-28 rounded-xl overflow-hidden border border-surface-200">
            <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
            <button onClick={() => { setCover(null); setCoverPreview(null); }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><X size={12} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => coverRef.current?.click()}
            className="w-full flex items-center gap-2 border border-dashed border-surface-200 hover:border-primary-300 rounded-xl px-3 py-2.5 text-xs text-surface-400 hover:text-surface-600 transition-colors">
            <Image size={14} /> Add cover image (optional)
          </button>
        )}
        <input ref={coverRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleCover} />

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label">Title *</label>
            <input className="input text-sm" placeholder="Note title" value={form.title} onChange={set('title')} />
          </div>
          <div className="col-span-2">
            <label className="field-label">Units / Topics covered</label>
            <input className="input text-sm" placeholder="e.g. Unit 1, Unit 2, Binary Trees" value={form.units} onChange={set('units')} />
          </div>
          <div>
            <label className="field-label">Tags</label>
            <input className="input text-sm" placeholder="comma-separated" value={form.tags} onChange={set('tags')} />
          </div>
          <div className="col-span-2">
            <label className="field-label">Description</label>
            <textarea className="input text-sm h-16 resize-none py-2" placeholder="Brief description…" value={form.description} onChange={set('description')} />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm flex-1 gap-1.5" onClick={() => upload()} disabled={isPending || !canSubmit}>
            <Upload size={12} /> {isPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { key: '',        label: 'All Notes'     },
  { key: 'student', label: 'Student Notes' },
  { key: 'faculty', label: 'Faculty Notes' },
];

const FacultyNotes = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const deptId          = user?.departmentId?._id ?? user?.departmentId ?? '';
  const assignedSubjects = user?.assignedSubjects ?? [];

  const [search,       setSearch]       = useState('');
  const [semester,     setSemester]     = useState('');
  const [subject,      setSubject]      = useState('');
  const [typeTab,      setTypeTab]      = useState('');
  const [showUpload,   setShowUpload]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = {
    ...(semester  && { semester: Number(semester) }),
    ...(subject   && { subject }),
    ...(search    && { search }),
    ...(typeTab   && { uploaderRole: typeTab }),
  };

  const { data, isLoading } = useQuery({
    queryKey:  ['faculty-notes', queryParams],
    queryFn:   () => notesService.list(queryParams),
    select:    r  => r.data ?? { notes: [], total: 0 },
    staleTime: 30_000,
  });

  const notes = data?.notes ?? [];

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: ({ id, reason }) => notesService.delete(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty-notes'] });
      qc.invalidateQueries({ queryKey: ['faculty-stats'] });
      toast.success('Note removed');
      setDeleteTarget(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to remove note'),
  });

  const hasFilters = semester || subject || search || typeTab;

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes & Validation</h1>
          <p className="page-subtitle">Upload your own notes and moderate department notes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data?.total > 0 && (
            <span className="text-[12px] font-semibold text-surface-500">{data.total} note{data.total !== 1 ? 's' : ''}</span>
          )}
          <button
            className="btn btn-primary btn-sm gap-1.5"
            onClick={() => setShowUpload(v => !v)}>
            <Plus size={13} />
            Upload Note
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <BookOpen size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[12px] text-blue-700 leading-relaxed">
          You can upload notes and remove notes for your <strong>assigned subjects</strong> only.
          Go to <strong>Settings → My Assigned Subjects</strong> to manage your subject list.
        </p>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          onClose={() => setShowUpload(false)}
          deptId={deptId}
          assignedSubjects={assignedSubjects}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['faculty-notes'] });
            qc.invalidateQueries({ queryKey: ['faculty-stats'] });
          }}
        />
      )}

      {/* Type tabs */}
      <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 w-fit">
        {TYPE_TABS.map(t => (
          <button key={t.key} onClick={() => setTypeTab(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
              ${typeTab === t.key ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input className="input pl-8 text-sm" placeholder="Search by title or subject…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input text-sm" value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="">All semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          {assignedSubjects.length > 0 ? (
            <select className="input text-sm w-40" value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {assignedSubjects.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
            </select>
          ) : (
            <input className="input text-sm w-36" placeholder="Subject…" value={subject} onChange={e => setSubject(e.target.value)} />
          )}
          {hasFilters && (
            <button className="btn btn-ghost btn-sm gap-1 text-surface-500"
              onClick={() => { setSearch(''); setSemester(''); setSubject(''); setTypeTab(''); }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card flex items-center gap-4">
              <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-56" /><div className="skeleton h-3 w-36" /></div>
              <div className="skeleton h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && notes.length === 0 && (
        <div className="card">
          <div className="empty-state py-14">
            <div className="empty-icon"><BookOpen size={22} className="text-surface-400" /></div>
            <p className="empty-title">{hasFilters ? 'No notes match your filters' : 'No notes yet'}</p>
            <p className="empty-body">
              {hasFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Upload your own notes or wait for students to share theirs.'}
            </p>
          </div>
        </div>
      )}

      {/* Notes list */}
      {!isLoading && notes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-surface-50">
            {notes.map(note => (
              <div key={note._id}
                   className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors group">

                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {note.coverImage?.url
                    ? <img src={note.coverImage.url} className="w-full h-full object-cover" alt="" />
                    : <FileText size={18} className="text-blue-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold text-surface-800 truncate">{note.title}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-surface-400">{note.subject}</span>
                    {note.subjectCode && (
                      <span className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded font-mono">{note.subjectCode}</span>
                    )}
                    {note.semester && <span className="badge badge-neutral text-[10px]">Sem {note.semester}</span>}
                    {/* Type badge */}
                    {note.uploaderRole === 'faculty' || note.uploaderRole === 'deptAdmin' ? (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <GraduationCap size={9} /> Faculty
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                        <User size={9} /> Student
                      </span>
                    )}
                    {note.fileUrl?.bytes && <span className="text-[10px] text-surface-300">{bytesToSize(note.fileUrl.bytes)}</span>}
                  </div>
                  <div className="text-[11px] text-surface-300 mt-0.5">
                    {note.uploadedBy ? `By ${note.uploadedBy.firstName} ${note.uploadedBy.lastName} · ` : ''}
                    {fmt(note.createdAt)}
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => doDownload(note)}
                    className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Download">
                    <Download size={14} />
                  </button>
                  {(() => {
                    const noteCode = note.subjectCode?.trim().toLowerCase();
                    const noteName = note.subject?.trim().toLowerCase();
                    const canDelete = assignedSubjects.length > 0 && assignedSubjects.some(s => {
                      const aCode = s.code?.trim().toLowerCase();
                      const aName = s.name?.trim().toLowerCase();
                      if (noteCode && aCode) return noteCode === aCode;
                      return noteName === aName;
                    });
                    return canDelete ? (
                      <button
                        className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove note"
                        onClick={() => setDeleteTarget(note)}>
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        className="p-2 rounded-lg text-surface-200 cursor-not-allowed"
                        title="Not your subject"
                        onClick={() => toast.error('You can only remove notes for your assigned subjects.')}>
                        <Trash2 size={14} />
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteModal
          note={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          isPending={removing}
          onConfirm={reason => remove({ id: deleteTarget._id, reason })}
        />
      )}
    </div>
  );
};

export default FacultyNotes;
