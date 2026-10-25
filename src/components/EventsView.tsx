import React, { useMemo, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Megaphone, Plus, User, Clock,
  ShieldAlert, Tag, X,
} from 'lucide-react';
import { User as UserType } from '../types';

interface EventEntity {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  host?: string;
  type?: string;
  desc?: string;
  description?: string;
  category?: string;
  kind?: 'event' | 'notice';
  postedByName?: string;
  postedByRole?: string;
  attendees?: string[];
}

interface EventsViewProps {
  currentUser: UserType | null;
  events: EventEntity[];
  onEventCreate: (eventPayload: any) => Promise<boolean>;
  triggerToast: (msg: string, type?: 'success' | 'warn') => void;
}

const SESSION_TYPES = [
  'Notice',
  'Exam Date',
  'Assignment Deadline',
  'UK Webinar',
  'AIUB Laboratory',
  'Hybrid Workshop',
];

const CATEGORIES = [
  'Notice', 'Smart Factory', 'Digital Twin', 'Robotics',
  'Circular Economy', 'IoT Security', 'General',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function EventsView({
  currentUser,
  events,
  onEventCreate,
  triggerToast,
}: EventsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toKey(new Date()));
  const [time, setTime] = useState('14:00');
  const [host, setHost] = useState(currentUser?.name || '');
  const [type, setType] = useState('Notice');
  const [category, setCategory] = useState('Notice');
  const [desc, setDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Admins, super-admins, instructors and moderators ("mod") may publish.
  // The server re-validates; this only controls whether the CTA renders.
  const role = (currentUser?.role || '').toLowerCase();
  const canPost =
    !!currentUser &&
    (['admin', 'super_admin', 'instructor'].includes(role) || role.includes('mod'));

  const sorted = useMemo(
    () => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [events]
  );
  const notices = sorted.filter(e => e.kind === 'notice' || /notice|exam|deadline/i.test(e.type || ''));
  const sessions = sorted.filter(e => !notices.includes(e));

  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startOffset =
    (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7; // Monday-first

  const getEventsForDay = (day: number) => {
    const key = toKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    return sorted.filter(ev => ev.date === key);
  };

  const todayKey = toKey(new Date());

  const shiftMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      triggerToast('Provide at least a title and a date.', 'warn');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        date,
        time: time.trim() || 'All day',
        host: host.trim() || currentUser?.name || 'DMA Faculty',
        type,
        category,
        desc: desc.trim(),
        kind: /notice|exam|deadline/i.test(type) ? 'notice' : 'event',
      };
      const ok = await onEventCreate(payload);
      if (ok) {
        setModalOpen(false);
        setTitle('');
        setDesc('');
        triggerToast(
          payload.kind === 'notice' ? 'Notice published for every visitor!' : 'Event published to the calendar!'
        );
        const [y, m] = date.split('-').map(Number);
        if (!Number.isNaN(y) && !Number.isNaN(m)) setViewDate(new Date(y, m - 1, 1));
      } else {
        triggerToast('Could not publish — your role may not be allowed to post.', 'warn');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Connection failed.', 'warn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left" id="events-calendar-page">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#00aaff]/10 border border-[#00ddff]/30 rounded-full text-xs font-bold text-[#00ddff] font-mono uppercase">
            <Calendar className="w-3.5 h-3.5 animate-pulse text-blue-400" />
            Public notice board &amp; calendar
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Events, Notices &amp; Exam Dates
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">
            Every notice posted by an admin, instructor or moderator — exam dates, deadlines and live
            sessions — is visible here to students and visitors alike, sorted on the calendar by date.
          </p>
        </div>

        {canPost ? (
          <button
            onClick={() => {
              setHost(currentUser?.name || '');
              setDate(toKey(new Date()));
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:opacity-95 text-xs font-bold tracking-wide text-white cursor-pointer shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all shrink-0"
            id="post-event-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Post notice or event</span>
          </button>
        ) : (
          <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] text-slate-400 max-w-xs flex gap-2 items-center font-mono leading-tight shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Notices are posted by <b>admins, instructors and moderators</b> from their dashboard.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Dynamic month grid */}
        <div className="lg:col-span-8 p-6 rounded-3xl border border-white/5 bg-slate-900/25 relative overflow-hidden space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-extrabold text-white min-w-[9.5rem] text-center">{monthLabel}</h3>
              <button
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-[#00ddff] font-mono font-bold bg-[#00ddff]/10 p-1 px-3 rounded border border-[#00aaff]/15">
              {events.length} published
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
              <div key={w} className="text-[10px] text-slate-500 font-extrabold py-2 uppercase">{w}</div>
            ))}

            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`offset-${idx}`} className="aspect-square bg-transparent rounded-lg border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const matches = getEventsForDay(dayNum);
              const isToday = toKey(new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNum)) === todayKey;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`aspect-square p-1.5 rounded-xl border flex flex-col justify-between transition-colors min-h-[75px] md:min-h-[85px] text-left relative ${
                    isToday
                      ? 'border-[#00aaff] bg-[#1d2d44]/35'
                      : matches.length > 0
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? 'text-[#00ddff]' : 'text-slate-400'}`}>
                    {dayNum}{' '}
                    {isToday && <span className="text-[8px] bg-sky-500/10 text-sky-400 p-0.5 rounded font-bold">TODAY</span>}
                  </span>

                  <div className="space-y-1">
                    {matches.slice(0, 2).map(m => (
                      <div
                        key={m.id}
                        className={`text-[8px] p-1 rounded truncate font-bold uppercase tracking-tight border cursor-pointer ${
                          m.kind === 'notice' || /notice|exam|deadline/i.test(m.type || '')
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-blue-650/40 text-blue-300 border-blue-500/10'
                        }`}
                        title={m.title}
                        onClick={() => triggerToast(`${m.title} — ${m.date}${m.time ? ` at ${m.time}` : ''}`)}
                      >
                        {m.title}
                      </div>
                    ))}
                    {matches.length > 2 && (
                      <div className="text-[8px] text-slate-500 font-bold text-center">+{matches.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notices + upcoming sessions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" /> Official notices
            </h3>
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 rounded-xl border border-white/5 bg-[#111827]">
                No active notices yet. Exam dates and announcements posted by faculty appear here.
              </p>
            ) : (
              notices.map(ev => (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3 hover:border-amber-400/40 transition-all text-left"
                  id={`notice-${ev.id}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold bg-amber-400/10 p-1 px-2.5 rounded border border-amber-500/20">
                      <Tag className="w-3 h-3" />
                      {ev.type || 'Notice'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{ev.date}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white leading-snug">{ev.title}</h4>
                    {ev.desc && <p className="text-xs text-slate-400 leading-normal">{ev.desc}</p>}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ev.time || 'All day'}
                    </span>
                    <span>{ev.postedByName || ev.host || 'DMA Faculty'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> Upcoming sessions
            </h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 rounded-xl border border-white/5 bg-[#111827]">
                Nothing scheduled yet — check the calendar for dated entries.
              </p>
            ) : (
              sessions.map(ev => (
                <div
                  key={ev.id}
                  className="p-5 rounded-2xl border border-white/5 bg-[#111827] space-y-3 hover:border-[#00ddff]/25 transition-all text-left group"
                  id={`event-item-${ev.id}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-400/5 p-1 px-2.5 rounded border border-emerald-500/10">
                      <Tag className="w-3 h-3" />
                      {ev.category || 'General'}
                    </span>
                    <span className="text-[10px] rounded p-0.5 px-2 bg-blue-600/10 border border-blue-500/10 font-mono text-[#00ddff] font-extrabold shrink-0">
                      {ev.type || 'Event'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white leading-snug group-hover:text-blue-400 transition-colors">
                      {ev.title}
                    </h4>
                    {ev.desc && (
                      <p className="text-xs text-slate-400 leading-normal line-clamp-2">{ev.desc}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-mono border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1 text-[#00aaff] font-bold">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      <span>{ev.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      <span>{ev.time || 'All day'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Hosted by <b>{ev.host || ev.postedByName || 'DMA Faculty'}</b></span>
                    </div>
                    <button
                      onClick={() => triggerToast('Successfully registered for this session! Watch your email inbox.')}
                      className="p-1.5 px-3 bg-[#111827] hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
                    >
                      Hold Seat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Post notice / event dialog */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="p-8 sm:p-10 rounded-3xl glass-dialog max-w-md w-full space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-extrabold text-sm p-1.5 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#00ddff] uppercase tracking-widest font-mono">
                Publish to the public calendar
              </span>
              <h3 className="text-lg font-extrabold text-white">
                Notice or event &mdash; visible to everyone
              </h3>
              <p className="text-slate-400 text-xs">
                Text and date based entries: exam dates, assignment deadlines, lab sessions or webinars.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Midterm exam — Digital Twin Technology"
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full glass-input [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="e.g. 14:00"
                    className="w-full glass-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Presenter / Coordinator</label>
                <input
                  type="text"
                  value={host}
                  onChange={e => setHost(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Type</label>
                  <select
                    value={type}
                    onChange={e => {
                      setType(e.target.value);
                      if (/notice|exam|deadline/i.test(e.target.value)) setCategory('Notice');
                    }}
                    className="w-full glass-input cursor-pointer"
                  >
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Topic domain</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full glass-input cursor-pointer"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 font-mono">Details *</label>
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  required
                  rows={3}
                  placeholder="Syllabus chapters, room number, marking scheme, joining link..."
                  className="w-full glass-input"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white uppercase tracking-wider font-mono cursor-pointer transition-colors shadow-lg shadow-blue-650/20 flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? 'Publishing...' : 'Publish to public calendar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
