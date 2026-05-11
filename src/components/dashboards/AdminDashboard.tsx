import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, GraduationCap, DollarSign, Archive, FileText,
  BarChart3, ChevronRight, Plus, Radio, Calendar,
  BookOpen, Sparkles, Send,
} from 'lucide-react';

interface Props {
  authToken: string;
  user: any;
  role: string;
  onNavigate: (tab: string) => void;
}

const ORANGE = '#FF6A00';

export default function AdminDashboard({ authToken, user, role, onNavigate }: Props) {
  const [stats, setStats] = useState({ students: 0, teachers: 0 });
  const [loading, setLoading] = useState(true);
  const [annTitle, setAnnTitle] = useState('');
  const [annSending, setAnnSending] = useState(false);
  const [annSent, setAnnSent] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [stdRes, tchRes] = await Promise.all([
          fetch('/api/students?limit=1', { headers }),
          fetch('/api/teachers?limit=1', { headers }),
        ]);
        const stdData = stdRes.ok ? await stdRes.json() : { total: 0 };
        const tchData = tchRes.ok ? await tchRes.json() : { total: 0 };
        setStats({ students: stdData.total || 0, teachers: tchData.total || 0 });
      } catch { /* no-op */ }
      finally { setLoading(false); }
    };
    fetchStats();
  }, [authToken]);

  const sendAnnouncement = async () => {
    if (!annTitle.trim()) return;
    setAnnSending(true);
    try {
      await fetch('/api/announcements', {
        method: 'POST', headers,
        body: JSON.stringify({ title: annTitle, targets: ['Guru', 'Siswa', 'Admin'] }),
      });
      setAnnSent(true);
      setTimeout(() => { setAnnSent(false); setAnnTitle(''); }, 2500);
    } catch { /* no-op */ }
    finally { setAnnSending(false); }
  };

  // Role-based module tiles
  const isBendahara = role === 'BENDAHARA';
  const isBK = role === 'BK';

  const modules = [
    !isBendahara && !isBK && { label: 'Manajemen Siswa', sub: `${stats.students} siswa`, icon: Users, color: '#0ea5e9', tab: 'siswa' },
    !isBendahara && !isBK && { label: 'Manajemen Guru', sub: `${stats.teachers} guru`, icon: GraduationCap, color: ORANGE, tab: 'guru' },
    (role === 'BENDAHARA' || role === 'SUPER_ADMIN' || role === 'TU') && { label: 'Keuangan & SPP', sub: 'Tagihan & pembayaran', icon: DollarSign, color: '#10b981', tab: 'keuangan' },
    !isBK && { label: 'Jadwal Pelajaran', sub: 'Jadwal & ruangan', icon: Calendar, color: '#7c3aed', tab: 'jadwal' },
    (role === 'SUPER_ADMIN' || role === 'TU') && { label: 'Presensi Siswa', sub: 'Pantau kehadiran', icon: Radio, color: '#f59e0b', tab: 'presensi' },
    { label: 'Analitik AI', sub: 'Laporan & insight', icon: Sparkles, color: '#ec4899', tab: 'laporan' },
    (role === 'SUPER_ADMIN' || role === 'TU') && { label: 'Arsip Digital', sub: 'Dokumen sekolah', icon: Archive, color: '#64748b', tab: 'arsip' },
    (role === 'SUPER_ADMIN' || role === 'TU') && { label: 'Surat Digital', sub: 'Masuk & keluar', icon: FileText, color: '#14b8a6', tab: 'surat' },
    isBK && { label: 'Ruang Belajar', sub: 'LMS & materi', icon: BookOpen, color: '#10b981', tab: 'lms' },
  ].filter(Boolean) as { label: string; sub: string; icon: any; color: string; tab: string }[];

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#1C100A' }}>

      {/* Stats Banner */}
      <div className="px-4 pt-3 pb-3">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Siswa', value: loading ? '...' : stats.students, color: '#0ea5e9', icon: Users },
            { label: 'Total Guru', value: loading ? '...' : stats.teachers, color: ORANGE, icon: GraduationCap },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: `${color}0f`, border: `1px solid ${color}20` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Announcement */}
      {(role === 'SUPER_ADMIN' || role === 'TU' || role === 'KEPALA_SEKOLAH') && (
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl p-4"
            style={{ background: '#2A1708', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Send size={13} style={{ color: ORANGE }} />
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Kirim Pengumuman Cepat
              </p>
            </div>
            {annSent ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                  <span className="text-green-400 text-xs">✓</span>
                </div>
                <p className="text-sm font-black text-green-400">Pengumuman terkirim!</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="Tulis pengumuman..."
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold text-white placeholder:text-white/25 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={sendAnnouncement}
                  disabled={!annTitle.trim() || annSending}
                  className="px-4 py-2.5 rounded-xl font-black text-white text-xs transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: annTitle.trim() ? ORANGE : 'rgba(255,255,255,0.1)' }}
                >
                  {annSending ? '...' : 'Kirim'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Grid */}
      <div className="px-4 pb-4">
        <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Modul Sistem
        </p>
        <div className="grid grid-cols-2 gap-3">
          {modules.map(({ label, sub, icon: Icon, color, tab }, i) => (
            <motion.button
              key={tab + label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(tab)}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left"
              style={{ background: `${color}0e`, border: `1px solid ${color}1e` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div>
                <p className="text-xs font-black text-white">{label}</p>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick Nav to Full Modules */}
      {[
        { label: 'Laporan & Analitik AI', sub: 'Insight, prediksi, dan risiko siswa', icon: BarChart3, color: '#7c3aed', tab: 'laporan' },
      ].map(({ label, sub, icon: Icon, color, tab }) => (
        <div key={tab} className="px-4 pb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(tab)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl"
            style={{ background: `${color}0e`, border: `1px solid ${color}1e` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-white">{label}</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.button>
        </div>
      ))}
    </div>
  );
}
