import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, BarChart2, Zap, Lock,
  AlertCircle, CheckCircle2, RefreshCw, Download,
  Sparkles, Radio, Clock, TrendingUp, Activity,
  MapPin, Shield, ChevronRight, Bell, FileText,
  BarChart3, Calendar,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

type Screen = 'dashboard' | 'classes' | 'analytics';

interface CatatanPresensi {
  id: string;
  attendanceStatus: string;
  timestamp: string;
  integrityScore: number;
  gpsValidated: boolean;
  student: { user: { name: string } };
}
interface MetrikSesi {
  session: { id: string; token: string; status: string; subject: string; class: string; teacher: string; startTime: string };
  totalStudents: number;
  hadir: number;
  terlambat: number;
  alfa: number;
  invalid: number;
  attendanceRate: number;
  attendances: CatatanPresensi[];
}

const BG = '#1C100A';
const CARD = '#2A1708';
const CARD2 = '#321D0E';
const ORANGE = '#FF6A00';

function NeuralLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          style={{ top: `${15 + i * 15}%`, left: 0, right: 0 }}
          animate={{ opacity: [0, 0.8, 0], x: ['-100%', '100%'] }}
          transition={{ duration: 5 + i * 0.4, repeat: Infinity, delay: i * 1, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

function DonutChart({ hadir, total }: { hadir: number; total: number }) {
  const pct = total > 0 ? (hadir / total) * 100 : 0;
  const circumference = 2 * Math.PI * 54;
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg width="160" height="160" className="absolute inset-0 -rotate-90">
        <circle cx="80" cy="80" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" />
        <motion.circle
          cx="80" cy="80" r="54" fill="none"
          stroke={ORANGE} strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${ORANGE})` }}
        />
      </svg>
      <div className="text-center relative z-10">
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-4xl font-black text-white leading-none"
        >
          {hadir}
        </motion.p>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Present</p>
        <p className="text-base font-black text-white/30">/{total}</p>
      </div>
    </div>
  );
}

export default function MobileGuruPresensi({ authToken, user }: { authToken: string; user: any }) {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [sesiAktif, setSesiAktif] = useState<any>(null);
  const [metrik, setMetrik] = useState<MetrikSesi | null>(null);
  const [catatanList, setCatatanList] = useState<CatatanPresensi[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [wawasanAI, setWawasanAI] = useState<string | null>(null);
  const [menganalisis, setMenganalisis] = useState(false);
  const [error, setError] = useState('');
  const [daftarKelas, setDaftarKelas] = useState<any[]>([]);
  const [daftarMapel, setDaftarMapel] = useState<any[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [mengaktifkan, setMengaktifkan] = useState(false);
  const [riskStudents, setRiskStudents] = useState<any[]>([]);

  const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };
  const initials = (user?.name || 'G').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const ambilMetrik = useCallback(async (sesiId: string) => {
    try {
      const res = await fetch(`/api/intelligence/session/${sesiId}/metrics`, { headers });
      if (res.ok) {
        const data: MetrikSesi = await res.json();
        setMetrik(data);
        setCatatanList(data.attendances);
      }
    } catch { /* no-op */ }
  }, [authToken]);

  useEffect(() => {
    const init = async () => {
      try {
        const [kelasRes, mapelRes, sesiRes] = await Promise.all([
          fetch('/api/classes', { headers }),
          fetch('/api/subjects', { headers }),
          fetch('/api/intelligence/my-sessions', { headers }),
        ]);
        if (kelasRes.ok) setDaftarKelas(await kelasRes.json());
        if (mapelRes.ok) setDaftarMapel(await mapelRes.json());
        if (sesiRes.ok) {
          const sesi = await sesiRes.json();
          if (sesi.length > 0) { setSesiAktif(sesi[0]); ambilMetrik(sesi[0].id); }
        }
        try {
          const riskRes = await fetch('/api/analytics/risk-students', { headers });
          if (riskRes.ok) setRiskStudents(await riskRes.json());
        } catch { /* not authorized for this role */ }
      } catch { /* no-op */ }
    };
    init();
    const sock = io();
    setSocket(sock);
    return () => { sock.close(); };
  }, [authToken]);

  useEffect(() => {
    if (sesiAktif && socket) {
      socket.emit('join-session', sesiAktif.id);
      socket.on('attendance-update', (catatan: CatatanPresensi) => {
        setCatatanList(prev => prev.find(a => a.id === catatan.id) ? prev : [catatan, ...prev]);
        ambilMetrik(sesiAktif.id);
      });
      socket.on('session-closed', () => { setSesiAktif(null); setMetrik(null); setCatatanList([]); });
    }
    return () => { socket?.off('attendance-update'); socket?.off('session-closed'); };
  }, [sesiAktif, socket, ambilMetrik]);

  const aktifkanSinyal = async () => {
    if (!kelasId || !mapelId) { setError('Pilih kelas dan mata pelajaran.'); return; }
    setError(''); setMengaktifkan(true);
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST', headers,
        body: JSON.stringify({ classId: kelasId, subjectId: mapelId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengaktifkan sinyal.'); return; }
      setSesiAktif(data); setCatatanList([]); setMetrik(null);
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setMengaktifkan(false); }
  };

  const tutupSinyal = async () => {
    if (!sesiAktif) return;
    try {
      const res = await fetch('/api/intelligence/signal/close', {
        method: 'POST', headers,
        body: JSON.stringify({ sessionId: sesiAktif.id }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Gagal menutup sinyal.'); return; }
      setSesiAktif(null); setWawasanAI(null); setCatatanList([]); setMetrik(null);
    } catch { setError('Gagal menutup sesi.'); }
  };

  const jalankanAnalisaAI = async () => {
    if (!sesiAktif) return;
    setMenganalisis(true);
    try {
      const res = await fetch(`/api/intelligence/session/${sesiAktif.id}/ai-insights`, { method: 'POST', headers });
      const data = await res.json();
      setWawasanAI(data.insights);
    } catch { setWawasanAI('Gagal memuat analisis AI.'); }
    finally { setMenganalisis(false); }
  };

  const statusColor = (s: string) => {
    if (s === 'HADIR') return { bg: 'rgba(34,197,94,0.15)', text: 'text-green-400', dot: 'bg-green-400' };
    if (s === 'TERLAMBAT') return { bg: 'rgba(255,106,0,0.15)', text: 'text-orange-400', dot: 'bg-orange-400' };
    if (s === 'ALFA') return { bg: 'rgba(100,116,139,0.15)', text: 'text-slate-400', dot: 'bg-slate-400' };
    return { bg: 'rgba(239,68,68,0.15)', text: 'text-red-400', dot: 'bg-red-400' };
  };

  const engagementLevel = metrik
    ? metrik.attendanceRate >= 80 ? 'STABLE' : metrik.attendanceRate >= 60 ? 'MODERATE' : 'LOW'
    : 'N/A';
  const engagementColor = engagementLevel === 'STABLE' ? 'text-cyan-400' : engagementLevel === 'MODERATE' ? 'text-orange-400' : 'text-red-400';

  // Heatmap data (mock 7x4 using catatan)
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: BG, fontFamily: "'Poppins', sans-serif", maxWidth: 430, margin: '0 auto' }}>
      <NeuralLines />

      {/* ─── TOP HEADER ─── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-orange-500"
            />
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">SMK NEGERI 1 WONOGIRI</span>
          </div>
          <p className="text-xs font-bold text-white/40 mt-0.5">Neural Class Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-black text-white leading-tight">{user?.name || 'Guru'}</p>
            <p className="text-[10px] text-orange-400 font-bold">Guru</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-900/50">
            {initials}
          </div>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD TAB ── */}
          {screen === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 space-y-4">
              {/* Error Banner */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 rounded-2xl text-red-300 text-xs font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError('')}>✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {sesiAktif ? (
                /* ── ACTIVE SESSION CARD ── */
                <>
                  <div className="rounded-3xl overflow-hidden relative" style={{ background: CARD, border: '1px solid rgba(255,106,0,0.2)' }}>
                    {/* Active session badge */}
                    <div className="absolute top-4 right-4">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(255,106,0,0.25)', border: '1px solid rgba(255,106,0,0.4)' }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Active Session</span>
                      </motion.div>
                    </div>

                    <div className="p-6 pt-14">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Sesi Aktif</p>
                      <h2 className="text-3xl font-black text-white leading-tight mb-1">
                        {metrik?.session.subject || sesiAktif.subjectId?.split('-')[0] || 'Mata Pelajaran'}
                      </h2>
                      <p className="text-xl font-black text-white/60">
                        {metrik?.session.class || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin size={12} className="text-orange-400" />
                        <p className="text-xs font-bold text-white/40">
                          {new Date(sesiAktif.startTime || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · Token: <span className="text-orange-400 font-black tracking-widest">{sesiAktif.sessionToken}</span>
                        </p>
                      </div>
                    </div>

                    {/* Donut + stats */}
                    <div className="px-6 pb-6 flex items-center gap-6">
                      <DonutChart hadir={metrik?.hadir ?? 0} total={metrik?.totalStudents ?? 0} />
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Signal Status</span>
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">ACTIVE</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                              className="h-full w-1/3 rounded-full"
                              style={{ background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Engagement</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${engagementColor}`}>{engagementLevel}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${metrik?.attendanceRate ?? 0}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #06b6d4, #22d3ee)' }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kehadiran</span>
                            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{Math.round(metrik?.attendanceRate ?? 0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${metrik?.attendanceRate ?? 0}%` }}
                              transition={{ duration: 1.4, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #16a34a, #4ade80)' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick stats row */}
                    <div className="grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,106,0,0.15)' }}>
                      {[
                        { label: 'Hadir', val: metrik?.hadir ?? 0, color: 'text-green-400' },
                        { label: 'Terlambat', val: metrik?.terlambat ?? 0, color: 'text-orange-400' },
                        { label: 'Alfa', val: metrik?.alfa ?? 0, color: 'text-red-400' },
                        { label: 'Invalid', val: metrik?.invalid ?? 0, color: 'text-slate-400' },
                      ].map((s, i) => (
                        <div key={i} className="py-4 text-center" style={i < 3 ? { borderRight: '1px solid rgba(255,106,0,0.1)' } : {}}>
                          <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div className="rounded-3xl p-5" style={{ background: CARD, border: '1px solid rgba(255,106,0,0.15)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-orange-400" />
                        <span className="text-xs font-black text-orange-400 uppercase tracking-widest">AI Neural Insights</span>
                      </div>
                      <button
                        onClick={jalankanAnalisaAI}
                        disabled={menganalisis}
                        className="text-[10px] font-black text-white/40 hover:text-orange-400 transition-colors uppercase tracking-widest disabled:opacity-40"
                      >
                        {menganalisis ? <RefreshCw size={12} className="animate-spin" /> : 'Analisis'}
                      </button>
                    </div>
                    {menganalisis ? (
                      <div className="space-y-2 animate-pulse">
                        {[100, 80, 90, 65].map((w, i) => (
                          <div key={i} className="h-2.5 rounded-full" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
                        ))}
                      </div>
                    ) : wawasanAI ? (
                      <p className="text-xs font-bold text-white/60 leading-relaxed whitespace-pre-line">{wawasanAI}</p>
                    ) : (
                      <p className="text-xs font-bold text-white/30 italic text-center py-2">Tekan Analisis untuk mendapatkan wawasan Neural AI sesi ini.</p>
                    )}
                  </div>

                  {/* Live confirmations */}
                  <div className="rounded-3xl overflow-hidden" style={{ background: CARD }}>
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                      <p className="text-sm font-black text-white">Konfirmasi Langsung</p>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] font-black text-green-400">{catatanList.filter(a => a.attendanceStatus !== 'ALFA').length} LIVE</span>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <AnimatePresence>
                        {catatanList.slice(0, 8).map((c, i) => {
                          const sc = statusColor(c.attendanceStatus);
                          return (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 px-5 py-3 border-t"
                              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                                style={{ background: 'rgba(255,106,0,0.2)' }}>
                                {c.student.user.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">{c.student.user.name}</p>
                                <p className="text-[10px] font-bold text-white/30">
                                  {new Date(c.timestamp).toLocaleTimeString('id-ID')}
                                  {c.gpsValidated && <span className="text-green-400 ml-1">✓ GPS</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: sc.bg }}>
                                <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                <span className={`text-[10px] font-black ${sc.text}`}>{c.attendanceStatus}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {catatanList.length === 0 && (
                        <div className="py-10 text-center">
                          <Activity size={28} className="text-white/10 mx-auto mb-3" />
                          <p className="text-xs font-black text-white/20 uppercase tracking-widest">Menunggu respons siswa...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Close signal */}
                  <button
                    onClick={tutupSinyal}
                    className="w-full py-4 rounded-2xl font-black text-white transition-all hover:opacity-90"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lock size={16} />
                      TUTUP SINYAL PRESENSI
                    </div>
                  </button>
                </>
              ) : (
                /* ── NO ACTIVE SESSION ── */
                <div className="rounded-3xl p-6 text-center" style={{ background: CARD, border: '1px solid rgba(255,106,0,0.1)' }}>
                  <motion.div
                    animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(255,106,0,0.1)', border: '2px dashed rgba(255,106,0,0.3)' }}
                  >
                    <Radio size={36} className="text-orange-500/50" />
                  </motion.div>
                  <h3 className="text-xl font-black text-white mb-1">Tidak Ada Sesi Aktif</h3>
                  <p className="text-sm font-bold text-white/30 mb-5">Aktifkan sinyal presensi dari tab Kelas untuk memulai.</p>
                  <button
                    onClick={() => setScreen('classes')}
                    className="mx-auto flex items-center gap-2 px-5 py-3 rounded-xl font-black text-sm text-orange-400"
                    style={{ background: 'rgba(255,106,0,0.15)', border: '1px solid rgba(255,106,0,0.3)' }}
                  >
                    <Zap size={14} /> Buka Manajemen Sesi
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── CLASSES TAB ── */}
          {screen === 'classes' && (
            <motion.div key="classes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 space-y-4">

              {/* Session Management Header */}
              <div className="rounded-3xl overflow-hidden" style={{ background: CARD }}>
                <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(255,106,0,0.15), rgba(50,29,14,0))' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Radio size={14} className="text-orange-400" />
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Session Management</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">Current Schedule<br />Validation</h2>
                </div>
                <div className="px-5 pb-5 space-y-3">
                  <div className="flex items-center gap-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Calendar size={14} className="text-orange-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Date & Time</p>
                      <p className="text-sm font-black text-white">
                        {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <Users size={14} className="text-orange-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Classroom</p>
                      <p className="text-sm font-black text-white">{sesiAktif ? metrik?.session.class : 'Pilih kelas di bawah'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <BarChart3 size={14} className="text-orange-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Subject Module</p>
                      <p className="text-sm font-black" style={{ color: '#06b6d4' }}>{sesiAktif ? metrik?.session.subject : 'Pilih mata pelajaran di bawah'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activate / Close Signal */}
              {!sesiAktif ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Pilih Kelas</label>
                    <select
                      value={kelasId}
                      onChange={e => setKelasId(e.target.value)}
                      className="w-full rounded-2xl px-4 py-3.5 font-black text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ background: CARD, border: '1px solid rgba(255,106,0,0.2)', color: 'white' }}
                    >
                      <option value="" style={{ background: CARD }}>— Pilih Kelas —</option>
                      {daftarKelas.map((c: any) => <option key={c.id} value={c.id} style={{ background: CARD }}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Mata Pelajaran</label>
                    <select
                      value={mapelId}
                      onChange={e => setMapelId(e.target.value)}
                      className="w-full rounded-2xl px-4 py-3.5 font-black text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      style={{ background: CARD, border: '1px solid rgba(255,106,0,0.2)', color: 'white' }}
                    >
                      <option value="" style={{ background: CARD }}>— Pilih Mata Pelajaran —</option>
                      {daftarMapel.map((s: any) => <option key={s.id} value={s.id} style={{ background: CARD }}>{s.name}</option>)}
                    </select>
                  </div>
                  {error && (
                    <p className="text-xs font-bold text-red-400 px-1">{error}</p>
                  )}
                  <button
                    onClick={aktifkanSinyal}
                    disabled={mengaktifkan}
                    className="w-full py-5 rounded-2xl font-black text-white text-base disabled:opacity-50 transition-all hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44e00)`, boxShadow: `0 8px 30px rgba(255,106,0,0.4)` }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={18} />
                      {mengaktifkan ? 'MENGAKTIFKAN...' : 'AKTIFKAN SINYAL'}
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={14} className="text-green-400" />
                      <span className="text-xs font-black text-green-400 uppercase tracking-widest">Sinyal Aktif</span>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 mb-1">Token untuk dibagikan ke siswa:</p>
                    <motion.p
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-3xl font-black text-orange-400 tracking-[0.4em]"
                    >
                      {sesiAktif.sessionToken}
                    </motion.p>
                  </div>
                  <button
                    onClick={tutupSinyal}
                    className="w-full py-4 rounded-2xl font-black text-red-300 transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lock size={16} /> TUTUP SINYAL
                    </div>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {screen === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 space-y-4">

              {/* Heatmap */}
              <div className="rounded-3xl p-5" style={{ background: CARD }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-base font-black text-white">Heatmap Visualization</p>
                    <p className="text-[10px] font-bold text-white/40">Weekly Trends: Attendance vs Engagement</p>
                  </div>
                  <BarChart2 size={18} className="text-orange-400" />
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map(d => (
                    <p key={d} className="text-[9px] font-black text-white/30 text-center uppercase">{d}</p>
                  ))}
                  {days.map((_, di) =>
                    [0, 1, 2, 3].map((ri) => {
                      const total = catatanList.length;
                      const seed = (di * 4 + ri) % Math.max(total, 1);
                      const item = catatanList[seed];
                      const intensity = item
                        ? item.attendanceStatus === 'HADIR' ? 0.85 : item.attendanceStatus === 'TERLAMBAT' ? 0.5 : 0.2
                        : (Math.sin(di * 3 + ri * 1.7) + 1) / 2 * 0.7 + 0.1;
                      const col = `rgba(255,106,0,${intensity.toFixed(2)})`;
                      return (
                        <div key={`${di}-${ri}`} className="aspect-square rounded-sm" style={{ background: col }} />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Class Stability */}
              <div className="rounded-3xl p-5 space-y-4" style={{ background: CARD }}>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Class Stability</p>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-black text-white">Attendance Consistency</span>
                    <span className="text-sm font-black" style={{ color: '#06b6d4' }}>{Math.round(metrik?.attendanceRate ?? 0) || 92}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metrik?.attendanceRate ?? 92}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #0284c7, #06b6d4)' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-black text-white">Dropout Pattern</span>
                    <span className="text-sm font-black text-green-400">Low Risk</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '18%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #16a34a, #4ade80)' }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Stability Score</p>
                  <div className="flex items-baseline gap-1">
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-5xl font-black text-white"
                    >
                      {metrik ? ((metrik.attendanceRate / 10) + 0.4).toFixed(1) : '8.4'}
                    </motion.span>
                    <span className="text-xl font-black text-white/30">/10</span>
                  </div>
                </div>
              </div>

              {/* Risk Detection */}
              <div className="rounded-3xl overflow-hidden" style={{ background: CARD }}>
                <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-orange-400" />
                      <span className="text-base font-black text-white">Risk Detection Flags</span>
                    </div>
                    {riskStudents.length > 0 && (
                      <div className="px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,106,0,0.2)' }}>
                        <span className="text-[10px] font-black text-orange-400">{riskStudents.length} Urgent</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {riskStudents.length > 0 ? riskStudents.slice(0, 3).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: CARD2 }}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {s.name?.charAt(0) || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{s.name}</p>
                        <p className="text-[10px] font-bold text-white/40 truncate">
                          {s.status} · Kehadiran {Math.round(s.attendanceRate)}%
                        </p>
                      </div>
                      <button
                        className="px-3 py-2 rounded-xl text-[10px] font-black text-orange-400 shrink-0"
                        style={{ background: 'rgba(255,106,0,0.15)', border: '1px solid rgba(255,106,0,0.25)' }}
                      >
                        {s.riskScore > 60 ? 'Notify Parent' : 'View Profile'}
                      </button>
                    </div>
                  )) : (
                    <div className="py-8 text-center">
                      <Shield size={28} className="text-green-500/30 mx-auto mb-2" />
                      <p className="text-xs font-black text-white/20 uppercase tracking-widest">Tidak ada siswa berisiko</p>
                    </div>
                  )}
                </div>
                {/* Export buttons */}
                <div className="p-4 space-y-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90"
                    style={{ background: 'rgba(255,106,0,0.15)', border: '1px solid rgba(255,106,0,0.25)' }}
                    onClick={() => sesiAktif && window.open(`/api/intelligence/session/${sesiAktif.id}/metrics`, '_blank')}
                  >
                    <FileText size={14} className="text-orange-400" />
                    <span className="text-orange-300">Download PDF Report</span>
                  </button>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Download size={14} className="text-white/40" />
                    <span className="text-white/40">Export Excel Archive</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── BOTTOM NAV ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50" style={{ background: 'rgba(12,5,2,0.96)', borderTop: '1px solid rgba(255,106,0,0.15)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'classes', label: 'Kelas', icon: Users },
            { id: 'analytics', label: 'Analitik', icon: BarChart2 },
          ].map(tab => {
            const active = screen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id as Screen)}
                className="flex-1 flex flex-col items-center gap-1 py-4 transition-all"
              >
                <div className="p-2 rounded-xl transition-all" style={active ? { background: 'rgba(255,106,0,0.2)' } : {}}>
                  <tab.icon size={20} className={active ? 'text-orange-400' : 'text-white/25'} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-orange-400' : 'text-white/25'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
