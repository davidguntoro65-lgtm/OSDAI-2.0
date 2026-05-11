import { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, RefreshCcw, Filter, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

export default function GuruRekap({ authToken }: { authToken: string }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [selCourse, setSelCourse] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    fetch('/api/lms/courses', { headers }).then(r => r.ok ? r.json() : []).then(setCourses).catch(() => {});
  }, [authToken]);

  useEffect(() => {
    if (!selCourse) { setSessions([]); return; }
    setLoading(true);
    fetch(`/api/intelligence/sessions?courseId=${selCourse}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [selCourse]);

  const totalSessions = sessions.length;
  const totalHadir = sessions.reduce((a, s) => a + (s.hadir || 0), 0);
  const totalAlfa = sessions.reduce((a, s) => a + (s.alfa || 0), 0);
  const avgKehadiran = totalSessions > 0 && (totalHadir + totalAlfa) > 0 ? Math.round((totalHadir / (totalHadir + totalAlfa)) * 100) : 0;

  const chartData = sessions.slice(-7).map((s, i) => ({
    name: `S${i + 1}`,
    hadir: s.hadir || 0,
    alfa: s.alfa || 0,
    terlambat: s.terlambat || 0,
  }));

  const printRekap = () => {
    const course = courses.find(c => c.id === selCourse);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Rekap Kehadiran</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px}th{background:#f5f5f5}</style></head><body>
      <h2>Rekap Kehadiran Kelas</h2>
      <p>Kelas: ${course?.class?.name} | Mapel: ${course?.subject?.name}</p>
      <p>Total Sesi: ${totalSessions} | Rata-rata Kehadiran: ${avgKehadiran}%</p>
      <table><thead><tr><th>#</th><th>Tanggal</th><th>Hadir</th><th>Terlambat</th><th>Alfa</th></tr></thead><tbody>
      ${sessions.map((s, i) => `<tr><td>${i+1}</td><td>${new Date(s.startTime || s.createdAt).toLocaleDateString('id-ID')}</td><td>${s.hadir||0}</td><td>${s.terlambat||0}</td><td>${s.alfa||0}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    win.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Rekap Kehadiran</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Laporan kehadiran siswa per kelas</p>
        </div>
        {selCourse && (
          <button onClick={printRekap} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50" style={{ borderColor: C.border, color: C.textMuted }}>
            <Printer size={12} /> Print Rekap
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Pilih Kelas / Mata Pelajaran</label>
        <select value={selCourse} onChange={e => setSelCourse(e.target.value)} className="w-full max-w-sm h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
          <option value="">— Pilih Kelas —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.class?.name} — {c.subject?.name}</option>)}
        </select>
      </div>

      {selCourse && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sesi', value: totalSessions, color: '#6366f1', icon: BarChart3 },
              { label: 'Rata-rata Hadir', value: `${avgKehadiran}%`, color: '#10B981', icon: CheckCircle2 },
              { label: 'Total Alfa', value: totalAlfa, color: '#EF4444', icon: X },
              { label: 'Total Terlambat', value: sessions.reduce((a, s) => a + (s.terlambat || 0), 0), color: '#F59E0B', icon: Clock },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}14` }}>
                    <Icon size={15} style={{ color: s.color }} />
                  </div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color: C.textMuted }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Tren Kehadiran (7 Sesi Terakhir)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="hadir" fill="#10B981" radius={[3, 3, 0, 0]} name="Hadir" />
                  <Bar dataKey="terlambat" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Terlambat" />
                  <Bar dataKey="alfa" fill="#EF4444" radius={[3, 3, 0, 0]} name="Alfa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Session table */}
          <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
              <p className="text-sm font-bold" style={{ color: C.text }}>Riwayat Sesi ({totalSessions} sesi)</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12" style={{ color: C.textMuted }}>Belum ada sesi tercatat</div>
            ) : (
              <table className="w-full text-xs">
                <thead><tr style={{ background: C.bg }}>
                  {['#', 'Tanggal', 'Waktu Mulai', 'Status', 'Hadir', 'Terlambat', 'Alfa', '% Hadir'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const tot = (s.hadir || 0) + (s.alfa || 0) + (s.terlambat || 0);
                    const pct = tot > 0 ? Math.round(((s.hadir || 0) / tot) * 100) : 0;
                    return (
                      <tr key={s.id || i} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2" style={{ color: C.textMuted }}>{i + 1}</td>
                        <td className="px-4 py-2 font-semibold" style={{ color: C.text }}>{new Date(s.startTime || s.createdAt).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-2 font-mono text-[10px]" style={{ color: C.textMuted }}>{new Date(s.startTime || s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.signalStatus === 'CLOSED' ? '#F3F4F6' : '#F0FDF4', color: s.signalStatus === 'CLOSED' ? '#6B7280' : '#15803D' }}>
                            {s.signalStatus || 'CLOSED'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-bold" style={{ color: '#10B981' }}>{s.hadir || 0}</td>
                        <td className="px-4 py-2 font-bold" style={{ color: '#F59E0B' }}>{s.terlambat || 0}</td>
                        <td className="px-4 py-2 font-bold" style={{ color: '#EF4444' }}>{s.alfa || 0}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-gray-200 w-16">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                            <span className="font-bold" style={{ color: pct >= 75 ? '#10B981' : '#EF4444' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!selCourse && (
        <div className="flex flex-col items-center py-16" style={{ color: C.textMuted }}>
          <BarChart3 size={40} style={{ opacity: 0.2 }} />
          <p className="text-sm mt-3">Pilih kelas untuk melihat rekap kehadiran</p>
        </div>
      )}
    </div>
  );
}
