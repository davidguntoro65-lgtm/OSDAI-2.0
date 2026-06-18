import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useTime, useTransform as useT, AnimatePresence } from 'motion/react';
import {
  BrainCircuit, Zap, Shield, BarChart3, Users, Clock, Globe,
  ChevronRight, Star, CheckCircle2, Menu, X, Sun, Moon,
  GraduationCap, BookOpen, MapPin, Bell, TrendingUp, Award,
  Smartphone, Monitor, ArrowRight, Play
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface LandingPageProps {
  onLogin: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

// ── Animated Logo ──────────────────────────────────────────────────────────────
const OsdaiLogo = ({ size = 40 }: { size?: number }) => {
  const time = useTime();
  const r1 = useT(time, t => (t / 3000) * 360);
  const r2 = useT(time, t => -(t / 4500) * 360);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div style={{ rotate: r1, position: 'absolute', inset: 0 }}>
        <svg viewBox="0 0 48 48" className="w-full h-full">
          <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,106,0,0.3)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx="24" cy="2" r="3" fill="#FF6A00" />
        </svg>
      </motion.div>
      <motion.div style={{ rotate: r2, position: 'absolute', inset: 6 }}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth="0.8" strokeDasharray="2 4" />
          <circle cx="18" cy="2" r="2.2" fill="rgba(139,92,246,0.9)" />
          <circle cx="18" cy="34" r="2.2" fill="rgba(139,92,246,0.9)" />
        </svg>
      </motion.div>
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.5)', '0 0 16px rgba(255,106,0,0.9)', '0 0 0px rgba(255,106,0,0.5)'] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="relative z-10 rounded-xl flex items-center justify-center"
        style={{
          width: size * 0.55, height: size * 0.55,
          background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)'
        }}
      >
        <BrainCircuit size={size * 0.28} className="text-white" strokeWidth={2.2} />
      </motion.div>
    </div>
  );
};

// ── Central Hero Orb (like Syncra reference) ───────────────────────────────────
const HeroOrb = () => {
  const time = useTime();
  const r1 = useT(time, t => (t / 4000) * 360);
  const r2 = useT(time, t => -(t / 6000) * 360);
  const r3 = useT(time, t => (t / 9000) * 360);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
      {/* Outer glow ring */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.18) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)' }}
      />

      {/* Orbit ring 1 */}
      <motion.div style={{ rotate: r1, position: 'absolute', inset: 0 }}>
        <svg viewBox="0 0 260 260" className="w-full h-full">
          <circle cx="130" cy="130" r="124" fill="none" stroke="rgba(255,106,0,0.2)" strokeWidth="1" strokeDasharray="6 4" />
          <circle cx="130" cy="6" r="5" fill="#FF6A00" filter="url(#glow1)" />
          <circle cx="254" cy="130" r="3.5" fill="rgba(255,180,60,0.8)" />
          <defs>
            <filter id="glow1">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
        </svg>
      </motion.div>

      {/* Orbit ring 2 */}
      <motion.div style={{ rotate: r2, position: 'absolute', inset: 20 }}>
        <svg viewBox="0 0 220 220" className="w-full h-full">
          <circle cx="110" cy="110" r="104" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="110" cy="6" r="4" fill="rgba(139,92,246,0.9)" />
          <circle cx="214" cy="110" r="4" fill="rgba(139,92,246,0.9)" />
          <circle cx="110" cy="214" r="3" fill="rgba(139,92,246,0.7)" />
        </svg>
      </motion.div>

      {/* Orbit ring 3 */}
      <motion.div style={{ rotate: r3, position: 'absolute', inset: 44 }}>
        <svg viewBox="0 0 172 172" className="w-full h-full">
          <circle cx="86" cy="86" r="80" fill="none" stroke="rgba(255,106,0,0.12)" strokeWidth="0.8" />
          <circle cx="86" cy="6" r="3" fill="rgba(255,106,0,0.5)" />
          <circle cx="166" cy="86" r="3" fill="rgba(255,106,0,0.5)" />
          <circle cx="86" cy="166" r="3" fill="rgba(255,106,0,0.5)" />
          <circle cx="6" cy="86" r="3" fill="rgba(255,106,0,0.5)" />
        </svg>
      </motion.div>

      {/* Core sphere */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 30px rgba(255,106,0,0.4), 0 0 60px rgba(255,106,0,0.15), inset 0 0 30px rgba(255,106,0,0.1)',
            '0 0 50px rgba(255,106,0,0.7), 0 0 100px rgba(139,92,246,0.25), inset 0 0 40px rgba(255,106,0,0.2)',
            '0 0 30px rgba(255,106,0,0.4), 0 0 60px rgba(255,106,0,0.15), inset 0 0 30px rgba(255,106,0,0.1)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: 100, height: 100,
          background: 'radial-gradient(circle at 35% 35%, rgba(255,140,0,0.9), rgba(200,60,0,0.95) 60%, rgba(80,20,0,1))',
        }}
      >
        <BrainCircuit size={44} className="text-white/90" strokeWidth={1.5} />
      </motion.div>

      {/* Pulsing halo rings */}
      {[120, 160, 200].map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: s, height: s,
            borderColor: i === 0 ? 'rgba(255,106,0,0.25)' : i === 1 ? 'rgba(139,92,246,0.15)' : 'rgba(255,106,0,0.08)',
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5 + i * 0.8, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
    </div>
  );
};

// ── Horizon Glow (reference image horizon effect) ─────────────────────────────
const HorizonGlow = ({ dark }: { dark: boolean }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {dark ? (
      <>
        <div className="absolute bottom-0 left-0 right-0 h-48 md:h-72"
          style={{ background: 'linear-gradient(to top, rgba(255,60,0,0.18) 0%, rgba(180,40,0,0.08) 40%, transparent 100%)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-32 md:h-48 rounded-full"
          style={{ background: 'radial-gradient(ellipse at center bottom, rgba(255,100,0,0.25) 0%, rgba(139,40,200,0.1) 40%, transparent 70%)', filter: 'blur(30px)' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.05) 0%, transparent 70%)', transform: 'translate(-20%, -20%)' }} />
      </>
    ) : (
      <>
        <div className="absolute top-0 left-0 right-0 h-full"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,106,0,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-48"
          style={{ background: 'linear-gradient(to top, rgba(255,106,0,0.06) 0%, transparent 100%)' }} />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
      </>
    )}
    {/* Sweeping light trail */}
    <motion.div
      animate={{ x: ['-20%', '120%'], opacity: [0, 0.4, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
      className="absolute top-1/3 left-0 h-px"
      style={{
        width: '60%',
        background: 'linear-gradient(90deg, transparent, rgba(255,106,0,0.5), transparent)',
        filter: 'blur(1px)'
      }}
    />
    <motion.div
      animate={{ x: ['120%', '-20%'], opacity: [0, 0.25, 0] }}
      transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', repeatDelay: 6, delay: 4 }}
      className="absolute top-2/3 left-0 h-px"
      style={{
        width: '70%',
        background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)',
        filter: 'blur(1px)'
      }}
    />
  </div>
);

// ── Floating Particle Field ────────────────────────────────────────────────────
const ParticleField = ({ dark }: { dark: boolean }) => {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.8,
    dur: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    color: i % 3 === 0 ? 'rgba(255,106,0,' : i % 3 === 1 ? 'rgba(139,92,246,' : 'rgba(255,180,60,',
    opacity: 0.2 + Math.random() * 0.5,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `${p.color}${p.opacity})`,
          }}
          animate={{
            y: [0, -18, 0, 12, 0],
            x: [0, 8, -6, 4, 0],
            opacity: [p.opacity * 0.4, p.opacity, p.opacity * 0.6, p.opacity, p.opacity * 0.4],
          }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

// ── Section animation wrapper ──────────────────────────────────────────────────
const FadeUp = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.65, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// ── Stats data ─────────────────────────────────────────────────────────────────
const STATS = [
  { value: '1.188+', label: 'Siswa Aktif', icon: GraduationCap },
  { value: '100+', label: 'Guru Terkoneksi', icon: Users },
  { value: '99.9%', label: 'Uptime Sistem', icon: Shield },
  { value: '15 Menit', label: 'Setup Awal', icon: Clock },
];

// ── Features ───────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: MapPin,
    title: 'Absensi GPS Cerdas',
    desc: 'Presensi otomatis berbasis geofencing. Siswa cukup hadir dalam radius sekolah, sistem mencatat sendiri.',
    color: '#FF6A00',
    grad: 'from-orange-500/20 to-orange-500/5',
  },
  {
    icon: BrainCircuit,
    title: 'AI Analytics Kelas',
    desc: 'Laporan prestasi, prediksi risiko, dan insight kelas dihasilkan oleh AI secara real-time.',
    color: '#8B5CF6',
    grad: 'from-violet-500/20 to-violet-500/5',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Real-Time',
    desc: 'Pantau seluruh aktivitas sekolah dalam satu layar — dari kehadiran hingga keuangan SPP.',
    color: '#06B6D4',
    grad: 'from-cyan-500/20 to-cyan-500/5',
  },
  {
    icon: BookOpen,
    title: 'LMS Terintegrasi',
    desc: 'Distribusi materi, tugas, dan penilaian langsung dalam platform tanpa aplikasi tambahan.',
    color: '#10B981',
    grad: 'from-emerald-500/20 to-emerald-500/5',
  },
  {
    icon: Bell,
    title: 'Notifikasi Pintar',
    desc: 'Orang tua & siswa mendapat notifikasi absensi, tugas, dan pengumuman secara instan.',
    color: '#F59E0B',
    grad: 'from-amber-500/20 to-amber-500/5',
  },
];

// ── Who is it for ──────────────────────────────────────────────────────────────
const ROLES = [
  { icon: Users, role: 'Admin / TU', desc: 'Kelola data siswa, guru, jurusan, dan konfigurasi sistem sekolah.', color: '#FF6A00' },
  { icon: GraduationCap, role: 'Guru', desc: 'Aktivasi sesi kelas, input nilai, dan pantau kehadiran siswa real-time.', color: '#8B5CF6' },
  { icon: BookOpen, role: 'Siswa', desc: 'Absen digital, akses materi LMS, dan lacak progres belajar mandiri.', color: '#06B6D4' },
  { icon: Award, role: 'Kepala Sekolah', desc: 'Monitoring menyeluruh dengan laporan AI dan dashboard eksekutif.', color: '#10B981' },
];

// ── Main Landing Page ──────────────────────────────────────────────────────────
export default function LandingPage({ onLogin, darkMode, onToggleDark }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const navScrolled = scrollY > 40;

  // ── Theme tokens ──────────────────────────────────────────────────────────────
  const bg = darkMode ? '#05030a' : '#fafafa';
  const bgCard = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const bgCardHover = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const borderHover = darkMode ? 'rgba(255,106,0,0.35)' : 'rgba(255,106,0,0.4)';
  const text = darkMode ? '#f1f0ff' : '#0d0d14';
  const textMuted = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const textSub = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)';
  const navBg = navScrolled
    ? darkMode ? 'rgba(5,3,10,0.9)' : 'rgba(255,255,255,0.92)'
    : 'transparent';

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: bg, color: text, fontFamily: 'Urbanist, Poppins, sans-serif' }}
    >

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: navBg,
          backdropFilter: navScrolled ? 'blur(20px)' : 'none',
          borderBottom: navScrolled ? `1px solid ${border}` : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <OsdaiLogo size={38} />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black tracking-tight" style={{ color: text }}>OSDAI</span>
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(255,106,0,0.15)', color: '#FF6A00', border: '1px solid rgba(255,106,0,0.3)' }}
                  >
                    v2.0
                  </motion.span>
                </div>
                <p className="text-[9px] font-bold tracking-wider hidden sm:block" style={{ color: textMuted }}>
                  INTELEGEN KELAS
                </p>
              </div>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Fitur', id: 'features' },
                { label: 'Untuk Siapa', id: 'roles' },
                { label: 'Statistik', id: 'stats' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                  style={{ color: textSub }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2.5">
              {/* Dark/Light toggle */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onToggleDark}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ background: bgCard, border: `1px solid ${border}` }}
                title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
              >
                <AnimatePresence mode="wait">
                  {darkMode ? (
                    <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Sun size={15} style={{ color: '#F59E0B' }} />
                    </motion.div>
                  ) : (
                    <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Moon size={15} style={{ color: '#8B5CF6' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Login button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
                onClick={onLogin}
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)',
                  boxShadow: '0 4px 20px rgba(255,106,0,0.35)',
                }}
              >
                Masuk
                <ArrowRight size={14} />
              </motion.button>

              {/* Mobile menu */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: bgCard, border: `1px solid ${border}` }}
              >
                {menuOpen ? <X size={16} style={{ color: text }} /> : <Menu size={16} style={{ color: text }} />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ background: darkMode ? 'rgba(5,3,10,0.97)' : 'rgba(255,255,255,0.97)', borderTop: `1px solid ${border}`, backdropFilter: 'blur(20px)' }}
            >
              <div className="px-4 py-4 space-y-1">
                {[
                  { label: 'Fitur', id: 'features' },
                  { label: 'Untuk Siapa', id: 'roles' },
                  { label: 'Statistik', id: 'stats' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ color: textSub, background: bgCard }}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={onLogin}
                  className="w-full px-4 py-3 rounded-xl text-sm font-black text-white mt-2"
                  style={{ background: 'linear-gradient(135deg, #FF6A00, #cc4a00)' }}
                >
                  Masuk ke Sistem
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO SECTION ───────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-24 overflow-hidden">
        <HorizonGlow dark={darkMode} />
        <ParticleField dark={darkMode} />

        {/* Fine grid overlay */}
        {darkMode && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        )}

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-bold"
            style={{
              background: darkMode ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.09)',
              border: '1px solid rgba(139,92,246,0.3)',
              color: '#8B5CF6'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-violet-500"
            />
            Platform Sekolah Digital Berbasis AI
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
              className="w-1.5 h-1.5 rounded-full bg-orange-500"
            />
          </motion.div>

          {/* Hero orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
            className="flex justify-center mb-8"
          >
            <HeroOrb />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-4"
            style={{ color: text }}
          >
            Selamat Datang di Era{' '}
            <span
              className="relative inline-block"
              style={{
                background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 60%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Intelegen Kelas
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="text-xl sm:text-2xl font-bold mb-6 max-w-2xl mx-auto"
            style={{ color: textSub }}
          >
            Saatnya Kelasmu Bergerak Lebih Cerdas!
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-10"
            style={{ color: textMuted }}
          >
            Bukan lagi ruang kelas konvensional yang kaku. <strong style={{ color: '#FF6A00' }}>OSDAI Intelegen Kelas</strong> mengubah
            ruang belajarmu menjadi ekosistem digital yang aktif, otomatis, dan terintegrasi.
            Kelola tugas, pantau absensi, hingga unjuk prestasi kelas dalam satu platform
            cerdas yang mudah diakses dari mana saja.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onLogin}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-black text-base w-full sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)',
                boxShadow: '0 8px 32px rgba(255,106,0,0.4)',
              }}
            >
              Mulai Sekarang
              <ChevronRight size={18} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollTo('features')}
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base w-full sm:w-auto transition-all"
              style={{
                background: bgCard,
                border: `1px solid ${border}`,
                color: textSub,
              }}
            >
              <Play size={16} style={{ color: '#FF6A00' }} />
              Lihat Fitur
            </motion.button>
          </motion.div>

          {/* Platform badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center justify-center gap-6 mt-10"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: textMuted }}>
              <Monitor size={13} style={{ color: '#FF6A00' }} /> Web App
            </div>
            <div className="w-px h-4" style={{ background: border }} />
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: textMuted }}>
              <Smartphone size={13} style={{ color: '#8B5CF6' }} /> Mobile Friendly
            </div>
            <div className="w-px h-4" style={{ background: border }} />
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: textMuted }}>
              <Shield size={13} style={{ color: '#10B981' }} /> Aman & Terenkripsi
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-10 rounded-full" style={{ background: `linear-gradient(to bottom, ${darkMode ? 'rgba(255,106,0,0.5)' : 'rgba(255,106,0,0.4)'}, transparent)` }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF6A00' }} />
        </motion.div>
      </section>

      {/* ── STATS SECTION ──────────────────────────────────────────────────── */}
      <section id="stats" className="relative py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <FadeUp key={i} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ scale: 1.04, y: -4 }}
                    className="text-center p-6 rounded-2xl transition-all"
                    style={{ background: bgCard, border: `1px solid ${border}` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'rgba(255,106,0,0.12)', border: '1px solid rgba(255,106,0,0.2)' }}>
                      <Icon size={18} style={{ color: '#FF6A00' }} />
                    </div>
                    <p className="text-2xl md:text-3xl font-black" style={{ color: '#FF6A00' }}>{s.value}</p>
                    <p className="text-xs font-semibold mt-1" style={{ color: textMuted }}>{s.label}</p>
                  </motion.div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────────────────── */}
      <section id="features" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#FF6A00' }}>
              ◆ Fitur Unggulan
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: text }}>
              Satu Platform,{' '}
              <span style={{
                background: 'linear-gradient(135deg, #FF6A00, #8B5CF6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>
                Semua Solusi
              </span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: textMuted }}>
              Dari absensi hingga keuangan, semua terintegrasi dalam satu ekosistem digital yang cerdas.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <FadeUp key={i} delay={i * 0.07}>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -6, borderColor: borderHover }}
                    className="relative p-6 rounded-2xl overflow-hidden group transition-all cursor-default"
                    style={{ background: bgCard, border: `1px solid ${border}` }}
                  >
                    {/* Card glow on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                      style={{
                        background: `radial-gradient(ellipse at 20% 20%, ${f.color}14 0%, transparent 70%)`,
                      }}
                    />

                    {/* Top accent line */}
                    <div className="absolute top-0 left-6 right-6 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />

                    <div className="relative z-10">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          background: `${f.color}18`,
                          border: `1px solid ${f.color}30`,
                        }}
                      >
                        <Icon size={22} style={{ color: f.color }} />
                      </div>
                      <h3 className="text-base font-black mb-2" style={{ color: text }}>{f.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{f.desc}</p>

                      {/* Bottom corner badge */}
                      <div
                        className="absolute top-5 right-5 w-6 h-6 rounded-lg flex items-center justify-center opacity-60"
                        style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />
                      </div>
                    </div>
                  </motion.div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HERO HIGHLIGHT (like reference image "Why choose" section) ──────── */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-48"
            style={{
              background: darkMode
                ? 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(255,106,0,0.06) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(255,106,0,0.05) 0%, transparent 70%)'
            }} />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <FadeUp>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#8B5CF6' }}>
                ◆ Mengapa Memilih OSDAI?
              </p>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-6" style={{ color: text }}>
                Ekosistem Belajar yang{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #FF6A00)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                }}>
                  Aktif & Otomatis
                </span>
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: textMuted }}>
                OSDAI bukan sekedar aplikasi absensi. Ini adalah otak digital sekolahmu —
                mengelola, menganalisis, dan mengoptimalkan setiap aspek pembelajaran secara
                otomatis sehingga guru bisa fokus pada yang paling penting: mengajar.
              </p>
              <div className="space-y-3">
                {[
                  'Tidak butuh perangkat khusus — cukup smartphone atau browser',
                  'Setup awal hanya 15 menit, langsung bisa digunakan',
                  'Data terenkripsi dan tersimpan aman di server lokal',
                  'Update fitur berkala tanpa biaya tambahan',
                ].map((pt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <CheckCircle2 size={12} style={{ color: '#10B981' }} />
                    </div>
                    <p className="text-sm" style={{ color: textSub }}>{pt}</p>
                  </motion.div>
                ))}
              </div>
            </FadeUp>

            {/* Right — 4 mini feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Integrasi Mulus', desc: 'Terhubung dengan semua sistem yang sudah ada di sekolahmu.', icon: Globe, color: '#8B5CF6' },
                { title: 'Presisi Tinggi', desc: 'AI kami dilatih untuk akurasi absensi dan analitik kelas.', icon: Star, color: '#FF6A00' },
                { title: 'Perintah Kustom', desc: 'Atur hak akses dan workflow sesuai kebutuhan sekolahmu.', icon: Zap, color: '#06B6D4' },
                { title: 'Aman & Andal', desc: 'Uptime 99.9%, data terenkripsi, backup otomatis harian.', icon: Shield, color: '#10B981' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <FadeUp key={i} delay={i * 0.08}>
                    <motion.div
                      whileHover={{ scale: 1.04, y: -4 }}
                      className="p-5 rounded-2xl transition-all"
                      style={{
                        background: bgCard,
                        border: `1px solid ${border}`,
                      }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}>
                        <Icon size={16} style={{ color: c.color }} />
                      </div>
                      <h4 className="text-sm font-black mb-1.5" style={{ color: text }}>{c.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{c.desc}</p>
                    </motion.div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ──────────────────────────────────────────────────── */}
      <section id="roles" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#06B6D4' }}>
              ◆ Untuk Semua Peran
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight" style={{ color: text }}>
              Satu Platform untuk{' '}
              <span style={{
                background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>
                Semua Peran
              </span>
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map((r, i) => {
              const Icon = r.icon;
              return (
                <FadeUp key={i} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ scale: 1.04, y: -8 }}
                    className="relative p-6 rounded-2xl text-center overflow-hidden transition-all"
                    style={{ background: bgCard, border: `1px solid ${border}` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />

                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: `${r.color}15`, border: `1px solid ${r.color}25` }}
                    >
                      <Icon size={24} style={{ color: r.color }} />
                    </div>
                    <h3 className="text-base font-black mb-2" style={{ color: text }}>{r.role}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{r.desc}</p>
                  </motion.div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────────────────────────────────── */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0"
            style={{
              background: darkMode
                ? 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,106,0,0.08) 0%, transparent 70%)'
                : 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,106,0,0.06) 0%, transparent 70%)'
            }} />
          {/* Animated rings */}
          {[200, 350, 500].map((s, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full border"
              style={{
                width: s, height: s,
                marginLeft: -s / 2, marginTop: -s / 2,
                borderColor: i === 0 ? 'rgba(255,106,0,0.12)' : i === 1 ? 'rgba(139,92,246,0.08)' : 'rgba(255,106,0,0.05)',
              }}
              animate={{ scale: [1, 1.04, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeUp>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex justify-center mb-6"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF6A00, #cc4a00)', boxShadow: '0 8px 32px rgba(255,106,0,0.4)' }}
              >
                <BrainCircuit size={32} className="text-white" />
              </div>
            </motion.div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6" style={{ color: text }}>
              Siap Transformasikan{' '}
              <span style={{
                background: 'linear-gradient(135deg, #FF6A00, #cc4a00)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>
                Sekolahmu?
              </span>
            </h2>
            <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: textMuted }}>
              Bergabunglah dengan ribuan siswa dan ratusan guru yang sudah merasakan
              perbedaan nyata dengan OSDAI Intelegen Kelas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={onLogin}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-black text-base w-full sm:w-auto"
                style={{
                  background: 'linear-gradient(135deg, #FF6A00 0%, #cc4a00 100%)',
                  boxShadow: '0 8px 40px rgba(255,106,0,0.45)',
                }}
              >
                <Zap size={18} />
                MULAI SEKARANG
              </motion.button>
            </div>

            <p className="text-xs mt-6 font-semibold" style={{ color: textMuted }}>
              ✓ Tidak perlu kartu kredit &nbsp;·&nbsp; ✓ Setup cepat &nbsp;·&nbsp; ✓ Support 24/7
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        className="relative py-10 px-4"
        style={{
          borderTop: `1px solid ${border}`,
          background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              <OsdaiLogo size={32} />
              <div>
                <p className="font-black text-sm" style={{ color: text }}>OSDAI v2.0</p>
                <p className="text-[10px] font-semibold" style={{ color: textMuted }}>SMK Negeri 1 Wonogiri</p>
              </div>
            </div>

            {/* Center links */}
            <div className="flex items-center gap-6 text-xs font-semibold" style={{ color: textMuted }}>
              <button onClick={() => scrollTo('features')} className="hover:opacity-70 transition-opacity">Fitur</button>
              <button onClick={() => scrollTo('roles')} className="hover:opacity-70 transition-opacity">Peran</button>
              <button onClick={() => scrollTo('stats')} className="hover:opacity-70 transition-opacity">Statistik</button>
              <button onClick={onLogin} className="hover:opacity-70 transition-opacity" style={{ color: '#FF6A00' }}>Login</button>
            </div>

            {/* Credit */}
            <div className="text-center md:text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
                Powered By
              </p>
              <p className="text-sm font-black mt-0.5" style={{ color: '#FF6A00' }}>
                Dave_Exe
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{
                background: 'linear-gradient(135deg, #FF6A00, #8B5CF6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
              }}>
                JOBEN ENTERPRISE
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: `1px solid ${border}` }}>
            <p className="text-[10px] font-semibold" style={{ color: textMuted }}>
              © 2026 OSDAI — Otomatisasi Sekolah Digital Berbasis AI. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-400"
              />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: textMuted }}>System Online</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
