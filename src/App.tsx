import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Lock, Loader2 } from 'lucide-react';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<MobileTab>('beranda');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  // For admin beranda sub-navigation (siswa/guru modules)
  const [adminSubPage, setAdminSubPage] = useState<string | null>(null);

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
    setAdminSubPage(null);
  };

  const navigate = (tab: string) => {
    // Handle special admin sub-pages
    if (tab === 'siswa') { setAdminSubPage('siswa'); setActiveTab('beranda'); return; }
    if (tab === 'guru') { setAdminSubPage('guru'); setActiveTab('beranda'); return; }
    if (tab === 'monitoring') { setAdminSubPage('monitoring'); setActiveTab('beranda'); return; }
    setAdminSubPage(null);
    setActiveTab(toMobileTab(tab));
  };

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────────

  if (!token || (authLoading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <NeuralBackground />
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(255,106,0,0.3),transparent_70%)]" />
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
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

              <div className="mt-6 pt-5 border-t border-white/20">
                <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Akun Test</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Super Admin', email: 'admin@smk.id', pass: 'password123' },
                    { label: 'Guru', email: 'guru@smk.id', pass: 'password123' },
                    { label: 'Siswa', email: 'siswa@smk.id', pass: 'password123' },
                  ].map(acc => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => { setLoginEmail(acc.email); setLoginPassword(acc.pass); }}
                      className="text-left px-3 py-2 rounded-xl text-[9px] font-black text-slate-600 hover:text-slate-800 hover:bg-orange-50 transition-all border border-white/40"
                      style={{ background: 'rgba(255,255,255,0.4)' }}
                    >
                      <p className="text-orange-500">{acc.label}</p>
                      <p className="truncate text-slate-500">{acc.email}</p>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-[10px] font-black text-slate-400 mt-5 uppercase tracking-widest">
                OSDAI · SMK Negeri 1 Wonogiri
              </p>
            </CardContent>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  // ── MAIN APP ─────────────────────────────────────────────────────────────────

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
