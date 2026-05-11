import { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Activity, 
  Users, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  RefreshCcw,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function IntelligenceDashboard({ authToken }: { authToken: string }) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Selection for starting session
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    // Initial fetch of classes
    const fetchContext = async () => {
      const classesRes = await fetch('/api/classes', { headers: { 'Authorization': `Bearer ${authToken}` } });
      const classes = await classesRes.json();
      setAvailableClasses(classes);
    };
    fetchContext();

    // Socket Setup
    const newSocket = io();
    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, [authToken]);

  const fetchMetrics = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/intelligence/session/${sessionId}/metrics`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    setMetrics(data);
    setAttendances(data.attendances);
  }, [authToken]);

  useEffect(() => {
    if (activeSession && socket) {
      socket.emit('join-session', activeSession.id);
      socket.on('attendance-update', (attendance) => {
        setAttendances(prev => [attendance, ...prev]);
        fetchMetrics(activeSession.id);
      });
      fetchMetrics(activeSession.id);
    }
    return () => { socket?.off('attendance-update'); };
  }, [activeSession, socket, fetchMetrics]);

  const activateSignal = async () => {
    if (!selectedClassId || !selectedSubjectId) return alert('Pilih kelas dan mata pelajaran');
    
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ classId: selectedClassId, subjectId: selectedSubjectId })
      });
      const session = await res.json();
      setActiveSession(session);
    } catch (err) {
      alert('Gagal mengaktifkan sinyal');
    }
  };

  const closeSignal = async () => {
    if (!activeSession) return;
    try {
      await fetch('/api/intelligence/signal/close', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId: activeSession.id })
      });
      setActiveSession(null);
      setAiInsights(null);
    } catch (err) {
      alert('Gagal menutup sinyal');
    }
  };

  const runAiAnalysis = async () => {
    if (!activeSession) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/intelligence/session/${activeSession.id}/ai-insights`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setAiInsights(data.insights);
    } catch (err) {
      setAiInsights("Gagal menganalisis data saat ini.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center active-glow-orange shadow-lg">
                 <BrainCircuit size={22} />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Neural Intelligence</h1>
           </div>
           <p className="text-sm font-bold text-slate-400">Integrated Classroom Performance & Presence Engine.</p>
        </div>
        
        {!activeSession ? (
          <div className="flex gap-4">
             <select 
               value={selectedClassId} 
               onChange={(e) => setSelectedClassId(e.target.value)}
               className="h-14 px-6 rounded-2xl bg-white/40 border-white/60 backdrop-blur-md font-black text-sm text-slate-900 border"
             >
               <option value="">PILIH KELAS</option>
               {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
             <select 
               value={selectedSubjectId} 
               onChange={(e) => setSelectedSubjectId(e.target.value)}
               className="h-14 px-6 rounded-2xl bg-white/40 border-white/60 backdrop-blur-md font-black text-sm text-slate-900 border"
             >
               <option value="">PILIH MAPEL</option>
               {/* Simplified mapping as we don't have separate mapel fetch yet in this component */}
               <option value="subject-id-placeholder">Mata Pelajaran Contoh</option>
             </select>
             <Button onClick={activateSignal} className="h-14 rounded-2xl bg-[#FF6A00] text-white px-8 font-black shadow-xl shadow-orange-900/30">
               <Zap size={18} className="mr-2" /> AKTIFKAN SINYAL
             </Button>
          </div>
        ) : (
          <Button onClick={closeSignal} className="h-14 rounded-2xl bg-black text-white px-8 font-black shadow-xl transition-all">
             <Lock size={18} className="mr-2" /> TUTUP SINYAL KELAS
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Status & Confirmation List */}
        <div className="lg:col-span-8 space-y-8">
          {/* Live Status Card */}
          <GlassPanel className="bg-white/40">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-1">Live Class Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Real-time Stream Active</p>
                  </div>
               </div>
               {activeSession && (
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Token</p>
                    <Badge className="bg-slate-900 text-white rounded-lg px-4 py-1.5 font-black text-lg">{activeSession.sessionToken}</Badge>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Siswa', value: metrics?.totalStudents || 0, icon: Users, color: 'slate' },
                { label: 'Siswa Hadir', value: metrics?.hadir || 0, icon: ShieldCheck, color: 'green' },
                { label: 'Terlambat', value: metrics?.terlambat || 0, icon: Clock, color: 'orange' },
                { label: 'Kehadiran %', value: `${Math.round(metrics?.attendanceRate || 0)}%`, icon: TrendingUp, color: 'blue' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white/40 border border-white/60 rounded-[32px] p-6">
                  <item.icon size={20} className={`text-${item.color}-500 mb-4`} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Realtime Confirmation List */}
          <GlassPanel className="bg-slate-900 text-white p-10">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-black">Live Confirmation Queue</h3>
               <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-black text-[10px] py-1 px-4">
                 {attendances.length} CONFIRMED
               </Badge>
             </div>

             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
               {attendances.map((att, i) => (
                 <motion.div 
                   key={att.id}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="flex items-center justify-between p-5 rounded-[28px] bg-white/5 border border-white/10 group hover:bg-white/10"
                 >
                   <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF6A00] flex items-center justify-center font-black text-white shadow-lg shadow-orange-900/20 group-hover:scale-110 transition-transform">
                         {att.student.user.name.charAt(0)}
                      </div>
                      <div>
                         <h4 className="font-black text-white">{att.student.user.name}</h4>
                         <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{new Date(att.timestamp).toLocaleTimeString()}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                         <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Integrity</p>
                         <p className="text-xs font-black text-green-400 uppercase">Validated</p>
                      </div>
                      <Badge className={`rounded-xl px-4 py-2 font-black text-[10px] shadow-sm ${
                        att.attendanceStatus === 'HADIR' ? 'bg-green-500 text-white' : 
                        att.attendanceStatus === 'TERLAMBAT' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {att.attendanceStatus}
                      </Badge>
                   </div>
                 </motion.div>
               ))}
               {attendances.length === 0 && (
                 <div className="py-20 text-center">
                    <Activity size={48} className="text-white/10 mx-auto mb-4" />
                    <p className="text-sm font-black text-white/30 uppercase tracking-widest">Waiting for responses...</p>
                 </div>
               )}
             </div>
          </GlassPanel>
        </div>

        {/* Right Column: AI Insights & Analytics */}
        <div className="lg:col-span-4 space-y-8">
           {/* AI Insight Panel */}
           <GlassPanel className="bg-white/40 border-slate-900 border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Sparkles size={120} />
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                 <Sparkles size={20} className="text-[#FF6A00]" />
                 <Badge variant="outline" className="rounded-full border-slate-400 font-black text-[10px]">AI ADVISORY</Badge>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-6">Neural Classroom Insights</h3>

              <div className="space-y-6">
                 {analyzing ? (
                   <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-5/6" />
                      <div className="h-4 bg-slate-200 rounded w-4/6" />
                   </div>
                 ) : aiInsights ? (
                   <div className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line bg-white/20 p-6 rounded-[32px] border border-white/40">
                      {aiInsights}
                   </div>
                 ) : (
                   <div className="text-sm font-bold text-slate-400 italic bg-white/20 p-6 rounded-[32px] border border-white/40 flex flex-col items-center gap-4 text-center">
                      <BarChart3 size={32} className="opacity-20" />
                      Generate deep behavioral analysis of this session using OSDAI Neural Vision.
                   </div>
                 )}

                 <Button 
                   onClick={runAiAnalysis}
                   className="w-full h-14 rounded-3xl bg-slate-900 text-white font-black hover:scale-[1.02] transition-transform"
                   disabled={!activeSession || analyzing}
                 >
                   {analyzing ? <Loader2 className="animate-spin" /> : <RefreshCcw size={18} className="mr-2" />}
                   RUN NEURAL ANALYSIS
                 </Button>
              </div>
           </GlassPanel>

           {/* Quick Analytics Chart */}
           <GlassPanel className="bg-white/40">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 leading-none">Weekly Participation Heatmap</h4>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: 'Mon', engagement: 65 },
                    { name: 'Tue', engagement: 45 },
                    { name: 'Wed', engagement: 85 },
                    { name: 'Thu', engagement: 70 },
                    { name: 'Fri', engagement: 90 },
                  ]}>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="engagement" stroke="#FF6A00" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </GlassPanel>

           {/* Official Archiving */}
           <div className="p-8 bg-[#F8F8F7] rounded-[40px] border border-white/60">
              <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-3">
                 <ShieldCheck size={20} className="text-green-500" />
                 Legal Compliance Archive
              </h4>
              <div className="space-y-4">
                 <Button variant="outline" className="w-full h-12 rounded-2xl border-white bg-white font-black text-[10px] uppercase tracking-widest text-slate-600">
                    Export Session PDF
                 </Button>
                 <Button variant="outline" className="w-full h-12 rounded-2xl border-white bg-white font-black text-[10px] uppercase tracking-widest text-slate-600">
                    Sync to Digital Signature
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Loader2(props: any) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
