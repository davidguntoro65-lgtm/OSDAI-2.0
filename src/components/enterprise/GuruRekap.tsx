/**
 * GuruRekap — Laporan Kehadiran Profesional
 * -----------------------------------------
 * - Tab Per Sesi + Per Siswa
 * - CSV Export
 * - Professional Print Layout
 * - Risk Flag (<75%)
 * - Recharts visualization
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, Printer, RefreshCcw, Users, CheckCircle2,
  AlertTriangle, Clock, Filter, FileText, TrendingUp, TrendingDown,
  X, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { C } from '@/lib/themeC';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SessionRow {
  id: string; startTime: string; endTime?: string; signalStatus: string;
  class?: { name: string }; subject?: { name: string };
  hadir: number; terlambat: number; alfa: number;
}
interface SiswaRow {
  studentId: string; name: string;
  hadir: number; terlambat: number; izin: number; sakit: number; alfa: number; invalid: number;
  presentTotal: number; total: number; persen: number;
}
interface RekapData {
  classId: string; totalSessions: number;
  period: { from: string | null; to: string | null };
  students: SiswaRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function csvEscape(v: string | number) {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsvSesi(sessions: SessionRow[], className: string, subjectName: string) {
  const headers = ['No', 'Tanggal', 'Waktu Mulai', 'Status', 'Hadir', 'Terlambat', 'Alfa', '% Hadir'];
  const rows = sessions.map((s, i) => {
    const tot = (s.hadir || 0) + (s.alfa || 0) + (s.terlambat || 0);
    const pct = tot > 0 ? Math.round(((s.hadir || 0) / tot) * 100) : 0;
    return [
      i + 1,
      new Date(s.startTime || s.endTime || '').toLocaleDateString('id-ID'),
      new Date(s.startTime || '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      s.signalStatus === 'CLOSED' ? 'Selesai' : 'Aktif',
      s.hadir || 0, s.terlambat || 0, s.alfa || 0, `${pct}%`,
    ].map(csvEscape).join(',');
  });
  const meta = [`Rekap Kehadiran Per Sesi`, `Kelas: ${className}`, `Mapel: ${subjectName}`, ''];
  const csv = [...meta.map(m => csvEscape(m)), headers.join(','), ...rows].join('\r\n');
  downloadCsv(csv, `rekap-sesi-${className}-${subjectName}.csv`);
}

function exportCsvSiswa(data: RekapData, className: string, subjectName: string) {
  const headers = ['No', 'Nama Siswa', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa', 'Total Sesi', '% Hadir', 'Status'];
  const rows = data.students.map((s, i) => [
    i + 1, s.name, s.hadir, s.terlambat, s.izin, s.sakit, s.alfa, s.total, `${s.persen}%`,
    s.persen < 75 ? 'RISIKO' : 'BAIK',
  ].map(csvEscape).join(','));
  const meta = [`Rekap Kehadiran Per Siswa`, `Kelas: ${className}`, `Mapel: ${subjectName}`,
    `Total Sesi: ${data.totalSessions}`, ''];
  const csv = [...meta.map(m => csvEscape(m)), headers.join(','), ...rows].join('\r\n');
  downloadCsv(csv, `rekap-siswa-${className}-${subjectName}.csv`);
}

function downloadCsv(content: string, filename: string) {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function printReport(opts: {
  tab: 'sesi' | 'siswa';
  sessions: SessionRow[];
  rekap: RekapData | null;
  className: string; subjectName: string;
  from?: string; to?: string;
}) {
  const { tab, sessions, rekap, className, subjectName, from, to } = opts;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const totalSessions = sessions.length;
  const totalHadir = sessions.reduce((a, s) => a + (s.hadir || 0), 0);
  const totalAlfa  = sessions.reduce((a, s) => a + (s.alfa || 0), 0);
  const totalTerlambat = sessions.reduce((a, s) => a + (s.terlambat || 0), 0);
  const avgHadir = (totalHadir + totalTerlambat + totalAlfa) > 0
    ? Math.round((totalHadir / (totalHadir + totalTerlambat + totalAlfa)) * 100) : 0;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Rekap Kehadiran — OSDAI SMKN 1 Wonogiri</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: white; padding: 24px; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #FF6A00; padding-bottom: 12px; margin-bottom: 16px; }
  .school-name { font-size: 15px; font-weight: 900; color: #FF6A00; }
  .school-address { font-size: 10px; color: #64748b; margin-top: 2px; }
  .report-title { font-size: 14px; font-weight: 900; text-align: right; }
  .report-sub { font-size: 10px; color: #64748b; text-align: right; }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
  .meta-label { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; }
  .meta-value { font-size: 14px; font-weight: 900; color: #1e293b; margin-top: 2px; }
  .meta-value.green { color: #16a34a; }
  .meta-value.red { color: #dc2626; }
  .meta-value.orange { color: #ea580c; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #f1f5f9; padding: 7px 10px; text-align: left; font-size: 10px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 50px; font-size: 9px; font-weight: bold; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-orange { background: #fef9c3; color: #b45309; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-purple { background: #ede9fe; color: #6d28d9; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .risk-row td { background: #fff7f7 !important; }
  .progress-bar { background: #e2e8f0; border-radius: 4px; height: 6px; overflow: hidden; width: 60px; display: inline-block; vertical-align: middle; margin-right: 4px; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
  .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
  .signature-box { text-align: center; }
  .signature-line { border-bottom: 1px solid #1e293b; margin: 40px 20px 6px; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none !important; }
  }
</style></head><body>
<div class="header">
  <div>
    <div class="school-name">SMK NEGERI 1 WONOGIRI</div>
    <div class="school-address">Jl. Bhayangkara No.2, Wonogiri, Jawa Tengah 57612</div>
    <div class="school-address" style="margin-top:6px">Sistem OSDAI — Otomatisasi Sekolah Digital Berbasis AI</div>
  </div>
  <div>
    <div class="report-title">LAPORAN KEHADIRAN SISWA</div>
    <div class="report-sub">${tab === 'sesi' ? 'Per Sesi Pembelajaran' : 'Per Siswa'}</div>
    <div class="report-sub" style="margin-top:4px">Dicetak: ${today}</div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-card"><div class="meta-label">Kelas</div><div class="meta-value">${className || '—'}</div></div>
  <div class="meta-card"><div class="meta-label">Mata Pelajaran</div><div class="meta-value" style="font-size:12px">${subjectName || 'Semua Mapel'}</div></div>
  <div class="meta-card"><div class="meta-label">Periode</div><div class="meta-value" style="font-size:11px">${from ? new Date(from).toLocaleDateString('id-ID') : '—'} s/d ${to ? new Date(to).toLocaleDateString('id-ID') : 'Sekarang'}</div></div>
  ${tab === 'sesi' ? `
  <div class="meta-card"><div class="meta-label">Total Sesi</div><div class="meta-value orange">${totalSessions}</div></div>
  <div class="meta-card"><div class="meta-label">Rata-rata Hadir</div><div class="meta-value green">${avgHadir}%</div></div>
  <div class="meta-card"><div class="meta-label">Total Alfa</div><div class="meta-value red">${totalAlfa}</div></div>
  ` : `
  <div class="meta-card"><div class="meta-label">Total Sesi</div><div class="meta-value orange">${rekap?.totalSessions || 0}</div></div>
  <div class="meta-card"><div class="meta-label">Total Siswa</div><div class="meta-value">${rekap?.students.length || 0}</div></div>
  <div class="meta-card"><div class="meta-label">Siswa Berisiko</div><div class="meta-value red">${rekap?.students.filter(s => s.persen < 75).length || 0}</div></div>
  `}
</div>

${tab === 'sesi' ? `
<table>
  <thead><tr>
    <th style="width:40px">No</th>
    <th>Tanggal</th>
    <th>Waktu</th>
    <th>Status</th>
    <th style="text-align:center">Hadir</th>
    <th style="text-align:center">Terlambat</th>
    <th style="text-align:center">Alfa</th>
    <th style="text-align:center">% Hadir</th>
  </tr></thead>
  <tbody>
  ${sessions.map((s, i) => {
    const tot = (s.hadir||0)+(s.alfa||0)+(s.terlambat||0);
    const pct = tot > 0 ? Math.round(((s.hadir||0)/tot)*100) : 0;
    const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#b45309' : '#dc2626';
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td>${new Date(s.startTime||'').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
      <td>${new Date(s.startTime||'').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</td>
      <td><span class="badge ${s.signalStatus==='CLOSED'?'badge-gray':'badge-green'}">${s.signalStatus==='CLOSED'?'Selesai':'Aktif'}</span></td>
      <td style="text-align:center;font-weight:bold;color:#16a34a">${s.hadir||0}</td>
      <td style="text-align:center;font-weight:bold;color:#b45309">${s.terlambat||0}</td>
      <td style="text-align:center;font-weight:bold;color:#dc2626">${s.alfa||0}</td>
      <td style="text-align:center;font-weight:bold;color:${color}">${pct}%</td>
    </tr>`;
  }).join('')}
  <tr style="background:#f1f5f9;font-weight:bold">
    <td colspan="4" style="text-align:right;padding-right:12px">Total / Rata-rata</td>
    <td style="text-align:center;color:#16a34a">${totalHadir}</td>
    <td style="text-align:center;color:#b45309">${totalTerlambat}</td>
    <td style="text-align:center;color:#dc2626">${totalAlfa}</td>
    <td style="text-align:center;color:${avgHadir>=75?'#16a34a':'#dc2626'}">${avgHadir}%</td>
  </tr>
  </tbody>
</table>
` : rekap ? `
<table>
  <thead><tr>
    <th style="width:40px">No</th>
    <th>Nama Siswa</th>
    <th style="text-align:center">Hadir</th>
    <th style="text-align:center">Terlambat</th>
    <th style="text-align:center">Izin</th>
    <th style="text-align:center">Sakit</th>
    <th style="text-align:center">Alfa</th>
    <th style="text-align:center">Total</th>
    <th style="text-align:center">% Hadir</th>
    <th style="text-align:center">Status</th>
  </tr></thead>
  <tbody>
  ${rekap.students.map((s, i) => {
    const risk = s.persen < 75;
    const color = s.persen >= 75 ? '#16a34a' : s.persen >= 50 ? '#b45309' : '#dc2626';
    return `<tr ${risk ? 'class="risk-row"' : ''}>
      <td style="text-align:center">${i+1}</td>
      <td style="font-weight:600">${s.name}</td>
      <td style="text-align:center;font-weight:bold;color:#16a34a">${s.hadir}</td>
      <td style="text-align:center;font-weight:bold;color:#b45309">${s.terlambat}</td>
      <td style="text-align:center;font-weight:bold;color:#1d4ed8">${s.izin}</td>
      <td style="text-align:center;font-weight:bold;color:#6d28d9">${s.sakit}</td>
      <td style="text-align:center;font-weight:bold;color:#dc2626">${s.alfa}</td>
      <td style="text-align:center">${s.total}</td>
      <td style="text-align:center">
        <div class="progress-bar"><div class="progress-fill" style="width:${s.persen}%;background:${color}"></div></div>
        <span style="font-weight:bold;color:${color}">${s.persen}%</span>
      </td>
      <td style="text-align:center"><span class="badge ${risk?'badge-red':'badge-green'}">${risk?'⚠ Risiko':'✓ Baik'}</span></td>
    </tr>`;
  }).join('')}
  </tbody>
</table>
${rekap.students.filter(s => s.persen < 75).length > 0 ? `
<div style="margin-top:12px;padding:10px;background:#fff7f7;border:1px solid #fca5a5;border-radius:6px;">
  <p style="font-weight:bold;color:#dc2626;font-size:10px;">⚠ CATATAN: ${rekap.students.filter(s=>s.persen<75).length} siswa memiliki kehadiran di bawah 75% dan memerlukan perhatian khusus.</p>
</div>` : ''}
` : ''}

<div class="signature-row" style="margin-top:32px">
  <div class="signature-box">
    <p style="font-size:10px;color:#64748b">Wonogiri, ${today}</p>
    <p style="font-weight:bold;font-size:10px;margin-top:4px">Guru Mata Pelajaran</p>
    <div class="signature-line"></div>
    <p style="font-size:10px">NIP. ___________________</p>
  </div>
  <div class="signature-box">
    <p style="font-size:10px;color:#64748b">&nbsp;</p>
    <p style="font-weight:bold;font-size:10px;margin-top:4px">Kepala Sekolah</p>
    <div class="signature-line"></div>
    <p style="font-size:10px">NIP. ___________________</p>
  </div>
</div>

<div class="footer">
  <span>Dicetak oleh Sistem OSDAI — SMKN 1 Wonogiri</span>
  <span>Dokumen ini sah tanpa tanda tangan apabila dicetak dari sistem</span>
</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ─── Donut Mini for stats ─────────────────────────────────────────────────────
const COLORS_PIE = ['#10B981', '#F59E0B', '#0ea5e9', '#8B5CF6', '#EF4444'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GuruRekap({ authToken }: { authToken: string }) {
  const [tab, setTab] = useState<'sesi' | 'siswa'>('sesi');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [rekap, setRekap] = useState<RekapData | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailSession, setDetailSession] = useState<SessionRow | null>(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/classes', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/subjects', { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([c, s]) => {
      if (c.status === 'fulfilled') setClasses(Array.isArray(c.value) ? c.value : []);
      if (s.status === 'fulfilled') { const d = s.value; setSubjects(Array.isArray(d) ? d : d.items || []); }
    });
  }, [authToken]);

  const fetchSessions = useCallback(async () => {
    if (!selClass) { setSessions([]); return; }
    setLoadingSessions(true);
    const p = new URLSearchParams({ classId: selClass });
    if (selSubject) p.set('subjectId', selSubject);
    const r = await fetch(`/api/intelligence/sessions?${p}`, { headers });
    if (r.ok) setSessions(await r.json()); else setSessions([]);
    setLoadingSessions(false);
  }, [selClass, selSubject, authToken]);

  const fetchRekap = useCallback(async () => {
    if (!selClass) { setRekap(null); return; }
    setLoadingRekap(true);
    const p = new URLSearchParams();
    if (selSubject) p.set('subjectId', selSubject);
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    const r = await fetch(`/api/intelligence/rekap/kelas/${selClass}?${p}`, { headers });
    if (r.ok) setRekap(await r.json()); else setRekap(null);
    setLoadingRekap(false);
  }, [selClass, selSubject, fromDate, toDate, authToken]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { if (tab === 'siswa') fetchRekap(); }, [tab, fetchRekap]);

  // Computed
  const selClassName   = classes.find(c => c.id === selClass)?.name || '—';
  const selSubjectName = subjects.find(s => s.id === selSubject)?.name || 'Semua Mapel';

  const totalSessions  = sessions.length;
  const totalHadir     = sessions.reduce((a, s) => a + (s.hadir || 0), 0);
  const totalTerlambat = sessions.reduce((a, s) => a + (s.terlambat || 0), 0);
  const totalAlfa      = sessions.reduce((a, s) => a + (s.alfa || 0), 0);
  const totalPresence  = totalHadir + totalTerlambat + totalAlfa;
  const avgKehadiran   = totalPresence > 0 ? Math.round((totalHadir / totalPresence) * 100) : 0;

  const chartData = sessions.slice().reverse().slice(-10).map((s, i) => ({
    name: new Date(s.startTime || '').toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    hadir: s.hadir || 0, terlambat: s.terlambat || 0, alfa: s.alfa || 0,
  }));

  const pieData = [
    { name: 'Hadir',     value: totalHadir },
    { name: 'Terlambat', value: totalTerlambat },
    { name: 'Alfa',      value: totalAlfa },
  ].filter(d => d.value > 0);

  const sortedSiswa = rekap ? [...rekap.students].sort((a, b) => {
    const va = sortField === 'name' ? a.name : sortField === 'persen' ? a.persen : a.alfa;
    const vb = sortField === 'name' ? b.name : sortField === 'persen' ? b.persen : b.alfa;
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  }) : [];

  const riskCount = sortedSiswa.filter(s => s.persen < 75).length;

  const SortIcon = ({ f }: { f: string }) => sortField === f
    ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)
    : <ChevronDown size={10} className="opacity-30" />;

  const toggleSort = (f: string) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5 max-w-7xl mx-auto" style={{ background: C.bg }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base md:text-lg font-black" style={{ color: C.text }}>Rekap Kehadiran</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Laporan profesional · Ekspor CSV · Cetak</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
            style={{ borderColor: selClass ? C.primary : C.border, color: selClass ? C.primary : C.textMuted }}>
            <Filter size={11} /> Filter {selClass && '✓'}
          </button>
          {selClass && tab === 'sesi' && (
            <>
              <button onClick={() => exportCsvSesi(sessions, selClassName, selSubjectName)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: '#10B981' }}>
                <Download size={11} /> CSV
              </button>
              <button
                onClick={() => printReport({ tab, sessions, rekap, className: selClassName, subjectName: selSubjectName, from: fromDate, to: toDate })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: C.textMuted }}>
                <Printer size={11} /> Print
              </button>
            </>
          )}
          {selClass && tab === 'siswa' && rekap && (
            <>
              <button onClick={() => exportCsvSiswa(rekap, selClassName, selSubjectName)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: '#10B981' }}>
                <Download size={11} /> CSV
              </button>
              <button
                onClick={() => printReport({ tab, sessions, rekap, className: selClassName, subjectName: selSubjectName, from: fromDate, to: toDate })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: C.border, color: C.textMuted }}>
                <Printer size={11} /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter panel ───────────────────────────────────────────────── */}
      {showFilters && (
        <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Kelas *</label>
              <select value={selClass} onChange={e => setSelClass(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="">— Semua —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Mata Pelajaran</label>
              <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="">— Semua —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Dari Tanggal</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: C.textMuted }}>Sampai Tanggal</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
        {([['sesi', 'Per Sesi', BarChart3], ['siswa', 'Per Siswa', Users]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: tab === t ? C.primary : 'transparent', color: tab === t ? 'white' : C.textMuted }}>
            <Icon size={11} /> {label}
            {t === 'siswa' && riskCount > 0 && tab !== 'siswa' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#EF4444', color: 'white' }}>{riskCount}</span>
            )}
          </button>
        ))}
      </div>

      {!selClass ? (
        /* ── Empty state ─────────────────────────────────────────────── */
        <div className="flex flex-col items-center py-20" style={{ color: C.textMuted }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: '#F3F4F6' }}>
            <BarChart3 size={36} style={{ opacity: 0.3 }} />
          </div>
          <p className="text-sm font-bold">Pilih kelas untuk melihat rekap</p>
          <p className="text-xs mt-1" style={{ color: C.textMuted }}>Klik tombol Filter di atas</p>
          <button onClick={() => setShowFilters(true)} className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: C.primary }}>
            <Filter size={11} className="inline mr-1" /> Buka Filter
          </button>
        </div>
      ) : tab === 'sesi' ? (
        /* ── Per Sesi Tab ────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Sesi',        value: totalSessions,  color: '#6366f1', bg: '#EEF2FF', icon: FileText, trend: null },
              { label: 'Rata-rata Hadir',   value: `${avgKehadiran}%`, color: avgKehadiran >= 75 ? '#10B981' : '#EF4444', bg: avgKehadiran >= 75 ? '#F0FDF4' : '#FEF2F2', icon: avgKehadiran >= 75 ? TrendingUp : TrendingDown, trend: null },
              { label: 'Total Terlambat',   value: totalTerlambat, color: '#F59E0B', bg: '#FFFBEB', icon: Clock, trend: null },
              { label: 'Total Alfa',        value: totalAlfa,      color: '#EF4444', bg: '#FEF2F2', icon: AlertTriangle, trend: null },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                    <Icon size={15} style={{ color: s.color }} />
                  </div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color: C.textMuted }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bar chart */}
              <div className="md:col-span-2 rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold mb-3" style={{ color: C.text }}>Tren Kehadiran (10 Sesi Terakhir)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} barSize={14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    />
                    <Bar dataKey="hadir"     fill="#10B981" radius={[3, 3, 0, 0]} name="Hadir" />
                    <Bar dataKey="terlambat" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Terlambat" />
                    <Bar dataKey="alfa"      fill="#EF4444" radius={[3, 3, 0, 0]} name="Alfa" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Pie chart */}
              <div className="rounded-2xl p-4 flex flex-col items-center justify-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold mb-2 self-start" style={{ color: C.text }}>Distribusi Status</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Session table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
              <p className="text-sm font-bold" style={{ color: C.text }}>
                Riwayat Sesi
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#EEF2FF', color: '#6366f1' }}>
                  {totalSessions} sesi
                </span>
              </p>
              <button onClick={fetchSessions} disabled={loadingSessions} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted }}>
                <RefreshCcw size={11} className={loadingSessions ? 'animate-spin' : ''} />
              </button>
            </div>
            {loadingSessions ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.primary }} />
                <p className="text-xs" style={{ color: C.textMuted }}>Memuat data…</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <BarChart3 size={28} style={{ color: C.textMuted, opacity: 0.25 }} />
                <p className="text-xs mt-2" style={{ color: C.textMuted }}>Belum ada sesi untuk kelas ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: C.bg }}>
                      <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>#</th>
                      <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Tanggal</th>
                      <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Waktu</th>
                      <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>Status</th>
                      <th className="px-4 py-3 text-center font-bold" style={{ color: '#10B981' }}>Hadir</th>
                      <th className="px-4 py-3 text-center font-bold" style={{ color: '#F59E0B' }}>Terlambat</th>
                      <th className="px-4 py-3 text-center font-bold" style={{ color: '#EF4444' }}>Alfa</th>
                      <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => {
                      const tot = (s.hadir||0)+(s.alfa||0)+(s.terlambat||0);
                      const pct = tot > 0 ? Math.round(((s.hadir||0)/tot)*100) : 0;
                      const pctColor = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                      return (
                        <tr key={s.id||i} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                          <td className="px-4 py-3 font-mono text-[10px]" style={{ color: C.textMuted }}>{i+1}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>
                            {new Date(s.startTime||'').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px]" style={{ color: C.textMuted }}>
                            {new Date(s.startTime||'').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: s.signalStatus==='CLOSED' ? '#F3F4F6' : '#DCFCE7', color: s.signalStatus==='CLOSED' ? '#6B7280' : '#15803D' }}>
                              {s.signalStatus==='CLOSED' ? 'Selesai' : 'Aktif'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-black" style={{ color: '#10B981' }}>{s.hadir||0}</td>
                          <td className="px-4 py-3 text-center font-black" style={{ color: '#F59E0B' }}>{s.terlambat||0}</td>
                          <td className="px-4 py-3 text-center font-black" style={{ color: '#EF4444' }}>{s.alfa||0}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full overflow-hidden bg-gray-100" style={{ width: 52 }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pctColor }} />
                              </div>
                              <span className="font-black text-[11px]" style={{ color: pctColor }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Summary row */}
                    <tr className="border-t" style={{ borderColor: '#E5E7EB', background: '#FAFAFA' }}>
                      <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black" style={{ color: C.textMuted }}>TOTAL / RATA-RATA</td>
                      <td className="px-4 py-3 text-center font-black text-sm" style={{ color: '#10B981' }}>{totalHadir}</td>
                      <td className="px-4 py-3 text-center font-black text-sm" style={{ color: '#F59E0B' }}>{totalTerlambat}</td>
                      <td className="px-4 py-3 text-center font-black text-sm" style={{ color: '#EF4444' }}>{totalAlfa}</td>
                      <td className="px-4 py-3">
                        <span className="font-black text-sm" style={{ color: avgKehadiran >= 75 ? '#10B981' : '#EF4444' }}>{avgKehadiran}%</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Per Siswa Tab ──────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Summary + risk banner */}
          {rekap && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Siswa',       value: rekap.students.length, color: '#6366f1', bg: '#EEF2FF', icon: Users },
                  { label: 'Total Sesi',         value: rekap.totalSessions,   color: '#F59E0B', bg: '#FFFBEB', icon: FileText },
                  { label: 'Kehadiran ≥75%',    value: rekap.students.filter(s=>s.persen>=75).length, color: '#10B981', bg: '#F0FDF4', icon: CheckCircle2 },
                  { label: 'Risiko (<75%)',      value: riskCount, color: riskCount>0 ? '#EF4444' : '#10B981', bg: riskCount>0 ? '#FEF2F2' : '#F0FDF4', icon: AlertTriangle },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                        <Icon size={15} style={{ color: s.color }} />
                      </div>
                      <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: C.textMuted }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>

              {riskCount > 0 && (
                <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5' }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Perhatian: {riskCount} Siswa Berisiko</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Terdapat {riskCount} siswa dengan tingkat kehadiran di bawah 75%. Pertimbangkan untuk koordinasi dengan BK atau wali kelas.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Per-siswa table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
              <p className="text-sm font-bold" style={{ color: C.text }}>
                Rekap Per Siswa
                {rekap && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#EEF2FF', color: '#6366f1' }}>
                    {rekap.students.length} siswa · {rekap.totalSessions} sesi
                  </span>
                )}
              </p>
              <button onClick={fetchRekap} disabled={loadingRekap} className="flex items-center gap-1.5 text-xs" style={{ color: C.textMuted }}>
                <RefreshCcw size={11} className={loadingRekap ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingRekap ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.primary }} />
                <p className="text-xs" style={{ color: C.textMuted }}>Menghitung rekap siswa…</p>
              </div>
            ) : !rekap || rekap.students.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <Users size={28} style={{ color: C.textMuted, opacity: 0.25 }} />
                <p className="text-xs mt-2" style={{ color: C.textMuted }}>
                  {!rekap ? 'Pilih kelas untuk melihat data siswa' : 'Belum ada data untuk kelas ini'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: C.bg }}>
                        <th className="px-4 py-3 text-left font-bold" style={{ color: C.textMuted }}>#</th>
                        <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('name')}>
                          <div className="flex items-center gap-1">Nama Siswa <SortIcon f="name" /></div>
                        </th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: '#10B981' }}>Hadir</th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: '#F59E0B' }}>Terlambat</th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: '#0ea5e9' }}>Izin</th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: '#8B5CF6' }}>Sakit</th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: '#EF4444' }}>Alfa</th>
                        <th className="px-4 py-3 text-center font-bold" style={{ color: C.textMuted }}>Total</th>
                        <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('persen')}>
                          <div className="flex items-center gap-1">% Hadir <SortIcon f="persen" /></div>
                        </th>
                        <th className="px-4 py-3 text-left font-bold cursor-pointer select-none" style={{ color: C.textMuted }} onClick={() => toggleSort('alfa')}>
                          <div className="flex items-center gap-1">Status <SortIcon f="alfa" /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSiswa.map((s, i) => {
                        const risk = s.persen < 75;
                        const pctColor = s.persen >= 75 ? '#10B981' : s.persen >= 50 ? '#F59E0B' : '#EF4444';
                        return (
                          <tr key={s.studentId} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6', background: risk ? '#FFFAFA' : undefined }}>
                            <td className="px-4 py-3 text-[10px] font-mono" style={{ color: C.textMuted }}>{i+1}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: C.text }}>{s.name}</td>
                            <td className="px-4 py-3 text-center font-black" style={{ color: '#10B981' }}>{s.hadir}</td>
                            <td className="px-4 py-3 text-center font-black" style={{ color: '#F59E0B' }}>{s.terlambat}</td>
                            <td className="px-4 py-3 text-center font-black" style={{ color: '#0ea5e9' }}>{s.izin}</td>
                            <td className="px-4 py-3 text-center font-black" style={{ color: '#8B5CF6' }}>{s.sakit}</td>
                            <td className="px-4 py-3 text-center font-black" style={{ color: '#EF4444' }}>{s.alfa}</td>
                            <td className="px-4 py-3 text-center" style={{ color: C.textMuted }}>{s.total}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 rounded-full overflow-hidden bg-gray-100" style={{ width: 56 }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${s.persen}%`, background: pctColor }} />
                                </div>
                                <span className="font-black" style={{ color: pctColor }}>{s.persen}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {risk ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>⚠ Risiko</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#DCFCE7', color: '#15803D' }}>✓ Baik</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {sortedSiswa.map((s, i) => {
                    const risk = s.persen < 75;
                    const pctColor = s.persen >= 75 ? '#10B981' : s.persen >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={s.studentId} className="px-4 py-3" style={{ background: risk ? '#FFFAFA' : undefined }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold" style={{ color: C.text }}>{i+1}. {s.name}</span>
                          {risk
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#FEE2E2', color: '#DC2626' }}>⚠ Risiko</span>
                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#DCFCE7', color: '#15803D' }}>✓ Baik</span>
                          }
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex-1">
                            <div className="h-full rounded-full" style={{ width: `${s.persen}%`, background: pctColor }} />
                          </div>
                          <span className="font-black text-sm" style={{ color: pctColor }}>{s.persen}%</span>
                        </div>
                        <div className="flex gap-3 text-[11px]">
                          <span style={{ color: '#10B981' }}>H:{s.hadir}</span>
                          <span style={{ color: '#F59E0B' }}>T:{s.terlambat}</span>
                          <span style={{ color: '#0ea5e9' }}>I:{s.izin}</span>
                          <span style={{ color: '#8B5CF6' }}>S:{s.sakit}</span>
                          <span style={{ color: '#EF4444' }}>A:{s.alfa}</span>
                          <span style={{ color: C.textMuted }}>/{s.total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
