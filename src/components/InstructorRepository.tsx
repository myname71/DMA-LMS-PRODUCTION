import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, Calendar, FileText, Loader2, Megaphone, Trash2, Upload, Download,
} from 'lucide-react';
import { Course, User } from '../types';
import { getAuthHeaders } from '../lib/session';
import {
  ACCEPTED_MATERIAL_EXTENSIONS, MAX_MATERIAL_BYTES, StudyMaterial,
  fetchMyMaterials, formatBytes, readFileAsDataUrl, validateMaterialFile,
} from '../lib/studyMaterials';

interface InstructorRepositoryProps {
  currentUser: User;
  courses: Course[];
  triggerToast?: (msg: string, type?: 'success' | 'warn') => void;
  /** Refreshes App state so the new notice shows up on the Events page at once. */
  onRefresh?: () => void;
}

const NOTICE_TYPES = [
  'Notice',
  'Exam Date',
  'Assignment Deadline',
  'Event',
  'UK Webinar',
  'Hybrid Workshop',
];

export default function InstructorRepository({
  currentUser,
  courses = [],
  triggerToast = () => {},
  onRefresh,
}: InstructorRepositoryProps) {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [tags, setTags] = useState('');
  const [busyDelete, setBusyDelete] = useState<string | null>(null);

  // Calendar notice composer (publishes straight onto the public Events page)
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeTime, setNoticeTime] = useState('');
  const [noticeType, setNoticeType] = useState('Notice');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeSending, setNoticeSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchMyMaterials();
      setMaterials(list);
    } catch {
      triggerToast('Could not load your uploaded materials.', 'warn');
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    load();
  }, [load]);

  const myCourses = courses.filter(c => !c.instructorId || c.instructorId === currentUser.id);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const problem = validateMaterialFile(picked);
    if (problem) {
      setFile(null);
      setFileError(problem);
      e.target.value = '';
      return;
    }
    setFileError('');
    setFile(picked);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { triggerToast('Give the material a title.', 'warn'); return; }
    if (!file) { triggerToast(fileError || 'Choose a file to upload.', 'warn'); return; }

    setUploading(true);
    try {
      const fileData = await readFileAsDataUrl(file);
      const resp = await fetch('/api/study-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          courseId: courseId || null,
          tags,
          fileName: file.name,
          fileData,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Upload failed');
      triggerToast(`${data.material?.title || title} published to the repository.`);
      setTitle(''); setDescription(''); setCourseId(''); setTags(''); setFile(null);
      setFileError('');
      const input = document.getElementById('material-file-input') as HTMLInputElement | null;
      if (input) input.value = '';
      load();
    } catch (err: any) {
      triggerToast(err?.message || 'Upload failed.', 'warn');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (material: StudyMaterial) => {
    if (!window.confirm(`Delete "${material.title}"? Students will no longer see it.`)) return;
    setBusyDelete(material.id);
    try {
      const resp = await fetch(`/api/study-materials/${material.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      triggerToast('Material removed from the repository.');
      setMaterials(prev => prev.filter(m => m.id !== material.id));
    } catch (err: any) {
      triggerToast(err?.message || 'Delete failed.', 'warn');
    } finally {
      setBusyDelete(null);
    }
  };

  const handleNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeDate) {
      triggerToast('A notice needs at least a title and a date.', 'warn');
      return;
    }
    setNoticeSending(true);
    try {
      const resp = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: noticeTitle.trim(),
          date: noticeDate,
          time: noticeTime.trim() || 'All day',
          host: currentUser.name,
          type: noticeType,
          category: 'Notice',
          kind: 'notice',
          desc: noticeBody.trim(),
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Could not publish the notice');
      triggerToast('Notice published on the Events page.');
      setNoticeTitle(''); setNoticeDate(''); setNoticeTime(''); setNoticeBody('');
      onRefresh?.();
    } catch (err: any) {
      triggerToast(err?.message || 'Could not publish the notice.', 'warn');
    } finally {
      setNoticeSending(false);
    }
  };

  const inputClass = 'w-full text-xs p-3 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600';
  const labelClass = 'block text-[10px] font-bold text-slate-400 uppercase mb-1';

  return (
    <div className="space-y-8 text-left" id="instructor-repository">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload form */}
        <form
          onSubmit={handleUpload}
          className="lg:col-span-7 p-6 rounded-2xl border border-slate-800 bg-[#111827] space-y-4"
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#00ddff]" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Upload study material
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            PDF, Word, Excel, PowerPoint, TXT, ZIP and images — up to 25MB. Students download it from the
            Repository page and their own panel.
          </p>

          <div>
            <label className={labelClass} htmlFor="material-title">Title *</label>
            <input
              id="material-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Siemens S7 Lab Manual — Chapter 3"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="material-desc">Description</label>
            <textarea
              id="material-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this file cover, and which week it belongs to..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="material-course">Course link</label>
              <select
                id="material-course"
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Not tied to a course</option>
                {myCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="material-tags">Tags (comma separated)</label>
              <input
                id="material-tags"
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="plc, lab-manual, week-3"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="material-file-input">File *</label>
            <input
              id="material-file-input"
              type="file"
              onChange={onPickFile}
              accept={ACCEPTED_MATERIAL_EXTENSIONS.map(e => `.${e}`).join(',')}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-bold file:cursor-pointer hover:file:bg-blue-500"
            />
            {file && (
              <p className="mt-2 text-[11px] font-mono text-emerald-400">
                {file.name} • {formatBytes(file.size)}
              </p>
            )}
            {fileError && (
              <p className="mt-2 text-[11px] font-mono text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fileError}
              </p>
            )}
            <p className="mt-1 text-[10px] font-mono text-slate-500">
              Max {formatBytes(MAX_MATERIAL_BYTES)} • allowed: {ACCEPTED_MATERIAL_EXTENSIONS.join(', ')}
            </p>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
            ) : (
              <><Upload className="w-4 h-4" /> Publish to repository</>
            )}
          </button>
        </form>

        {/* Site notice composer → public Events page */}
        <form
          onSubmit={handleNotice}
          className="lg:col-span-5 p-6 rounded-2xl border border-slate-800 bg-[#111827] space-y-4"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Post site notice
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Publishes straight to the <b>Events</b> calendar — exam dates, deadlines and announcements
            that every student and visitor can see.
          </p>

          <div>
            <label className={labelClass} htmlFor="notice-title">Notice title *</label>
            <input
              id="notice-title"
              type="text"
              value={noticeTitle}
              onChange={e => setNoticeTitle(e.target.value)}
              required
              placeholder="e.g. Midterm exam — Digital Twin Technology"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="notice-date">Date *</label>
              <input
                id="notice-date"
                type="date"
                value={noticeDate}
                onChange={e => setNoticeDate(e.target.value)}
                required
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="notice-time">Time</label>
              <input
                id="notice-time"
                type="text"
                value={noticeTime}
                onChange={e => setNoticeTime(e.target.value)}
                placeholder="14:00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="notice-type">Type</label>
            <select
              id="notice-type"
              value={noticeType}
              onChange={e => setNoticeType(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {NOTICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="notice-body">Details</label>
            <textarea
              id="notice-body"
              value={noticeBody}
              onChange={e => setNoticeBody(e.target.value)}
              rows={4}
              placeholder="Room, syllabus chapters, marking scheme, bring your student ID..."
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={noticeSending}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            {noticeSending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
            ) : (
              <><Calendar className="w-4 h-4" /> Publish to Events page</>
            )}
          </button>
        </form>
      </div>

      {/* Own materials */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#111827] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#00ddff]" /> My uploaded materials
          </h3>
          <span className="text-[11px] font-mono text-slate-400">{materials.length} file(s)</span>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#00ddff]" /> Loading...
          </div>
        ) : materials.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            You have not published any study material yet — use the upload form above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-mono text-slate-500 border-b border-white/5">
                  <th className="py-2 pr-3">Material</th>
                  <th className="py-2 pr-3">Course link</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Downloads</th>
                  <th className="py-2 pr-3">Posted</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id} className="border-b border-white/5 text-slate-300">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-white">{m.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        {m.fileName} • {m.fileType}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-[11px] text-slate-400">
                      {m.courseId
                        ? (courses.find(c => c.id === m.courseId)?.title || m.courseId)
                        : '—'}
                    </td>
                    <td className="py-3 pr-3 font-mono text-slate-400">{formatBytes(m.fileSize)}</td>
                    <td className="py-3 pr-3 font-mono text-emerald-400 inline-flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      {m.downloads || 0}
                    </td>
                    <td className="py-3 pr-3 font-mono text-slate-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={busyDelete === m.id}
                        className="p-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer transition-colors"
                        aria-label={`Delete ${m.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
