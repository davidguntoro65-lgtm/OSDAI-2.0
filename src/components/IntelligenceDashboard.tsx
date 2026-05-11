import { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Activity, 
  Users, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  RefreshCcw,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  Lock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceRecord {
  id: string;
  attendanceStatus: string;
  timestamp: string;
  integrityScore: number;
  gpsValidated: boolean;
  student: { user: { name: string } };
}

interface SessionMetrics {
  session: { id: string; token: string; status: string; subject: string; class: string; teacher: string; startTime: string };
  totalStudents: number;
  hadir: number;
  terlambat: number;
  alfa: number;
  invalid: number;
  attendanceRate: number;
  attendances: AttendanceRecord[];
}

export default function IntelligenceDashboard({ authToken }: { authToken: string }) {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [activating, setActivating] = useState(false);

  const authHeaders = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [classesRes, subjectsRes, mySessionsRes] = await Promise.all([
          fetch('/api/classes', { headers: authHeaders }),
          fetch('/api/subjects', { headers: authHeaders }),
          fetch('/api/intelligence/my-sessions', { headers: authHeaders })
        ]);
        if (classesRes.ok) setAvailableClasses(await classesRes.json());
        if (subjectsRes.ok) setAvailableSubjects(await subjectsRes.json());
        if (mySessionsRes.ok) {
          const sessions = await mySessionsRes.json();
          if (sessions.length > 0) setActiveSession(sessions[0]);
        }
      } catch { /* no-op */ }
    };
    fetchContext();

    const newSocket = io();
    setSocket(newSocket);
    return () => { newSocket.close(); };
  }, [authToken]);

  const fetchMetrics = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/intelligence/session/${sessionId}/metrics`, { headers: authHeaders });
      if (res.ok) {
        const data: SessionMetrics = await res.json();
        setMetrics(data);
        setAttendances(data.attendances);
      }
    } catch { /* no-op */ }
  }, [authToken]);

  useEffect(() => {
    if (activeSession && socket) {
      socket.emit('join-session', activeSession.id);
      socket.on('attendance-update', (attendance: AttendanceRecord) => {
        setAttendances(prev => {
          // Deduplicate by id
          const exists = prev.find(a => a.id === attendance.id);
          return exists ? prev : [attendance, ...prev];
        });
        fetchMetrics(activeSession.id);
      });
      socket.on('session-closed', () => {
        setActiveSession(null);
        setMetrics(null);
        setAttendances([]);
      });
      fetchMetrics(activeSession.id);
    }
    return () => {
      socket?.off('attendance-update');
      socket?.off('session-closed');
    };
  }, [activeSession, socket, fetchMetrics]);

  const activateSignal = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError('Pilih kelas dan mata pelajaran terlebih dahulu.');
      return;
    }
    setError('');
    setActivating(true);
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ classId: selectedClassId, subjectId: selectedSubjectId })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengaktifkan sinyal'); return; }
      setActiveSession(data);
      setAttendances([]);
      setMetrics(null);
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setActivating(false);
    }
  };

  const closeSignal = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch('/api/intelligence/signal/close', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ sessionId: activeSession.id })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menutup sinyal'); return; }
      setActiveSession(null);
      setAiInsights(null);
      setAttendances([]);
      setMetrics(null);
    } catch {
      setError('Gagal menutup sesi.');
    }
  };

  const runAiAnalysis = async () => {
    if (!activeSession) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/intelligence/session/${activeSession.id}/ai-insights`, {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      setAiInsights(data.insights);
    } catch {
      setAiInsights("Gagal menganalisis data saat ini.");
    } finally {
      setAnalyzing(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'HADIR') return 'bg-green-500 text-white';
    if (s === 'TERLAMBAT') return 'bg-orange-500 text-white';
    if (s === 'ALFA') return 'bg-slate-500 text-white';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
              <BrainCircuit size={22} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Neural Intelligence</h1>
          </div>
          <p className="text-sm font-bold text-slate-400">Integrated Classroom Performance & Presence Engine.</p>
          {error && (
            <div className="flex items-center gap-2 mt-3 text-red-600 text-sm font-bold bg-red-50 px-4 py-2 rounded-2xl border border-red-200">
              <AlertCircle size={16} /> {error}
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
        </div>
        
        {!activeSession ? (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="h-12 px-4 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-md font-bold text-sm text-slate-900 min-w-[160px]"
              >
                <option value="">Pilih Kelas</option>
                {availableClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="h-12 px-4 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-md font-bold text-sm text-slate-900 min-w-[160px]"
              >
                <option value="">Pilih Mapel</option>
                {availableSubjects.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={activateSignal}
              disabled={activating}
              className="h-12 rounded-2xl bg-[#FF6A00] text-white px-6 font-black shadow-xl shadow-orange-900/30 whitespace-nowrap"
            >
              <Zap size={16} className="mr-2" />
              {activating ? 'MENGAKTIFKAN...' : 'AKTIFKAN SINYAL'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Token (bagikan ke siswa)</p>
              <Badge className="bg-[#FF6A00] text-white rounded-xl px-5 py-2 font-black text-2xl tracking-widest shadow-lg">
                {activeSession.sessionToken}
              </Badge>
            </div>
            <Button
              onClick={closeSignal}
              className="h-12 rounded-2xl bg-black text-white px-6 font-black shadow-xl"
            >
              <Lock size={16} className="mr-2" /> TUTUP SINYAL
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Live Status + Confirmation List */}
        <div className="lg:col-span-8 space-y-8">
          {/* Metric Cards */}
          <GlassPanel className="bg-white/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Live Class Status</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {activeSession ? 'Sinyal Aktif' : 'Tidak Ada Sesi Aktif'}
                  </p>
                </div>
              </div>
              {activeSession && metrics?.session && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kelas • Mapel</p>
                  <p className="text-sm font-black text-slate-700">{metrics.session.class} • {metrics.session.subject}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Siswa', value: metrics?.totalStudents ?? '—', icon: Users, color: 'slate' },
                { label: 'Hadir', value: metrics?.hadir ?? '—', icon: CheckCircle2, color: 'green' },
                { label: 'Terlambat', value: metrics?.terlambat ?? '—', icon: Clock, color: 'orange' },
                { label: 'Alfa', value: metrics?.alfa ?? '—', icon: Activity, color: 'red' },
                { label: 'Kehadiran %', value: metrics ? `${Math.round(metrics.attendanceRate)}%` : '—', icon: TrendingUp, color: 'blue' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white/40 border border-white/60 rounded-[28px] p-5">
                  <item.icon size={18} className={`text-${item.color}-500 mb-3`} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Live Confirmation Queue */}
          <GlassPanel className="bg-slate-900 text-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black">Live Confirmation Queue</h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-black text-[10px] py-1 px-4">
                {attendances.filter(a => a.attendanceStatus !== 'ALFA').length} RESPONDED
              </Badge>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
              <AnimatePresence>
                {attendances.map((att, i) => (
                  <motion.div
                    key={att.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.5) }}
                    className="flex items-center justify-between p-4 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6A00] flex items-center justify-center font-black text-white text-sm shadow-lg">
                        {att.student.user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm">{att.student.user.name}</h4>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          {new Date(att.timestamp).toLocaleTimeString('id-ID')}
                          {att.gpsValidated && <span className="ml-2 text-green-400">✓ GPS</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-white/30 hidden md:block">
                        Integrity: {Math.round(att.integrityScore * 100)}%
                      </p>
                      <Badge className={`rounded-xl px-3 py-1.5 font-black text-[10px] ${statusColor(att.attendanceStatus)}`}>
                        {att.attendanceStatus}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {attendances.length === 0 && (
                <div className="py-16 text-center">
                  <Activity size={40} className="text-white/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-white/30 uppercase tracking-widest">
                    {activeSession ? 'Menunggu respons siswa...' : 'Aktifkan sinyal untuk memulai'}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Right: AI Insights + Chart + Export */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Insight Panel */}
          <GlassPanel className="bg-white/40 border-slate-900 border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles size={100} />
            </div>
            <div className="flex items-center gap-3 mb-5">
              <Sparkles size={18} className="text-[#FF6A00]" />
              <Badge variant="outline" className="rounded-full border-slate-400 font-black text-[10px]">AI ADVISORY</Badge>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-5">Neural Classroom Insights</h3>
            <div className="space-y-5">
              {analyzing ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-5/6" />
                  <div className="h-3 bg-slate-200 rounded w-4/6" />
                  <div className="h-3 bg-slate-200 rounded w-3/6" />
                </div>
              ) : aiInsights ? (
                <div className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line bg-white/30 p-5 rounded-[28px] border border-white/40">
                  {aiInsights}
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 italic bg-white/20 p-5 rounded-[28px] border border-white/40 flex flex-col items-center gap-3 text-center">
                  <BarChart3 size={28} className="opacity-20" />
                  Generate analisis perilaku mendalam sesi ini menggunakan OSDAI Neural Vision.
                </div>
              )}
              <Button
                onClick={runAiAnalysis}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black hover:scale-[1.02] transition-transform"
                disabled={!activeSession || analyzing}
              >
                {analyzing
                  ? <><RefreshCcw size={16} className="mr-2 animate-spin" /> MENGANALISIS...</>
                  : <><RefreshCcw size={16} className="mr-2" /> RUN NEURAL ANALYSIS</>
                }
              </Button>
            </div>
          </GlassPanel>

          {/* Attendance Rate Chart */}
          <GlassPanel className="bg-white/40">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Participation Rate (Session)</h4>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { name: 'Hadir', v: metrics?.hadir ?? 0 },
                  { name: 'Terlambat', v: metrics?.terlambat ?? 0 },
                  { name: 'Alfa', v: metrics?.alfa ?? 0 },
                  { name: 'Invalid', v: metrics?.invalid ?? 0 },
                ]}>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="v" stroke="#FF6A00" strokeWidth={3} dot={{ fill: '#FF6A00', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* Legal Archive */}
          <div className="p-6 bg-[#F8F8F7] rounded-[32px] border border-white/60">
            <h4 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-3">
              <ShieldCheck size={18} className="text-green-500" />
              Legal Compliance Archive
            </h4>
            <div className="space-y-3">
              <Button
                variant="outline"
                disabled={!activeSession}
                className="w-full h-11 rounded-2xl border-white bg-white font-black text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-40"
                onClick={() => activeSession && window.open(`/api/intelligence/session/${activeSession.id}/metrics`, '_blank')}
              >
                Lihat Rekap Sesi
              </Button>
              <p className="text-[10px] text-slate-400 text-center font-bold">
                Token: <span className="font-black text-slate-700">{activeSession?.sessionToken ?? '—'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
