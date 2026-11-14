import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, FileText, Trash2, BookOpen, User, GraduationCap, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { notesService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const TABS = [
  { key: 'all',     label: 'All Notes',      icon: BookOpen      },
  { key: 'student', label: 'Student Notes',  icon: User          },
  { key: 'faculty', label: 'Faculty Notes',  icon: GraduationCap },
  { key: 'mine',    label: 'My Uploads',     icon: User          },
];

const bytesToSize = b => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const handleDownload = async (note) => {
  try {
    const res = await notesService.download(note._id);
    const blob = new Blob([res.data], { type: res.headers['content-type'] ?? 'application/octet-stream' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = note.fileUrl?.originalName ?? note.title;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Download failed. Please try again.');
  }
};

const NoteCard = ({ note, onDeleteOwn, isOwn }) => (
  <div className="card group">
    {note.coverImage?.url ? (
      <img
        src={note.coverImage.url}
        alt={note.title}
        className="w-full h-32 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity"
      />
    ) : (
      <div className="w-full h-32 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50">
        <FileText size={28} className="text-surface-300" />
      </div>
    )}

    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-surface-800 text-sm truncate">{note.title}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-surface-400">{note.subject}</span>
          {note.subjectCode && (
            <span className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded font-mono">{note.subjectCode}</span>
          )}
        </div>
      </div>
      <span className="badge badge-primary shrink-0">Sem {note.semester}</span>
    </div>

    {/* Uploader type badge */}
    <div className="flex items-center gap-2 mt-1.5">
      {note.uploaderRole === 'faculty' || note.uploaderRole === 'deptAdmin' ? (
        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Faculty</span>
      ) : (
        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Student</span>
      )}
      {note.fileUrl?.bytes && (
        <span className="text-[10px] text-surface-300">{bytesToSize(note.fileUrl.bytes)}</span>
      )}
    </div>

    {note.description && (
      <p className="text-xs text-surface-400 mt-1.5 line-clamp-2">{note.description}</p>
    )}

    <div className="flex items-center justify-between mt-3 gap-2">
      <span className="text-xs text-surface-400 truncate">
        {note.uploadedBy?.firstName} {note.uploadedBy?.lastName}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {isOwn && (
          <button
            onClick={() => onDeleteOwn(note._id)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete my note">
            <Trash2 size={12} />
          </button>
        )}
        <button
          onClick={() => handleDownload(note)}
          className="flex items-center gap-1 btn btn-ghost btn-sm text-xs">
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  </div>
);

const BrowseNotes = () => {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('all');
  const [filters, setFilters] = useState({ search: '', semester: '', subject: '' });
  const set = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const isMyTab    = tab === 'mine';
  const uploaderRoleFilter = tab === 'student' ? 'student' : tab === 'faculty' ? 'faculty' : undefined;

  const queryParams = {
    ...(filters.semester && { semester: Number(filters.semester) }),
    ...(filters.subject  && { subject: filters.subject }),
    ...(filters.search   && { search: filters.search }),
    ...(uploaderRoleFilter && { uploaderRole: uploaderRoleFilter }),
  };

  const { data, isLoading } = useQuery({
    queryKey:  isMyTab ? ['notes-my'] : ['notes', queryParams],
    queryFn:   () => isMyTab ? notesService.myNotes() : notesService.list(queryParams),
    select:    r => r.data?.notes ?? [],
    staleTime: 30_000,
  });

  const { mutate: deleteOwn } = useMutation({
    mutationFn: id => notesService.deleteOwn(id),
    onSuccess:  () => {
      toast.success('Note deleted');
      qc.invalidateQueries({ queryKey: ['notes-my'] });
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleDeleteOwn = id => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    deleteOwn(id);
  };

  const myId  = user?._id?.toString();
  const notes = data ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-surface-800 mb-6">Notes</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-surface-200 p-1 bg-surface-50 w-fit mb-5 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors
              ${tab === key ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}>
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters — not on my-uploads tab */}
      {!isMyTab && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input className="input pl-8 text-sm" placeholder="Search notes…" value={filters.search} onChange={set('search')} />
          </div>
          <select className="input text-sm w-36" value={filters.semester} onChange={set('semester')}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input className="input text-sm w-40" placeholder="Subject…" value={filters.subject} onChange={set('subject')} />
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <div className="card">
          <div className="empty-state py-16">
            <div className="empty-icon"><FileText size={22} className="text-surface-400" /></div>
            <p className="empty-title">{isMyTab ? 'No uploads yet' : 'No notes found'}</p>
            <p className="empty-body">
              {isMyTab
                ? 'Notes you upload will appear here.'
                : 'Try different filters or be the first to upload!'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map(n => (
            <NoteCard
              key={n._id}
              note={n}
              isOwn={isMyTab || n.uploadedBy?._id?.toString() === myId}
              onDeleteOwn={handleDeleteOwn}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseNotes;
