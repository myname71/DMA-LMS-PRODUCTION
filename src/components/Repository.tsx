import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Download, File, FileText, Image, Loader2, Lock,
  Presentation, Search, Sheet, Tag, Upload,
} from 'lucide-react';
import { Course, User } from '../types';
import {
  MATERIAL_KINDS, MaterialKind, StudyMaterial, createMaterial, downloadMaterial,
  fetchMaterials, fileKind, formatBytes, readFileAsDataUrl, validateMaterialFile,
} from '../lib/studyMaterials';

interface RepositoryProps {
  currentUser: User | null;
  /** Course list used by the staff upload form to attach a file to a course. */
  courses?: Course[];
  /** Called when a signed-out visitor presses Download (route to register). */
  onRequireAuth?: () => void;
  triggerToast?: (msg: string, type?: 'success' | 'warn') => void;
  /** Renders the list without the page header/padding (dashboard embed). */
  embedded?: boolean;
}

const KIND_ICON = {
  pdf: FileText,
  doc: FileText,
  sheet: Sheet,
  slides: Presentation,
  archive: Archive,
  image: Image,
  text: FileText,
  file: File,
} as const;

export default function Repository({
  currentUser,
  courses = [],
  onRequireAuth,
  triggerToast = () => {},
  embedded = false,
}: RepositoryProps) {
  const canUpload = !!currentUser && ['instructor', 'admin', 'super_admin'].includes(currentUser.role);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadKind, setUploadKind] = useState<MaterialKind>('material');
  const [uploadCourse, setUploadCourse] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const list = await fetchMaterials();
      setMaterials(list);
    } catch (err: any) {
      setError(err?.message || 'Could not load the repository');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => (m.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [materials]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter(m => {
      const tagMatch = activeTag === 'all' || (m.tags || []).includes(activeTag);
      if (!tagMatch) return false;
      if (!q) return true;
      return [m.title, m.description, m.fileName, m.uploaderName, ...(m.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [materials, query, activeTag]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) { triggerToast('Give the file a title.', 'warn'); return; }
    if (!uploadFile) { triggerToast(uploadError || 'Choose a file to upload.', 'warn'); return; }
    const problem = validateMaterialFile(uploadFile);
    if (problem) { setUploadError(problem); triggerToast(problem, 'warn'); return; }
    setUploading(true);
    try {
      const fileData = await readFileAsDataUrl(uploadFile);
      await createMaterial({
        title: uploadTitle.trim(),
        kind: uploadKind,
        courseId: uploadCourse || null,
        tags: uploadTags,
        fileName: uploadFile.name,
        fileData,
      });
      triggerToast('Published to the repository.');
      setUploadTitle(''); setUploadTags(''); setUploadCourse(''); setUploadFile(null);
      setUploadKind('material'); setUploadError(''); setUploadOpen(false);
      const input = document.getElementById('repo-file-input') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (err: any) {
      triggerToast(err?.message || 'Upload failed.', 'warn');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (material: StudyMaterial) => {
    if (!currentUser) {
      triggerToast('Sign in or register to download study materials.', 'warn');
      onRequireAuth?.();
      return;
    }
    setBusyId(material.id);
    try {
      const result = await downloadMaterial(material.id);
      setMaterials(prev => prev.map(m =>
        m.id === material.id ? { ...m, downloads: result.downloads } : m
      ));
      triggerToast(`Downloaded ${result.fileName}`);
    } catch (err: any) {
      if (err?.message === 'AUTH_REQUIRED') {
        triggerToast('Sign in or register to download study materials.', 'warn');
        onRequireAuth?.();
      } else {
        triggerToast(err?.message || 'Download failed', 'warn');
      }
    } finally {
      setBusyId(null);
    }
  };

  const body = (
    <div className="space-y-6 text-left">
      {/* Staff upload — instructors and admins publish straight to the repository */}
      {canUpload && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-extrabold text-white">Upload to the repository</h3>
              <p className="text-xs text-slate-400 mt-0.5">Study material, syllabus, exam question papers and answer keys.</p>
            </div>
            <button
              onClick={() => setUploadOpen(o => !o)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> {uploadOpen ? 'Close' : 'Upload a file'}
            </button>
          </div>

          {uploadOpen && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Title *</label>
                  <input
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="e.g. PLC Lab Manual — Week 3"
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document type</label>
                  <select
                    value={uploadKind}
                    onChange={e => setUploadKind(e.target.value as MaterialKind)}
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white cursor-pointer"
                  >
                    {MATERIAL_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Course link</label>
                  <select
                    value={uploadCourse}
                    onChange={e => setUploadCourse(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white cursor-pointer"
                  >
                    <option value="">Not tied to a course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tags (comma separated)</label>
                  <input
                    value={uploadTags}
                    onChange={e => setUploadTags(e.target.value)}
                    placeholder="plc, week-3, lab"
                    className="w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">File *</label>
                <input
                  id="repo-file-input"
                  type="file"
                  onChange={e => {
                    const picked = e.target.files?.[0] || null;
                    if (!picked) { setUploadFile(null); return; }
                    const problem = validateMaterialFile(picked);
                    setUploadError(problem || '');
                    setUploadFile(problem ? null : picked);
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-bold file:cursor-pointer"
                />
                {uploadError && <p className="text-[10px] text-rose-400 mt-1">{uploadError}</p>}
                <p className="text-[10px] text-slate-600 mt-1">PDF, Office files, TXT, CSV, ZIP or images — up to 25MB.</p>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {uploading ? 'Uploading…' : 'Publish file'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Search + tag filter */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search materials, tags, file names..."
            aria-label="Search study materials"
            className="w-full glass-input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', ...tags].map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono border transition-all cursor-pointer ${
                activeTag === tag
                  ? 'bg-blue-600/25 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tag === 'all' ? 'All tags' : tag}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="p-12 rounded-2xl border border-white/5 bg-slate-900/25 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#00ddff]" />
          <span className="text-xs font-mono">Loading repository files...</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-3">
          <p className="text-xs text-red-300">{error}</p>
          <button
            onClick={() => { setLoading(true); load(); }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="p-12 rounded-2xl border border-white/5 bg-slate-900/25 text-center space-y-2">
          <p className="text-sm font-extrabold text-white">No materials found</p>
          <p className="text-xs text-slate-400">
            {materials.length === 0
              ? 'Instructors have not uploaded study material yet — check back soon.'
              : 'Try a different keyword or clear the selected tag.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(material => {
            const Icon = KIND_ICON[fileKind(material.fileType || '')] || File;
            return (
              <article
                key={material.id}
                className="p-5 rounded-2xl border border-white/5 bg-[#111827] space-y-3 hover:border-[#00ddff]/25 transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#00ddff]" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded border border-white/10 text-slate-400">
                    {material.fileType || 'file'}
                  </span>
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="text-sm font-extrabold text-white leading-snug">{material.title}</h3>
                  {material.description && (
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{material.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(material.tags || []).slice(0, 4).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 border-t border-white/5 pt-3">
                  <span>{formatBytes(material.fileSize)}</span>
                  <span className="text-right">{material.downloads || 0} downloads</span>
                  <span className="col-span-2 truncate">By {material.uploaderName || 'DMA Faculty'}</span>
                </div>

                <button
                  onClick={() => handleDownload(material)}
                  disabled={busyId === material.id}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {busyId === material.id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...</>
                  ) : currentUser ? (
                    <><Download className="w-3.5 h-3.5" /> Download</>
                  ) : (
                    <><Lock className="w-3.5 h-3.5" /> Sign in to download</>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left" id="repository-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#00aaff]/10 border border-[#00ddff]/30 rounded-full text-xs font-bold text-[#00ddff] font-mono uppercase">
            <Archive className="w-3.5 h-3.5" />
            Open Repository
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Study Material Repository
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
            Lecture notes, lab manuals, slides and datasets uploaded by DMA instructors — search by tag,
            preview the metadata and download what you need. Sign in to pull files into your panel.
          </p>
        </div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] text-slate-400 max-w-xs flex gap-2 items-center font-mono leading-tight shrink-0">
          <Download className="w-4 h-4 text-[#00ddff] shrink-0" />
          <span><b>{materials.length}</b> files shared • signed-in learners download straight to their panel.</span>
        </div>
      </div>

      {body}
    </div>
  );
}
