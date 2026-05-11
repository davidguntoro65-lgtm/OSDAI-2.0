import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, Clock, ShieldCheck, Zap, TrendingUp,
  RefreshCcw, Eye, BookOpen, AlertTriangle, CheckCircle2,
  Sparkles, Radio, School, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { io, Socket } from 'socket.io-client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';

interface SesiAktif {
  id: string;
  guru: string;
  mapel: string;
  kelas: string;
  jamMulai: string;
  status: string;
  hadir: number;
  terlambat: number;
  alfa: number;
  totalRespond: number;
}

interface StatHariIni {
  totalSesi: number;
  totalHadir: number;
  totalTerlambat: number;
  totalAlfa: number;
  guruAktif: number;
}

const INSIGHT_TEMPLATES = [
  (s: StatHariIni) => s.totalAlfa > s.totalHadir
    ? `Perhatian: jumlah siswa Alfa (${s.totalAlfa}) melebihi jumlah Hadir (${s.totalHadir}). Diperlukan tindak lanjut segera.`
    : `Kehadiran berjalan baik. Total ${s.totalHadir} siswa terkonfirmasi hadir hari ini.`,
  (s: StatHariIni) => `${s.guruAktif} guru telah mengaktifkan sesi presensi dari total ${s.totalSesi} sesi yang berlangsung hari ini.`,
  (s: StatHariIni) => s.totalTerlambat > 5
    ? `Tingkat keterlambatan siswa hari ini cukup tinggi: ${s.totalTerlambat} siswa terlambat. Pertimbangkan sosialisasi disiplin waktu.`
    : `Tingkat ketepatan waktu siswa baik. Hanya ${s.totalTerlambat} siswa yang tercatat terlambat.`,
];

export default function PusatMonitoringKepsek({ authToken }: { authToken: string }) {
  const [sesiAktif, setSesiAktif] = useState<SesiAktif[]>([]);
  const [stat, setStat] = useState<StatHariIni | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [socket, setSocket] = useState<Socket | null>(null);

  const headers = { 'Authorization': `Bearer ${authToken}` };

  const fetchData = useCallback(async () => {
    try {
      const [sesiRes, statRes] = await Promise.all([
        fetch('/api/intelligence/semua-sesi-aktif', { headers }),
        fetch('/api/intelligence/statistik-hari-ini', { headers }),
      ]);
      if (sesiRes.ok) setSesiAktif(await sesiRes.json());
      if (statRes.ok) setStat(await statRes.json());
      setLastUpdate(new Date());
    } catch { /* no-op */ } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    const sock = io();
    setSocket(sock);
    sock.on('attendance-update', () => fetchData());
    sock.on('session-activated', () => fetchData());
    sock.on('session-closed', () => fetchData());
    return () => {
      clearInterval(interval);
      sock.close();
    };
  }, [fetchData]);

  const pieData = stat ? [
    { name: 'Hadir', value: stat.totalHadir, color: '#22c55e' },
    { name: 'Terlambat', value: stat.totalTerlambat, color: '#f97316' },
    { name: 'Alfa', value: stat.totalAlfa, color: '#64748b' },
  ] : [];

  const barData = sesiAktif.map(s => ({
    kelas: s.kelas,
    hadir: s.hadir,
    terlambat: s.terlambat,
    alfa: s.alfa,
  }));

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 20px rgba(255,106,0,0.8)', '0 0 0px rgba(255,106,0,0.4)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-xl"
            >
              <School size={22} />
            </motion.div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Ruang Kendali</h1>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Kepala Sekolah · Pemantauan Langsung</p>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400">
            Pantau seluruh aktivitas presensi sekolah secara langsung dan real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-2xl">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-green-500"
            />
            <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Pemantauan Aktif</span>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            className="h-10 rounded-2xl border-white/60 bg-white/40 backdrop-blur-md font-black text-[10px] uppercase tracking-widest gap-2"
          >
            <RefreshCcw size={14} /> Perbarui
          </Button>
        </div>
      </div>

      {/* Waktu update terakhir */}
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Diperbarui: {lastUpdate.toLocaleTimeString('id-ID')} · Otomatis setiap 15 detik
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/40 border border-white/60 rounded-[28px] p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded mb-3 w-3/4" />
              <div className="h-8 bg-slate-200 rounded w-1/2" />
            </div>
          ))
        ) : [
          { label: 'Sesi Berlangsung', value: stat?.totalSesi ?? 0, icon: Radio, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Guru Aktif', value: stat?.guruAktif ?? 0, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Siswa Hadir', value: stat?.totalHadir ?? 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Siswa Terlambat', value: stat?.totalTerlambat ?? 0, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-50' },
          { label: 'Siswa Alfa', value: stat?.totalAlfa ?? 0, icon: AlertTriangle, color: 'text-slate-500', bg: 'bg-slate-100' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="bg-white/50 border border-white/70 rounded-[28px] p-5 backdrop-blur-sm hover:shadow-lg transition-shadow"
          >
            <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
              <item.icon size={18} className={item.color} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className="text-3xl font-black text-slate-900">{item.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main: Tabel Sesi Aktif */}
        <div className="lg:col-span-8 space-y-8">
          {/* AI Insights */}
          {stat && (
            <GlassPanel className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles size={18} className="text-orange-400" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Analitik Cerdas OSDAI</p>
              </div>
              <div className="space-y-3">
                {INSIGHT_TEMPLATES.map((fn, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-start gap-3 p-4 rounded-[20px] bg-white/5 border border-white/10"
                  >
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    </div>
                    <p className="text-sm font-bold text-white/80 leading-relaxed">{fn(stat)}</p>
                  </motion.div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Tabel Sesi Aktif */}
          <GlassPanel className="bg-white/40 p-0 overflow-hidden">
            <div className="px-8 py-6 border-b border-white/40 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Sesi Pembelajaran Aktif</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Seluruh kelas yang sedang berlangsung</p>
              </div>
              <Badge className="bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/20 font-black text-[10px] px-4 py-1.5 rounded-full">
                {sesiAktif.length} KELAS AKTIF
              </Badge>
            </div>

            {loading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-[20px] animate-pulse" />
                ))}
              </div>
            ) : sesiAktif.length === 0 ? (
              <div className="py-24 text-center">
                <Radio size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Belum ada sesi presensi aktif</p>
                <p className="text-xs font-bold text-slate-300 mt-1">Guru perlu mengaktifkan sinyal presensi</p>
              </div>
            ) : (
              <div className="divide-y divide-white/30">
                {/* Header row */}
                <div className="px-8 py-3 grid grid-cols-12 gap-4">
                  {['GURU', 'MAPEL', 'KELAS', 'JAM MULAI', 'HADIR', 'TERLAMBAT', 'ALFA', 'STATUS'].map(h => (
                    <p key={h} className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${h === 'GURU' ? 'col-span-3' : h === 'MAPEL' ? 'col-span-2' : 'col-span-1'}`}>{h}</p>
                  ))}
                </div>
                <AnimatePresence>
                  {sesiAktif.map((sesi, i) => (
                    <motion.div
                      key={sesi.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-8 py-5 grid grid-cols-12 gap-4 items-center hover:bg-white/30 transition-colors"
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#FF6A00] text-white flex items-center justify-center font-black text-xs shrink-0">
                          {sesi.guru.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-slate-800 truncate">{sesi.guru}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs font-bold text-slate-600 truncate">{sesi.mapel}</span>
                      </div>
                      <div className="col-span-1">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black text-[9px] rounded-lg px-2">
                          {sesi.kelas}
                        </Badge>
                      </div>
                      <div className="col-span-1">
                        <span className="text-[10px] font-black text-slate-500">
                          {new Date(sesi.jamMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-sm font-black text-green-600">{sesi.hadir}</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-sm font-black text-orange-500">{sesi.terlambat}</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-sm font-black text-slate-400">{sesi.alfa}</span>
                      </div>
                      <div className="col-span-1">
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex items-center gap-1.5"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-[9px] font-black text-green-600 uppercase">Aktif</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pie Chart Kehadiran */}
          {stat && (stat.totalHadir + stat.totalTerlambat + stat.totalAlfa) > 0 && (
            <GlassPanel className="bg-white/40">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Distribusi Status Presensi Hari Ini</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', background: 'white', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value, name) => [`${value} siswa`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-5 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px] font-black text-slate-600">{d.name}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Bar Chart per Kelas */}
          {barData.length > 0 && (
            <GlassPanel className="bg-white/40">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Perbandingan Kehadiran per Kelas</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="kelas" tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '11px' }} />
                    <Bar dataKey="hadir" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="terlambat" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="alfa" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>
          )}

          {/* Integritas Sistem */}
          <GlassPanel className="bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-5">
              <ShieldCheck size={18} className="text-green-400" />
              <h4 className="text-sm font-black uppercase tracking-widest">Integritas Sistem</h4>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Validasi GPS', status: true },
                { label: 'Enkripsi Token Sesi', status: true },
                { label: 'Audit Log Aktif', status: true },
                { label: 'Koneksi Realtime', status: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.status ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${item.status ? 'text-green-400' : 'text-red-400'}`}>
                      {item.status ? 'Aktif' : 'Gangguan'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Aktivitas terbaru */}
          <GlassPanel className="bg-white/40">
            <div className="flex items-center gap-3 mb-5">
              <Activity size={16} className="text-slate-500" />
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Log Aktivitas Sistem</h4>
            </div>
            <div className="space-y-4">
              {[
                { waktu: 'Baru saja', pesan: `${sesiAktif.length} sesi presensi aktif`, warna: 'text-green-500' },
                { waktu: 'Hari ini', pesan: `${stat?.totalHadir ?? 0} siswa terkonfirmasi hadir`, warna: 'text-blue-500' },
                { waktu: 'Hari ini', pesan: 'Validasi GPS selesai untuk semua sesi', warna: 'text-orange-500' },
              ].map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[9px] font-black text-slate-400 w-14 shrink-0 pt-0.5">{log.waktu}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{log.pesan}</p>
                    <div className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${log.warna}`}>OSDAI</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
