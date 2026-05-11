import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, GraduationCap, Server, Activity, HardDrive, Radio,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, BrainCircuit,
  Zap, Database, Shield, ChevronRight, RefreshCcw, Globe,
  BarChart3, DollarSign, BookOpen, ArrowUpRight, ArrowDownRight,
  Cpu, Wifi, Package
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const C = {
  primary: '#FF6A00',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  textSub: '#374151',
};

const KpiCard = ({ label, value, sub, icon: Icon, color, trend, trendUp }: any) => (
  <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: trendUp ? '#10B981' : '#EF4444' }}>
          {trendUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {trend}
        </div>
      )}
    </div>
    <div>
      <div className="text-2xl font-black" style={{ color: C.text }}>{value}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: C.textMuted }}>{label}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{sub}</div>}
    </div>
  </div>
);

const SectionHeader = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-sm font-bold" style={{ color: C.text }}>{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
    </div>
    {action}
  </div>
);

const attendanceData = [
  { name: 'Sen', hadir: 85, alfa: 12, terlambat: 8 },
  { name: 'Sel', hadir: 78, alfa: 15, terlambat: 11 },
  { name: 'Rab', hadir: 90, alfa: 8, terlambat: 6 },
  { name: 'Kam', hadir: 82, alfa: 10, terlambat: 9 },
  { name: 'Jum', hadir: 75, alfa: 18, terlambat: 14 },
];

const moduleQuickAccess = [
  { id: 'siswa', label: 'Data Siswa', icon: Users, color: '#0ea5e9', desc: 'CRUD Siswa' },
  { id: 'guru', label: 'Data Guru', icon: GraduationCap, color: C.primary, desc: 'CRUD Guru' },
  { id: 'penjadwalan', label: 'Penjadwalan', icon: BarChart3, color: '#7c3aed', desc: 'Jadwal Kelas' },
  { id: 'ai-analytics', label: 'Analitik AI', icon: BrainCircuit, color: '#ec4899', desc: 'AI Insights' },
  { id: 'keuangan', label: 'Keuangan', icon: DollarSign, color: '#10B981', desc: 'SPP & Finance' },
  { id: 'arsip-digital', label: 'Arsip', icon: Database, color: '#64748b', desc: 'Dokumen' },
  { id: 'audit-log', label: 'Audit Log', icon: Shield, color: '#f59e0b', desc: 'Keamanan' },
  { id: 'server-monitor', label: 'Server', icon: Server, color: '#6366f1', desc: 'Monitoring' },
];

export default function AdminDashboardHome({ authToken, user, onNavigate }: { authToken: string; user: any; onNavigate: (m: any) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [riskStudents, setRiskStudents] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, riskRes, sessRes, secRes] = await Promise.allSettled([
        fetch('/api/analytics/overall-stats', { headers }),
        fetch('/api/analytics/risk-students', { headers }),
        fetch('/api/intelligence/semua-sesi-aktif', { headers }),
        fetch('/api/auth/security-logs?limit=5', { headers }),
      ]);
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) setStats(await statsRes.value.json());
      if (riskRes.status === 'fulfilled' && riskRes.value.ok) setRiskStudents(await riskRes.value.json());
      if (sessRes.status === 'fulfilled' && sessRes.value.ok) setActiveSessions(await sessRes.value.json());
      if (secRes.status === 'fulfilled' && secRes.value.ok) setSecurityLogs(await secRes.value.json());
    } catch { /* no-op */ }
    finally { setLoading(false); setLastRefresh(new Date()); }
  };

  useEffect(() => { fetchData(); }, [authToken]);

  const Skeleton = () => <div className="h-7 w-16 rounded animate-pulse" style={{ background: '#E5E7EB' }} />;

  return (
    <div className="p-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Selamat datang, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all hover:bg-gray-50"
          style={{ borderColor: C.border, color: C.textMuted }}
        >
          <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Siswa" value={loading ? '...' : stats?.studentCount ?? 0} icon={Users} color="#0ea5e9" trend="+12%" trendUp />
        <KpiCard label="Total Guru" value={loading ? '...' : stats?.teacherCount ?? 0} icon={GraduationCap} color={C.primary} trend="+2%" trendUp />
        <KpiCard label="Kelas Aktif" value={loading ? '...' : stats?.activeClasses ?? 0} icon={BookOpen} color="#7c3aed" sub="Semester ini" />
        <KpiCard label="Sesi Aktif" value={loading ? '...' : activeSessions.length} icon={Radio} color="#10B981" sub="Sedang berlangsung" />
        <KpiCard label="Siswa Berisiko" value={loading ? '...' : riskStudents.length} icon={AlertTriangle} color="#F59E0B" sub="Perlu perhatian" />
        <KpiCard label="Server Health" value="99.8%" icon={Server} color="#6366f1" sub="Uptime 30 hari" trend="+0.1%" trendUp />
      </div>

      {/* Quick Module Access */}
      <div>
        <SectionHeader title="Akses Cepat Modul" sub="Navigasi langsung ke modul yang tersedia" />
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {moduleQuickAccess.map(m => {
            const Icon = m.icon;
            return (
              <motion.button
                key={m.id}
                whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(m.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance chart */}
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <SectionHeader title="Kehadiran Minggu Ini" sub="Rekap harian" action={
            <button onClick={() => onNavigate('ai-analytics')} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: C.primary }}>
              Detail <ChevronRight size={11} />
            </button>
          } />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={attendanceData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${C.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="hadir" fill="#10B981" radius={[3, 3, 0, 0]} name="Hadir" />
              <Bar dataKey="terlambat" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Terlambat" />
              <Bar dataKey="alfa" fill="#EF4444" radius={[3, 3, 0, 0]} name="Alfa" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            {[{ c: '#10B981', l: 'Hadir' }, { c: '#F59E0B', l: 'Terlambat' }, { c: '#EF4444', l: 'Alfa' }].map(b => (
              <div key={b.l} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: b.c }} />
                <span className="text-[10px] font-semibold" style={{ color: C.textMuted }}>{b.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <SectionHeader title="Status Sistem" />
          <div className="space-y-3">
            {[
              { label: 'Web Server', status: 'online', latency: '12ms', icon: Globe, color: '#10B981' },
              { label: 'Database', status: 'online', latency: '8ms', icon: Database, color: '#10B981' },
              { label: 'AI Engine', status: 'online', latency: '340ms', icon: Cpu, color: '#10B981' },
              { label: 'WebSocket', status: 'online', latency: '2ms', icon: Wifi, color: '#10B981' },
              { label: 'Storage', status: 'online', latency: '—', icon: HardDrive, color: '#10B981' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}12` }}>
                    <Icon size={13} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: C.text }}>{s.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: C.textMuted }}>{s.latency}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Sessions */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <SectionHeader
            title="Sesi Kelas Aktif"
            sub={`${activeSessions.length} sesi berlangsung`}
            action={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#15803D' }}>
                LIVE
              </span>
            }
          />
          {activeSessions.length === 0 ? (
            <div className="flex flex-col items-center py-8" style={{ color: C.textMuted }}>
              <Radio size={28} style={{ opacity: 0.3 }} />
              <p className="text-xs mt-2">Tidak ada sesi aktif saat ini</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSessions.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: C.bg }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" style={{ boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{s.mapel} — {s.kelas}</p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>{s.guru} · {s.hadir} hadir, {s.alfa} alfa</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk Students */}
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <SectionHeader
            title="Siswa Perlu Perhatian"
            sub="Berdasarkan kehadiran & nilai"
            action={
              <button onClick={() => onNavigate('ai-analytics')} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: C.primary }}>
                Lihat Semua <ChevronRight size={11} />
              </button>
            }
          />
          {riskStudents.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle2 size={28} style={{ color: '#10B981', opacity: 0.6 }} />
              <p className="text-xs mt-2" style={{ color: C.textMuted }}>Tidak ada siswa berisiko</p>
            </div>
          ) : (
            <div className="space-y-2">
              {riskStudents.slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: C.bg }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs text-white" style={{ background: s.riskScore > 60 ? '#EF4444' : '#F59E0B' }}>
                    {s.riskScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{s.name}</p>
                    <p className="text-[10px]" style={{ color: C.textMuted }}>{s.class} · Kehadiran: {s.attendanceRate?.toFixed(0)}%</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{
                    background: s.status === 'HIGH RISK' ? '#FEF2F2' : '#FFFBEB',
                    color: s.status === 'HIGH RISK' ? '#EF4444' : '#D97706'
                  }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
