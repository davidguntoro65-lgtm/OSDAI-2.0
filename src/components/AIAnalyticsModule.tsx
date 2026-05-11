import { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  BrainCircuit,
  ArrowRight,
  ShieldCheck,
  Activity,
  Sparkles,
  Download,
  RefreshCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function AIAnalyticsModule({ authToken }: { authToken: string }) {
  const [stats, setStats] = useState<any>(null);
  const [siswaBerisiko, setSiswaBerisiko] = useState<any[]>([]);
  const [kinerjGuru, setKinerjaGuru] = useState<any[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [analisaAI, setAnalisaAI] = useState<string | null>(null);
  const [menganalisis, setMenganalisis] = useState(false);

  const headers = { 'Authorization': `Bearer ${authToken}` };

  useEffect(() => { ambilSemuaData(); }, []);

  const ambilSemuaData = async () => {
    setMemuat(true);
    try {
      const [statsRes, risikoRes, guruRes] = await Promise.all([
        fetch('/api/analytics/overall-stats', { headers }),
        fetch('/api/analytics/risk-students', { headers }),
        fetch('/api/analytics/teacher-performance', { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (risikoRes.ok) setSiswaBerisiko(await risikoRes.json());
      if (guruRes.ok) setKinerjaGuru(await guruRes.json());
    } catch (err) {
      console.error('Gagal memuat data analitik:', err);
    } finally {
      setMemuat(false);
    }
  };

  const jalankanAnalisaAI = async () => {
    setMenganalisis(true);
    // Simulasi analisis lokal (Gemini API key belum dikonfigurasi)
    await new Promise(r => setTimeout(r, 1500));
    const jmlSiswa = stats?.studentCount ?? 0;
    const jmlGuru = stats?.teacherCount ?? 0;
    const jmlBerisiko = siswaBerisiko.length;
    setAnalisaAI(
      `RINGKASAN EKSEKUTIF OSDAI\n\n` +
      `• Jumlah siswa aktif: ${jmlSiswa} siswa terdaftar dalam sistem.\n` +
      `• Jumlah tenaga pendidik: ${jmlGuru} guru aktif mengajar.\n` +
      (jmlBerisiko > 0
        ? `• Perhatian: Terdapat ${jmlBerisiko} siswa teridentifikasi berisiko tinggi. Disarankan BK segera melakukan pendampingan individual.\n`
        : `• Kondisi kehadiran: Tidak ada siswa dengan risiko tinggi. Sistem berjalan normal.\n`) +
      `• Rekomendasi: Lanjutkan pemantauan rutin melalui Ruang Kendali Kepala Sekolah untuk memastikan konsistensi kehadiran.`
    );
    setMenganalisis(false);
  };

  const dataKehadiran = useMemo(() => {
    if (!stats?.attendance) return [];
    const labelMap: Record<string, string> = {
      HADIR: 'Hadir',
      TERLAMBAT: 'Terlambat',
      ALFA: 'Alfa',
      PRESENT: 'Hadir',
      ABSENT: 'Alfa',
      LATE: 'Terlambat',
    };
    const warnaPeta: Record<string, string> = {
      Hadir: '#22c55e',
      Terlambat: '#f97316',
      Alfa: '#64748b',
    };
    return stats.attendance.map((a: any) => {
      const label = labelMap[a.status] || a.status;
      return { name: label, jumlah: a._count, fill: warnaPeta[label] || '#94a3b8' };
    });
  }, [stats]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
              <BrainCircuit size={18} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Analitik Pembelajaran</h1>
          </div>
          <p className="text-sm font-bold text-slate-400">
            Intelijen sekolah real-time · Penilaian risiko prediktif · Optimasi sumber daya.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={ambilSemuaData}
            variant="outline"
            className="rounded-2xl border-white/60 bg-white/40 h-12 px-6 font-black text-[10px] uppercase tracking-widest gap-2"
          >
            <RefreshCcw size={14} /> Perbarui Data
          </Button>
          <Button
            onClick={jalankanAnalisaAI}
            disabled={menganalisis || memuat}
            className="rounded-2xl bg-slate-900 text-white h-12 px-6 font-black shadow-lg flex items-center gap-2 hover:bg-slate-800"
          >
            {menganalisis
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menganalisis...</>
              : <><Sparkles size={16} /> Wawasan Cerdas</>
            }
          </Button>
        </div>
      </div>

      {/* Kartu Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Siswa Aktif', value: stats?.studentCount ?? 0, icon: Users, warna: 'blue' },
          { label: 'Guru Aktif', value: stats?.teacherCount ?? 0, icon: Activity, warna: 'orange' },
          { label: 'Pendapatan SPP', value: `Rp ${(stats?.revenue ?? 0).toLocaleString('id-ID')}`, icon: TrendingUp, warna: 'green' },
          { label: 'Siswa Berisiko', value: siswaBerisiko.length, icon: AlertTriangle, warna: 'red' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <Card className="rounded-[28px] border-white/60 bg-white/50 backdrop-blur-sm shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl bg-${item.warna}-50`}>
                    <item.icon size={20} className={`text-${item.warna}-500`} />
                  </div>
                </div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{memuat ? '—' : item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">

          {/* Grafik Kehadiran */}
          <GlassPanel className="bg-white/40 p-8 rounded-[36px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900">Status Presensi Hari Ini</h3>
                <p className="text-xs font-bold text-slate-400">Rekap kehadiran seluruh kelas per kategori status.</p>
              </div>
              <button className="p-2 rounded-xl hover:bg-white/50 transition-colors text-slate-400">
                <Download size={16} />
              </button>
            </div>
            <div className="h-[280px] w-full">
              {memuat ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
                </div>
              ) : dataKehadiran.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataKehadiran}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0EE" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="jumlah" radius={[10, 10, 0, 0]}>
                      {dataKehadiran.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 font-black text-sm uppercase tracking-widest">
                  Belum ada data presensi hari ini
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Siswa Berisiko */}
          <div className="bg-slate-900 rounded-[40px] p-8 text-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Intelijen Siswa Berisiko</h3>
                <p className="text-sm font-bold text-white/50">Sistem peringatan dini potensi putus sekolah.</p>
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-1.5 px-4 font-black">
                {siswaBerisiko.length} PERINGATAN
              </Badge>
            </div>

            <div className="space-y-4">
              {memuat ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : siswaBerisiko.length > 0 ? siswaBerisiko.map(siswa => (
                <motion.div
                  key={siswa.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center font-black text-white/60 text-lg">
                      {siswa.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-white">{siswa.name}</h4>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{siswa.class}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black uppercase text-white/30">Kehadiran</p>
                      <p className={`text-sm font-black ${siswa.attendanceRate < 50 ? 'text-red-400' : 'text-orange-400'}`}>
                        {siswa.attendanceRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black uppercase text-white/30">Rata Nilai</p>
                      <p className="text-sm font-black text-white">{siswa.avgGrade.toFixed(1)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-16 text-center text-white/30 font-black uppercase tracking-widest text-sm">
                  <ShieldCheck size={36} className="mx-auto mb-4 opacity-20" />
                  Semua sistem hijau. Tidak ada siswa dalam kondisi darurat.
                </div>
              )}
            </div>

            {siswaBerisiko.length > 0 && (
              <Button className="w-full mt-8 h-12 rounded-2xl bg-white text-black font-black hover:bg-slate-100 transition-colors">
                Lihat Penilaian Risiko Lengkap
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Analitik */}
        <div className="lg:col-span-4 space-y-6">

          {/* Panel AI Strategy */}
          <Card className="rounded-[36px] border-slate-900 border-2 shadow-2xl relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap size={110} />
            </div>
            <CardHeader className="relative z-10 px-8 pt-8 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-slate-900" />
                <Badge variant="outline" className="rounded-full border-slate-900 font-black text-[9px] uppercase tracking-widest">
                  Didukung AI
                </Badge>
              </div>
              <CardTitle className="text-2xl font-black text-slate-900">Rekomendasi Strategis</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {menganalisis ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded-full w-full" />
                  <div className="h-3 bg-slate-100 rounded-full w-5/6" />
                  <div className="h-3 bg-slate-100 rounded-full w-4/6" />
                  <div className="h-3 bg-slate-100 rounded-full w-3/5" />
                </div>
              ) : analisaAI ? (
                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-line">{analisaAI}</p>
              ) : (
                <p className="text-sm font-bold text-slate-400 italic">
                  Klik "Wawasan Cerdas" untuk menghasilkan laporan kinerja sekolah berbasis OSDAI AI.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Kinerja Guru */}
          {kinerjGuru.length > 0 && (
            <GlassPanel className="bg-white/40 p-7 rounded-[32px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-black text-slate-900">Kinerja Guru</h3>
                <Badge variant="outline" className="rounded-full font-black text-[9px] uppercase tracking-widest">KPI</Badge>
              </div>
              <div className="space-y-5">
                {kinerjGuru.slice(0, 5).map((guru, i) => (
                  <div key={guru.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-800">{guru.name}</span>
                      <span className="text-xs font-bold text-slate-400">{guru.kpi}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${guru.kpi}%` }}
                        transition={{ delay: i * 0.1, duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-slate-900 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Log Sistem */}
          <div className="bg-white/30 border border-white/50 rounded-[32px] p-7">
            <h3 className="text-sm font-black text-slate-900 mb-5 flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              Denyut Sistem OSDAI
            </h3>
            <div className="space-y-5">
              {[
                { waktu: '10:45', peristiwa: 'Rekonsiliasi presensi harian selesai', status: 'SELESAI' },
                { waktu: '09:30', peristiwa: 'Sinkronisasi transaksi keuangan', status: 'TERSINKRON' },
                { waktu: '08:00', peristiwa: 'Mesin prediksi risiko AI berjalan', status: 'STABIL' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-[10px] font-black text-slate-400 w-10 pt-0.5 shrink-0">{log.waktu}</div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{log.peristiwa}</p>
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-0.5">{log.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Need GlassPanel for standalone use
function GlassPanel({ className = '', children, ...props }: any) {
  return (
    <div className={`glass-panel rounded-[32px] p-8 ${className}`} {...props}>
      {children}
    </div>
  );
}
