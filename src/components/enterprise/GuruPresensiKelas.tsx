/**
 * GuruPresensiKelas — Real-time Intelligence Signal Panel
 * -------------------------------------------------------
 * - Socket.IO live updates (no polling)
 * - Mobile-first responsive layout
 * - Animated live attendance feed
 * - Status override modal
 * - Session timer
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, Users, CheckCircle2, X, Clock, BrainCircuit,
  Loader2, Monitor, Shield, Edit3, Wifi, WifiOff, Zap,
  AlertTriangle, QrCode, ChevronUp, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { C } from '@/lib/themeC';

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'HADIR',     label: 'Hadir',      color: '#10B981', bg: '#F0FDF4' },
  { value: 'TERLAMBAT', label: 'Terlambat',  color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'IZIN',      label: 'Izin',       color: '#0ea5e9', bg: '#EFF6FF' },
  { value: 'SAKIT',     label: 'Sakit',      color: '#8B5CF6', bg: '#F5F3FF' },
  { value: 'ALFA',      label: 'Alfa',       color: '#EF4444', bg: '#FEF2F2' },
];
const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  HADIR:     { color: '#10B981', bg: '#DCFCE7', label: 'Hadir' },
  TERLAMBAT: { color: '#F59E0B', bg: '#FEF9C3', label: 'Terlambat' },
  ALFA:      { color: '#EF4444', bg: '#FEE2E2', label: 'Alfa' },
  IZIN:      { color: '#0ea5e9', bg: '#DBEAFE', label: 'Izin' },
  SAKIT:     { color: '#8B5CF6', bg: '#EDE9FE', label: 'Sakit' },
  INVALID:   { color: '#6B7280', bg: '#F3F4F6', label: 'Invalid' },
};

// ─── Donut Ring SVG ──────────────────────────────────────────────────────────
function DonutRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}
        strokeWidth={8} strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

// ─── Session Timer ────────────────────────────────────────────────────────────
function SessionTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const base = new Date(startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - base) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="font-mono font-black text-white/90 text-sm">
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg, prev }: { label: string; value: number; color: string; bg: string; prev: number }) {
  const changed = value !== prev;
  return (
    <motion.div
      animate={changed ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.35 }}
      className="rounded-xl p-3 flex flex-col items-center justify-center text-center"
      style={{ background: bg, border: `1.5px solid ${color}25` }}
    >
      <motion.div
        key={value}
        initial={{ y: changed ? -10 : 0, opacity: changed ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-2xl font-black leading-none"
        style={{ color }}
      >{value}</motion.div>
      <div className="text-[10px] font-bold mt-1" style={{ color }}>{label}</div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuruPresensiKelas({ authToken, user }: { authToken: string; user: any }) {
  const [view, setView] = useState<'idle' | 'active'>('idle');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [session, setSession] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [activating, setActivating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [aiInsights, setAiInsights] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [newFlashId, setNewFlashId] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // Override
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [overrideName, setOverrideName] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [overriding, setOverriding] = useState(false);
  // Stats for animation
  const prevStats = useRef({ hadir: 0, terlambat: 0, alfa: 0, izin: 0, sakit: 0 });

  const socketRef = useRef<Socket | null>(null);
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const sock = io({ transports: ['polling', 'websocket'] });
    socketRef.current = sock;
    sock.on('connect', () => setSocketConnected(true));
    sock.on('disconnect', () => setSocketConnected(false));
    sock.on('session-closed', () => {
      setView('idle'); setSession(null); setAttendances([]);
      showToast('Sesi telah ditutup');
    });
    fetchSetup();
    checkActiveSessions();
    return () => { sock.close(); };
  }, [authToken]);

  // ── Socket: join session room when session changes ────────────────────────
  useEffect(() => {
    if (!session || !socketRef.current) return;
    socketRef.current.emit('join-session', session.id);
    socketRef.current.on('attendance-update', (record: any) => {
      setAttendances(prev => {
        const idx = prev.findIndex(a => a.id === record.id);
        const updated = idx >= 0
          ? prev.map((a, i) => i === idx ? { ...a, ...record } : a)
          : [record, ...prev];
        return updated;
      });
      setNewFlashId(record.id);
      setTimeout(() => setNewFlashId(null), 1500);
    });
    return () => {
      socketRef.current?.off('attendance-update');
      socketRef.current?.emit('leave-session', session.id);
    };
  }, [session?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchSetup = async () => {
    const [cRes, sRes, schRes] = await Promise.allSettled([
      fetch('/api/classes', { headers }),
      fetch('/api/subjects', { headers }),
      fetch('/api/intelligence/today-schedule', { headers }),
    ]);
    if (cRes.status === 'fulfilled' && cRes.value.ok) setClasses(await cRes.value.json());
    if (sRes.status === 'fulfilled' && sRes.value.ok) {
      const d = await sRes.value.json();
      setSubjects(Array.isArray(d) ? d : d.items || []);
    }
    if (schRes.status === 'fulfilled' && schRes.value.ok) {
      const sc = await schRes.value.json();
      setTodaySchedule(sc?.schedule);
      if (sc?.schedule) {
        setSelClass(sc.schedule.classId || '');
        setSelSubject(sc.schedule.subjectId || '');
      }
    }
  };

  const checkActiveSessions = async () => {
    const res = await fetch('/api/intelligence/my-sessions', { headers });
    if (res.ok) {
      const sessions = await res.json();
      if (sessions.length > 0) {
        const s = sessions[0];
        setSession(s);
        setView('active');
        fetchMetrics(s.id);
      }
    }
  };

  const fetchMetrics = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/intelligence/session/${sessionId}/metrics`, { headers });
    if (res.ok) {
      const d = await res.json();
      setAttendances(d.attendances || []);
    }
  }, [authToken]);

  const activate = async () => {
    if (!selClass || !selSubject) { showToast('Pilih kelas dan mata pelajaran', 'err'); return; }
    setActivating(true);
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST', headers,
        body: JSON.stringify({ classId: selClass, subjectId: selSubject, scheduleId: todaySchedule?.id || null }),
      });
      if (res.ok) {
        const sess = await res.json();
        setSession(sess); setView('active'); setAttendances([]);
        showToast('✅ Sesi presensi berhasil dibuka');
      } else {
        const e = await res.json();
        showToast(e.error || 'Gagal membuka sesi', 'err');
      }
    } finally { setActivating(false); }
  };

  const closeSession = async () => {
    if (!session || !confirm('Tutup sesi? Siswa yang belum merespons akan dicatat ALFA.')) return;
    setClosing(true);
    try {
      const res = await fetch('/api/intelligence/signal/close', {
        method: 'POST', headers, body: JSON.stringify({ sessionId: session.id }),
      });
      if (res.ok) {
        setView('idle'); setSession(null); setAttendances([]);
        showToast('Sesi ditutup — data rekap telah disinkron');
      }
    } finally { setClosing(false); }
  };

  const getAiInsights = async () => {
    if (!session || loadingAI) return;
    setLoadingAI(true);
    try {
      const res = await fetch(`/api/intelligence/session/${session.id}/ai-insights`, { method: 'POST', headers });
      if (res.ok) { const d = await res.json(); setAiInsights(d.insights || ''); }
    } finally { setLoadingAI(false); }
  };

  const openOverride = (att: any) => {
    setOverrideId(att.id);
    setOverrideName(att.student?.user?.name || '—');
    setOverrideStatus(att.attendanceStatus);
    setOverrideNote(att.note || '');
  };

  const submitOverride = async () => {
    if (!overrideId) return;
    setOverriding(true);
    try {
      const res = await fetch(`/api/intelligence/attendance/${overrideId}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: overrideStatus, note: overrideNote || undefined }),
      });
      if (res.ok) {
        showToast('Status kehadiran berhasil diubah');
        setOverrideId(null);
        fetchMetrics(session.id);
      } else {
        const e = await res.json();
        showToast(e.error || 'Gagal mengubah status', 'err');
      }
    } finally { setOverriding(false); }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const hadir     = attendances.filter(a => a.attendanceStatus === 'HADIR').length;
  const terlambat = attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
  const izin      = attendances.filter(a => a.attendanceStatus === 'IZIN').length;
  const sakit     = attendances.filter(a => a.attendanceStatus === 'SAKIT').length;
  const alfa      = attendances.filter(a => a.attendanceStatus === 'ALFA').length;
  const total     = attendances.length;
  const hadirPct  = total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 0;

  const sortedAtts = [...attendances].sort((a, b) => {
    let va: any, vb: any;
    if (sortField === 'name')    { va = a.student?.user?.name || ''; vb = b.student?.user?.name || ''; }
    else if (sortField === 'status') { va = a.attendanceStatus || ''; vb = b.attendanceStatus || ''; }
    else { va = new Date(a.timestamp || 0).getTime(); vb = new Date(b.timestamp || 0).getTime(); }
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const selectedClass   = classes.find(c => c.id === selClass);
  const selectedSubject = subjects.find(s => s.id === selSubject);

  const SortIcon = ({ field }: { field: string }) => sortField === field
    ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
    : <ChevronDown size={10} className="opacity-30" />;

  // Save prev stats for animation
  useEffect(() => {
    prevStats.current = { hadir, terlambat, alfa, izin, sakit };
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* ── Toast ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold text-white max-w-xs"
            style={{ background: toastType === 'ok' ? '#10B981' : '#EF4444' }}
          >
            {toastType === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Override Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {overrideId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) setOverrideId(null); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-black" style={{ color: C.text }}>Ubah Status Kehadiran</p>
                <button onClick={() => setOverrideId(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <X size={14} style={{ color: C.textMuted }} />
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: C.textMuted }}>Siswa: <strong style={{ color: C.text }}>{overrideName}</strong></p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: C.textMuted }}>Status Baru</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setOverrideStatus(opt.value)}
                        className="py-2 rounded-xl text-[11px] font-bold border-2 transition-all"
                        style={{
                          background: overrideStatus === opt.value ? opt.bg : 'transparent',
                          color: opt.color,
                          borderColor: overrideStatus === opt.value ? opt.color : `${opt.color}30`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: C.textMuted }}>Keterangan (opsional)</label>
                  <input
                    value={overrideNote} onChange={e => setOverrideNote(e.target.value)}
                    placeholder="Contoh: Surat izin dilampirkan"
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all"
                    style={{ borderColor: C.border, color: C.text, background: C.bg }}
                    onFocus={e => (e.target.style.borderColor = C.primary)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                  />
                </div>
                <button onClick={submitOverride} disabled={overriding || !overrideStatus}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: overriding || !overrideStatus ? '#FED7AA' : C.primary }}>
                  {overriding && <Loader2 size={14} className="animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base md:text-lg font-black" style={{ color: C.text }}>Presensi Kelas</h1>
            <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>OSDAI Intelligence Signal</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Socket status indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: socketConnected ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${socketConnected ? '#BBF7D0' : '#FCA5A5'}` }}>
              {socketConnected ? <Wifi size={11} className="text-green-600" /> : <WifiOff size={11} className="text-red-500" />}
              <span className="text-[10px] font-bold" style={{ color: socketConnected ? '#15803D' : '#DC2626' }}>
                {socketConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            {view === 'active' && (
              <button onClick={getAiInsights} disabled={loadingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: C.primary }}>
                {loadingAI ? <Loader2 size={11} className="animate-spin" /> : <BrainCircuit size={11} />}
                <span className="hidden sm:inline">AI Insights</span>
              </button>
            )}
          </div>
        </div>

        {/* ── IDLE VIEW ───────────────────────────────────────────────── */}
        {view === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Open Session Card */}
            <div className="lg:col-span-3 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF4ED' }}>
                  <Radio size={17} style={{ color: C.primary }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: C.text }}>Buka Sesi Presensi</p>
                  <p className="text-[10px]" style={{ color: C.textMuted }}>Aktifkan sinyal untuk kelas Anda hari ini</p>
                </div>
              </div>

              {todaySchedule && (
                <div className="mb-4 p-3 rounded-xl flex items-start gap-3" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
                  <Zap size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.primary }}>Jadwal Terdeteksi Hari Ini</p>
                    <p className="text-sm font-black" style={{ color: C.text }}>{todaySchedule.subject?.name}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>{todaySchedule.class?.name} · Jam ke-{todaySchedule.periodStart}–{todaySchedule.periodEnd}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Kelas *</label>
                  <select value={selClass} onChange={e => setSelClass(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                    <option value="">— Pilih Kelas —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Mata Pelajaran *</label>
                  <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl text-sm border outline-none transition-all"
                    style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                    <option value="">— Pilih Mapel —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={activate} disabled={activating || !selClass || !selSubject}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: activating || !selClass || !selSubject ? '#FED7AA' : 'linear-gradient(135deg,#FF6A00,#e55a00)' }}>
                {activating ? <Loader2 size={15} className="animate-spin" /> : <Radio size={15} />}
                {activating ? 'Membuka Sesi…' : 'Buka Sesi Presensi Sekarang'}
              </button>
            </div>

            {/* How it works */}
            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-black mb-4" style={{ color: C.text }}>Cara Kerja</p>
              <div className="space-y-3.5">
                {[
                  { icon: Radio,       color: C.primary,  step: '1', title: 'Buka Sesi', desc: 'Aktifkan sinyal presensi kelas.' },
                  { icon: QrCode,      color: '#0ea5e9',  step: '2', title: 'Token Dibuat', desc: 'Token unik dikirim ke siswa via mobile.' },
                  { icon: Shield,      color: '#10B981',  step: '3', title: 'GPS + AI Check', desc: 'Lokasi & identitas siswa divalidasi otomatis.' },
                  { icon: CheckCircle2,color: '#7c3aed',  step: '4', title: 'Rekap Real-time', desc: 'Data langsung tersinkron saat sesi ditutup.' },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15` }}>
                        <Icon size={13} style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold" style={{ color: C.text }}>{s.title}</p>
                        <p className="text-[10px] leading-relaxed" style={{ color: C.textMuted }}>{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 flex items-center gap-2 border-t" style={{ borderColor: C.border }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: socketConnected ? '#10B981' : '#EF4444' }} />
                <p className="text-[10px]" style={{ color: C.textMuted }}>
                  {socketConnected ? 'Koneksi real-time aktif' : 'Menghubungkan ke server…'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE SESSION VIEW ──────────────────────────────────────── */}
        {view === 'active' && session && (
          <div className="space-y-4">
            {/* Session banner */}
            <div className="rounded-2xl p-4 md:p-5" style={{ background: 'linear-gradient(135deg,#FF6A00,#b84500)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  {/* Donut ring */}
                  <div className="relative flex-shrink-0">
                    <DonutRing pct={hadirPct} size={72} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-white">{hadirPct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/70">Sesi Aktif</p>
                    <p className="text-base font-black text-white leading-snug">
                      {selectedSubject?.name || session.subject?.name || 'Mapel'}
                    </p>
                    <p className="text-xs text-white/80">
                      {selectedClass?.name || session.class?.name || 'Kelas'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-black text-white/60">TOKEN:</span>
                      <span className="font-mono font-black text-white text-sm tracking-widest">{session.sessionToken}</span>
                      <div className="flex items-center gap-1 text-white/60">
                        <Clock size={10} />
                        <SessionTimer startTime={session.startTime || session.createdAt} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-[10px] font-bold text-white">LIVE</span>
                  </div>
                  <button onClick={closeSession} disabled={closing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/10 transition-all text-xs font-bold text-white border border-white/30">
                    {closing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    Tutup Sesi
                  </button>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-5 gap-2">
              <StatCard label="Hadir"     value={hadir}     color="#10B981" bg="#F0FDF4" prev={prevStats.current.hadir} />
              <StatCard label="Terlambat" value={terlambat} color="#F59E0B" bg="#FFFBEB" prev={prevStats.current.terlambat} />
              <StatCard label="Izin"      value={izin}      color="#0ea5e9" bg="#EFF6FF" prev={prevStats.current.izin} />
              <StatCard label="Sakit"     value={sakit}     color="#8B5CF6" bg="#F5F3FF" prev={prevStats.current.sakit} />
              <StatCard label="Alfa"      value={alfa}      color="#EF4444" bg="#FEF2F2" prev={prevStats.current.alfa} />
            </div>

            {/* AI Insights */}
            <AnimatePresence>
              {aiInsights && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="rounded-2xl p-4 overflow-hidden" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BrainCircuit size={14} style={{ color: C.primary }} />
                      <p className="text-xs font-bold" style={{ color: C.primary }}>Analisis AI OSDAI</p>
                    </div>
                    <button onClick={() => setAiInsights('')} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-orange-100">
                      <X size={11} style={{ color: C.textMuted }} />
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#7C2D12' }}>{aiInsights}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attendance Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
                <p className="text-sm font-bold" style={{ color: C.text }}>
                  Daftar Kehadiran
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#FFF4ED', color: C.primary }}>
                    {total} siswa
                  </span>
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1" style={{ color: C.textMuted }}>
                    <Wifi size={10} className={socketConnected ? 'text-green-500' : 'text-gray-400'} />
                    <span className="text-[10px]">{socketConnected ? 'Real-time' : 'Offline'}</span>
                  </div>
                </div>
              </div>

              {total === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#F3F4F6' }}>
                    <Users size={28} style={{ color: C.textMuted, opacity: 0.4 }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: C.textMuted }}>Menunggu respons siswa…</p>
                  <p className="text-xs mt-1" style={{ color: C.textMuted }}>Data akan muncul secara real-time</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: C.bg }}>
                          <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('name')}>
                            <div className="flex items-center gap-1">Nama Siswa <SortIcon field="name" /></div>
                          </th>
                          <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('status')}>
                            <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                          </th>
                          <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('timestamp')}>
                            <div className="flex items-center gap-1">Waktu <SortIcon field="timestamp" /></div>
                          </th>
                          <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>GPS</th>
                          <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Integritas</th>
                          <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Keterangan</th>
                          <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence initial={false}>
                          {sortedAtts.map((a, i) => {
                            const meta = STATUS_META[a.attendanceStatus] || STATUS_META.INVALID;
                            const isNew = a.id === newFlashId;
                            return (
                              <motion.tr
                                key={a.id || i}
                                initial={{ opacity: 0, backgroundColor: '#FFF4ED' }}
                                animate={{ opacity: 1, backgroundColor: isNew ? '#FFF4ED' : 'transparent' }}
                                transition={{ duration: 0.6 }}
                                className="border-t"
                                style={{ borderColor: '#F3F4F6' }}
                              >
                                <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>
                                  {a.student?.user?.name || '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: meta.bg, color: meta.color }}>
                                    {meta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-[10px]" style={{ color: C.textMuted }}>
                                  {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {a.gpsValidated
                                    ? <span className="text-[10px] font-bold text-green-600">✓ Valid</span>
                                    : <span className="text-[10px]" style={{ color: C.textMuted }}>—</span>
                                  }
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" style={{ width: 48 }}>
                                      <div className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.round((a.integrityScore || 0) * 100)}%`, background: (a.integrityScore || 0) > 0.7 ? '#10B981' : '#F59E0B' }} />
                                    </div>
                                    <span className="text-[10px] font-mono" style={{ color: C.textMuted }}>
                                      {Math.round((a.integrityScore || 0) * 100)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 max-w-[140px]">
                                  {a.note
                                    ? <span className="text-[10px] italic truncate block" style={{ color: C.textMuted }} title={a.note}>{a.note}</span>
                                    : <span style={{ color: C.textMuted }}>—</span>
                                  }
                                </td>
                                <td className="px-4 py-3">
                                  <button onClick={() => openOverride(a)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: C.border, color: C.primary }}>
                                    <Edit3 size={10} /> Ubah
                                  </button>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: '#F3F4F6' }}>
                    {sortedAtts.map((a, i) => {
                      const meta = STATUS_META[a.attendanceStatus] || STATUS_META.INVALID;
                      const isNew = a.id === newFlashId;
                      return (
                        <motion.div key={a.id || i}
                          animate={{ backgroundColor: isNew ? '#FFF4ED' : 'transparent' }}
                          transition={{ duration: 0.8 }}
                          className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                              {a.student?.user?.name || '—'}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                              {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              {a.gpsValidated && <span className="ml-2 text-green-600">✓ GPS</span>}
                            </p>
                            {a.note && <p className="text-[10px] italic mt-0.5 truncate" style={{ color: C.textMuted }}>{a.note}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                              {meta.label}
                            </span>
                            <button onClick={() => openOverride(a)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center border"
                              style={{ borderColor: C.border, color: C.primary }}>
                              <Edit3 size={12} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
