import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, X, Image } from 'lucide-react';
import toast from 'react-hot-toast';
import { notesService, subjectsService } from '../../services/index.js';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

const UploadNote = () => {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const fileRef  = useRef();
  const coverRef = useRef();
  const { user } = useAuthStore();

  const deptId = user?.departmentId?._id ?? user?.departmentId ?? '';

  const [form, setForm] = useState({
    title: '', subject: '', subjectCode: '', semester: '', description: '', tags: '',
  });
  const [file, setFile]                     = useState(null);
  const [coverImage, setCoverImage]         = useState(null);
  const [coverPreview, setCoverPreview]     = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Load dept subjects for autocomplete hint
  const { data: subjectsData } = useQuery({
    queryKey:  ['subjects', deptId, form.semester],
    queryFn:   () => subjectsService.list({ departmentId: deptId, semester: form.semester || undefined }),
    select:    r => r.data?.subjects ?? [],
    enabled:   !!deptId,
    staleTime: 60_000,
  });
  const subjects = subjectsData ?? [];

  const handleCoverChange = e => {
    const picked = e.target.files[0];
    if (!picked) return;
    if (picked.size > 5 * 1024 * 1024) { toast.error('Cover image must be under 5 MB'); return; }
    setCoverImage(picked);
    setCoverPreview(URL.createObjectURL(picked));
  };

  const removeCover = () => {
    setCoverImage(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (coverRef.current) coverRef.current.value = '';
  };

  const { mutate: upload, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('departmentId', deptId);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('file', file);
      if (coverImage) fd.append('coverImage', coverImage);
      return notesService.upload(fd);
    },
    onSuccess: () => {
      toast.success('Note uploaded successfully!');
      qc.invalidateQueries({ queryKey: ['notes'] });
      navigate('/student/notes');
    },
    onError: e => {
      const errs = e.response?.data?.error?.details;
      if (errs) errs.forEach(err => toast.error(err.message));
      else toast.error(e.response?.data?.message ?? 'Upload failed');
    },
  });

  const dropFile = e => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const selectSubject = (s) => {
    setForm(f => ({ ...f, subject: s.name, subjectCode: s.code ?? '', semester: s.semester.toString() }));
  };

  const canSubmit = file && form.title && form.subject && form.semester && deptId;

  return (
    <div className="max-w-2xl">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Upload Note</h1>
          <p className="page-subtitle">Share study material with your department.</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-5">

          {/* File drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={dropFile}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${file ? 'border-primary-400 bg-primary-50' : 'border-surface-200 hover:border-primary-300 hover:bg-surface-50'}`}>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              onChange={e => setFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-primary-600" />
                <span className="text-sm font-medium text-primary-700">{file.name}</span>
                <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-surface-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={24} className="text-surface-300 mx-auto mb-2" />
                <div className="text-sm font-medium text-surface-600">Drop file here or click to browse</div>
                <div className="text-xs text-surface-400 mt-1">PDF, DOCX, PPT, TXT — max 50 MB</div>
              </div>
            )}
          </div>

          {/* Cover image */}
          <div>
            <label className="field-label">Cover Image <span className="text-surface-400 font-normal">(optional)</span></label>
            {coverPreview ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-surface-200 group">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <button type="button" onClick={removeCover}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => coverRef.current?.click()}
                className="w-full flex items-center gap-3 border border-dashed border-surface-200 hover:border-primary-300 hover:bg-surface-50 rounded-xl px-4 py-3 text-sm text-surface-500 hover:text-surface-700 transition-colors">
                <Image size={16} className="shrink-0 text-surface-400" />
                <span>Add a cover image</span>
                <span className="ml-auto text-xs text-surface-400">JPEG / PNG / WebP · max 5 MB</span>
              </button>
            )}
            <input ref={coverRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
          </div>

          {/* Subject quick-select from dept subjects */}
          {subjects.length > 0 && (
            <div>
              <label className="field-label">Quick-select subject from your department</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => selectSubject(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${form.subject === s.name
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-surface-200 text-surface-600 hover:border-primary-300 hover:bg-surface-50'}`}>
                    {s.name}{s.code ? ` (${s.code})` : ''} · Sem {s.semester}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="field-label">Title *</label>
              <input className="input" placeholder="e.g. Data Structures Notes - Unit 3" value={form.title} onChange={set('title')} />
            </div>
            <div>
              <label className="field-label">Subject *</label>
              <input className="input" placeholder="e.g. Data Structures" value={form.subject} onChange={set('subject')} />
            </div>
            <div>
              <label className="field-label">Subject Code <span className="text-surface-400 font-normal">(optional)</span></label>
              <input className="input font-mono" placeholder="e.g. CS301" value={form.subjectCode} onChange={set('subjectCode')} />
            </div>
            <div>
              <label className="field-label">Semester *</label>
              <select className="input" value={form.semester} onChange={set('semester')}>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Tags <span className="text-surface-400 font-normal">(comma-separated)</span></label>
              <input className="input" placeholder="e.g. trees, sorting" value={form.tags} onChange={set('tags')} />
            </div>
            <div className="col-span-2">
              <label className="field-label">Description</label>
              <textarea
                className="input h-20 resize-none py-2"
                placeholder="Brief description of what's covered…"
                value={form.description}
                onChange={set('description')}
              />
            </div>
          </div>

          <button
            className="btn btn-primary justify-center gap-2 mt-1"
            onClick={() => upload()}
            disabled={isPending || !canSubmit}>
            <Upload size={14} />
            {isPending ? 'Uploading…' : 'Upload Note'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadNote;
