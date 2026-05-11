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
  CheckCircle2,
  Radio,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

interface CatatanPresensi {
  id: string;
  attendanceStatus: string;
  timestamp: string;
  integrityScore: number;
  gpsValidated: boolean;
  student: { user: { name: string } };
}

interface MetrikSesi {
  session: { id: string; token: string; status: string; subject: string; class: string; teacher: string; startTime: string };
  totalStudents: number;
  hadir: number;
  terlambat: number;
  alfa: number;
  invalid: number;
  attendanceRate: number;
  attendances: CatatanPresensi[];
}

export default function IntelligenceDashboard({ authToken }: { authToken: string }) {
  const [sesiAktif, setSesiAktif] = useState<any>(null);
  const [metrik, setMetrik] = useState<MetrikSesi | null>(null);
  const [catatanList, setCatatanList] = useState<CatatanPresensi[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [wawasanAI, setWawasanAI] = useState<string | null>(null);
  const [menganalisis, setMenganalisis] = useState(false);
  const [error, setError] = useState('');

  const [daftarKelas, setDaftarKelas] = useState<any[]>([]);
  const [daftarMapel, setDaftarMapel] = useState<any[]>([]);
  const [kelasId, setKelasId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [mengaktifkan, setMengaktifkan] = useState(false);

  const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const init = async () => {
      try {
        const [kelasRes, mapelRes, sesiRes] = await Promise.all([
          fetch('/api/classes', { headers }),
          fetch('/api/subjects', { headers }),
          fetch('/api/intelligence/my-sessions', { headers }),
        ]);
        if (kelasRes.ok) setDaftarKelas(await kelasRes.json());
        if (mapelRes.ok) setDaftarMapel(await mapelRes.json());
        if (sesiRes.ok) {
          const sesi = await sesiRes.json();
          if (sesi.length > 0) setSesiAktif(sesi[0]);
        }
      } catch { /* no-op */ }
    };
    init();

    const sock = io();
    setSocket(sock);
    return () => { sock.close(); };
  }, [authToken]);

  const ambilMetrik = useCallback(async (sesiId: string) => {
    try {
      const res = await fetch(`/api/intelligence/session/${sesiId}/metrics`, { headers });
      if (res.ok) {
        const data: MetrikSesi = await res.json();
        setMetrik(data);
        setCatatanList(data.attendances);
      }
    } catch { /* no-op */ }
  }, [authToken]);

  useEffect(() => {
    if (sesiAktif && socket) {
      socket.emit('join-session', sesiAktif.id);
      socket.on('attendance-update', (catatan: CatatanPresensi) => {
        setCatatanList(prev => prev.find(a => a.id === catatan.id) ? prev : [catatan, ...prev]);
        ambilMetrik(sesiAktif.id);
      });
      socket.on('session-closed', () => {
        setSesiAktif(null); setMetrik(null); setCatatanList([]);
      });
      ambilMetrik(sesiAktif.id);
    }
    return () => { socket?.off('attendance-update'); socket?.off('session-closed'); };
  }, [sesiAktif, socket, ambilMetrik]);

  const aktifkanSinyal = async () => {
    if (!kelasId || !mapelId) { setError('Pilih kelas dan mata pelajaran terlebih dahulu.'); return; }
    setError(''); setMengaktifkan(true);
    try {
      const res = await fetch('/api/intelligence/signal/activate', {
        method: 'POST', headers,
        body: JSON.stringify({ classId: kelasId, subjectId: mapelId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengaktifkan sinyal presensi.'); return; }
      setSesiAktif(data); setCatatanList([]); setMetrik(null);
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setMengaktifkan(false); }
  };

  const tutupSinyal = async () => {
    if (!sesiAktif) return;
    try {
      const res = await fetch('/api/intelligence/signal/close', {
        method: 'POST', headers,
        body: JSON.stringify({ sessionId: sesiAktif.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menutup sinyal.'); return; }
      setSesiAktif(null); setWawasanAI(null); setCatatanList([]); setMetrik(null);
    } catch { setError('Gagal menutup sesi.'); }
  };

  const jalankanAnalisaAI = async () => {
    if (!sesiAktif) return;
    setMenganalisis(true);
    try {
      const res = await fetch(`/api/intelligence/session/${sesiAktif.id}/ai-insights`, {
        method: 'POST', headers,
      });
      const data = await res.json();
      setWawasanAI(data.insights);
    } catch { setWawasanAI('Gagal memuat analisis AI saat ini.'); }
    finally { setMenganalisis(false); }
  };

  const warnaStatus = (s: string) => {
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
              <Radio size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Sistem Presensi Cerdas</h1>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.25em]">OSDAI Neural Signal · Panel Guru</p>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Aktifkan sinyal presensi dan pantau kehadiran siswa secara langsung.
          </p>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mt-3 text-red-600 text-sm font-bold bg-red-50 px-4 py-3 rounded-2xl border border-red-200"
              >
                <AlertCircle size={16} /> {error}
                <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!sesiAktif ? (
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kelas</label>
              <select
                value={kelasId}
                onChange={e => setKelasId(e.target.value)}
                className="h-12 px-4 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-md font-bold text-sm text-slate-900 min-w-[150px]"
              >
                <option value="">Pilih Kelas</option>
                {daftarKelas.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</label>
              <select
                value={mapelId}
                onChange={e => setMapelId(e.target.value)}
                className="h-12 px-4 rounded-2xl bg-white/60 border border-white/80 backdrop-blur-md font-bold text-sm text-slate-900 min-w-[160px]"
              >
                <option value="">Pilih Mapel</option>
                {daftarMapel.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <Button
              onClick={aktifkanSinyal}
              disabled={mengaktifkan}
              className="h-12 rounded-2xl bg-[#FF6A00] text-white px-6 font-black shadow-xl shadow-orange-900/25 whitespace-nowrap hover:bg-orange-600"
            >
              <Zap size={16} className="mr-2" />
              {mengaktifkan ? 'MENGAKTIFKAN...' : 'AKTIFKAN SINYAL'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Token Sesi · Bagikan ke Siswa</p>
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 20px rgba(255,106,0,0.8)', '0 0 0px rgba(255,106,0,0.4)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Badge className="bg-[#FF6A00] text-white rounded-xl px-6 py-2.5 font-black text-2xl tracking-[0.3em] shadow-lg">
                  {sesiAktif.sessionToken}
                </Badge>
              </motion.div>
            </div>
            <Button
              onClick={tutupSinyal}
              className="h-12 rounded-2xl bg-slate-900 text-white px-6 font-black shadow-xl"
            >
              <Lock size={16} className="mr-2" /> TUTUP SINYAL
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">

          {/* Kartu Metrik */}
          <GlassPanel className="bg-white/40">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Status Kelas Langsung</h3>
                <div className="flex items-center gap-2 mt-1">
                  <motion.div
                    animate={sesiAktif ? { opacity: [1, 0.3, 1] } : { opacity: 0.3 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className={`w-2 h-2 rounded-full ${sesiAktif ? 'bg-green-500' : 'bg-slate-300'}`}
                  />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {sesiAktif ? 'Sinyal Presensi Aktif' : 'Tidak Ada Sesi Aktif'}
                  </p>
                </div>
              </div>
              {sesiAktif && metrik?.session && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Kelas · Mapel</p>
                  <p className="text-sm font-black text-slate-700">{metrik.session.class} · {metrik.session.subject}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Siswa', value: metrik?.totalStudents ?? '—', icon: Users, color: 'text-slate-500' },
                { label: 'Hadir', value: metrik?.hadir ?? '—', icon: CheckCircle2, color: 'text-green-500' },
                { label: 'Terlambat', value: metrik?.terlambat ?? '—', icon: Clock, color: 'text-orange-500' },
                { label: 'Alfa', value: metrik?.alfa ?? '—', icon: Activity, color: 'text-red-400' },
                { label: 'Kehadiran %', value: metrik ? `${Math.round(metrik.attendanceRate)}%` : '—', icon: TrendingUp, color: 'text-blue-500' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white/50 border border-white/60 rounded-[24px] p-5">
                  <item.icon size={18} className={`${item.color} mb-3`} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-2xl font-black text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Antrian Konfirmasi Langsung */}
          <GlassPanel className="bg-slate-900 text-white p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black">Antrian Konfirmasi Langsung</h3>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-black text-[10px] py-1.5 px-4">
                {catatanList.filter(a => a.attendanceStatus !== 'ALFA').length} TERKONFIRMASI
              </Badge>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              <AnimatePresence>
                {catatanList.map((catatan, i) => (
                  <motion.div
                    key={catatan.id}
                    initial={{ opacity: 0, x: -20, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="flex items-center justify-between p-4 rounded-[22px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-black text-white text-sm shadow-lg">
                        {catatan.student.user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-white text-sm">{catatan.student.user.name}</h4>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          {new Date(catatan.timestamp).toLocaleTimeString('id-ID')}
                          {catatan.gpsValidated && <span className="ml-2 text-green-400">✓ GPS Valid</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-white/30 hidden md:block">
                        Integritas: {Math.round(catatan.integrityScore * 100)}%
                      </p>
                      <Badge className={`rounded-xl px-3 py-1.5 font-black text-[10px] ${warnaStatus(catatan.attendanceStatus)}`}>
                        {catatan.attendanceStatus}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {catatanList.length === 0 && (
                <div className="py-16 text-center">
                  <Activity size={36} className="text-white/10 mx-auto mb-4" />
                  <p className="text-sm font-black text-white/30 uppercase tracking-widest">
                    {sesiAktif ? 'Menunggu respons siswa...' : 'Aktifkan sinyal untuk memulai sesi'}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">

          {/* Panel Wawasan AI */}
          <GlassPanel className="bg-white/40 border-slate-900 border shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles size={90} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles size={16} className="text-[#FF6A00]" />
              <Badge variant="outline" className="rounded-full border-slate-300 font-black text-[9px] uppercase tracking-widest">
                Analitik Cerdas OSDAI
              </Badge>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-5">Wawasan Kelas Neural</h3>
            <div className="space-y-5">
              {menganalisis ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-200 rounded-full w-full" />
                  <div className="h-3 bg-slate-200 rounded-full w-5/6" />
                  <div className="h-3 bg-slate-200 rounded-full w-4/6" />
                  <div className="h-3 bg-slate-200 rounded-full w-2/3" />
                </div>
              ) : wawasanAI ? (
                <div className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line bg-white/40 p-5 rounded-[24px] border border-white/50">
                  {wawasanAI}
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 italic bg-white/20 p-5 rounded-[24px] border border-white/40 flex flex-col items-center gap-3 text-center">
                  <BarChart3 size={26} className="opacity-20" />
                  Jalankan analisis mendalam sesi presensi ini menggunakan OSDAI Neural Vision.
                </div>
              )}
              <Button
                onClick={jalankanAnalisaAI}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black hover:scale-[1.01] transition-transform"
                disabled={!sesiAktif || menganalisis}
              >
                {menganalisis
                  ? <><RefreshCcw size={15} className="mr-2 animate-spin" /> MENGANALISIS...</>
                  : <><RefreshCcw size={15} className="mr-2" /> JALANKAN ANALISIS NEURAL</>
                }
              </Button>
            </div>
          </GlassPanel>

          {/* Grafik Partisipasi */}
          <GlassPanel className="bg-white/40">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">
              Grafik Partisipasi Sesi
            </h4>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { name: 'Hadir', v: metrik?.hadir ?? 0 },
                  { name: 'Terlambat', v: metrik?.terlambat ?? 0 },
                  { name: 'Alfa', v: metrik?.alfa ?? 0 },
                  { name: 'Tidak Valid', v: metrik?.invalid ?? 0 },
                ]}>
                  <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', fontWeight: 'bold', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="v" stroke="#FF6A00" strokeWidth={3} dot={{ fill: '#FF6A00', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* Arsip Legal */}
          <div className="p-6 bg-white/40 rounded-[28px] border border-white/60">
            <h4 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-2">
              <ShieldCheck size={16} className="text-green-500" />
              Kepatuhan & Arsip Legal
            </h4>
            <div className="space-y-3">
              <Button
                variant="outline"
                disabled={!sesiAktif}
                className="w-full h-11 rounded-2xl border-white bg-white font-black text-[10px] uppercase tracking-widest text-slate-600 disabled:opacity-40 gap-2"
                onClick={() => sesiAktif && window.open(`/api/intelligence/session/${sesiAktif.id}/metrics`, '_blank')}
              >
                <Download size={13} /> Unduh Rekap Sesi
              </Button>
              <p className="text-[10px] text-slate-400 text-center font-bold">
                Token Sesi: <span className="font-black text-slate-700">{sesiAktif?.sessionToken ?? '—'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
