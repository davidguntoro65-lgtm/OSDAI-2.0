import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Radio, Users, BarChart3, ShieldCheck, ChevronRight,
  Activity, Eye, AlertCircle, CheckCircle2, Zap,
} from 'lucide-react';

interface Props {
  authToken: string;
  user: any;
  onNavigate: (tab: string) => void;
}

const ORANGE = '#FF6A00';

export default function KepsekDashboard({ authToken, user, onNavigate }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [riskStudents, setRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes, riskRes] = await Promise.all([
          fetch('/api/intelligence/active-sessions', { headers }),
          fetch('/api/analytics/risk-students', { headers }),
        ]);
        if (sessRes.ok) setSessions(await sessRes.json());
        if (riskRes.ok) setRiskStudents(await riskRes.json());
      } catch { /* no-op */ }
      finally { setLoading(false); }
    };
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [authToken]);

  const totalHadir = sessions.reduce((s, sess) => s + (sess._count?.attendances || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1C100A' }}>

      {/* Live School Status Banner */}
      <div className="px-4 pt-3 pb-3">
        <motion.div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, #2A1708 100%)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute -top-6 -right-6 w-32 h-32 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(34,197,94,0.3)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-green-500"
                style={{ boxShadow: '0 0 6px rgba(34,197,94,0.7)' }}
              />
              <span className="text-[9px] font-black uppercase tracking-widest text-green-400">MONITORING LANGSUNG</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{sessions.length} Kelas Aktif</h2>
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {totalHadir} siswa hadir saat ini
            </p>
          </div>
        </motion.div>
      </div>

      {/* Quick Action Grid */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Aksi Cepat
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Monitor Kelas', sub: `${sessions.length} aktif`, icon: Eye, color: '#22c55e', action: () => onNavigate('monitoring') },
            { label: 'Guru Aktif', sub: `${sessions.length} mengajar`, icon: Users, color: '#0ea5e9', action: () => onNavigate('laporan') },
            { label: 'Statistik Sekolah', sub: 'Data real-time', icon: BarChart3, color: ORANGE, action: () => onNavigate('laporan') },
            { label: 'Audit Kehadiran', sub: `${riskStudents.length} siswa risiko`, icon: ShieldCheck, color: '#7c3aed', action: () => onNavigate('laporan') },
          ].map(({ label, sub, icon: Icon, color, action }) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.95 }}
              onClick={action}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl"
              style={{ background: `${color}10`, border: `1px solid ${color}20` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-white">{label}</p>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Active Sessions List */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Sesi Kelas Aktif
          </p>
          <button onClick={() => onNavigate('monitoring')} className="text-[9px] font-black uppercase tracking-widest" style={{ color: ORANGE }}>
            Lihat Semua
          </button>
        </div>

        {sessions.length === 0 ? (
          <div
            className="rounded-2xl px-5 py-6 text-center"
            style={{ background: '#2A1708', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Activity size={24} style={{ color: 'rgba(255,255,255,0.15)' }} className="mx-auto mb-2" />
            <p className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada kelas aktif</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 4).map((sess, i) => (
              <motion.button
                key={sess.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => onNavigate('monitoring')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                style={{ background: '#2A1708', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">
                    {sess.class?.name || '—'} · {sess.subject?.name || '—'}
                  </p>
                  <p className="text-[10px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {sess.teacher?.user?.name || '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black" style={{ color: '#22c55e' }}>
                    {sess._count?.attendances || 0}
                  </p>
                  <p className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>hadir</p>
                </div>
                <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Risk Students Alert */}
      {riskStudents.length > 0 && (
        <div className="px-4 pb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('laporan')}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-white">{riskStudents.length} Siswa Risiko Tinggi</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Butuh perhatian segera · Kehadiran rendah
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(239,68,68,0.5)' }} />
          </motion.button>
        </div>
      )}

      {/* Go to Full Control Room */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('monitoring')}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)', color: 'white' }}
        >
          <Zap size={16} />
          Buka Ruang Kendali Penuh
        </motion.button>
      </div>
    </div>
  );
}
