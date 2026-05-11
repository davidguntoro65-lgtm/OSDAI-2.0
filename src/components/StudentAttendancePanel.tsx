import { useState, useEffect } from 'react';
import { 
  Zap, 
  MapPin, 
  ShieldCheck, 
  Smartphone, 
  History,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function StudentAttendancePanel({ authToken }: { authToken: string }) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LOCATING' | 'SUBMITTING' | 'CONFIRMED' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // Optionally poll for active session if we don't have socket here
    const checkActiveSession = async () => {
      // Logic to find if there's an active session for this student's class
      // For now, let's assume we can fetch sessions
      const res = await fetch('/api/intelligence/active-session', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
      }
    };
    // checkActiveSession();
  }, [authToken]);

  const handleRespond = async () => {
    if (!navigator.geolocation) {
      setStatus('ERROR');
      setErrorMsg('GPS Tidak Didukung');
      return;
    }

    setStatus('LOCATING');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setStatus('SUBMITTING');
      try {
        const res = await fetch('/api/intelligence/respond', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: activeSession?.id || 'placeholder-id', // In real use, we'd have the ID from list
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            deviceId: navigator.userAgent
          })
        });
        const data = await res.json();
        if (data.status === 'SUCCESS' || data.status === 'ALREADY_CONFIRMED') {
          setAttendanceResult(data.attendance);
          setStatus('CONFIRMED');
        } else {
          setStatus('ERROR');
          setErrorMsg(data.error || 'Gagal konfirmasi kehadiran');
        }
      } catch (err) {
        setStatus('ERROR');
        setErrorMsg('Gagal terhubung ke server');
      }
    }, (err) => {
      setStatus('ERROR');
      setErrorMsg('Gagal mendapatkan lokasi (GPS)');
    });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-900 mb-1">PRESENSI NEURAL</h1>
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Mata Pelajaran: RPL Dasar</p>
        </div>
        <Badge className="bg-green-500/10 text-green-500 border-none font-black text-[10px] animate-pulse">SINYAL AKTIF</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Action Area */}
        <div className="md:col-span-8">
           <GlassPanel className="bg-slate-900 text-white min-h-[400px] flex flex-col items-center justify-center text-center p-10 overflow-hidden relative">
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <Zap size={400} className="text-white absolute -top-20 -right-20" />
              </div>

              <AnimatePresence mode="wait">
                {status === 'CONFIRMED' ? (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40">
                       <CheckCircle2 size={48} className="text-white" />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black mb-2 uppercase">Kehadiran Terkonfirmasi</h3>
                       <p className="text-sm font-bold text-white/60">Data presensi telah masuk ke sistem Neural SMK.</p>
                    </div>
                    <div className="bg-white/10 rounded-[32px] p-6 border border-white/20">
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Timestamp</p>
                       <p className="font-black text-xl">{new Date(attendanceResult?.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-8 z-10"
                  >
                    <div className="w-32 h-32 rounded-[48px] bg-[#FF6A00] flex items-center justify-center mx-auto shadow-2xl shadow-orange-900/40 transform -rotate-12">
                       <Zap size={64} className="text-white" />
                    </div>
                    
                    <div className="max-w-md">
                       <h3 className="text-4xl font-black mb-4 uppercase leading-tight tracking-tight">RESPON SINYAL SEKARANG</h3>
                       <p className="text-sm font-bold text-white/50 mb-8">Pastikan GPS aktif dan Anda berada di area SMK Negeri 1 Wonogiri.</p>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <Button 
                        onClick={handleRespond}
                        disabled={status !== 'IDLE'}
                        className="h-20 w-80 rounded-[40px] bg-white text-slate-900 font-black text-lg shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {status === 'IDLE' && 'AKTIFKAN RESPONS'}
                        {status === 'LOCATING' && <><Navigation className="animate-spin mr-3" /> MENCARI GPS...</>}
                        {status === 'SUBMITTING' && <><RefreshCcw className="animate-spin mr-3" /> MENGIRIM DATA...</>}
                      </Button>
                      
                      {status === 'ERROR' && (
                        <div className="flex items-center gap-2 text-red-400 font-black text-sm uppercase tracking-widest">
                           <AlertCircle size={16} />
                           {errorMsg}
                           <button onClick={() => setStatus('IDLE')} className="underline ml-2">Coba Lagi</button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </GlassPanel>

           <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-white/40 border border-white/60 p-8 rounded-[40px] flex items-center gap-5">
                 <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ShieldCheck size={24} />
                 </div>
                 <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Integrity Level</h4>
                    <p className="text-xl font-black text-slate-900">100% SECURE</p>
                 </div>
              </div>
              <div className="bg-white/40 border border-white/60 p-8 rounded-[40px] flex items-center gap-5">
                 <div className="w-12 h-12 rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00] flex items-center justify-center">
                    <Smartphone size={24} />
                 </div>
                 <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Device Valid</h4>
                    <p className="text-xl font-black text-slate-900">VERIFIED</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar: History */}
        <div className="md:col-span-4 space-y-8">
           <GlassPanel className="bg-white/40 border-dashed border-2 border-slate-200">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-black flex items-center gap-3">
                    <History size={20} className="text-slate-400" />
                    History Terakhir
                 </h3>
              </div>
              
              <div className="space-y-4">
                 {[1,2,3].map(i => (
                   <div key={i} className="bg-white/60 p-4 rounded-3xl border border-white flex justify-between items-center">
                      <div>
                         <p className="text-xs font-black text-slate-900">Produktif TKJ</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase">12 Mei 2024</p>
                      </div>
                      <Badge className="bg-green-500 text-white rounded-lg">HADIR</Badge>
                   </div>
                 ))}
                 <Button variant="ghost" className="w-full font-black text-[10px] text-slate-400 uppercase tracking-widest">Lihat Semua Riwayat</Button>
              </div>
           </GlassPanel>

           <div className="p-8 rounded-[40px] bg-slate-900 text-white relative overflow-hidden">
              <MapPin className="absolute -bottom-4 -right-4 text-white/5" size={100} />
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 leading-none">Security Zone</h4>
              <p className="text-sm font-bold text-white/60 leading-relaxed">
                 Anda sedang dipantau oleh OSDAI Neural Vision untuk memastikan kejujuran presensi.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function RefreshCcw(props: any) {
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
      className="animate-spin" 
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
      <path d="M16 16h5v5"/>
    </svg>
  );
}
