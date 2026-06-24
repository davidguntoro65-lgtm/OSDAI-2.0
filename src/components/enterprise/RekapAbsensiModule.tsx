/**
 * RekapAbsensiModule — Admin & Kepsek view
 * Rekap kehadiran siswa per kelas, dengan filter tanggal,
 * preview tabel, dan export Excel A4 profesional.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, RefreshCcw, Users, CheckCircle2,
  AlertTriangle, Clock, Filter, Calendar, Loader2,
  TrendingUp, FileSpreadsheet, ChevronDown,
} from 'lucide-react';
import { C } from '@/lib/themeC';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SiswaRow {
  studentId: string; name: string;
  hadir: number; terlambat: number; izin: number; sakit: number;
  alfa: number; invalid: number; presentTotal: number; total: number; persen: number;
}
interface RekapData {
  classId: string; totalSessions: number;
  period: { from: string | null; to: string | null };
  students: SiswaRow[];
  className?: string;
}
interface ClassItem { id: string; name: string; grade: number; major?: { name: string; code: string } }

// ─── Helper: date presets ─────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function thisMonthStart() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function semesterStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() >= 6 ? 6 : 0, 1).toISOString().slice(0, 10);
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ persen }: { persen: number }) {
  const risk = persen < 75;
  const warn = persen >= 75 && persen < 85;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-black"
      style={{
        background: risk ? '#FEE2E2' : warn ? '#FEF3C7' : '#DCFCE7',
        color: risk ? '#DC2626' : warn ? '#D97706' : '#16A34A',
      }}
    >
      {risk ? 'RISIKO' : warn ? 'PERHATIAN' : 'BAIK'}
    </span>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, color = C.text, bg = C.cardAlt,
}: { label: string; value: string | number; sub?: string; color?: string; bg?: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: bg, border: `1px solid ${C.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: C.textMuted }}>{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RekapAbsensiModule({ authToken }: { authToken: string }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState(semesterStart());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<RekapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<keyof SiswaRow>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ── Fetch classes ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/classes', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => {
        const list: ClassItem[] = Array.isArray(d) ? d : (d.items ?? []);
        setClasses(list);
        if (list.length > 0 && !classId) setClassId(list[0].id);
      })
      .catch(() => {});
  }, [authToken]);

  // ── Fetch rekap ─────────────────────────────────────────────────────────────
  const fetchRekap = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/intelligence/rekap/kelas/${classId}?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Gagal mengambil data rekap.');
      const d = await res.json();
      const cls = classes.find(c => c.id === classId);
      setData({ ...d, className: cls ? `${cls.name}${cls.major ? ' — ' + cls.major.name : ''}` : classId });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken, classId, from, to, classes]);

  useEffect(() => { if (classId) fetchRekap(); }, [classId, from, to]);

  // ── Export Excel ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!classId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ classId, from, to });
      const res = await fetch(`/api/intelligence/rekap/export?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Export gagal.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap_absensi_${data?.className ?? classId}_${from}_${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh file export.');
    } finally {
      setExporting(false);
    }
  };

  // ── Sort table ───────────────────────────────────────────────────────────────
  const toggleSort = (key: keyof SiswaRow) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const sortedStudents = data
    ? [...data.students].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey];
        const cmp = typeof av === 'string' ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : [];

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalSiswa = data?.students.length ?? 0;
  const avgPersen = totalSiswa > 0
    ? Math.round(data!.students.reduce((acc, s) => acc + s.persen, 0) / totalSiswa) : 0;
  const risikoCount = data?.students.filter(s => s.persen < 75).length ?? 0;
  const totalHadir = data?.students.reduce((a, s) => a + s.hadir, 0) ?? 0;
  const totalAlfa  = data?.students.reduce((a, s) => a + s.alfa, 0) ?? 0;

  // ── Th helper ─────────────────────────────────────────────────────────────────
  const Th = ({ label, k, right }: { label: string; k: keyof SiswaRow; right?: boolean }) => (
    <th
      className="py-3 px-4 text-[9px] font-black uppercase tracking-wider cursor-pointer select-none"
      style={{ color: sortKey === k ? C.primary : C.textMuted, textAlign: right ? 'right' : 'center' }}
      onClick={() => toggleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: C.text }}>
            Rekap Absensi
          </h2>
          <p className="text-sm font-medium mt-1" style={{ color: C.textMuted }}>
            Laporan kehadiran siswa per kelas dengan analitik risiko dan export A4
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRekap}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all"
            style={{ borderColor: C.border, color: C.text, background: C.card }}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={!data || exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: data && !exporting ? C.text : C.border,
              color: data && !exporting ? '#fff' : C.textMuted,
              cursor: data && !exporting ? 'pointer' : 'not-allowed',
            }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export Excel A4
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="rounded-2xl p-5 flex flex-wrap gap-4 items-end"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        {/* Class selector */}
        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
            Kelas
          </label>
          <div className="relative">
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="w-full h-10 rounded-xl px-3 pr-8 text-sm font-semibold appearance-none focus:outline-none focus:ring-2"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
            >
              <option value="">— Pilih Kelas —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.major ? ` (${c.major.code})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textMuted }} />
          </div>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
            Dari Tanggal
          </label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="h-10 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:ring-2"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="h-10 rounded-xl px-3 text-sm font-semibold focus:outline-none focus:ring-2"
            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
          />
        </div>

        {/* Preset buttons */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
            Filter Cepat
          </label>
          <div className="flex items-center gap-2">
            {[
              { label: '7 Hari', f: daysAgo(7), t: todayStr() },
              { label: 'Bulan Ini', f: thisMonthStart(), t: todayStr() },
              { label: 'Semester', f: semesterStart(), t: todayStr() },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => { setFrom(p.f); setTo(p.t); }}
                className="h-10 px-3 rounded-xl text-xs font-bold transition-all border"
                style={{
                  background: from === p.f && to === p.t ? C.text : C.bg,
                  color: from === p.f && to === p.t ? '#fff' : C.text,
                  borderColor: C.border,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl text-sm font-semibold bg-red-50 text-red-600 border border-red-100">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── Stats cards ── */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Sesi" value={data.totalSessions} sub="sesi selesai" />
          <StatCard label="Total Siswa" value={totalSiswa} sub="siswa aktif" />
          <StatCard
            label="Rata-rata Hadir"
            value={`${avgPersen}%`}
            sub="dari semua sesi"
            color={avgPersen < 75 ? '#DC2626' : avgPersen < 85 ? '#D97706' : '#16A34A'}
          />
          <StatCard
            label="Siswa Risiko"
            value={risikoCount}
            sub="kehadiran < 75%"
            color={risikoCount > 0 ? '#DC2626' : C.text}
            bg={risikoCount > 0 ? '#FEF2F2' : C.cardAlt}
          />
          <StatCard
            label="Total Alfa"
            value={totalAlfa}
            sub={`dari ${data.totalSessions * totalSiswa} presensi`}
            color={totalAlfa > 0 ? '#B45309' : C.text}
          />
        </div>
      )}

      {/* ── Table ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, background: C.card }}
      >
        {/* Table header info */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: C.border, background: C.cardAlt }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.card }}>
              <BarChart3 size={15} style={{ color: C.primary }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: C.text }}>
                {data?.className ?? 'Pilih kelas untuk menampilkan data'}
              </p>
              {data && (
                <p className="text-[10px] font-semibold" style={{ color: C.textMuted }}>
                  {data.totalSessions} sesi · Periode {from} s/d {to}
                </p>
              )}
            </div>
          </div>
          {data && risikoCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600">
              <AlertTriangle size={12} />
              {risikoCount} siswa risiko
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: C.textMuted }}>
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm font-semibold">Memuat data rekap...</span>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: C.textMuted }}>
            <FileSpreadsheet size={36} />
            <p className="text-sm font-semibold">Pilih kelas dan periode untuk menampilkan rekap</p>
          </div>
        ) : data.students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: C.textMuted }}>
            <Users size={36} />
            <p className="text-sm font-semibold">Tidak ada data siswa pada periode ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: C.cardAlt, borderBottom: `1px solid ${C.border}` }}>
                  <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-wider" style={{ color: C.textMuted, width: 36 }}>No</th>
                  <Th label="Nama Siswa" k="name" right={false} />
                  <Th label="Hadir" k="hadir" />
                  <Th label="Terlambat" k="terlambat" />
                  <Th label="Izin" k="izin" />
                  <Th label="Sakit" k="sakit" />
                  <Th label="Alfa" k="alfa" />
                  <Th label="Total" k="total" />
                  <Th label="% Hadir" k="persen" />
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-wider text-center" style={{ color: C.textMuted }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s, i) => {
                  const isRisk = s.persen < 75;
                  const isWarn = s.persen >= 75 && s.persen < 85;
                  return (
                    <tr
                      key={s.studentId}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: isRisk
                          ? 'rgba(254,226,226,0.4)'
                          : i % 2 === 0 ? C.card : C.cardAlt,
                      }}
                    >
                      <td className="py-3 px-4 text-xs font-bold" style={{ color: C.textMuted }}>{i + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: isRisk ? '#FEE2E2' : C.cardAlt, color: isRisk ? '#DC2626' : C.text }}
                          >
                            {s.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: C.text }}>{s.name}</span>
                        </div>
                      </td>
                      {[
                        { v: s.hadir, color: '#16A34A' },
                        { v: s.terlambat, color: '#D97706' },
                        { v: s.izin, color: '#1D4ED8' },
                        { v: s.sakit, color: '#7C3AED' },
                        { v: s.alfa, color: '#DC2626' },
                        { v: s.total, color: C.text },
                      ].map(({ v, color }, ci) => (
                        <td key={ci} className="py-3 px-4 text-xs font-black text-center" style={{ color: v > 0 ? color : C.textMuted }}>
                          {v}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <span
                          className="text-sm font-black"
                          style={{ color: isRisk ? '#DC2626' : isWarn ? '#D97706' : '#16A34A' }}
                        >
                          {s.persen}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge persen={s.persen} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr style={{ borderTop: `2px solid ${C.border}`, background: C.cardAlt }}>
                  <td colSpan={2} className="py-3 px-4 text-xs font-black" style={{ color: C.text }}>
                    TOTAL / RATA-RATA
                  </td>
                  {[
                    data.students.reduce((a, s) => a + s.hadir, 0),
                    data.students.reduce((a, s) => a + s.terlambat, 0),
                    data.students.reduce((a, s) => a + s.izin, 0),
                    data.students.reduce((a, s) => a + s.sakit, 0),
                    data.students.reduce((a, s) => a + s.alfa, 0),
                    data.students.reduce((a, s) => a + s.total, 0),
                  ].map((v, i) => (
                    <td key={i} className="py-3 px-4 text-xs font-black text-center" style={{ color: C.text }}>{v}</td>
                  ))}
                  <td className="py-3 px-4 text-center text-sm font-black" style={{ color: avgPersen < 75 ? '#DC2626' : '#16A34A' }}>
                    {avgPersen}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-black" style={{ color: C.textMuted }}>
                      {risikoCount} risiko
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      {data && (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <span className="font-bold" style={{ color: C.textMuted }}>Keterangan:</span>
          {[
            { color: '#16A34A', label: 'Hadir' },
            { color: '#D97706', label: 'Terlambat' },
            { color: '#1D4ED8', label: 'Izin' },
            { color: '#7C3AED', label: 'Sakit' },
            { color: '#DC2626', label: 'Alfa' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 font-semibold" style={{ color: C.text }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="ml-auto font-semibold" style={{ color: C.textMuted }}>
            Risiko = kehadiran &lt; 75% · Perhatian = 75–84% · Baik = ≥ 85%
          </span>
        </div>
      )}
    </div>
  );
}
