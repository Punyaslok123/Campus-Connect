// pages/alumni/PostJob.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobsService } from '../../services/index.js';
import { useNavigate } from 'react-router-dom';

const PostJob = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title:'', company:'', type:'job', description:'',
    location:'', isRemote:false, applyLink:'', deadline:'',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => jobsService.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
      toast.success('Job posting created!');
      navigate('/alumni');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to post'),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-6">Post a Job / Internship</h1>
      <div className="card flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Job Title *</label>
            <input className="input" placeholder="e.g. Software Engineer Intern" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Company *</label>
            <input className="input" placeholder="Your company name" value={form.company} onChange={set('company')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Type *</label>
            <select className="input" value={form.type} onChange={set('type')}>
              <option value="job">Full-time Job</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Description *</label>
            <textarea className="input h-28 resize-none py-2" placeholder="Role description, requirements, benefits…"
              value={form.description} onChange={set('description')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Location</label>
            <input className="input" placeholder="City or Remote" value={form.location} onChange={set('location')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Application Deadline</label>
            <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-surface-600 mb-1">Apply Link</label>
            <input className="input" type="url" placeholder="https://…" value={form.applyLink} onChange={set('applyLink')} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="remote" className="rounded"
              checked={form.isRemote} onChange={e => setForm(f => ({ ...f, isRemote: e.target.checked }))} />
            <label htmlFor="remote" className="text-sm text-surface-600">This is a remote position</label>
          </div>
        </div>
        <button className="btn btn-primary justify-center gap-2 mt-2" onClick={() => mutate()} disabled={isPending}>
          <Briefcase size={14} />
          {isPending ? 'Posting…' : 'Post Opportunity'}
        </button>
      </div>
    </div>
  );
};

export default PostJob;
