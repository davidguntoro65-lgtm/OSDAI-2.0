import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  DollarSign,
  BarChart3, 
  ShieldCheck, 
  Database,
  Plus,
  Search,
  MoreVertical,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  LogOut,
  Briefcase,
  Layers,
  FileText,
  Archive,
  Inbox,
  Navigation,
  Sparkles,
  Zap,
  Target,
  MessageSquare,
  Send,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import NeuralBackground from '@/components/NeuralBackground';

import StudentModule from '@/components/StudentModule';
import TeacherModule from '@/components/TeacherModule';
import IntelligenceDashboard from '@/components/IntelligenceDashboard';
import StudentAttendancePanel from '@/components/StudentAttendancePanel';
import AcademicModule from '@/components/AcademicModule';
import TimetableModule from '@/components/TimetableModule';
import FinanceModule from '@/components/FinanceModule';
import LMSModule from '@/components/LMSModule';
import AIAnalyticsModule from '@/components/AIAnalyticsModule';

// Custom AI Abacus Icon with Glowing Particles (Simplified with Lucide + CSS)
const AIAbacusIcon = () => (
  <div className="relative">
    <Layers size={22} className="text-orange-500" />
    <motion.div 
      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full blur-[2px]" 
    />
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('admin@smk.id');
  const [loginPassword, setLoginPassword] = useState('password123');

  useEffect(() => {
    if (token) {
      checkAuth();
    } else {
      setAuthLoading(false);
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        handleLogout();
      }
    } catch (err) {
      handleLogout();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.accessToken) {
        setToken(data.accessToken);
        localStorage.setItem('token', data.accessToken);
        setUser(data.user);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <NeuralBackground />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassPanel className="w-full max-w-md p-0 overflow-hidden bg-white/40">
            <div className="bg-[#1A1A1A] p-10 text-white text-center relative">
              <div className="w-16 h-16 bg-[#FF6A00] rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-orange-900/40">
                <Database size={32} />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2">EduNexus Alpha</h1>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">AI Glassmorphism Gateway</p>
            </div>
            <CardContent className="p-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Identity</label>
                  <Input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-14 rounded-2xl border-white/20 bg-white/20 backdrop-blur-md font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Secure Key</label>
                  <Input 
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-14 rounded-2xl border-white/20 bg-white/20 backdrop-blur-md font-bold text-slate-800"
                  />
                </div>
                <Button className="w-full h-14 rounded-2xl bg-black text-white text-sm font-black shadow-2xl hover:scale-[1.02] transition-transform">
                  {authLoading ? <Loader2 className="animate-spin" /> : 'AUTHORIZE SESSION'}
                </Button>
              </form>
            </CardContent>
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 lg:p-10 flex flex-col lg:flex-row gap-8 relative overflow-hidden h-screen overflow-y-auto">
      <NeuralBackground />

      {/* LEFT PANEL — OSDAI CONSOLE */}
      <div className="lg:w-[320px] flex flex-col gap-6 shrink-0 h-full">
        <GlassPanel className="flex-1 flex flex-col p-6">
          <div className="flex items-center gap-4 mb-10 px-2">
             <div className="w-12 h-12 bg-[#FF6A00] rounded-2xl flex items-center justify-center text-white shadow-lg active-glow-orange">
                <BrainCircuit size={24} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 leading-tight">OSDAI CONSOLE</h2>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Enterprise Ready</p>
                </div>
             </div>
          </div>

          <nav className="space-y-2 flex-1">
             {[
               { id: 'overview', label: 'Guru & Siswa', icon: Users },
               { id: 'intelligence', label: 'Neural Intelligence', icon: Zap },
               { id: 'finance', label: 'Keuangan / SPP', icon: AIAbacusIcon },
               { id: 'inventory', label: 'Manajemen Inventaris', icon: Briefcase },
               { id: 'surat', label: 'Pusat Surat Digital', icon: FileText },
               { id: 'archive', label: 'Digital Archive', icon: Archive },
               { id: 'mailbox', label: 'Kotak Masuk', icon: Inbox },
             ].map((item: any) => (
               <button
                 key={item.id}
                 onClick={() => setActiveTab(item.id)}
                 className={`w-full flex items-center gap-4 px-5 py-4 rounded-[22px] transition-all duration-300 group ${
                   activeTab === item.id 
                     ? 'bg-slate-900/5 text-slate-900 border border-white/50 active-glow-lavender' 
                     : 'text-slate-400 hover:bg-white/40 hover:text-slate-600'
                 }`}
               >
                 <div className={`${activeTab === item.id ? 'text-[#FF6A00]' : 'text-slate-400 group-hover:text-slate-900'}`}>
                    <item.icon size={20} />
                 </div>
                 <span className="text-sm font-black tracking-tight">{item.label}</span>
               </button>
             ))}
          </nav>

          <div className="mt-8 space-y-4">
             <div className="p-4 bg-white/30 rounded-[28px] border border-white/40">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OSDAI Neural Core</p>
                   <ArrowDown size={14} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-2">
                   <Navigation size={14} className="text-blue-500" />
                   <span className="text-xs font-black text-slate-800">GPS Integrity Active</span>
                </div>
             </div>

             <div className="p-5 bg-slate-900 rounded-[32px] text-white shadow-xl">
                <p className="text-[11px] font-black text-white/40 mb-3 uppercase tracking-[0.2em]">Usage Credits</p>
                <div className="space-y-4">
                   <p className="text-sm font-bold text-white/80 leading-relaxed">
                     You're out of credits. <span className="text-[#FF6A00]">Upgrade to Core.</span>
                   </p>
                   <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF6A00] w-[92%]" />
                   </div>
                   <p className="text-[9px] font-black text-white/30">Make, test, iterate...</p>
                </div>
             </div>
          </div>
        </GlassPanel>
      </div>

      {/* CENTER PANEL — MAIN STAGE */}
      <div className="flex-1 flex flex-col gap-6 min-w-0 h-full">
         <GlassPanel className="flex flex-col h-full bg-white/25">
            <header className="flex items-center justify-between mb-10">
               <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">SIM simulasi DEMO SISTEM</h1>
                  <p className="text-sm font-bold text-slate-400 mt-1">Enterprise School Operating System v1.0</p>
               </div>
               <div className="flex items-center gap-3 bg-white/40 p-1.5 rounded-full border border-white/50">
                  {['Administrator', 'Tata Usaha', 'Kepala Sekolah', 'Guru', 'Siswa'].map((role) => (
                    <button 
                      key={role}
                      className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        role === 'Administrator' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
               </div>
            </header>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {/* Dashboard / SIS / Modules will render here */}
                  {activeTab === 'overview' && (
                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <GlassPanel hoverScale className="bg-white/40 border-white/60 p-8 cursor-pointer" onClick={() => setActiveTab('students')}>
                             <Users className="text-[#FF6A00] mb-4" size={32} />
                             <h3 className="text-xl font-black mb-2">Manajemen Siswa</h3>
                             <p className="text-sm font-bold text-slate-400">Registry data NISN/NIS, absensi realtime, dan riwayat akademik.</p>
                          </GlassPanel>
                          <GlassPanel hoverScale className="bg-white/40 border-white/60 p-8 cursor-pointer" onClick={() => setActiveTab('teachers')}>
                             <Briefcase className="text-blue-500 mb-4" size={32} />
                             <h3 className="text-xl font-black mb-2">Manajemen Guru</h3>
                             <p className="text-sm font-bold text-slate-400">Database pofesional, jam mengajar, dan sertifikasi pendidik.</p>
                          </GlassPanel>
                       </div>
                       <AIAnalyticsModule authToken={token!} />
                    </div>
                  )}

                  {activeTab === 'students' && <StudentModule authToken={token!} />}
                  {activeTab === 'teachers' && <TeacherModule authToken={token!} />}
                  {activeTab === 'finance' && <FinanceModule authToken={token!} userRole={user?.role} />}
                  
                  {activeTab === 'intelligence' && (
                    user?.role === Role.SISWA ? (
                      <StudentAttendancePanel authToken={token!} />
                    ) : (
                      <IntelligenceDashboard authToken={token!} />
                    )
                  )}
                  
                  {activeTab === 'inventory' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black">Inventaris Sarpras</h2>
                        <Button className="rounded-2xl bg-black text-white px-6 font-black h-12">TAMBAH BARANG</Button>
                      </div>
                      <GlassPanel className="bg-white/40 p-0 overflow-hidden">
                         <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest">
                           Awaiting Inventory Data
                         </div>
                      </GlassPanel>
                    </div>
                  )}

                  {activeTab === 'archive' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black">Digital Archive System</h2>
                        <Button className="rounded-2xl bg-orange-500 text-white px-6 font-black h-12">UPLOAD ARSIP</Button>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        {['Arsip Ijazah', 'SK Pegawai', 'Sertifikat Siswa'].map(t => (
                          <GlassPanel key={t} className="bg-white/40 p-8 text-center border-dashed border-2">
                             <Archive className="mx-auto mb-4 text-slate-300" size={32} />
                             <p className="font-black text-slate-600">{t}</p>
                          </GlassPanel>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="mt-8 pt-8 border-t border-white/20 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FF6A00] flex items-center justify-center text-white font-black text-sm active-glow-orange">
                     DG
                  </div>
                  <div>
                     <p className="text-sm font-black text-slate-900">David Guntoro</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Super Administrator</p>
                  </div>
               </div>
               <Button onClick={handleLogout} variant="ghost" className="rounded-2xl h-12 px-6 font-black text-slate-500 hover:text-red-500 hover:bg-red-50">
                  <LogOut size={18} className="mr-2" /> EXIT SYSTEM
               </Button>
            </footer>
         </GlassPanel>
      </div>

      {/* RIGHT PANEL — COMMUNICATION */}
      <div className="lg:w-[400px] shrink-0 flex flex-col gap-8 h-full">
         <GlassPanel className="bg-white/20 border-white/40 p-10 relative group overflow-hidden">
            {/* Visual Decoration: Large ribbed glass object placeholder with abstract orange cone */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#FF6A00] rounded-full blur-[80px] opacity-20 pointer-events-none" />
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
               className="relative z-10 w-full aspect-square mb-10 flex items-center justify-center"
            >
               <div className="w-48 h-48 bg-white/20 backdrop-blur-3xl rounded-[40px] border border-white/50 rotate-12 flex items-center justify-center shadow-2xl relative">
                  <Zap size={64} className="text-[#FF6A00] drop-shadow-[0_0_15px_rgba(255,106,0,0.5)]" />
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-blue-500/20 backdrop-blur-2xl rounded-full border border-white/30 -rotate-12" />
               </div>
            </motion.div>

            <div className="space-y-6 relative z-10">
               <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">A NEW WAY TO COMMUNICATE WITH AI</p>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">Kirim Pengumuman</h2>
               </div>

               <p className="text-sm font-bold text-slate-500 leading-relaxed uppercase">
                 BUAT PENGUMUMAN LEBIH PINTAR.
               </p>

               <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Pengumuman</p>
                     <Input placeholder="Tulis subjek di sini..." className="h-12 rounded-2xl bg-white/40 border-white/60 font-bold placeholder:text-slate-400" />
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                     {['Admin', 'Waka', 'Guru', 'Siswa'].map(role => (
                        <button key={role} className="px-4 py-2 rounded-full border border-white/60 bg-white/20 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white transition-all">
                           {role}
                        </button>
                     ))}
                  </div>

                  <Button className="w-full h-14 rounded-3xl bg-slate-900 text-white font-black flex items-center justify-center gap-3 shadow-2xl mt-4">
                     <Send size={18} /> BROADCAST AI
                  </Button>
               </div>
            </div>
         </GlassPanel>

         <GlassPanel className="bg-white/10 p-6 border-white/20">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-slate-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600">Quick Tools</span>
               </div>
               <button className="text-slate-400"><MoreHorizontal size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <button className="p-4 rounded-[24px] bg-white/30 border border-white/50 text-[10px] font-black text-slate-600 hover:bg-[#FF6A00] hover:text-white transition-all uppercase">Check GIS</button>
               <button className="p-4 rounded-[24px] bg-white/30 border border-white/50 text-[10px] font-black text-slate-600 hover:bg-[#FF6A00] hover:text-white transition-all uppercase">Print QR</button>
            </div>
         </GlassPanel>
      </div>
    </div>
  );
}

// Simple ArrowDown until I import it
function ArrowDown(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
