import { useState }   from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast           from 'react-hot-toast';
import { Plus, Trash2, Pin, Megaphone, X } from 'lucide-react';
import { announcementsService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const EMPTY = { title: '', body: '', isPinned: false };

const Announcements = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementsService.list(),
    select:   r => r.data,
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => announcementsService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement posted');
      setOpen(false); setForm(EMPTY);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: announcementsService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const { mutate: togglePin } = useMutation({
    mutationFn: ({ id, isPinned }) => announcementsService.update(id, { isPinned: !isPinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const announcements = data?.announcements ?? [];

  return (
    <div className="max-w-3xl space-y-6">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">College-wide announcements visible to all department members.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Plus size={14} strokeWidth={2.5} /> New Announcement
        </button>
      </div>

      {/* Create form */}
      {open && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-surface-800 text-[13.5px]">New College-Wide Announcement</span>
            <button
              onClick={() => { setOpen(false); setForm(EMPTY); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
              <X size={15} />
            </button>
          </div>

          <input className="input" placeholder="Title *"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          <textarea className="input min-h-[120px] resize-none" placeholder="Write your announcement…"
            value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />

          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-surface-700 font-medium w-fit">
            <input type="checkbox" className="rounded accent-primary-600"
              checked={form.isPinned}
              onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} />
            Pin this announcement (always shown at top)
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setOpen(false); setForm(EMPTY); }}>Cancel</button>
            <button className="btn btn-primary btn-sm"
              disabled={creating || !form.title || !form.body}
              onClick={() => create()}>
              {creating ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && announcements.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <Megaphone size={22} className="text-surface-400" />
            </div>
            <p className="empty-title">No announcements yet</p>
            <p className="empty-body">Post announcements to keep your college informed.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => setOpen(true)}>
              <Plus size={13} /> New Announcement
            </button>
          </div>
        </div>
      )}

      {/* Announcement list */}
      <div className="space-y-3">
        {announcements.map(ann => (
          <div key={ann._id}
               className={`card group ${ann.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700
                                     px-2 py-0.5 rounded-full font-semibold">
                      <Pin size={9} /> Pinned
                    </span>
                  )}
                  <div className="font-semibold text-surface-800 text-[13.5px]">{ann.title}</div>
                </div>
                <p className="text-sm text-surface-500 whitespace-pre-wrap leading-relaxed">{ann.body}</p>
                <div className="text-[11px] text-surface-400 mt-3">
                  Posted {fmt(ann.createdAt)}
                  {ann.postedBy && ` · ${ann.postedBy.firstName} ${ann.postedBy.lastName}`}
                </div>
              </div>

              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => togglePin({ id: ann._id, isPinned: ann.isPinned })}
                  className={`p-1.5 rounded-lg transition-colors
                    ${ann.isPinned
                      ? 'text-amber-500 hover:bg-amber-100'
                      : 'text-surface-300 hover:text-amber-500 hover:bg-amber-50'}`}
                  title={ann.isPinned ? 'Unpin' : 'Pin'}>
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => { if (window.confirm('Delete this announcement?')) remove(ann._id); }}
                  className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
