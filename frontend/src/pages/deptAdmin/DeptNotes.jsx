import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BookOpen, Trash2, Download, Search, FileText, X, Filter,
  AlertTriangle, GraduationCap, User,
} from 'lucide-react';
import { notesService } from '../../services/index.js';
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
            <div className="font-semibold text-surface-800">Delete Note</div>
            <div className="text-xs text-surface-400 truncate max-w-[200px]">{note?.title}</div>
          </div>
        </div>
        <div>
          <label className="field-label">Reason</label>
          <textarea
            className="input min-h-[64px] resize-none py-2 text-sm"
            placeholder="e.g. Duplicate, copyright violation…"
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
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TYPE_TABS = [
  { key: '',        label: 'All' },
  { key: 'student', label: 'Student' },
  { key: 'faculty', label: 'Faculty' },
];

const DeptNotes = () => {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [semester,     setSemester]     = useState('');
  const [subject,      setSubject]      = useState('');
  const [typeTab,      setTypeTab]      = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = {
    ...(semester && { semester: Number(semester) }),
    ...(subject  && { subject }),
    ...(search   && { search }),
    ...(typeTab  && { uploaderRole: typeTab }),
  };

  const { data, isLoading } = useQuery({
    queryKey:  ['dept-notes', queryParams],
    queryFn:   () => notesService.list(queryParams),
    select:    r  => r.data ?? { notes: [], total: 0 },
    staleTime: 30_000,
  });

  const notes = data?.notes ?? [];

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: ({ id, reason }) => notesService.delete(id, { reason }),
    onSuccess:  ()  => {
      qc.invalidateQueries({ queryKey: ['dept-notes'] });
      qc.invalidateQueries({ queryKey: ['dept-stats'] });
      toast.success('Note removed');
      setDeleteTarget(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to delete'),
  });

  const hasFilters = semester || subject || search || typeTab;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">All notes uploaded by department members.</p>
        </div>
        {data?.total > 0 && (
          <div className="shrink-0 text-[12px] font-semibold text-surface-500">
            {data.total} note{data.total !== 1 ? 's' : ''}
          </div>
        )}
      </div>

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
          <input className="input text-sm w-40" placeholder="Subject…" value={subject} onChange={e => setSubject(e.target.value)} />
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
          {[1,2,3,4].map(i => (
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
            <p className="empty-title">{hasFilters ? 'No notes match your filters' : 'No notes uploaded yet'}</p>
            <p className="empty-body">
              {hasFilters ? 'Try adjusting your search or filters.' : 'Department members can upload notes from their dashboards.'}
            </p>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm mt-4 gap-1"
                onClick={() => { setSearch(''); setSemester(''); setSubject(''); setTypeTab(''); }}>
                <Filter size={13} /> Clear Filters
              </button>
            )}
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
                    ? <img src={note.coverImage.url} className="w-full h-full rounded-xl object-cover" alt="" />
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

                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => doDownload(note)}
                    className="p-2 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Download">
                    <Download size={14} />
                  </button>
                  <button
                    className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete note"
                    onClick={() => setDeleteTarget(note)}>
                    <Trash2 size={14} />
                  </button>
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

export default DeptNotes;
