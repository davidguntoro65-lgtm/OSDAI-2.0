import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio, Calendar, BarChart3, Users, Zap, Clock,
  CheckCircle2, AlertCircle, ChevronRight, Sparkles,
  BookOpen, Activity, Shield,
} from 'lucide-react';

interface Props {
  authToken: string;
  user: any;
  onNavigate: (tab: string) => void;
}

interface TodaySchedule {
  schedule: {
    id: string; classId: string; subjectId: string;
    periodStart: number; periodEnd: number;
    class: { id: string; name: string };
    subject: { id: string; name: string };
  } | null;
  currentPeriod: number; day: number; periodTime: string;
}

const ORANGE = '#FF6A00';
const CARD = '#2A1708';

export default function GuruDashboard({ authToken, user, onNavigate }: Props) {
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [riskCount, setRiskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, sessRes] = await Promise.all([
        fetch('/api/intelligence/today-schedule', { headers }),
        fetch('/api/intelligence/my-sessions', { headers }),
      ]);
      if (schedRes.ok) setTodaySchedule(await schedRes.json());
      if (sessRes.ok) setActiveSessions(await sessRes.json());
      try {
        const riskRes = await fetch('/api/analytics/risk-students', { headers });
        if (riskRes.ok) { const d = await riskRes.json(); setRiskCount(d.length); }
      } catch { /* no-op */ }
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [authToken]);

  const activateSignal = async () => {
    const sched = todaySchedule?.schedule;
    if (!sched) { setError('Tidak ada jadwal mengajar hari ini.'); return; }
    setActivating(true); setError('');
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST', headers,
        body: JSON.stringify({ classId: sched.class.id, subjectId: sched.subject.id, scheduleId: sched.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengaktifkan.'); return; }
      setSuccessMsg('Sinyal presensi aktif!');
      setTimeout(() => { setSuccessMsg(''); fetchData(); onNavigate('presensi'); }, 1200);
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setActivating(false); }
  };

  const closeSignal = async () => {
    const sess = activeSessions[0];
    if (!sess) return;
    setClosing(true); setError('');
    try {
      const res = await fetch('/api/intelligence/signal/close', {
        method: 'POST', headers, body: JSON.stringify({ sessionId: sess.id }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Gagal menutup.'); return; }
      setSuccessMsg('Sesi ditutup.');
      setTimeout(() => { setSuccessMsg(''); fetchData(); }, 1000);
    } catch { setError('Gagal menutup sesi.'); }
    finally { setClosing(false); }
  };

  const hasActiveSession = activeSessions.length > 0;
  const sched = todaySchedule?.schedule;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1C100A' }}>

      {/* Date & Time Strip */}
      <div className="px-4 pt-3 pb-2">
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,106,0,0.07)', border: '1px solid rgba(255,106,0,0.14)' }}
        >
          <div>
            <p className="text-xs font-black text-white">{dateStr}</p>
            <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Jam ke-{todaySchedule?.currentPeriod || '—'} · {todaySchedule?.periodTime || '—'}
            </p>
          </div>
          <div className="text-2xl font-black" style={{ color: ORANGE }}>{timeStr}</div>
        </div>
      </div>

      {/* Current Class Status */}
      <div className="px-4 pb-3">
        <motion.div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: hasActiveSession
              ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, #2A1708 100%)'
              : 'linear-gradient(135deg, #2A1708 0%, #1C100A 100%)',
            border: hasActiveSession ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,106,0,0.15)',
          }}
        >
          {hasActiveSession && (
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl"
              style={{ background: 'rgba(34,197,94,0.25)' }}
            />
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={hasActiveSession ? { opacity: [1, 0.4, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: hasActiveSession ? '#22c55e' : 'rgba(255,255,255,0.2)' }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: hasActiveSession ? '#22c55e' : 'rgba(255,255,255,0.3)' }}
              >
                {hasActiveSession ? 'SINYAL AKTIF' : 'TIDAK ADA SESI'}
              </span>
            </div>

            {hasActiveSession ? (
              <>
                <h2 className="text-xl font-black text-white mb-1">
                  {activeSessions[0]?.subject?.name || sched?.subject.name || 'Sesi Aktif'}
                </h2>
                <p className="text-sm font-bold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {activeSessions[0]?.class?.name || sched?.class.name}
                </p>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}
                >
                  <Radio size={10} />
                  Token: <span className="font-black text-white">{activeSessions[0]?.sessionToken}</span>
                </div>
              </>
            ) : sched ? (
              <>
                <h2 className="text-xl font-black text-white mb-1">{sched.subject.name}</h2>
                <p className="text-sm font-bold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {sched.class.name} · JP {sched.periodStart}–{sched.periodEnd}
                </p>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,106,0,0.7)' }}>
                  Jadwal mengajar tersedia. Aktifkan sinyal presensi.
                </p>
              </>
            ) : loading ? (
              <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Memuat jadwal...</p>
            ) : (
              <>
                <h2 className="text-lg font-black text-white mb-1">Tidak ada jadwal</h2>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Hari ini tidak ada kelas mengajar.</p>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Feedback Messages */}
      <AnimatePresence>
        {(error || successMsg) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-3 px-4 py-3 rounded-2xl text-sm font-black text-center"
            style={{
              background: error ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: error ? '#ef4444' : '#22c55e',
            }}
          >
            {error || successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Action Buttons */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Aksi Cepat
        </p>
        <div className="grid grid-cols-2 gap-3">

          {/* Activate Signal */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={activateSignal}
            disabled={activating || hasActiveSession || !sched}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all"
            style={{
              background: hasActiveSession || !sched ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #FF6A00, #e55a00)',
              border: hasActiveSession || !sched ? '1px solid rgba(255,255,255,0.06)' : 'none',
              opacity: hasActiveSession || !sched ? 0.5 : 1,
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Aktifkan</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Presensi</p>
            </div>
          </motion.button>

          {/* Close Signal */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={closeSignal}
            disabled={closing || !hasActiveSession}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all"
            style={{
              background: !hasActiveSession ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.12)',
              border: !hasActiveSession ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(239,68,68,0.3)',
              opacity: !hasActiveSession ? 0.4 : 1,
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <Shield size={16} style={{ color: '#ef4444' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Tutup</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Presensi</p>
            </div>
          </motion.button>

          {/* Lihat Jadwal */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('jadwal')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.2)' }}>
              <Calendar size={16} style={{ color: '#0ea5e9' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Lihat Jadwal</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Pelajaran</p>
            </div>
          </motion.button>

          {/* Rekap Hari Ini */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('laporan')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
              <BarChart3 size={16} style={{ color: '#7c3aed' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Rekap</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Hari Ini</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Live Session Shortcut */}
      {hasActiveSession && (
        <div className="px-4 pb-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onNavigate('presensi')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.2)' }}
            >
              <Activity size={18} style={{ color: '#22c55e' }} />
            </motion.div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-white">Pantau Presensi Live</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Lihat kehadiran siswa secara real-time</p>
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </motion.button>
        </div>
      )}

      {/* Stats Row */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Statistik Cepat
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sesi Hari Ini', value: activeSessions.length, color: '#FF6A00', icon: Radio },
            { label: 'Jadwal JP', value: sched ? `${sched.periodStart}–${sched.periodEnd}` : '—', color: '#0ea5e9', icon: Clock },
            { label: 'Siswa Risiko', value: riskCount, color: '#ef4444', icon: AlertCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl p-3 flex flex-col gap-1"
              style={{ background: `${color}0f`, border: `1px solid ${color}20` }}
            >
              <Icon size={14} style={{ color }} />
              <p className="text-lg font-black" style={{ color }}>{value}</p>
              <p className="text-[9px] font-black leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LMS Shortcut */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('lms')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: CARD, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,106,0,0.15)' }}>
            <BookOpen size={18} style={{ color: ORANGE }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-black text-white">Ruang Belajar Digital</p>
            <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>Kelola materi, tugas & kuis</p>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </motion.button>
      </div>

      {/* AI Shortcut */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('laporan')}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
            <Sparkles size={18} style={{ color: '#7c3aed' }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-black text-white">Analitik AI</p>
            <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>Insight pembelajaran & risiko siswa</p>
          </div>
          <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </motion.button>
      </div>
    </div>
  );
}
