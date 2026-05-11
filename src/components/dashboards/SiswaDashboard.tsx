import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio, Calendar, BookOpen, Clock, ChevronRight,
  CheckCircle2, AlertCircle, ClipboardList, Zap,
} from 'lucide-react';

interface Props {
  authToken: string;
  user: any;
  onNavigate: (tab: string) => void;
}

const ORANGE = '#FF6A00';

export default function SiswaDashboard({ authToken, user, onNavigate }: Props) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, histRes] = await Promise.all([
        fetch('/api/intelligence/student/active-session', { headers }),
        fetch('/api/intelligence/student/history?limit=3', { headers }),
      ]);
      if (sessRes.ok) { const d = await sessRes.json(); setActiveSession(d); }
      if (histRes.ok) setHistory(await histRes.json());
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [authToken]);

  const today = new Date();
  const timeStr = today.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const statusColor: Record<string, string> = {
    HADIR: '#22c55e', TERLAMBAT: '#f59e0b', ALFA: '#64748b', INVALID: '#ef4444',
  };
  const statusLabel: Record<string, string> = {
    HADIR: 'Hadir', TERLAMBAT: 'Terlambat', ALFA: 'Alfa', INVALID: 'Pending',
  };

  // Attendance rate from history
  const hadirCount = history.filter(h => h.attendanceStatus === 'HADIR').length;
  const rate = history.length > 0 ? Math.round((hadirCount / history.length) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1C100A' }}>

      {/* Date & Time */}
      <div className="px-4 pt-3 pb-3">
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(255,106,0,0.07)', border: '1px solid rgba(255,106,0,0.14)' }}
        >
          <div>
            <p className="text-xs font-black text-white">{dateStr}</p>
            <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>SMK Negeri 1 Wonogiri</p>
          </div>
          <div className="text-2xl font-black" style={{ color: ORANGE }}>{timeStr}</div>
        </div>
      </div>

      {/* Presensi Status Card */}
      <div className="px-4 pb-4">
        <motion.div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{
            background: activeSession
              ? 'linear-gradient(135deg, rgba(255,106,0,0.15) 0%, #2A1708 100%)'
              : 'linear-gradient(135deg, #2A1708 0%, #1C100A 100%)',
            border: activeSession ? '1px solid rgba(255,106,0,0.3)' : '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {activeSession && (
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-6 -right-6 w-28 h-28 rounded-full blur-2xl"
              style={{ background: 'rgba(255,106,0,0.3)' }}
            />
          )}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={activeSession ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-2 h-2 rounded-full"
                style={{ background: activeSession ? ORANGE : 'rgba(255,255,255,0.2)' }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: activeSession ? ORANGE : 'rgba(255,255,255,0.3)' }}
              >
                {activeSession ? 'SINYAL TERSEDIA' : 'TIDAK ADA SINYAL'}
              </span>
            </div>

            {activeSession ? (
              <>
                <h2 className="text-xl font-black text-white mb-1">
                  {activeSession.subject?.name || 'Sesi Aktif'}
                </h2>
                <p className="text-sm font-bold mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {activeSession.class?.name} · {activeSession.teacher?.user?.name || 'Guru'}
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('presensi')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
                  style={{ background: ORANGE, color: 'white' }}
                  animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 20px rgba(255,106,0,0.6)', '0 0 0px rgba(255,106,0,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Radio size={16} />
                  RESPON PRESENSI
                </motion.button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-black text-white mb-1">Status Presensi</h2>
                <p className="text-sm font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Belum ada sinyal aktif dari guru.
                </p>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,106,0,0.6)' }}>
                  Notifikasi akan muncul saat guru membuka sesi.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Aksi Cepat
        </p>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('presensi')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Radio size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Respon</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>Presensi</p>
            </div>
          </motion.button>

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
              <p className="text-xs font-black text-white">Jadwal</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Hari Ini</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('laporan')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
              <ClipboardList size={16} style={{ color: '#7c3aed' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Riwayat</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Kehadiran</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('lms')}
            className="flex flex-col items-start gap-2 p-4 rounded-2xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
              <BookOpen size={16} style={{ color: '#10b981' }} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-white">Tugas</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Aktif</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Ringkasan Kehadiran
        </p>
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: '#2A1708', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Circular progress */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg width="64" height="64" className="-rotate-90 absolute inset-0">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <motion.circle
                cx="32" cy="32" r="26" fill="none" stroke={ORANGE} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 26}
                initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - rate / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,106,0,0.5))' }}
              />
            </svg>
            <span className="text-sm font-black text-white relative z-10">{rate}%</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-white mb-1">Tingkat Kehadiran</p>
            <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {hadirCount}/{history.length} sesi hadir
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Hadir', count: hadirCount, color: '#22c55e' },
                { label: 'Terlambat', count: history.filter(h => h.attendanceStatus === 'TERLAMBAT').length, color: '#f59e0b' },
                { label: 'Alfa', count: history.filter(h => h.attendanceStatus === 'ALFA').length, color: '#64748b' },
              ].map(({ label, count, color }) => (
                <div key={label} className="text-center">
                  <p className="text-sm font-black" style={{ color }}>{count}</p>
                  <p className="text-[8px] font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent History */}
      {history.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Riwayat Terbaru
            </p>
            <button
              onClick={() => onNavigate('laporan')}
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: ORANGE }}
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((item, i) => {
              const color = statusColor[item.attendanceStatus] || '#64748b';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: '#2A1708', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">
                      {item.session?.subject?.name || '—'}
                    </p>
                    <p className="text-[10px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      {' · '}{item.session?.class?.name}
                    </p>
                  </div>
                  <span className="text-[9px] font-black px-2 py-1 rounded-full" style={{ background: `${color}18`, color }}>
                    {statusLabel[item.attendanceStatus] || item.attendanceStatus}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
