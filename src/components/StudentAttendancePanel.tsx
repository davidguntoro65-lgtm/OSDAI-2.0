import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  MapPin,
  ShieldCheck,
  Smartphone,
  History,
  AlertCircle,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Lock,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { io } from 'socket.io-client';

type AttendanceStatus = 'IDLE' | 'LOCATING' | 'SUBMITTING' | 'CONFIRMED' | 'ALREADY_CONFIRMED' | 'ERROR';

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
  session: {
    subject: { name: string };
    class: { name: string };
    startTime: string;
  };
}

export default function StudentAttendancePanel({ authToken }: { authToken: string }) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const authHeaders = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchActiveSession = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence/active-session', { headers: authHeaders });
      if (res.status === 200) {
        const data = await res.json();
        setActiveSession(data);
        // Auto-fill token from URL param if present
        const params = new URLSearchParams(window.location.search);
        if (params.get('token')) setSessionToken(params.get('token')!.toUpperCase());
      } else {
        setActiveSession(null);
      }
    } catch { /* no-op */ }
    finally { setLoadingSession(false); }
  }, [authToken]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/intelligence/my-history', { headers: authHeaders });
      if (res.ok) setHistory(await res.json());
    } catch { /* no-op */ }
    finally { setLoadingHistory(false); }
  }, [authToken]);

  useEffect(() => {
    fetchActiveSession();
    fetchHistory();

    // Listen for new session signals via socket
    const socket = io();
    socket.on('session-opened', () => fetchActiveSession());
    socket.on('session-closed', () => {
      setActiveSession(null);
      if (status !== 'CONFIRMED' && status !== 'ALREADY_CONFIRMED') {
        setStatus('IDLE');
        setErrorMsg('Sinyal kelas telah ditutup oleh guru.');
      }
    });
    return () => { socket.close(); };
  }, [fetchActiveSession, fetchHistory]);

  const handleRespond = async () => {
    if (!activeSession) { setErrorMsg('Tidak ada sinyal aktif.'); return; }
    if (!sessionToken.trim()) { setErrorMsg('Masukkan token sesi dari guru.'); return; }
    if (!navigator.geolocation) { setStatus('ERROR'); setErrorMsg('GPS tidak didukung di perangkat ini.'); return; }

    setStatus('LOCATING');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('SUBMITTING');
        try {
          const deviceId = [
            navigator.userAgent,
            screen.width,
            screen.height,
            navigator.hardwareConcurrency ?? '',
            navigator.language
          ].join('|');

          const res = await fetch('/api/intelligence/respond', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              sessionId: activeSession.id,
              sessionToken: sessionToken.toUpperCase(),
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              deviceId
            })
          });
          const data = await res.json();

          if (!res.ok) {
            setStatus('ERROR');
            setErrorMsg(data.error || 'Gagal konfirmasi kehadiran.');
            return;
          }

          if (data.status === 'SUCCESS') {
            setAttendanceResult(data.attendance);
            setStatus('CONFIRMED');
            fetchHistory();
          } else if (data.status === 'ALREADY_CONFIRMED') {
            setAttendanceResult(data.attendance);
            setStatus('ALREADY_CONFIRMED');
          } else {
            setStatus('ERROR');
            setErrorMsg(data.error || 'Terjadi kesalahan.');
          }
        } catch {
          setStatus('ERROR');
          setErrorMsg('Gagal terhubung ke server.');
        }
      },
      (err) => {
        setStatus('ERROR');
        setErrorMsg(`Gagal mendapatkan lokasi GPS (${err.message}). Aktifkan GPS dan izinkan akses lokasi.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetPanel = () => {
    setStatus('IDLE');
    setErrorMsg('');
    setSessionToken('');
    setAttendanceResult(null);
    fetchActiveSession();
  };

  const statusLabel: Record<string, string> = {
    HADIR: 'Hadir',
    TERLAMBAT: 'Terlambat',
    ALFA: 'Tidak Hadir',
    INVALID: 'Invalid (GPS)'
  };
  const statusColors: Record<string, string> = {
    HADIR: 'bg-green-500 text-white',
    TERLAMBAT: 'bg-orange-500 text-white',
    ALFA: 'bg-slate-500 text-white',
    INVALID: 'bg-red-500 text-white'
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">PRESENSI NEURAL</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {activeSession ? `${activeSession.subject.name} — ${activeSession.class.name}` : 'OSDAI Neural Pulse Attendance'}
          </p>
        </div>
        <Badge className={`font-black text-[10px] border-none ${activeSession ? 'bg-green-500/10 text-green-600 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
          {activeSession ? 'SINYAL AKTIF' : 'MENUNGGU SINYAL'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Action Area */}
        <div className="md:col-span-8 space-y-6">
          <GlassPanel className="bg-slate-900 text-white min-h-[420px] flex flex-col items-center justify-center text-center p-10 overflow-hidden relative">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <Zap size={400} className="text-white absolute -top-20 -right-20" />
            </div>

            <AnimatePresence mode="wait">
              {(status === 'CONFIRMED' || status === 'ALREADY_CONFIRMED') ? (
                <motion.div
                  key="confirmed"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-6 z-10"
                >
                  <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40">
                    <CheckCircle2 size={48} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black mb-2 uppercase">
                      {status === 'ALREADY_CONFIRMED' ? 'Sudah Terkonfirmasi' : 'Kehadiran Terkonfirmasi'}
                    </h3>
                    <p className="text-sm font-bold text-white/60">Data presensi telah tercatat di sistem Neural SMK.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
                    <div className="bg-white/10 rounded-[24px] p-4 border border-white/20">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Waktu</p>
                      <p className="font-black text-lg">
                        {attendanceResult?.timestamp
                          ? new Date(attendanceResult.timestamp).toLocaleTimeString('id-ID')
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-[24px] p-4 border border-white/20">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status</p>
                      <p className={`font-black text-sm uppercase ${attendanceResult?.attendanceStatus === 'HADIR' ? 'text-green-400' : 'text-orange-400'}`}>
                        {attendanceResult?.attendanceStatus ?? '—'}
                      </p>
                    </div>
                  </div>
                  <button onClick={resetPanel} className="text-xs font-black text-white/30 hover:text-white/60 uppercase tracking-widest mt-2">
                    Refresh Panel
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="action"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-6 z-10 w-full max-w-sm mx-auto"
                >
                  {loadingSession ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 animate-pulse mx-auto" />
                      <p className="text-sm font-bold text-white/40">Memeriksa sinyal aktif...</p>
                    </div>
                  ) : activeSession ? (
                    <>
                      <div className="w-24 h-24 rounded-[40px] bg-[#FF6A00] flex items-center justify-center mx-auto shadow-2xl shadow-orange-900/40 -rotate-12">
                        <Zap size={52} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black mb-2 uppercase leading-tight">RESPON SINYAL</h3>
                        <p className="text-sm font-bold text-white/50">
                          {activeSession.subject.name} • {activeSession.class.name}<br />
                          Guru: {activeSession.teacher.user.name}
                        </p>
                      </div>

                      {/* Token Input */}
                      <div className="w-full">
                        <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                          Token Sesi (dari guru)
                        </label>
                        <input
                          type="text"
                          value={sessionToken}
                          onChange={e => setSessionToken(e.target.value.toUpperCase())}
                          placeholder="Masukkan token..."
                          maxLength={8}
                          className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-white font-black text-center text-xl tracking-widest placeholder-white/20 focus:outline-none focus:border-[#FF6A00]"
                        />
                      </div>

                      {status === 'ERROR' && (
                        <div className="flex items-start gap-2 text-red-400 font-bold text-sm bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-left">
                          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                          <div>
                            {errorMsg}
                            <button onClick={() => { setStatus('IDLE'); setErrorMsg(''); }} className="block underline mt-1 text-xs">
                              Coba Lagi
                            </button>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleRespond}
                        disabled={status !== 'IDLE' && status !== 'ERROR'}
                        className="h-16 w-full rounded-[32px] bg-white text-slate-900 font-black text-lg shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        {status === 'IDLE' || status === 'ERROR'
                          ? <><Zap size={20} className="mr-2" /> KONFIRMASI KEHADIRAN</>
                          : status === 'LOCATING'
                          ? <><Navigation size={20} className="mr-2 animate-spin" /> MENCARI GPS...</>
                          : <><RefreshCw size={20} className="mr-2 animate-spin" /> MENGIRIM DATA...</>
                        }
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-24 h-24 rounded-[40px] bg-white/5 flex items-center justify-center mx-auto border-2 border-dashed border-white/20">
                        <Lock size={36} className="text-white/20" />
                      </div>
                      <h3 className="text-2xl font-black uppercase text-white/60">Belum Ada Sinyal</h3>
                      <p className="text-sm text-white/30 font-bold">Tunggu guru mengaktifkan sinyal presensi untuk kelasmu.</p>
                      <button onClick={fetchActiveSession} className="text-xs font-black text-white/30 hover:text-white/60 uppercase tracking-widest flex items-center gap-2 mx-auto">
                        <RefreshCw size={12} /> Refresh
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/40 border border-white/60 p-6 rounded-[36px] flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPS Integrity</p>
                <p className="text-lg font-black text-slate-900">
                  {status === 'CONFIRMED' && attendanceResult?.gpsValidated ? '✓ VALID' : 'MONITORING'}
                </p>
              </div>
            </div>
            <div className="bg-white/40 border border-white/60 p-6 rounded-[36px] flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center flex-shrink-0">
                <Smartphone size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Device</p>
                <p className="text-lg font-black text-slate-900">VERIFIED</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: History */}
        <div className="md:col-span-4 space-y-6">
          <GlassPanel className="bg-white/40 border-dashed border-2 border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black flex items-center gap-3">
                <History size={18} className="text-slate-400" /> Riwayat Presensi
              </h3>
              <button onClick={fetchHistory} className="text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {loadingHistory ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))
              ) : history.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock size={28} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum ada riwayat</p>
                </div>
              ) : (
                history.slice(0, 8).map(item => (
                  <div key={item.id} className="bg-white/60 p-4 rounded-2xl border border-white flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{item.session.subject.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        {new Date(item.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <Badge className={`text-[10px] font-black rounded-lg flex-shrink-0 ${statusColors[item.attendanceStatus] ?? 'bg-slate-500 text-white'}`}>
                      {statusLabel[item.attendanceStatus] ?? item.attendanceStatus}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          <div className="p-6 rounded-[36px] bg-slate-900 text-white relative overflow-hidden">
            <MapPin className="absolute -bottom-4 -right-4 text-white/5" size={90} />
            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Security Zone</h4>
            <p className="text-sm font-bold text-white/60 leading-relaxed">
              Sistem OSDAI Neural Vision memantau kejujuran presensi melalui validasi GPS dan token sesi unik per kelas.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Monitoring Aktif</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
