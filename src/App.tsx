import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { useTheme, type Theme } from '@/lib/ThemeContext';
import { motion, AnimatePresence, useTime, useTransform } from 'motion/react';
import { BrainCircuit, Lock, Loader2, Sun, Moon } from 'lucide-react';
import DemoBanner from '@/components/DemoBanner';
import ForgotPasswordScreen from '@/components/ForgotPasswordScreen';
import LandingPage from '@/components/LandingPage';
import ModeSelector from '@/components/enterprise/ModeSelector';
import AdminEnterprise from '@/components/enterprise/AdminEnterprise';
import GuruEnterprise from '@/components/enterprise/GuruEnterprise';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { GlassPanel } from '@/components/ui/GlassPanel';
import NeuralBackground from '@/components/NeuralBackground';

import MobileBottomNav, { MobileTab } from '@/components/MobileBottomNav';
import MobileHeader from '@/components/MobileHeader';
import AkunScreen from '@/components/AkunScreen';
import GuruDashboard from '@/components/dashboards/GuruDashboard';
import SiswaDashboard from '@/components/dashboards/SiswaDashboard';
import KepsekDashboard from '@/components/dashboards/KepsekDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import LaporanScreen from '@/components/LaporanScreen';
import JadwalScreen from '@/components/JadwalScreen';

import MobileStudentPresensi from '@/components/MobileStudentPresensi';
import MobileGuruPresensi from '@/components/MobileGuruPresensi';
import PusatMonitoringKepsek from '@/components/PusatMonitoringKepsek';
import StudentModule from '@/components/StudentModule';
import TeacherModule from '@/components/TeacherModule';
import FinanceModule from '@/components/FinanceModule';
import ArchiveModule from '@/components/ArchiveModule';
import SuratModule from '@/components/SuratModule';
import AIAnalyticsModule from '@/components/AIAnalyticsModule';
import LMSModule from '@/components/LMSModule';

// ── Helpers ────────────────────────────────────────────────────────────────────

// Futuristic AI logo mark — orbiting rings + neural core
const OsdaiLogoMark = () => {
  const time = useTime();
  const rotate1 = useTransform(time, t => (t / 3000) * 360);
  const rotate2 = useTransform(time, t => -(t / 4500) * 360);
  const rotate3 = useTransform(time, t => (t / 7000) * 360);
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Outer orbit ring */}
      <motion.div style={{ rotate: rotate1 }} className="absolute inset-0">
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,106,0,0.25)" strokeWidth="0.8" strokeDasharray="4 3" />
          <circle cx="24" cy="2" r="2.5" fill="#FF6A00" />
        </svg>
      </motion.div>
      {/* Mid orbit ring */}
      <motion.div style={{ rotate: rotate2 }} className="absolute inset-[5px]">
        <svg viewBox="0 0 38 38" className="w-full h-full">
          <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(255,106,0,0.18)" strokeWidth="0.7" strokeDasharray="2 4" />
          <circle cx="19" cy="2" r="1.8" fill="rgba(255,180,60,0.9)" />
          <circle cx="19" cy="36" r="1.8" fill="rgba(255,180,60,0.9)" />
        </svg>
      </motion.div>
      {/* Inner slow ring */}
      <motion.div style={{ rotate: rotate3 }} className="absolute inset-[10px]">
        <svg viewBox="0 0 28 28" className="w-full h-full">
          <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,106,0,0.12)" strokeWidth="0.6" />
          <circle cx="14" cy="2" r="1.5" fill="rgba(255,106,0,0.6)" />
          <circle cx="26" cy="14" r="1.5" fill="rgba(255,106,0,0.6)" />
          <circle cx="14" cy="26" r="1.5" fill="rgba(255,106,0,0.6)" />
        </svg>
      </motion.div>
      {/* Core icon */}
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.6)', '0 0 14px rgba(255,106,0,1)', '0 0 0px rgba(255,106,0,0.6)'] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="relative z-10 w-7 h-7 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)' }}
      >
        <BrainCircuit size={14} className="text-white" strokeWidth={2.2} />
      </motion.div>
    </div>
  );
};

// Scanning line that sweeps across the header
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-px pointer-events-none"
    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,106,0,0.6) 20%, rgba(255,180,60,0.9) 50%, rgba(255,106,0,0.6) 80%, transparent 100%)' }}
    animate={{ top: ['0%', '100%', '0%'] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
  />
);

const defaultTab = (role: string): MobileTab => {
  if (role === 'GURU') return 'beranda';
  if (role === 'SISWA') return 'beranda';
  if (role === 'KEPALA_SEKOLAH') return 'beranda';
  return 'beranda';
};

// Roles that map to the admin-style dashboard
const ADMIN_ROLES = ['SUPER_ADMIN', 'TU', 'BK', 'BENDAHARA'];

// Map internal tab IDs to MobileTab for navigate-from-dashboard calls
function toMobileTab(tab: string): MobileTab {
  if (tab === 'laporan' || tab === 'analitik' || tab === 'keuangan' || tab === 'arsip' || tab === 'surat' || tab === 'lms') return 'laporan';
  if (tab === 'jadwal') return 'jadwal';
  if (tab === 'presensi') return 'presensi';
  if (tab === 'monitoring') return 'beranda'; // kepsek monitoring lives in beranda
  if (tab === 'siswa' || tab === 'guru') return 'beranda';
  return 'beranda';
}

// ── App ────────────────────────────────────────────────────────────────────────

type AppMode = 'pending' | 'mobile' | 'web';

export default function App() {
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // For admin beranda sub-navigation (siswa/guru modules)
  const [adminSubPage, setAdminSubPage] = useState<string | null>(null);
  // App mode: 'pending' = show selector, 'mobile' = mobile UI, 'web' = enterprise web UI
  const [appMode, setAppMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('osdai_app_mode');
    return (saved as AppMode) || 'pending';
  });
  // Landing page — shown before login when no token
  const [showLanding, setShowLanding] = useState<boolean>(() => !localStorage.getItem('token'));
  // Global dark mode (landing + login screens)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('osdai_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const toggleDark = () => {
    setDarkMode(prev => {
      localStorage.setItem('osdai_dark_mode', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    if (token) checkAuth();
    else setAuthLoading(false);
  }, [token]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        if (userData.theme) setTheme(userData.theme as Theme);
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
        if (data.user.theme) setTheme(data.user.theme as Theme);
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
    localStorage.removeItem('osdai_app_mode');
    setActiveTab('beranda');
    setAdminSubPage(null);
    setAppMode('pending');
    setShowLanding(true);
  };

  const handleModeSelect = (mode: 'mobile' | 'web') => {
    localStorage.setItem('osdai_app_mode', mode);
    setAppMode(mode);
  };

  const navigate = (tab: string) => {
    // Handle special admin sub-pages
    if (tab === 'siswa') { setAdminSubPage('siswa'); setActiveTab('beranda'); return; }
    if (tab === 'guru') { setAdminSubPage('guru'); setActiveTab('beranda'); return; }
    if (tab === 'monitoring') { setAdminSubPage('monitoring'); setActiveTab('beranda'); return; }
    setAdminSubPage(null);
    setActiveTab(toMobileTab(tab));
  };

  // ── LANDING PAGE ─────────────────────────────────────────────────────────────

  if (!token && showLanding) {
    return (
      <LandingPage
        onLogin={() => setShowLanding(false)}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />
    );
  }

  // ── FORGOT PASSWORD SCREEN ───────────────────────────────────────────────────

  if (showForgotPassword) {
    return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
  }

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────────

  if (!token || (authLoading && !user)) {
    const lDark = darkMode;
    const lBg = lDark ? 'linear-gradient(135deg, #0a0604 0%, #130b05 50%, #0a0604 100%)' : 'linear-gradient(135deg, #f0ece6 0%, #f7f3ee 50%, #f0ece6 100%)';
    const lText = lDark ? '#ffffff' : '#0d0d14';
    const lMuted = lDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
    const lCardBg = lDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)';
    const lCardBorder = lDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const lInputBg = lDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const lInputBorder = lDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)';
    const lInputText = lDark ? '#ffffff' : '#0d0d14';
    const lDivider = lDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
    const lDividerText = lDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)';
    const lChipBg = lDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    const lChipBorder = lDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
    const lFooter = lDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.25)';
    return (
      <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden" style={{ background: lBg }}>
        {lDark && <NeuralBackground />}

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.1) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.05) 0%, transparent 70%)' }} />
        </div>

        {/* Dark/Light toggle + Back to Landing */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowLanding(true)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            style={{ background: lCardBg, border: `1px solid ${lCardBorder}`, color: lMuted }}
          >
            ← Beranda
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleDark}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: lCardBg, border: `1px solid ${lCardBorder}` }}
          >
            <AnimatePresence mode="wait">
              {lDark ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun size={14} style={{ color: '#F59E0B' }} />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon size={14} style={{ color: '#8B5CF6' }} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-sm relative z-10"
        >
          <GlassPanel
            className="overflow-hidden shadow-2xl"
            style={{ background: lCardBg, backdropFilter: 'blur(24px)', border: `1px solid ${lCardBorder}` }}
          >
            {/* ── Futuristic AI Header ── */}
            <div
              className="relative px-7 pt-6 pb-5 overflow-hidden"
              style={{ background: lDark ? 'linear-gradient(160deg, #0d0804 0%, #1a0d06 55%, #0f0a05 100%)' : 'linear-gradient(160deg, #fff8f2 0%, #ffede0 55%, #fff5ed 100%)' }}
            >
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: `linear-gradient(${lDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px), linear-gradient(90deg, ${lDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'} 1px, transparent 1px)`,
                backgroundSize: '20px 20px',
              }} />
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,106,0,0.22) 0%, transparent 70%)' }} />
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-orange-500/40" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-orange-500/40" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-orange-500/20" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-orange-500/20" />
              <ScanLine />

              <div className="relative z-10 flex items-center gap-3.5">
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                  <OsdaiLogoMark />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-2xl font-black tracking-tight leading-none" style={{ color: lDark ? '#ffffff' : '#1a0a00' }}>OSDAI</h1>
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,106,0,0.2)', color: '#FF6A00', border: '1px solid rgba(255,106,0,0.35)' }}
                    >v2.0</motion.span>
                  </div>
                  <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] mt-1 whitespace-nowrap" style={{ color: lDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.4)' }}>
                    Otomatisasi Sekolah Digital · AI
                  </p>
                  <p className="text-[7px] font-black mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,106,0,0.6)', letterSpacing: '0.12em' }}>
                    SMK Negeri 1 Wonogiri
                  </p>
                </motion.div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-green-400"
                    />
                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: lDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)' }}>LIVE</span>
                  </div>
                  <motion.div
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-[7px] font-bold tabular-nums"
                    style={{ color: 'rgba(255,106,0,0.6)', fontFamily: 'monospace' }}
                  >SYS.OK</motion.div>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-1.5 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <motion.div
                    key={i}
                    className="flex-1 h-0.5 rounded-full"
                    animate={{ background: ['rgba(255,106,0,0.08)', 'rgba(255,106,0,0.45)', 'rgba(255,106,0,0.08)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                  />
                ))}
                <motion.span
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="text-[7px] font-black tabular-nums ml-1"
                  style={{ color: 'rgba(255,106,0,0.6)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}
                >AI READY</motion.span>
              </div>
            </div>

            <div className="px-6 py-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-black tracking-widest mb-1.5 block" style={{ color: lMuted }}>
                    Alamat Surel
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="nama@smk.id"
                    autoComplete="username"
                    required
                    className="w-full h-12 px-4 rounded-2xl text-sm font-bold placeholder:font-normal outline-none transition-all"
                    style={{ background: lInputBg, border: `1px solid ${lInputBorder}`, color: lInputText, caretColor: '#FF6A00' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = lInputBorder)}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black tracking-widest mb-1.5 block" style={{ color: lMuted }}>
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full h-12 px-4 rounded-2xl text-sm font-bold placeholder:font-normal outline-none transition-all"
                    style={{ background: lInputBg, border: `1px solid ${lInputBorder}`, color: lInputText, caretColor: '#FF6A00' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = lInputBorder)}
                  />
                </div>

                <AnimatePresence>
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs font-bold px-4 py-3 rounded-2xl text-center"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                    >
                      {loginError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={authLoading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-12 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)', boxShadow: '0 4px 24px rgba(255,106,0,0.35)' }}
                >
                  {authLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Memverifikasi...</>
                  ) : (
                    <><Lock size={15} /> MASUK KE SISTEM</>
                  )}
                </motion.button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] font-black transition-all hover:opacity-70"
                    style={{ color: '#FF6A00' }}
                  >
                    Lupa Password?
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: lDivider }} />
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: lDividerText }}>Akun Test</span>
                <div className="flex-1 h-px" style={{ background: lDivider }} />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { label: 'Admin', email: 'admin@smk.id', pass: 'password123', color: '#FF6A00' },
                  { label: 'Guru', email: 'guru@smk.id', pass: 'password123', color: '#f59e0b' },
                  { label: 'Siswa', email: 'siswa@smk.id', pass: 'password123', color: '#22c55e' },
                ].map(acc => (
                  <motion.button
                    key={acc.email}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { setLoginEmail(acc.email); setLoginPassword(acc.pass); }}
                    className="flex flex-col items-center py-2.5 px-2 rounded-xl transition-all"
                    style={{ background: lChipBg, border: `1px solid ${lChipBorder}` }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = `${acc.color}40`)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = lChipBorder)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mb-1.5" style={{ background: acc.color }} />
                    <p className="text-[10px] font-black" style={{ color: acc.color }}>{acc.label}</p>
                    <p className="text-[7px] font-bold mt-0.5 truncate w-full text-center" style={{ color: lMuted }}>{acc.email.split('@')[0]}</p>
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-[8px] font-black uppercase tracking-widest" style={{ color: lFooter }}>
                OSDAI · SMK Negeri 1 Wonogiri · 2026
              </p>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  // ── MODE SELECTOR (shown after login) ────────────────────────────────────────

  if (token && user && appMode === 'pending') {
    return (
      <ModeSelector
        onSelectMode={handleModeSelect}
        userName={user.name}
        userRole={user.role}
      />
    );
  }

  // ── ENTERPRISE WEB MODE ───────────────────────────────────────────────────────

  if (token && user && appMode === 'web') {
    const ADMIN_ROLES_WEB = ['SUPER_ADMIN', 'TU', 'BK', 'BENDAHARA', 'KEPALA_SEKOLAH'];
    const isAdminRole = ADMIN_ROLES_WEB.includes(user.role);
    if (isAdminRole) {
      return (
        <AdminEnterprise
          user={user}
          authToken={token}
          onLogout={handleLogout}
          onSwitchMobile={() => handleModeSelect('mobile')}
        />
      );
    } else {
      return (
        <GuruEnterprise
          user={user}
          authToken={token}
          onLogout={handleLogout}
          onSwitchMobile={() => handleModeSelect('mobile')}
        />
      );
    }
  }

  // ── MAIN APP (mobile mode) ────────────────────────────────────────────────────

  const role = user?.role || 'GURU';
  const isGuru = role === 'GURU';
  const isSiswa = role === 'SISWA';
  const isKepsek = role === 'KEPALA_SEKOLAH';
  const isAdmin = ADMIN_ROLES.includes(role);

  // Resolve what to show on "beranda" based on role and sub-page
  const renderBeranda = () => {
    // Admin special sub-pages
    if (adminSubPage === 'siswa') return <div className="flex-1 overflow-y-auto pb-24 px-3 pt-2"><StudentModule authToken={token!} /></div>;
    if (adminSubPage === 'guru') return <div className="flex-1 overflow-y-auto pb-24 px-3 pt-2"><TeacherModule authToken={token!} /></div>;
    if (adminSubPage === 'monitoring') return <div className="flex-1 overflow-y-auto pb-24 px-3 pt-2"><PusatMonitoringKepsek authToken={token!} /></div>;

    if (isGuru) return <GuruDashboard authToken={token!} user={user} onNavigate={navigate} />;
    if (isSiswa) return <SiswaDashboard authToken={token!} user={user} onNavigate={navigate} />;
    if (isKepsek) return <KepsekDashboard authToken={token!} user={user} onNavigate={navigate} />;
    if (isAdmin) return <AdminDashboard authToken={token!} user={user} role={role} onNavigate={navigate} />;
    return <AdminDashboard authToken={token!} user={user} role={role} onNavigate={navigate} />;
  };

  const renderPresensi = () => {
    if (isSiswa) return <MobileStudentPresensi authToken={token!} user={user} />;
    if (isKepsek) return (
      <div className="flex-1 overflow-y-auto pb-24 px-3 pt-2">
        <PusatMonitoringKepsek authToken={token!} />
      </div>
    );
    return <MobileGuruPresensi authToken={token!} user={user} />;
  };

  const pageTitle = (() => {
    if (adminSubPage === 'siswa') return 'Manajemen Siswa';
    if (adminSubPage === 'guru') return 'Manajemen Guru';
    if (adminSubPage === 'monitoring') return 'Ruang Kendali';
    if (activeTab === 'beranda') {
      if (isKepsek) return 'Ruang Kepala';
      if (isGuru) return 'Beranda Guru';
      if (isSiswa) return 'Beranda Siswa';
      return 'Beranda';
    }
    if (activeTab === 'presensi') return 'Presensi';
    if (activeTab === 'jadwal') return 'Jadwal';
    if (activeTab === 'laporan') return 'Laporan';
    if (activeTab === 'akun') return 'Akun Saya';
    return 'OSDAI';
  })();

  // Badge counts (can be extended with real data)
  const badges: Partial<Record<MobileTab, number>> = {};

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#1C100A', maxWidth: 480, margin: '0 auto', position: 'relative' }}
    >
      {/* Demo Mode Banner */}
      <DemoBanner authToken={token ?? undefined} />

      {/* Fixed Header */}
      <MobileHeader
        user={user}
        title={pageTitle}
        onNotif={() => {}}
        onSearch={activeTab !== 'akun' ? () => {} : undefined}
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${adminSubPage || ''}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex-1 flex flex-col overflow-hidden h-full"
          >
            {activeTab === 'beranda' && renderBeranda()}
            {activeTab === 'presensi' && renderPresensi()}
            {activeTab === 'jadwal' && <JadwalScreen authToken={token!} role={role} />}
            {activeTab === 'laporan' && <LaporanScreen authToken={token!} role={role} />}
            {activeTab === 'akun' && <AkunScreen user={user} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation — always visible */}
      <MobileBottomNav
        active={activeTab}
        onChange={(tab) => {
          setAdminSubPage(null);
          setActiveTab(tab);
        }}
        badge={badges}
      />

      {/* Switch to Web Mode button (for admin/guru/kepsek) */}
      {(isAdmin || isGuru || isKepsek) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-[88px] left-4 z-50"
        >
          <button
            onClick={() => handleModeSelect('web')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black shadow-lg border transition-all active:scale-95"
            style={{ background: 'rgba(255,106,0,0.9)', color: '#fff', borderColor: 'rgba(255,106,0,0.4)', backdropFilter: 'blur(8px)' }}
            title="Beralih ke Mode Web Enterprise"
          >
            🖥 MODE WEB
          </button>
        </motion.div>
      )}

      {/* Floating Action Button for Guru */}
      {isGuru && activeTab === 'presensi' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-5 z-50"
        >
          <motion.button
            animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.5)', '0 0 24px rgba(255,106,0,0.8)', '0 0 0px rgba(255,106,0,0.5)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
            title="Buka Presensi Baru"
            onClick={() => navigate('presensi')}
          >
            +
          </motion.button>
        </motion.div>
      )}

      {/* Floating Action Button for Admin: Add Data */}
      {isAdmin && (activeTab === 'beranda') && !adminSubPage && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-5 z-50"
        >
          <motion.button
            animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 18px rgba(255,106,0,0.7)', '0 0 0px rgba(255,106,0,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
            title="Tambah Data"
            onClick={() => navigate('siswa')}
          >
            +
          </motion.button>
        </motion.div>
      )}

      {/* Floating Action Button for Kepsek */}
      {isKepsek && activeTab === 'beranda' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-5 z-50"
        >
          <motion.button
            animate={{ boxShadow: ['0 0 0px rgba(124,58,237,0.5)', '0 0 20px rgba(124,58,237,0.7)', '0 0 0px rgba(124,58,237,0.5)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            title="Lihat Audit"
            onClick={() => { setAdminSubPage('monitoring'); setActiveTab('beranda'); }}
          >
            👁
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
