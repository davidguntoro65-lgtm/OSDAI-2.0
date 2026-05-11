import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar, Radio, BookOpen, Users, BarChart3, Award,
  Clock, CheckCircle2, AlertTriangle, BrainCircuit,
  ArrowRight, Activity, TrendingUp, RefreshCcw, Zap,
  FileText, MessageSquare, ChevronRight
} from 'lucide-react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

const KpiCard = ({ label, value, icon: Icon, color, sub }: any) => (
  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}14` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <div className="text-2xl font-black" style={{ color: C.text }}>{value}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: C.textMuted }}>{label}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{sub}</div>}
    </div>
  </div>
);

const quickModules = [
  { id: 'jadwal-mengajar', label: 'Jadwal Mengajar', icon: Calendar, color: '#0ea5e9', desc: 'Lihat jadwal hari ini' },
  { id: 'presensi-kelas', label: 'Presensi Kelas', icon: Radio, color: C.primary, desc: 'Buka sesi presensi' },
  { id: 'penilaian', label: 'Input Nilai', icon: Award, color: '#7c3aed', desc: 'Nilai siswa' },
  { id: 'materi', label: 'Upload Materi', icon: FileText, color: '#10B981', desc: 'LMS & tugas' },
  { id: 'rekap-kehadiran', label: 'Rekap Kehadiran', icon: BarChart3, color: '#F59E0B', desc: 'Laporan presensi' },
  { id: 'komunikasi', label: 'Komunikasi', icon: MessageSquare, color: '#ec4899', desc: 'Pesan siswa/wali' },
];

export default function GuruDashboardHome({ authToken, user, onNavigate }: { authToken: string; user: any; onNavigate: (m: any) => void }) {
  const [schedule, setSchedule] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => { fetchData(); }, [authToken]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, sessRes, courseRes] = await Promise.allSettled([
        fetch('/api/intelligence/today-schedule', { headers }),
        fetch('/api/intelligence/my-sessions', { headers }),
        fetch('/api/lms/courses', { headers }),
      ]);
      if (schedRes.status === 'fulfilled' && schedRes.value.ok) setSchedule(await schedRes.value.json());
      if (sessRes.status === 'fulfilled' && sessRes.value.ok) setActiveSessions(await sessRes.value.json());
      if (courseRes.status === 'fulfilled' && courseRes.value.ok) setCourses(await courseRes.value.json());
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  const todaySchedule = schedule?.schedule;
  const dayNames = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Selamat datang, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {schedule?.currentPeriod && ` · Jam ke-${schedule.currentPeriod}`}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-all" style={{ borderColor: C.border, color: C.textMuted }}>
          <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Kelas Diampu" value={courses.length} icon={BookOpen} color={C.primary} sub="Semester ini" />
        <KpiCard label="Sesi Aktif" value={activeSessions.length} icon={Radio} color="#10B981" sub="Sedang berlangsung" />
        <KpiCard label="Jam Pelajaran" value={schedule?.currentPeriod || '—'} icon={Clock} color="#0ea5e9" sub="Jam saat ini" />
        <KpiCard label="Status" value="Aktif" icon={CheckCircle2} color="#10B981" sub="Terdaftar guru" />
      </div>

      {/* Today's schedule + quick access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Schedule now */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: C.text }}>Jadwal Sekarang</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFF4ED', color: C.primary }}>
              {dayNames[schedule?.day || 0] || 'Hari ini'}
            </span>
          </div>

          {!todaySchedule ? (
            <div className="flex flex-col items-center py-6">
              <Calendar size={32} style={{ color: C.textMuted, opacity: 0.3 }} />
              <p className="text-xs mt-2 text-center" style={{ color: C.textMuted }}>Tidak ada jadwal mengajar aktif saat ini</p>
              <button onClick={() => onNavigate('jadwal-mengajar')} className="mt-3 text-[11px] font-semibold" style={{ color: C.primary }}>
                Lihat semua jadwal →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)', color: 'white' }}>
                <p className="text-xs font-bold opacity-80">Jam {todaySchedule.periodStart}–{todaySchedule.periodEnd} · {schedule?.periodTime}</p>
                <p className="text-base font-black mt-1">{todaySchedule.subject?.name}</p>
                <p className="text-xs font-semibold opacity-90 mt-0.5">{todaySchedule.class?.name}</p>
              </div>
              <button
                onClick={() => onNavigate('presensi-kelas')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: '#10B981' }}
              >
                <Radio size={13} /> Buka Presensi Kelas
              </button>
            </div>
          )}
        </div>

        {/* Quick access */}
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Akses Cepat</p>
          <div className="grid grid-cols-3 gap-3">
            {quickModules.map(m => {
              const Icon = m.icon;
              return (
                <motion.button
                  key={m.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onNavigate(m.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                  style={{ background: C.bg, border: `1px solid ${C.border}` }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14` }}>
                    <Icon size={17} style={{ color: m.color }} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold" style={{ color: C.text }}>{m.label}</p>
                    <p className="text-[9px]" style={{ color: C.textMuted }}>{m.desc}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Courses & Active Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My courses */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: C.text }}>Kelas Diampu</p>
            <button onClick={() => onNavigate('lms')} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: C.primary }}>
              Kelola LMS <ChevronRight size={11} />
            </button>
          </div>
          {courses.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <BookOpen size={28} style={{ color: C.textMuted, opacity: 0.3 }} />
              <p className="text-xs mt-2" style={{ color: C.textMuted }}>Belum ada kelas terdaftar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: C.bg }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)' }}>
                    {c.subject?.name?.[0] || 'K'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{c.subject?.name}</p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>{c.class?.name}</p>
                  </div>
                  <button onClick={() => onNavigate('lms')} className="text-[10px] font-semibold" style={{ color: C.primary }}>Buka</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active sessions */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: C.text }}>Sesi Presensi Saya</p>
            {activeSessions.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#15803D' }}>LIVE</span>
            )}
          </div>
          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Radio size={28} style={{ color: C.textMuted, opacity: 0.3 }} />
              <p className="text-xs mt-2 text-center" style={{ color: C.textMuted }}>Tidak ada sesi aktif.<br />Buka presensi untuk memulai.</p>
              <button
                onClick={() => onNavigate('presensi-kelas')}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: C.primary }}
              >
                <Radio size={11} /> Mulai Presensi
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.map(s => (
                <div key={s.id} className="p-3 rounded-xl border" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 0 3px rgba(34,197,94,0.3)' }} />
                    <p className="text-xs font-bold" style={{ color: '#15803D' }}>Sesi Aktif</p>
                  </div>
                  <p className="text-sm font-black" style={{ color: C.text }}>{s.subject?.name}</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{s.class?.name}</p>
                  <button
                    onClick={() => onNavigate('presensi-kelas')}
                    className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: '#10B981' }}
                  >
                    Kelola Presensi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
