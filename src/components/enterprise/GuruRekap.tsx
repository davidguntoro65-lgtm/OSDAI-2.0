import { useState, useEffect } from 'react';
import { BarChart3, Printer, RefreshCcw, Users, CheckCircle2, X, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { C } from '@/lib/themeC';

type TabType = 'sesi' | 'siswa';

export default function GuruRekap({ authToken }: { authToken: string }) {
  const [tab, setTab] = useState<TabType>('sesi');

  // Sesi tab state
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Siswa tab state
  const [rekapSiswa, setRekapSiswa] = useState<any | null>(null);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    // Load classes and subjects for filter
    Promise.allSettled([
      fetch('/api/classes', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/subjects', { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([cRes, sRes]) => {
      if (cRes.status === 'fulfilled') setClasses(Array.isArray(cRes.value) ? cRes.value : []);
      if (sRes.status === 'fulfilled') { const d = sRes.value; setSubjects(Array.isArray(d) ? d : d.items || []); }
    });
  }, [authToken]);

  // Fetch session-based rekap
  useEffect(() => {
    if (!selClass) { setSessions([]); return; }
    setLoadingSessions(true);
    const params = new URLSearchParams({ classId: selClass });
    if (selSubject) params.set('subjectId', selSubject);
    fetch(`/api/intelligence/sessions?${params}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  }, [selClass, selSubject]);

  // Fetch per-siswa rekap
  const fetchRekapSiswa = () => {
    if (!selClass) return;
    setLoadingSiswa(true);
    const params = new URLSearchParams();
    if (selSubject) params.set('subjectId', selSubject);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    fetch(`/api/intelligence/rekap/kelas/${selClass}?${params}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(setRekapSiswa)
      .catch(() => setRekapSiswa(null))
      .finally(() => setLoadingSiswa(false));
  };

  useEffect(() => {
    if (tab === 'siswa' && selClass) fetchRekapSiswa();
  }, [tab, selClass, selSubject, fromDate, toDate]);

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
    const cls = classes.find(c => c.id === selClass);
    const sub = subjects.find(s => s.id === selSubject);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Rekap Kehadiran</title><style>
      body{font-family:Arial;padding:24px;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:7px 10px;text-align:left}
      th{background:#f5f5f5;font-weight:bold}
      h2{margin-bottom:4px}p{margin:2px 0;color:#555}
    </style></head><body>
    <h2>Rekap Kehadiran Kelas</h2>
    <p>Kelas: <b>${cls?.name || '—'}</b>${sub ? ` | Mapel: <b>${sub.name}</b>` : ''}</p>
    <p>Total Sesi: <b>${totalSessions}</b> | Rata-rata Kehadiran: <b>${avgKehadiran}%</b></p>
    ${tab === 'sesi' ? `
    <table><thead><tr><th>#</th><th>Tanggal</th><th>Hadir</th><th>Terlambat</th><th>Alfa</th><th>% Hadir</th></tr></thead><tbody>
    ${sessions.map((s, i) => {
      const tot = (s.hadir||0)+(s.alfa||0)+(s.terlambat||0);
      const pct = tot > 0 ? Math.round((s.hadir||0)/tot*100) : 0;
      return `<tr><td>${i+1}</td><td>${new Date(s.startTime||s.createdAt).toLocaleDateString('id-ID')}</td><td>${s.hadir||0}</td><td>${s.terlambat||0}</td><td>${s.alfa||0}</td><td>${pct}%</td></tr>`;
    }).join('')}
    </tbody></table>` : rekapSiswa ? `
    <table><thead><tr><th>#</th><th>Nama Siswa</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Alfa</th><th>% Hadir</th></tr></thead><tbody>
    ${rekapSiswa.students.map((s: any, i: number) => `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.hadir}</td><td>${s.terlambat}</td><td>${s.izin}</td><td>${s.sakit}</td><td>${s.alfa}</td><td>${s.persen}%</td></tr>`).join('')}
    </tbody></table>` : ''}
    </body></html>`);
    win.print();
  };

  const filterBar = (
    <div className="p-4 rounded-xl space-y-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kelas *</label>
          <select value={selClass} onChange={e => setSelClass(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
            <option value="">— Semua Kelas —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Mata Pelajaran</label>
          <select value={selSubject} onChange={e => setSelSubject(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
            <option value="">— Semua Mapel —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {tab === 'siswa' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Dari Tanggal</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Sampai Tanggal</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Rekap Kehadiran</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Laporan kehadiran siswa per kelas</p>
        </div>
        {selClass && (
          <button onClick={printRekap} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50" style={{ borderColor: C.border, color: C.textMuted }}>
            <Printer size={12} /> Print Rekap
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
        {([['sesi', 'Per Sesi', BarChart3], ['siswa', 'Per Siswa', Users]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: tab === t ? C.primary : 'transparent',
              color: tab === t ? 'white' : C.textMuted,
            }}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {filterBar}

      {!selClass ? (
        <div className="flex flex-col items-center py-16" style={{ color: C.textMuted }}>
          <BarChart3 size={40} style={{ opacity: 0.2 }} />
          <p className="text-sm mt-3">Pilih kelas untuk melihat rekap kehadiran</p>
        </div>
      ) : tab === 'sesi' ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sesi', value: totalSessions, color: '#6366f1', icon: BarChart3 },
              { label: 'Rata-rata Hadir', value: `${avgKehadiran}%`, color: '#10B981', icon: CheckCircle2 },
              { label: 'Total Alfa', value: totalAlfa, color: '#EF4444', icon: AlertTriangle },
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
            {loadingSessions ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-xs" style={{ color: C.textMuted }}>Belum ada sesi tercatat untuk kelas ini</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr style={{ background: C.bg }}>
                    {['#', 'Tanggal', 'Waktu Mulai', 'Status', 'Hadir', 'Terlambat', 'Alfa', '% Hadir'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sessions.map((s, i) => {
                      const tot = (s.hadir||0)+(s.alfa||0)+(s.terlambat||0);
                      const pct = tot > 0 ? Math.round(((s.hadir||0)/tot)*100) : 0;
                      return (
                        <tr key={s.id||i} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                          <td className="px-4 py-2" style={{ color: C.textMuted }}>{i+1}</td>
                          <td className="px-4 py-2 font-semibold" style={{ color: C.text }}>{new Date(s.startTime||s.createdAt).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-2 font-mono text-[10px]" style={{ color: C.textMuted }}>{new Date(s.startTime||s.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.signalStatus==='CLOSED' ? '#F3F4F6' : '#F0FDF4', color: s.signalStatus==='CLOSED' ? '#6B7280' : '#15803D' }}>
                              {s.signalStatus||'CLOSED'}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-bold" style={{ color: '#10B981' }}>{s.hadir||0}</td>
                          <td className="px-4 py-2 font-bold" style={{ color: '#F59E0B' }}>{s.terlambat||0}</td>
                          <td className="px-4 py-2 font-bold" style={{ color: '#EF4444' }}>{s.alfa||0}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-gray-200 w-16">
                                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct>=75 ? '#10B981' : pct>=50 ? '#F59E0B' : '#EF4444' }} />
                              </div>
                              <span className="font-bold" style={{ color: pct>=75 ? '#10B981' : '#EF4444' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab: Per Siswa */
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>
              Rekap Per Siswa {rekapSiswa ? `(${rekapSiswa.students.length} siswa · ${rekapSiswa.totalSessions} sesi)` : ''}
            </p>
            {selClass && (
              <button onClick={fetchRekapSiswa} disabled={loadingSiswa} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted }}>
                <RefreshCcw size={11} className={loadingSiswa ? 'animate-spin' : ''} /> Refresh
              </button>
            )}
          </div>
          {loadingSiswa ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : !rekapSiswa || rekapSiswa.students.length === 0 ? (
            <div className="flex flex-col items-center py-12" style={{ color: C.textMuted }}>
              <Users size={32} style={{ opacity: 0.2 }} />
              <p className="text-xs mt-2">Belum ada data siswa untuk kelas ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr style={{ background: C.bg }}>
                  {['#', 'Nama Siswa', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa', 'Total', '% Hadir', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rekapSiswa.students.map((s: any, i: number) => {
                    const risk = s.persen < 75;
                    return (
                      <tr key={s.studentId} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{i+1}</td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: C.text }}>{s.name}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#10B981' }}>{s.hadir}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#F59E0B' }}>{s.terlambat}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#0ea5e9' }}>{s.izin}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#8B5CF6' }}>{s.sakit}</td>
                        <td className="px-4 py-2.5 font-bold" style={{ color: '#EF4444' }}>{s.alfa}</td>
                        <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{s.total}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-gray-200 w-16">
                              <div className="h-1.5 rounded-full" style={{ width: `${s.persen}%`, background: s.persen>=75 ? '#10B981' : s.persen>=50 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                            <span className="font-black" style={{ color: s.persen>=75 ? '#10B981' : '#EF4444' }}>{s.persen}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {risk ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#FEF2F2', color: '#EF4444' }}>⚠ Risiko</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#F0FDF4', color: '#10B981' }}>✓ Baik</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
