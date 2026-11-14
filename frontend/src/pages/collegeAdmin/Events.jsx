import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Calendar, MapPin, Monitor,
  X, Image as ImageIcon, Clock, Wifi,
} from 'lucide-react';
import { eventsService } from '../../services/index.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

const EMPTY_FORM = {
  title: '', description: '', scheduledAt: '', endsAt: '',
  venue: '', meetingLink: '', isOnline: false,
};

const Events = () => {
  const qc = useQueryClient();
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);
  const [file,    setFile]    = useState(null);
  const fileRef               = useRef();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn:  () => eventsService.list(),
    select:   r  => r.data,
  });

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (file) fd.append('coverImage', file);
      return eventsService.create(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created');
      setOpen(false); setForm(EMPTY_FORM); setFile(null); setPreview(null);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to create event'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: eventsService.delete,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Event deleted'); },
    onError:    e  => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => { setOpen(false); setForm(EMPTY_FORM); setFile(null); setPreview(null); };
  const events = eventsData?.events ?? [];

  return (
    <div className="max-w-4xl space-y-6">

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">College-wide events visible to all department members.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Plus size={14} strokeWidth={2.5} /> Create Event
        </button>
      </div>

      {/* Create form */}
      {open && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-surface-800 text-[13.5px]">New College-Wide Event</span>
            <button onClick={reset}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-100 text-surface-400 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Cover image upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`relative h-44 rounded-xl border-2 border-dashed flex items-center justify-center
              cursor-pointer transition-colors overflow-hidden
              ${preview ? 'border-transparent' : 'border-surface-200 hover:border-primary-300 bg-surface-50'}`}>
            {preview
              ? <img src={preview} className="w-full h-full object-cover rounded-xl" alt="" />
              : <div className="text-center text-surface-400">
                  <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center mx-auto mb-2">
                    <ImageIcon size={18} className="text-surface-400" />
                  </div>
                  <p className="text-xs font-medium">Click to add cover image</p>
                  <p className="text-[11px] text-surface-300 mt-0.5">PNG, JPG, WebP · Max 5 MB</p>
                </div>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          <input className="input" placeholder="Event title *"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          <textarea className="input min-h-[80px]" placeholder="Description *"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Start date & time</label>
              <input type="datetime-local" className="input"
                value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">End date & time</label>
              <input type="datetime-local" className="input"
                value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-surface-700 font-medium w-fit">
            <input type="checkbox" className="rounded accent-primary-600"
              checked={form.isOnline}
              onChange={e => setForm(p => ({ ...p, isOnline: e.target.checked }))} />
            Online event
          </label>

          {form.isOnline
            ? <input className="input" placeholder="Meeting link (Zoom, Meet, etc.)"
                value={form.meetingLink} onChange={e => setForm(p => ({ ...p, meetingLink: e.target.value }))} />
            : <input className="input" placeholder="Venue / location"
                value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} />
          }

          <div className="flex justify-end gap-2 pt-1">
            <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>
            <button className="btn btn-primary btn-sm"
              disabled={creating || !form.title || !form.description}
              onClick={() => create()}>
              {creating ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-0 overflow-hidden">
              <div className="skeleton h-40 rounded-none" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <Calendar size={22} className="text-surface-400" />
            </div>
            <p className="empty-title">No events yet</p>
            <p className="empty-body">Create your first college-wide event to get started.</p>
            <button className="btn btn-primary btn-sm mt-4" onClick={() => setOpen(true)}>
              <Plus size={13} /> Create Event
            </button>
          </div>
        </div>
      )}

      {/* Events grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {events.map(ev => (
          <div key={ev._id} className="card overflow-hidden p-0 group">
            {/* Cover */}
            {ev.coverImage?.url
              ? <img src={ev.coverImage.url} alt={ev.title} className="w-full h-44 object-cover" />
              : (
                <div className="w-full h-28 bg-gradient-to-br from-primary-50 to-accent-50
                                flex items-center justify-center">
                  <Calendar size={28} className="text-primary-200" />
                </div>
              )
            }

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-surface-800 truncate text-[13.5px]">{ev.title}</div>
                  <p className="text-[12px] text-surface-400 mt-1 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                </div>
                <button
                  onClick={() => { if (window.confirm(`Delete "${ev.title}"?`)) remove(ev._id); }}
                  className="p-1.5 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50
                             transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-surface-400">
                {ev.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {fmt(ev.scheduledAt)}
                  </span>
                )}
                {ev.isOnline
                  ? <span className="flex items-center gap-1"><Wifi size={10} /> Online</span>
                  : ev.venue && <span className="flex items-center gap-1"><MapPin size={10} /> {ev.venue}</span>
                }
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`badge ${ev.status === 'published' ? 'badge-success' : 'badge-neutral'}`}>
                  {ev.status}
                </span>
                {ev.isOnline && <span className="badge badge-info">Online</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
