import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { mentorshipService } from '../../services/index.js';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = [
  { value: 'zoom',        label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'ms_teams',    label: 'MS Teams' },
  { value: 'webex',       label: 'Webex' },
  { value: 'other',       label: 'Other' },
];

const HostSession = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', meetingLink: '',
    meetingPlatform: 'google_meet', scheduledAt: '',
    durationMinutes: 60, maxAttendees: 50, topics: '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => mentorshipService.create({
      ...form,
      topics: form.topics.split(',').map(t => t.trim()).filter(Boolean),
      durationMinutes: parseInt(form.durationMinutes),
      maxAttendees:    parseInt(form.maxAttendees),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-sessions'] });
      toast.success('Mentorship session created!');
      navigate('/alumni');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-6">Host a Mentorship Session</h1>
      <div className="card flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Session Title *</label>
            <input className="input" placeholder="e.g. Breaking into Product Management" value={form.title} onChange={set('title')} required />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Description</label>
            <textarea className="input h-20 resize-none py-2" placeholder="What will students learn?"
              value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Platform *</label>
            <select className="input" value={form.meetingPlatform} onChange={set('meetingPlatform')}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Meeting Link *</label>
            <input className="input" type="url" placeholder="https://meet.google.com/…" value={form.meetingLink} onChange={set('meetingLink')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Date & Time *</label>
            <input className="input" type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Duration (minutes)</label>
            <select className="input" value={form.durationMinutes} onChange={set('durationMinutes')}>
              {[30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Max Attendees</label>
            <input className="input" type="number" min="1" max="500" value={form.maxAttendees} onChange={set('maxAttendees')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Topics (comma-separated)</label>
            <input className="input" placeholder="career, tech, interview" value={form.topics} onChange={set('topics')} />
          </div>
        </div>
        <button className="btn btn-primary justify-center gap-2 mt-2"
          onClick={() => mutate()} disabled={isPending}>
          <GraduationCap size={14} />
          {isPending ? 'Creating session…' : 'Schedule Session'}
        </button>
      </div>
    </div>
  );
};

export default HostSession;
