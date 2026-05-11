import { useState, useEffect } from 'react';
import { Award, Search, Plus, Save, Download, Printer, CheckCircle2, X, Filter, Loader2, ChevronDown } from 'lucide-react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

const gradeColor = (v: number) => {
  if (v >= 90) return '#10B981';
  if (v >= 75) return C.primary;
  if (v >= 60) return '#F59E0B';
  return '#EF4444';
};

export default function GuruPenilaian({ authToken, user }: { authToken: string; user: any }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [selCourse, setSelCourse] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [gradeType, setGradeType] = useState('HARIAN');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/lms/courses', { headers }).then(r => r.ok ? r.json() : []).then(setCourses).catch(() => {});
  }, [authToken]);

  useEffect(() => {
    if (!selCourse) { setStudents([]); return; }
    const c = courses.find(c => c.id === selCourse);
    if (c?.classId) {
      setLoading(true);
      fetch(`/api/students?classId=${c.classId}&limit=100`, { headers })
        .then(r => r.ok ? r.json() : { items: [] })
        .then(d => { setStudents(d.items || d); })
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    }
  }, [selCourse]);

  const showToast = (msg: string, ok = true) => { setToast(msg); setToastOk(ok); setTimeout(() => setToast(''), 3000); };

  const saveGrades = async () => {
    const entries = Object.entries(grades).filter(([, v]) => v !== '');
    if (!entries.length || !selCourse) { showToast('Tidak ada nilai untuk disimpan', false); return; }
    setSaving(true);
    try {
      let saved = 0;
      for (const [studentId, value] of entries) {
        const res = await fetch('/api/grades', {
          method: 'POST', headers,
          body: JSON.stringify({ studentId, courseId: selCourse, value: parseFloat(value), type: gradeType, description: desc })
        });
        if (res.ok) saved++;
      }
      showToast(`${saved} nilai berhasil disimpan`);
      setGrades({});
    } finally { setSaving(false); }
  };

  const printReport = () => {
    const course = courses.find(c => c.id === selCourse);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Daftar Nilai</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body>
      <h2>Daftar Nilai ${gradeType}</h2>
      <p>Kelas: ${course?.class?.name || '—'} | Mapel: ${course?.subject?.name || '—'}</p>
      <p>Tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <table><thead><tr><th>#</th><th>Nama Siswa</th><th>NIS</th><th>Nilai</th><th>Keterangan</th></tr></thead><tbody>
      ${students.map((s, i) => `<tr><td>${i + 1}</td><td>${s.user?.name || s.name}</td><td>${s.nis || '—'}</td><td>${grades[s.id] || '—'}</td><td>${parseFloat(grades[s.id]) >= 75 ? 'TUNTAS' : parseFloat(grades[s.id]) > 0 ? 'REMEDIAL' : '—'}</td></tr>`).join('')}
      </tbody></table></body></html>`);
    win.print();
  };

  const avgScore = () => {
    const vals = Object.values(grades).filter(v => v !== '').map(Number).filter(n => !isNaN(n));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white" style={{ background: toastOk ? '#10B981' : '#EF4444' }}>
          {toastOk ? <CheckCircle2 size={14} /> : <X size={14} />} {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Penilaian Siswa</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Input dan kelola nilai siswa per kelas</p>
        </div>
        <div className="flex items-center gap-2">
          {students.length > 0 && (
            <>
              <button onClick={printReport} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50" style={{ borderColor: C.border, color: C.textMuted }}>
                <Printer size={12} /> Print
              </button>
              <button onClick={saveGrades} disabled={saving} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Simpan Nilai
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kelas / Kursus</label>
          <select value={selCourse} onChange={e => setSelCourse(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
            <option value="">— Pilih Kelas —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.class?.name} — {c.subject?.name}</option>)}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Jenis Nilai</label>
          <select value={gradeType} onChange={e => setGradeType(e.target.value)} className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
            {['HARIAN', 'UTS', 'UAS', 'TUGAS', 'PRAKTIK'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Keterangan</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Ulangan Bab 3" className="w-full h-9 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
        </div>
      </div>

      {/* Summary */}
      {students.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Jumlah Siswa', value: students.length, color: '#0ea5e9' },
            { label: 'Nilai Rata-rata', value: avgScore(), color: C.primary },
            { label: 'Sudah Dinilai', value: Object.values(grades).filter(v => v !== '').length, color: '#10B981' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-semibold mt-0.5" style={{ color: C.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grade table */}
      {selCourse && (
        <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
            <p className="text-sm font-bold" style={{ color: C.text }}>
              Daftar Siswa — {courses.find(c => c.id === selCourse)?.class?.name} · {gradeType}
            </p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : students.length === 0 ? (
            <div className="text-center py-12" style={{ color: C.textMuted }}>Tidak ada siswa di kelas ini.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr style={{ background: C.bg }}>
                {['#', 'Nama Siswa', 'NIS', 'Nilai (0-100)', 'Predikat', 'Keterangan'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {students.map((s, i) => {
                  const val = parseFloat(grades[s.id] || '');
                  const predikat = isNaN(val) ? '—' : val >= 90 ? 'A' : val >= 80 ? 'B+' : val >= 75 ? 'B' : val >= 70 ? 'C+' : val >= 60 ? 'C' : 'D';
                  const ket = isNaN(val) ? '—' : val >= 75 ? 'TUNTAS' : 'REMEDIAL';
                  return (
                    <tr key={s.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-4 py-2 text-center" style={{ color: C.textMuted }}>{i + 1}</td>
                      <td className="px-4 py-2 font-semibold" style={{ color: C.text }}>{s.user?.name || s.name || '—'}</td>
                      <td className="px-4 py-2 font-mono text-[10px]" style={{ color: C.textMuted }}>{s.nis || '—'}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min={0} max={100}
                          value={grades[s.id] || ''}
                          onChange={e => setGrades(p => ({ ...p, [s.id]: e.target.value }))}
                          placeholder="—"
                          className="w-20 h-7 px-2 rounded-lg text-xs text-center border outline-none font-bold transition-all"
                          style={{
                            borderColor: grades[s.id] ? gradeColor(val) : C.border,
                            color: grades[s.id] ? gradeColor(val) : C.text,
                            background: grades[s.id] ? `${gradeColor(val)}10` : C.bg
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 font-black" style={{ color: isNaN(val) ? C.textMuted : gradeColor(val) }}>{predikat}</td>
                      <td className="px-4 py-2">
                        {!isNaN(val) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: val >= 75 ? '#F0FDF4' : '#FEF2F2', color: val >= 75 ? '#15803D' : '#DC2626' }}>
                            {ket}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!selCourse && (
        <div className="flex flex-col items-center py-16" style={{ color: C.textMuted }}>
          <Award size={40} style={{ opacity: 0.2 }} />
          <p className="text-sm mt-3">Pilih kelas untuk mulai memasukkan nilai</p>
        </div>
      )}
    </div>
  );
}
