import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  GraduationCap,
  DollarSign,
  BarChart3,
  ShieldCheck,
  BrainCircuit,
  Loader2,
  Lock,
  LogOut,
  Briefcase,
  FileText,
  Archive,
  Zap,
  School,
  BookOpen,
  Radio,
  ChevronRight,
  Sparkles,
  Navigation,
  Activity,
  Eye,
  Send,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import NeuralBackground from '@/components/NeuralBackground';

import StudentModule from '@/components/StudentModule';
import TeacherModule from '@/components/TeacherModule';
import MobileStudentPresensi from '@/components/MobileStudentPresensi';
import MobileGuruPresensi from '@/components/MobileGuruPresensi';
import AcademicModule from '@/components/AcademicModule';
import TimetableModule from '@/components/TimetableModule';
import FinanceModule from '@/components/FinanceModule';
import LMSModule from '@/components/LMSModule';
import AIAnalyticsModule from '@/components/AIAnalyticsModule';
import PusatMonitoringKepsek from '@/components/PusatMonitoringKepsek';

// OSDAI Logo / Branding Icon
const OsdaiIcon = ({ size = 24 }: { size?: number }) => (
  <div className="relative flex items-center justify-center">
    <BrainCircuit size={size} className="text-white" />
    <motion.div
      animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-300 rounded-full blur-[1px]"
    />
  </div>
);

// Role label mapping
const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  TU: 'Tata Usaha',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  BK: 'Bimbingan Konseling',
  BENDAHARA: 'Bendahara',
};

// Navigation items per role
const getNavItems = (role: string) => {
  const all = [
    { id: 'beranda',     label: 'Beranda Sistem',          icon: BarChart3,      roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH'] },
    { id: 'monitoring',  label: 'Ruang Kendali',           icon: Eye,            roles: ['KEPALA_SEKOLAH', 'SUPER_ADMIN'] },
    { id: 'presensi',    label: 'Sistem Presensi Cerdas',  icon: Radio,          roles: ['GURU', 'SISWA', 'SUPER_ADMIN', 'TU'] },
    { id: 'siswa',       label: 'Manajemen Siswa',         icon: Users,          roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH'] },
    { id: 'guru',        label: 'Manajemen Guru',          icon: BookOpen,       roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH'] },
    { id: 'keuangan',    label: 'Keuangan & SPP',          icon: DollarSign,     roles: ['SUPER_ADMIN', 'TU', 'BENDAHARA'] },
    { id: 'jadwal',      label: 'Jadwal Pelajaran',        icon: GraduationCap,  roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH', 'GURU'] },
    { id: 'arsip',       label: 'Arsip Digital',           icon: Archive,        roles: ['SUPER_ADMIN', 'TU'] },
    { id: 'surat',       label: 'Pusat Surat Digital',     icon: FileText,       roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH'] },
    { id: 'analitik',   label: 'Analitik Pembelajaran',   icon: Sparkles,       roles: ['SUPER_ADMIN', 'KEPALA_SEKOLAH', 'BK'] },
  ];
  return all.filter(item => item.roles.includes(role));
};

// Default tab per role
const defaultTab = (role: string) => {
  if (role === 'SISWA') return 'presensi';
  if (role === 'GURU') return 'presensi';
  if (role === 'KEPALA_SEKOLAH') return 'monitoring';
  return 'beranda';
};

export default function App() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (token) checkAuth();
    else setAuthLoading(false);
  }, [token]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setActiveTab(defaultTab(userData.role));
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        setActiveTab(defaultTab(data.user.role));
      } else {
        setLoginError(data.error || 'Email atau kata sandi tidak valid.');
      }
    } catch {
      setLoginError('Gagal terhubung ke server. Periksa koneksi Anda.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setActiveTab('beranda');
  };

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!token || authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <NeuralBackground />

        {/* Floating top badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-full shadow-sm"
        >
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-green-500"
          />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">
            SMK Negeri 1 Wonogiri · Sistem Online
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <GlassPanel className="overflow-hidden bg-white/45 border-white/60 shadow-2xl">
            {/* Brand Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white text-center relative overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(255,106,0,0.3),transparent_70%)]" />
              {/* Neural grid lines */}
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                  backgroundSize: '32px 32px'
                }}
              />

              <div className="relative z-10">
                <motion.div
                  animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.5)', '0 0 30px rgba(255,106,0,0.8)', '0 0 0px rgba(255,106,0,0.5)'] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl"
                >
                  <OsdaiIcon size={30} />
                </motion.div>
                <h1 className="text-3xl font-black tracking-tight mb-1">OSDAI</h1>
                <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] leading-relaxed">
                  Otomatisasi Sekolah Digital<br />Berbasis Artificial Intelligent
                </p>
              </div>
            </div>

            <CardContent className="p-10">
              <p className="text-center text-xs font-bold text-slate-500 mb-8 leading-relaxed">
                Sistem Operasional Sekolah Berbasis<br />Kecerdasan Buatan
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">
                    Alamat Surel
                  </label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="nama@smk.id"
                    autoComplete="username"
                    required
                    className="h-14 rounded-2xl border-white/30 bg-white/30 backdrop-blur-md font-bold text-slate-800 placeholder:text-slate-400 focus:border-orange-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">
                    Kata Sandi
                  </label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="h-14 rounded-2xl border-white/30 bg-white/30 backdrop-blur-md font-bold text-slate-800 placeholder:text-slate-400 focus:border-orange-300"
                  />
                </div>

                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center"
                    >
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm font-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-60"
                >
                  {authLoading ? (
                    <><Loader2 size={18} className="animate-spin mr-2" /> Memverifikasi...</>
                  ) : (
                    <><Lock size={16} className="mr-2" /> MASUK KE SISTEM</>
                  )}
                </Button>
              </form>

              <p className="text-center text-[10px] font-black text-slate-400 mt-8 uppercase tracking-widest">
                OSDAI · SMK Negeri 1 Wonogiri
              </p>
            </CardContent>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────────────────────
  const navItems = getNavItems(user?.role || 'GURU');
  const initials = (user?.name || 'U').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen p-4 lg:p-8 flex flex-col lg:flex-row gap-5 relative overflow-hidden h-screen overflow-y-auto">
      <NeuralBackground />

      {/* ── LEFT SIDEBAR ── */}
      <div className="lg:w-[280px] xl:w-[300px] flex flex-col gap-5 shrink-0 h-full">
        <GlassPanel className="flex-1 flex flex-col p-6 overflow-hidden">

          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-8 px-1">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.3)', '0 0 16px rgba(255,106,0,0.7)', '0 0 0px rgba(255,106,0,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            >
              <OsdaiIcon size={22} />
            </motion.div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 leading-tight">OSDAI</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                />
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 truncate">Sistem Aktif</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-[18px] transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-500 hover:bg-white/50 hover:text-slate-800'
                  }`}
                >
                  <div className={`shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-orange-400 transition-colors'}`}>
                    <item.icon size={17} />
                  </div>
                  <span className="text-[11px] font-black tracking-tight flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="text-white/40 shrink-0" />}
                </motion.button>
              );
            })}
          </nav>

          {/* GPS Status */}
          <div className="mt-6 p-4 bg-white/30 rounded-[20px] border border-white/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inti Neural OSDAI</p>
            </div>
            <div className="flex items-center gap-2">
              <Navigation size={13} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-700">Integritas GPS Aktif</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <ShieldCheck size={13} className="text-green-500" />
              <span className="text-[10px] font-black text-slate-700">Audit Log Berjalan</span>
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{user?.name || '—'}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                  {roleLabel[user?.role] || user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Keluar dari Sistem"
            >
              <LogOut size={15} />
            </button>
          </div>
        </GlassPanel>
      </div>

      {/* ── CENTER MAIN PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <GlassPanel className="flex flex-col h-full bg-white/25 overflow-hidden">

          {/* Top Header */}
          <header className="flex items-center justify-between mb-8 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                  {navItems.find(n => n.id === activeTab)?.label || 'Beranda Sistem'}
                </h1>
                {activeTab === 'monitoring' && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Live</span>
                  </motion.div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400">
                OSDAI · Otomatisasi Sekolah Digital Berbasis Artificial Intelligent
              </p>
            </div>

            {/* School info badge */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/40 border border-white/60 rounded-2xl">
              <School size={14} className="text-orange-500" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">SMK Negeri 1 Wonogiri</span>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {activeTab === 'beranda' && (
                  <div className="space-y-8 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <GlassPanel
                        hoverScale
                        className="bg-white/40 border-white/60 p-8 cursor-pointer group"
                        onClick={() => setActiveTab('siswa')}
                      >
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                          <Users className="text-blue-500" size={24} />
                        </div>
                        <h3 className="text-xl font-black mb-2 text-slate-900">Manajemen Siswa</h3>
                        <p className="text-sm font-bold text-slate-400">Registri data NISN/NIS, riwayat akademik, dan rekap kehadiran.</p>
                        <div className="mt-5 flex items-center gap-1.5 text-orange-500">
                          <span className="text-[10px] font-black uppercase tracking-widest">Buka Modul</span>
                          <ChevronRight size={12} />
                        </div>
                      </GlassPanel>

                      <GlassPanel
                        hoverScale
                        className="bg-white/40 border-white/60 p-8 cursor-pointer group"
                        onClick={() => setActiveTab('guru')}
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-5">
                          <BookOpen className="text-orange-500" size={24} />
                        </div>
                        <h3 className="text-xl font-black mb-2 text-slate-900">Manajemen Guru</h3>
                        <p className="text-sm font-bold text-slate-400">Database profesional pendidik, jam mengajar, dan sertifikasi.</p>
                        <div className="mt-5 flex items-center gap-1.5 text-orange-500">
                          <span className="text-[10px] font-black uppercase tracking-widest">Buka Modul</span>
                          <ChevronRight size={12} />
                        </div>
                      </GlassPanel>
                    </div>

                    <AIAnalyticsModule authToken={token!} />
                  </div>
                )}

                {activeTab === 'monitoring' && (
                  <PusatMonitoringKepsek authToken={token!} />
                )}

                {activeTab === 'presensi' && (
                  user?.role === Role.SISWA
                    ? <MobileStudentPresensi authToken={token!} user={user} />
                    : <MobileGuruPresensi authToken={token!} user={user} />
                )}

                {activeTab === 'siswa' && <StudentModule authToken={token!} />}
                {activeTab === 'guru' && <TeacherModule authToken={token!} />}
                {activeTab === 'keuangan' && <FinanceModule authToken={token!} userRole={user?.role} />}
                {activeTab === 'jadwal' && <TimetableModule authToken={token!} />}
                {activeTab === 'analitik' && <AIAnalyticsModule authToken={token!} />}

                {activeTab === 'arsip' && (
                  <div className="space-y-6 pb-20">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-900">Arsip Digital</h2>
                      <Button className="rounded-2xl bg-orange-500 text-white px-6 font-black h-12 shadow-lg shadow-orange-900/20">
                        + Unggah Arsip
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {['Arsip Ijazah', 'SK Pegawai', 'Sertifikat Siswa'].map(t => (
                        <GlassPanel key={t} className="bg-white/40 p-8 text-center border-dashed border-2 border-white/50">
                          <Archive className="mx-auto mb-4 text-slate-300" size={32} />
                          <p className="font-black text-slate-600">{t}</p>
                          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Kosong</p>
                        </GlassPanel>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'surat' && (
                  <div className="space-y-6 pb-20">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-900">Pusat Surat Digital</h2>
                      <Button className="rounded-2xl bg-black text-white px-6 font-black h-12">+ Buat Surat</Button>
                    </div>
                    <GlassPanel className="bg-white/40 p-20 text-center">
                      <FileText size={40} className="text-slate-200 mx-auto mb-4" />
                      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Tidak ada surat tersimpan</p>
                    </GlassPanel>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </GlassPanel>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-5 h-full">

        {/* Pengumuman */}
        <GlassPanel className="bg-white/20 border-white/40 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-orange-400 rounded-full blur-[80px] opacity-15 pointer-events-none" />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 flex items-center justify-center mb-8"
          >
            <div className="w-36 h-36 bg-white/20 backdrop-blur-3xl rounded-[32px] border border-white/50 rotate-12 flex items-center justify-center shadow-2xl">
              <Zap size={56} className="text-[#FF6A00] drop-shadow-[0_0_12px_rgba(255,106,0,0.5)]" />
            </div>
          </motion.div>

          <div className="space-y-5 relative z-10">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">KOMUNIKASI SEKOLAH</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Kirim Pengumuman</h2>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
              Buat dan siarkan pengumuman secara instan ke seluruh sivitas sekolah.
            </p>
            <div className="space-y-3 pt-2">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Judul Pengumuman</p>
                <Input
                  placeholder="Tulis judul di sini..."
                  className="h-12 rounded-2xl bg-white/40 border-white/60 font-bold placeholder:text-slate-400 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Admin', 'Waka', 'Guru', 'Siswa'].map(r => (
                  <button
                    key={r}
                    className="px-4 py-1.5 rounded-full border border-white/60 bg-white/20 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white transition-all duration-200"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Button className="w-full h-13 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 shadow-xl mt-3">
                <Send size={15} /> SIARAN KE SEMUA
              </Button>
            </div>
          </div>
        </GlassPanel>

        {/* Quick Tools */}
        <GlassPanel className="bg-white/15 border-white/20 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Akses Cepat</span>
            </div>
            <button className="text-slate-400"><MoreHorizontal size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Cek GPS', icon: Navigation },
              { label: 'Cetak QR', icon: ShieldCheck },
              { label: 'Laporan Hari Ini', icon: BarChart3 },
              { label: 'Audit Log', icon: Activity },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="p-4 rounded-[20px] bg-white/30 border border-white/50 text-[10px] font-black text-slate-600 hover:bg-[#FF6A00] hover:text-white hover:border-[#FF6A00] transition-all duration-200 flex flex-col items-center gap-2"
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
