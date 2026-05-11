import { useState, useEffect, useRef } from 'react';
import { Radio, Users, CheckCircle2, X, Clock, QrCode, RefreshCcw, Zap, AlertTriangle, BrainCircuit, Loader2, ChevronDown, Monitor, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

export default function GuruPresensiKelas({ authToken, user }: { authToken: string; user: any }) {
  const [view, setView] = useState<'idle' | 'active'>('idle');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [session, setSession] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'ok' | 'err'>('ok');
  const [aiInsights, setAiInsights] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchSetup();
    checkActiveSessions();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authToken]);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast(msg); setToastType(type); setTimeout(() => setToast(''), 3000); };

  const fetchSetup = async () => {
    const [cRes, sRes, schRes] = await Promise.allSettled([
      fetch('/api/classes', { headers }),
      fetch('/api/subjects', { headers }),
      fetch('/api/intelligence/today-schedule', { headers }),
    ]);
    if (cRes.status === 'fulfilled' && cRes.value.ok) setClasses(await cRes.value.json());
    if (sRes.status === 'fulfilled' && sRes.value.ok) { const d = await sRes.value.json(); setSubjects(Array.isArray(d) ? d : d.items || []); }
    if (schRes.status === 'fulfilled' && schRes.value.ok) {
      const sc = await schRes.value.json();
      setTodaySchedule(sc?.schedule);
      if (sc?.schedule) { setSelClass(sc.schedule.classId || ''); setSelSubject(sc.schedule.subjectId || ''); }
    }
  };

  const checkActiveSessions = async () => {
    const res = await fetch('/api/intelligence/my-sessions', { headers });
    if (res.ok) {
      const sessions = await res.json();
      if (sessions.length > 0) { setSession(sessions[0]); setView('active'); startPolling(sessions[0].id); }
    }
  };

  const fetchAttendances = async (sessionId: string) => {
    const res = await fetch(`/api/intelligence/session/${sessionId}/metrics`, { headers });
    if (res.ok) { const d = await res.json(); setAttendances(d.attendances || []); }
  };

  const startPolling = (sid: string) => {
    fetchAttendances(sid);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAttendances(sid), 5000);
  };

  const activate = async () => {
    if (!selClass || !selSubject) { showToast('Pilih kelas dan mata pelajaran terlebih dahulu', 'err'); return; }
    setActivating(true);
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST', headers,
        body: JSON.stringify({ classId: selClass, subjectId: selSubject, scheduleId: todaySchedule?.id || null })
      });
      if (res.ok) {
        const sess = await res.json();
        setSession(sess); setView('active'); startPolling(sess.id);
        showToast('Sesi presensi berhasil dibuka');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membuka sesi', 'err');
      }
    } finally { setActivating(false); }
  };

  const closeSession = async () => {
    if (!session) return;
    if (!confirm('Tutup sesi presensi? Siswa yang belum respond akan ditandai ALFA.')) return;
    setClosing(true);
    try {
      const res = await fetch('/api/intelligence/signal/close', { method: 'POST', headers, body: JSON.stringify({ sessionId: session.id }) });
      if (res.ok) {
        if (pollRef.current) clearInterval(pollRef.current);
        setView('idle'); setSession(null); setAttendances([]);
        showToast('Sesi presensi ditutup');
      }
    } finally { setClosing(false); }
  };

  const validateAttendance = async (attId: string) => {
    const res = await fetch(`/api/intelligence/attendance/${attId}/validate`, { method: 'POST', headers, body: JSON.stringify({}) });
    if (res.ok) { showToast('Kehadiran divalidasi'); fetchAttendances(session.id); }
  };

  const getAiInsights = async () => {
    if (!session) return;
    setLoadingAI(true);
    try {
      const res = await fetch(`/api/intelligence/session/${session.id}/ai-insights`, { method: 'POST', headers });
      if (res.ok) { const d = await res.json(); setAiInsights(d.insights || 'Tidak ada insight tersedia.'); }
    } finally { setLoadingAI(false); }
  };

  const hadir = attendances.filter(a => a.attendanceStatus === 'HADIR').length;
  const terlambat = attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
  const alfa = attendances.filter(a => a.attendanceStatus === 'ALFA').length;
  const total = attendances.length;
  const pending = attendances.filter(a => a.confirmationStatus === 'PENDING').length;

  const selectedClass = classes.find(c => c.id === selClass);
  const selectedSubject = subjects.find(s => s.id === selSubject);

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white"
          style={{ background: toastType === 'ok' ? '#10B981' : '#EF4444' }}>
          {toastType === 'ok' ? <CheckCircle2 size={14} /> : <X size={14} />} {toast}
        </motion.div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Presensi Kelas</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Sistem OSDAI Intelligence Signal</p>
        </div>
        {view === 'active' && session && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold" style={{ color: '#15803D' }}>SESI AKTIF</span>
            </div>
            <button onClick={getAiInsights} disabled={loadingAI} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50" style={{ borderColor: C.border, color: C.textMuted }}>
              {loadingAI ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />} AI Insights
            </button>
          </div>
        )}
      </div>

      {/* Idle view – form to open session */}
      {view === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FFF4ED' }}>
                <Radio size={16} style={{ color: C.primary }} />
              </div>
              <p className="text-sm font-bold" style={{ color: C.text }}>Buka Sesi Presensi</p>
            </div>

            {todaySchedule && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: C.primary }}>Jadwal Terdeteksi</p>
                <p className="text-sm font-black" style={{ color: C.text }}>{todaySchedule.subject?.name}</p>
                <p className="text-xs" style={{ color: C.textMuted }}>{todaySchedule.class?.name} · Jam {todaySchedule.periodStart}–{todaySchedule.periodEnd}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kelas *</label>
                <select value={selClass} onChange={e => setSelClass(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                  <option value="">— Pilih Kelas —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Mata Pelajaran *</label>
                <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                  <option value="">— Pilih Mapel —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={activate} disabled={activating || !selClass || !selSubject}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: activating || !selClass || !selSubject ? '#FED7AA' : C.primary }}>
                {activating ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                {activating ? 'Membuka Sesi...' : 'Buka Sesi Presensi'}
              </button>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Cara Kerja OSDAI Signal</p>
            <div className="space-y-3">
              {[
                { icon: Radio, color: C.primary, step: '1', title: 'Buka Sesi', desc: 'Guru mengaktifkan sinyal presensi dengan memilih kelas dan mapel.' },
                { icon: Monitor, color: '#0ea5e9', step: '2', title: 'Token QR', desc: 'Token unik dibuat dan dapat ditampilkan ke siswa via mobile.' },
                { icon: Shield, color: '#10B981', step: '3', title: 'Validasi GPS', desc: 'Sistem memvalidasi lokasi & identitas siswa secara otomatis.' },
                { icon: CheckCircle2, color: '#7c3aed', step: '4', title: 'Rekap Otomatis', desc: 'Siswa yang tidak merespons otomatis dicatat ALFA saat sesi ditutup.' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}14` }}>
                      <Icon size={13} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: C.text }}>{s.title}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active session view */}
      {view === 'active' && session && (
        <div className="space-y-4">
          {/* Session info */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)', color: 'white' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold opacity-80">Sesi Aktif</p>
                <p className="text-base font-black">{selectedSubject?.name || session.subject?.name || 'Mapel'} — {selectedClass?.name || session.class?.name || 'Kelas'}</p>
                <p className="text-xs opacity-80 mt-0.5">Token: <span className="font-mono font-black">{session.sessionToken}</span></p>
              </div>
              <button onClick={closeSession} disabled={closing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all text-xs font-bold">
                {closing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Tutup Sesi
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Hadir', value: hadir, color: '#10B981', bg: '#F0FDF4' },
              { label: 'Terlambat', value: terlambat, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Alfa', value: alfa, color: '#EF4444', bg: '#FEF2F2' },
              { label: 'Belum Konfirm', value: pending, color: '#6366f1', bg: '#EEF2FF' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg, border: `1px solid ${s.color}20` }}>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] font-bold mt-0.5" style={{ color: s.color }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          {aiInsights && (
            <div className="rounded-xl p-4" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit size={14} style={{ color: C.primary }} />
                <p className="text-xs font-bold" style={{ color: C.primary }}>AI Insights</p>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: C.textSub }}>{aiInsights}</p>
            </div>
          )}

          {/* Attendance list */}
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
              <p className="text-sm font-bold" style={{ color: C.text }}>Daftar Kehadiran ({total} siswa)</p>
              <button onClick={() => fetchAttendances(session.id)} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted }}>
                <RefreshCcw size={11} /> Refresh
              </button>
            </div>
            {total === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Users size={32} style={{ color: C.textMuted, opacity: 0.3 }} />
                <p className="text-xs mt-2" style={{ color: C.textMuted }}>Menunggu siswa merespons…</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr style={{ background: C.bg }}>
                    {['Nama Siswa', 'Status', 'Waktu', 'GPS', 'Integrity', 'Konfirmasi', 'Aksi'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {attendances.map((a, i) => {
                      const statusColor = { HADIR: '#10B981', TERLAMBAT: '#F59E0B', ALFA: '#EF4444', IZIN: '#0ea5e9' }[a.attendanceStatus] || '#6B7280';
                      return (
                        <tr key={a.id || i} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                          <td className="px-4 py-2.5 font-semibold" style={{ color: C.text }}>{a.student?.user?.name || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>{a.attendanceStatus || '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: C.textMuted }}>{a.timestamp ? new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-4 py-2.5">
                            {a.gpsLat ? <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>✓ Valid</span> : <span style={{ color: C.textMuted }}>—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-200" style={{ maxWidth: 60 }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${Math.round((a.integrityScore || 0) * 100)}%`, background: '#10B981' }} />
                              </div>
                              <span className="text-[9px]" style={{ color: C.textMuted }}>{Math.round((a.integrityScore || 0) * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] font-bold" style={{ color: a.confirmationStatus === 'CONFIRMED' ? '#10B981' : '#F59E0B' }}>
                              {a.confirmationStatus || 'PENDING'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {a.confirmationStatus === 'PENDING' && (
                              <button onClick={() => validateAttendance(a.id)} className="px-2 py-1 rounded text-[10px] font-bold text-white" style={{ background: '#10B981' }}>Validasi</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
