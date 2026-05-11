import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, BarChart2, MapPin, Shield,
  Smartphone, RefreshCw, CheckCircle2, AlertCircle,
  Radio, Fingerprint, Wifi, Lock,
  BookOpen, Clock,
} from 'lucide-react';
import { io } from 'socket.io-client';

type Screen = 'dashboard' | 'classes' | 'analytics';
type AttendanceStatus = 'IDLE' | 'SEARCHING' | 'FOUND' | 'LOCATING' | 'SUBMITTING' | 'CONFIRMED' | 'ALREADY_CONFIRMED' | 'PENDING_DEVICE' | 'ERROR';

interface ActiveSession {
  id: string;
  sessionToken: string;
  subject: { name: string };
  class: { name: string };
  teacher: { user: { name: string } };
  startTime: string;
}

interface HistoryItem {
  id: string;
  attendanceStatus: string;
  timestamp: string;
  session: { subject: { name: string }; class: { name: string }; startTime: string };
}

const BG = '#1C100A';
const CARD = '#2A1708';
const ORANGE = '#FF6A00';

function PulseRing({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {active && [0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-orange-500/40"
          initial={{ width: 160, height: 160, opacity: 0.7 }}
          animate={{ width: 260, height: 260, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function PulseRingYellow({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {active && [0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-yellow-500/40"
          initial={{ width: 160, height: 160, opacity: 0.7 }}
          animate={{ width: 260, height: 260, opacity: 0 }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function NeuralLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          style={{ top: `${10 + i * 12}%`, left: 0, right: 0 }}
          animate={{ opacity: [0, 0.6, 0], x: ['-100%', '100%'] }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.7, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

export default function MobileStudentPresensi({
  authToken, user
}: { authToken: string; user: any }) {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'VALIDATING' | 'VALID' | 'INVALID'>('IDLE');

  const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchActiveSession = useCallback(async () => {
    setLoadingSession(true);
    try {
      const res = await fetch('/api/intelligence/active-session', { headers });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setStatus(prev => prev === 'IDLE' ? 'FOUND' : prev);
      } else {
        setActiveSession(null);
        setStatus(prev => (prev !== 'CONFIRMED' && prev !== 'ALREADY_CONFIRMED' && prev !== 'PENDING_DEVICE') ? 'IDLE' : prev);
      }
    } catch { /* no-op */ }
    finally { setLoadingSession(false); }
  }, [authToken]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence/my-history', { headers });
      if (res.ok) setHistory(await res.json());
    } catch { /* no-op */ }
  }, [authToken]);

  useEffect(() => {
    fetchActiveSession();
    fetchHistory();
    const socket = io();
    socket.on('session-opened', () => fetchActiveSession());
    socket.on('session-closed', () => {
      setActiveSession(null);
      if (status !== 'CONFIRMED' && status !== 'ALREADY_CONFIRMED' && status !== 'PENDING_DEVICE') setStatus('IDLE');
    });
    // Point 8 — if teacher validates pending attendance, update status to CONFIRMED
    socket.on('attendance-update', (data: any) => {
      if (data?.confirmationStatus === 'CONFIRMED' && status === 'PENDING_DEVICE') {
        setStatus('CONFIRMED');
        setAttendanceResult(data);
        fetchHistory();
      }
    });
    return () => { socket.close(); };
  }, []);

  const handleRespond = async () => {
    if (!activeSession) return;
    if (!sessionToken.trim()) { setErrorMsg('Masukkan token sesi dari guru.'); return; }
    if (!navigator.geolocation) { setStatus('ERROR'); setErrorMsg('GPS tidak didukung di perangkat ini.'); return; }

    setStatus('LOCATING');
    setGpsStatus('VALIDATING');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsStatus('VALID');
        setStatus('SUBMITTING');
        try {
          const deviceId = [navigator.userAgent, window.screen.width, window.screen.height, navigator.language].join('|');
          const res = await fetch('/api/intelligence/respond', {
            method: 'POST', headers,
            body: JSON.stringify({
              sessionId: activeSession.id,
              sessionToken: sessionToken.toUpperCase(),
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              deviceId,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setStatus('ERROR'); setGpsStatus('INVALID'); setErrorMsg(data.error || 'Gagal konfirmasi kehadiran.'); return; }

          if (data.status === 'ALREADY_CONFIRMED') {
            setAttendanceResult(data.attendance);
            setStatus('ALREADY_CONFIRMED');
            fetchHistory();
          } else if (data.status === 'SUCCESS') {
            setAttendanceResult(data.attendance);
            // Point 2 — if GPS invalid (confirmationStatus UNCONFIRMED) → PENDING_DEVICE
            if (data.attendance?.confirmationStatus === 'UNCONFIRMED') {
              setStatus('PENDING_DEVICE');
              setGpsStatus('INVALID');
            } else {
              setStatus('CONFIRMED');
              setGpsStatus('VALID');
            }
            fetchHistory();
          } else {
            setStatus('ERROR'); setGpsStatus('INVALID'); setErrorMsg(data.error || 'Terjadi kesalahan.');
          }
        } catch { setStatus('ERROR'); setGpsStatus('INVALID'); setErrorMsg('Gagal terhubung ke server.'); }
      },
      (err) => { setStatus('ERROR'); setGpsStatus('INVALID'); setErrorMsg(`GPS gagal: ${err.message}`); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reset = () => {
    setStatus(activeSession ? 'FOUND' : 'IDLE');
    setErrorMsg(''); setSessionToken(''); setAttendanceResult(null); setGpsStatus('IDLE');
  };

  const initials = (user?.name || 'S').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const statusBadge = (s: string) => {
    if (s === 'HADIR') return { label: 'Hadir', cls: 'bg-green-500/20 text-green-400' };
    if (s === 'TERLAMBAT') return { label: 'Terlambat', cls: 'bg-orange-500/20 text-orange-400' };
    if (s === 'ALFA') return { label: 'Alfa', cls: 'bg-slate-500/20 text-slate-400' };
    if (s === 'INVALID') return { label: 'Pending', cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: s, cls: 'bg-red-500/20 text-red-400' };
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: BG, fontFamily: "'Poppins', sans-serif", maxWidth: 430, margin: '0 auto' }}>
      <NeuralLines />

      {/* ─── TOP HEADER ─── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-orange-500"
            />
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">SMK NEGERI 1 WONOGIRI</span>
          </div>
          <p className="text-xs font-bold text-white/40 mt-0.5">Neural Class Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs font-black text-white">{user?.name || 'Siswa'}</p>
            <p className="text-[10px] text-orange-400 font-bold">Siswa</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-900/50">
            {initials}
          </div>
        </div>
      </div>

      {/* ─── SCREEN CONTENT ─── */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <AnimatePresence mode="wait">
          {screen === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 space-y-4">
              <div className="text-center pt-4 pb-2">
                <h1 className="text-4xl font-black text-white tracking-tight">Presensi Digital</h1>
                <p className="text-sm font-bold text-white/50 mt-1">Sistem berbasis AI untuk validasi<br />kehadiran real-time.</p>
              </div>

              {/* Main Signal Button */}
              <div className="relative flex items-center justify-center py-8">
                <PulseRing active={status === 'LOCATING' || status === 'SUBMITTING'} />
                <PulseRingYellow active={status === 'PENDING_DEVICE'} />
                <AnimatePresence mode="wait">
                  {status === 'CONFIRMED' || status === 'ALREADY_CONFIRMED' ? (
                    <motion.button
                      key="confirmed"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 cursor-default"
                      style={{ background: 'radial-gradient(circle at 40% 40%, #166534, #14532d)', boxShadow: '0 0 60px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                    >
                      <CheckCircle2 size={52} className="text-green-300" />
                      <span className="text-xs font-black text-green-300 uppercase tracking-widest">Terkonfirmasi</span>
                      <span className="text-[10px] font-bold text-green-400/70">
                        {attendanceResult?.attendanceStatus === 'HADIR' ? 'HADIR' : attendanceResult?.attendanceStatus}
                      </span>
                    </motion.button>

                  ) : status === 'PENDING_DEVICE' ? (
                    /* Point 2 — PENDING_DEVICE waiting state */
                    <motion.button
                      key="pending"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 cursor-default"
                      style={{ background: 'radial-gradient(circle at 40% 40%, #713f12, #451a03)', boxShadow: '0 0 60px rgba(234,179,8,0.35), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <Radio size={48} className="text-yellow-300" />
                      </motion.div>
                      <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest text-center leading-tight">
                        Menunggu<br />Validasi
                      </span>
                    </motion.button>

                  ) : status === 'ERROR' ? (
                    <motion.button
                      key="error"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={reset}
                      className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2"
                      style={{ background: 'radial-gradient(circle at 40% 40%, #7f1d1d, #450a0a)', boxShadow: '0 0 60px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                    >
                      <AlertCircle size={48} className="text-red-300" />
                      <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">Coba Lagi</span>
                    </motion.button>

                  ) : (
                    <motion.button
                      key="signal"
                      whileTap={{ scale: 0.95 }}
                      onClick={activeSession && status === 'FOUND' ? handleRespond : undefined}
                      className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center gap-3"
                      style={{
                        background: activeSession
                          ? `radial-gradient(circle at 40% 40%, ${ORANGE}, #c44e00)`
                          : 'radial-gradient(circle at 40% 40%, #3d2010, #2a1708)',
                        boxShadow: activeSession
                          ? `0 0 60px rgba(255,106,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)`
                          : '0 0 30px rgba(255,106,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      <motion.div
                        animate={status === 'LOCATING' || status === 'SUBMITTING' ? { rotate: 360 } : {}}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      >
                        <Fingerprint size={60} className={activeSession ? 'text-white' : 'text-orange-900'} />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-[11px] font-black text-white/90 uppercase tracking-widest leading-tight">
                          {status === 'LOCATING' ? 'Mencari GPS...' : status === 'SUBMITTING' ? 'Mengirim...' : 'Respon Sinyal'}
                        </p>
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-0.5">
                          {status === 'FOUND' ? 'KETUK UNTUK HADIR' : loadingSession ? 'MEMERIKSA...' : 'STANDBY'}
                        </p>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Point 2 — PENDING_DEVICE detailed info card */}
              <AnimatePresence>
                {status === 'PENDING_DEVICE' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl p-5 space-y-3"
                    style={{ background: 'rgba(113,63,18,0.4)', border: '1px solid rgba(234,179,8,0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-yellow-400"
                      />
                      <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Validasi Perangkat Tertunda</p>
                    </div>
                    <p className="text-sm font-bold text-white/70 leading-relaxed">
                      Kehadiran Anda telah tercatat, namun posisi GPS Anda berada di luar zona sekolah. Guru perlu memvalidasi kehadiran Anda secara manual.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-yellow-400">PENDING</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Waktu</p>
                        <p className="text-sm font-black text-white">
                          {attendanceResult?.timestamp ? new Date(attendanceResult.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center justify-center gap-2 pt-1"
                    >
                      <Clock size={12} className="text-yellow-400/60" />
                      <p className="text-[10px] font-black text-yellow-400/60 uppercase tracking-widest">Menunggu konfirmasi guru...</p>
                    </motion.div>
                    <button
                      onClick={reset}
                      className="w-full text-xs font-black text-white/20 hover:text-white/40 uppercase tracking-widest py-1 transition-colors"
                    >
                      ↩ Reset
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Session info / token input */}
              <AnimatePresence>
                {activeSession && status !== 'CONFIRMED' && status !== 'ALREADY_CONFIRMED' && status !== 'PENDING_DEVICE' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl p-4 border border-orange-500/20" style={{ background: CARD }}>
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Sesi Aktif</p>
                      <p className="text-sm font-black text-white">{activeSession.subject.name} — {activeSession.class.name}</p>
                      <p className="text-xs font-bold text-white/40 mt-1">Guru: {activeSession.teacher.user.name}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Token Sesi</label>
                      <input
                        type="text"
                        value={sessionToken}
                        onChange={e => setSessionToken(e.target.value.toUpperCase())}
                        placeholder="Masukkan token dari guru..."
                        maxLength={8}
                        className="w-full rounded-2xl px-4 py-3 text-white font-black text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
                        style={{ background: CARD, border: '1px solid rgba(255,106,0,0.3)' }}
                      />
                    </div>
                    {status !== 'LOCATING' && status !== 'SUBMITTING' && (
                      <button
                        onClick={handleRespond}
                        disabled={!sessionToken}
                        className="w-full py-4 rounded-2xl font-black text-white disabled:opacity-40 transition-all"
                        style={{ background: `linear-gradient(135deg, ${ORANGE}, #c44e00)`, boxShadow: '0 4px 20px rgba(255,106,0,0.4)' }}
                      >
                        KONFIRMASI KEHADIRAN
                      </button>
                    )}
                    {errorMsg && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-red-300 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        {errorMsg}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Searching indicator */}
              {!activeSession && !loadingSession && status !== 'CONFIRMED' && status !== 'ALREADY_CONFIRMED' && status !== 'PENDING_DEVICE' && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center justify-center gap-2"
                >
                  <Wifi size={14} className="text-orange-400" />
                  <p className="text-sm font-bold text-white/40">Searching for Classroom Signal...</p>
                </motion.div>
              )}

              {loadingSession && (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="text-orange-400 animate-spin" />
                  <p className="text-sm font-bold text-white/40">Memeriksa sinyal aktif...</p>
                </div>
              )}

              {/* Confirmed summary */}
              {(status === 'CONFIRMED' || status === 'ALREADY_CONFIRMED') && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4 text-center" style={{ background: CARD }}>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Waktu</p>
                      <p className="text-lg font-black text-white">
                        {attendanceResult?.timestamp ? new Date(attendanceResult.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4 text-center" style={{ background: CARD }}>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-lg font-black text-green-400">{attendanceResult?.attendanceStatus || 'HADIR'}</p>
                    </div>
                  </div>
                  <button onClick={reset} className="w-full text-xs font-black text-white/30 hover:text-white/50 uppercase tracking-widest py-2 transition-colors">
                    ↩ Reset Panel
                  </button>
                </motion.div>
              )}

              {/* GPS & Device Status */}
              <div className="rounded-2xl overflow-hidden border border-orange-500/20" style={{ background: CARD }}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,0,0.15)' }}>
                    <MapPin size={20} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Validasi Geospasial</p>
                    <p className="text-sm font-black text-white">
                      {gpsStatus === 'VALIDATING' ? 'VALIDATING GPS...'
                        : gpsStatus === 'VALID' ? 'GPS VALIDATED ✓'
                        : gpsStatus === 'INVALID' ? 'GPS DI LUAR ZONA ✗'
                        : 'STANDBY'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,0,0.1)' }}>
                    {gpsStatus === 'VALID' ? <Shield size={18} className="text-green-400" />
                      : gpsStatus === 'INVALID' ? <Shield size={18} className="text-yellow-400" />
                      : <Shield size={18} className="text-orange-400/50" />}
                  </div>
                </div>
                <div className="h-px" style={{ background: 'rgba(255,106,0,0.1)' }} />
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,0,0.15)' }}>
                    <Smartphone size={20} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Device Fingerprint</p>
                    <p className="text-sm font-black text-white">
                      {status === 'PENDING_DEVICE' ? 'PENDING VALIDATION' : 'VERIFIED'}
                    </p>
                  </div>
                  {status === 'PENDING_DEVICE'
                    ? <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
                        <Shield size={18} className="text-yellow-400" />
                      </motion.div>
                    : <Shield size={18} className="text-green-400" />
                  }
                </div>
              </div>

              {/* Lock icon if no active session and not confirmed */}
              {!activeSession && !loadingSession && status === 'IDLE' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Lock size={24} className="text-orange-900/60" />
                  <p className="text-xs font-bold text-white/20 text-center">Belum ada sesi presensi aktif dari guru.</p>
                </div>
              )}
            </motion.div>
          )}

          {screen === 'classes' && (
            <motion.div key="classes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 pt-4 space-y-4">
              <h2 className="text-2xl font-black text-white">Jadwal Hari Ini</h2>
              <p className="text-xs font-bold text-white/40">{today}</p>
              {history.length === 0 ? (
                <div className="rounded-3xl p-10 text-center" style={{ background: CARD }}>
                  <BookOpen size={40} className="text-orange-900 mx-auto mb-4" />
                  <p className="text-sm font-black text-white/40">Belum ada riwayat kehadiran</p>
                </div>
              ) : (
                history.slice(0, 6).map((item, i) => {
                  const badge = statusBadge(item.attendanceStatus);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-2xl p-4 flex items-center gap-4"
                      style={{ background: CARD }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black text-white" style={{ background: 'rgba(255,106,0,0.2)' }}>
                        {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">{item.session.subject.name}</p>
                        <p className="text-[10px] font-bold text-white/40">{item.session.class.name} · {new Date(item.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${badge.cls}`}>{badge.label}</span>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {screen === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="px-4 pb-28 pt-4 space-y-4">
              <h2 className="text-2xl font-black text-white">Rekap Presensi</h2>
              {(() => {
                const hadir = history.filter(h => h.attendanceStatus === 'HADIR').length;
                const terlambat = history.filter(h => h.attendanceStatus === 'TERLAMBAT').length;
                const alfa = history.filter(h => h.attendanceStatus === 'ALFA').length;
                const pending = history.filter(h => h.attendanceStatus === 'INVALID').length;
                const total = history.length;
                const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total Sesi', value: total, color: 'text-white' },
                        { label: 'Hadir', value: hadir, color: 'text-green-400' },
                        { label: 'Terlambat', value: terlambat, color: 'text-orange-400' },
                        { label: 'Alfa', value: alfa, color: 'text-red-400' },
                      ].map(s => (
                        <div key={s.label} className="rounded-2xl p-4" style={{ background: CARD }}>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">{s.label}</p>
                          <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {pending > 0 && (
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(113,63,18,0.3)', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <p className="text-[9px] font-black text-yellow-400/60 uppercase tracking-widest mb-1">Validasi Tertunda</p>
                        <p className="text-3xl font-black text-yellow-400">{pending}</p>
                      </div>
                    )}
                    <div className="rounded-2xl p-5" style={{ background: CARD }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-white">Tingkat Kehadiran</p>
                        <p className="text-xl font-black" style={{ color: ORANGE }}>{rate}%</p>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${ORANGE}, #FFB347)` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-white/30 mt-2 uppercase tracking-widest">
                        {rate >= 75 ? '✓ Memenuhi batas minimum kehadiran' : '⚠ Di bawah batas minimum 75%'}
                      </p>
                    </div>
                    <div className="rounded-2xl p-5" style={{ background: CARD }}>
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">Kehadiran Mingguan</p>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
                          <div key={i} className="text-center">
                            <p className="text-[9px] font-black text-white/30 mb-1">{d}</p>
                            {[...Array(4)].map((_, j) => {
                              const idx = i * 4 + j;
                              const h = history[idx];
                              const col = !h ? 'rgba(255,255,255,0.05)'
                                : h.attendanceStatus === 'HADIR' ? 'rgba(34,197,94,0.6)'
                                : h.attendanceStatus === 'TERLAMBAT' ? 'rgba(255,106,0,0.6)'
                                : h.attendanceStatus === 'INVALID' ? 'rgba(234,179,8,0.5)'
                                : 'rgba(239,68,68,0.4)';
                              return <div key={j} className="w-full aspect-square rounded-sm mb-1" style={{ background: col }} />;
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── BOTTOM NAV ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50" style={{ background: 'rgba(15,7,3,0.95)', borderTop: '1px solid rgba(255,106,0,0.15)', backdropFilter: 'blur(20px)' }}>
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
                className="flex-1 flex flex-col items-center gap-1 py-4 transition-all relative"
              >
                {tab.id === 'dashboard' && status === 'PENDING_DEVICE' && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="absolute top-2 right-[30%] w-3 h-3 rounded-full bg-yellow-400"
                  />
                )}
                <div className={`p-2 rounded-xl transition-all`} style={active ? { background: 'rgba(255,106,0,0.2)' } : {}}>
                  <tab.icon size={20} className={active ? 'text-orange-400' : 'text-white/30'} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-orange-400' : 'text-white/30'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
