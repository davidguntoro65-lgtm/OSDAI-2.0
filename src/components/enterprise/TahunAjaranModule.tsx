import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, Edit, Trash2, CheckCircle2, Loader2,
  Layers, Sparkles, Star, ChevronDown, ChevronUp,
  AlertTriangle, Clock, X, Minus, Zap, BookOpen,
  RefreshCcw, Check,
} from 'lucide-react';
import { C } from '@/lib/themeC';
import SetupWizardModal from './SetupWizardModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADES = [
  { value: 10, roman: 'X'   },
  { value: 11, roman: 'XI'  },
  { value: 12, roman: 'XII' },
];

const MAJOR_COLORS: Record<string, string> = {
  AKL:  '#0ea5e9',
  MPLB: '#7c3aed',
  PM:   '#10B981',
  TB:   '#ec4899',
  TBS:  '#f59e0b',
};

const majorColor = (code: string) => MAJOR_COLORS[code] ?? C.primary;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AcademicYear {
  id: string;
  name: string;
  term: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  _count?: { classes: number };
}

interface Major {
  id: string;
  code: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  majorId: string;
  academicYearId: string;
  major?: Major;
  _count?: { students: number };
}

type RombelMap = Record<string, Record<number, number>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const termLabel  = (t: number) => (t === 1 ? 'Semester 1 · Gasal' : 'Semester 2 · Genap');
const termColor  = (t: number) => (t === 1 ? '#7c3aed' : '#0ea5e9');
const gradeRoman = (g: number) => GRADES.find(x => x.value === g)?.roman ?? String(g);

const today = new Date();
const isOngoing = (ay: AcademicYear) =>
  new Date(ay.startDate) <= today && today <= new Date(ay.endDate);

/** Generate class name: "X AKL" for 1 rombel, "X AKL 1" / "X AKL 2" for 2+ */
const className = (roman: string, code: string, total: number, idx: number) =>
  total > 1 ? `${roman} ${code} ${idx + 1}` : `${roman} ${code}`;

// ─── StatCard ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
  <div className="rounded-xl p-4 flex items-center gap-3"
    style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}14` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-base font-black leading-tight truncate" style={{ color: C.text }}>{value}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: C.textMuted }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5 truncate" style={{ color: C.textMuted }}>{sub}</p>}
    </div>
  </div>
);

// ─── ClassManagerPanel ────────────────────────────────────────────────────────

function ClassManagerPanel({
  ay, authToken, onClose, onRefresh,
}: {
  ay: AcademicYear;
  authToken: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [yearClasses,    setYearClasses]    = useState<ClassItem[]>([]);
  const [majors,         setMajors]         = useState<Major[]>([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [selectedCodes,  setSelectedCodes]  = useState<string[]>([]);
  const [rombelMap,      setRombelMap]      = useState<RombelMap>({});
  const [generating,     setGenerating]     = useState(false);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [genResult,      setGenResult]      = useState<{ created: number; skipped: number } | null>(null);
  const [error,          setError]          = useState('');

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // ── Fetch classes for this year + all majors ───────────────────────────────
  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [cRes, mRes] = await Promise.all([
        fetch('/api/classes', { headers }),
        fetch('/api/majors',  { headers }),
      ]);
      if (cRes.ok) {
        const all: ClassItem[] = await cRes.json();
        setYearClasses(all.filter(c => c.academicYearId === ay.id));
      }
      if (mRes.ok) {
        const mx: Major[] = await mRes.json();
        setMajors(mx);
        // Default rombel map: 1 per major×grade, not selected
        const rm: RombelMap = {};
        mx.forEach(m => {
          rm[m.code] = {};
          GRADES.forEach(g => { rm[m.code][g.value] = 1; });
        });
        setRombelMap(rm);
      }
    } finally { setLoadingData(false); }
  }, [ay.id, authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Rombel stepper ─────────────────────────────────────────────────────────
  const adjust = (code: string, grade: number, delta: number) => {
    setRombelMap(prev => ({
      ...prev,
      [code]: { ...prev[code], [grade]: Math.max(0, Math.min(6, (prev[code]?.[grade] ?? 1) + delta) ) },
    }));
  };

  // ── Toggle major selection ─────────────────────────────────────────────────
  const toggleMajor = (code: string) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // ── Preview classes to be created ─────────────────────────────────────────
  const existingNames = new Set(yearClasses.map(c => c.name));

  const previewClasses = selectedCodes.flatMap(code => {
    const major = majors.find(m => m.code === code);
    if (!major) return [];
    return GRADES.flatMap(g => {
      const count = rombelMap[code]?.[g.value] ?? 1;
      return Array.from({ length: count }, (_, i) => ({
        name:    className(g.roman, code, count, i),
        grade:   g.value,
        majorId: major.id,
        code,
        color:   majorColor(code),
      }));
    });
  }).filter(c => !existingNames.has(c.name));

  // ── Generate ───────────────────────────────────────────────────────────────
  const generate = async () => {
    if (previewClasses.length === 0) return;
    setError('');
    setGenResult(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers,
        body: JSON.stringify({ academicYearId: ay.id, classes: previewClasses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat kelas.');
      setGenResult({ created: data.created, skipped: data.skipped });
      setSelectedCodes([]);
      await fetchData();
      onRefresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete individual class ────────────────────────────────────────────────
  const deleteClass = async (id: string, name: string) => {
    if (!confirm(`Hapus kelas "${name}"? Semua data siswa dan jadwal terkait akan ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setYearClasses(prev => prev.filter(c => c.id !== id));
        onRefresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Gagal menghapus kelas.');
      }
    } finally { setDeletingId(null); }
  };

  // ── Grade groups ───────────────────────────────────────────────────────────
  const gradeGroups = GRADES.map(g => ({
    ...g,
    classes: yearClasses.filter(c => c.grade === g.value),
  })).filter(g => g.classes.length > 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden', borderTop: `1px solid ${C.border}` }}
    >
      <div className="p-5 space-y-5" style={{ background: C.bg }}>

        {/* Panel header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={15} style={{ color: C.primary }} />
            <span className="text-sm font-black" style={{ color: C.text }}>
              Kelola Kelas — {ay.name}
            </span>
            {!loadingData && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${C.primary}14`, color: C.primary }}>
                {yearClasses.length} kelas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData} disabled={loadingData}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100"
              title="Muat ulang">
              <RefreshCcw size={13} className={loadingData ? 'animate-spin' : ''} style={{ color: C.textMuted }} />
            </button>
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100">
              <X size={13} style={{ color: C.textMuted }} />
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${C.primary}40`, borderTopColor: C.primary }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── LEFT: Existing classes ── */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
                Kelas Terdaftar
              </p>

              {gradeGroups.length === 0 ? (
                <div className="flex flex-col items-center py-8 rounded-xl"
                  style={{ background: C.card, border: `1px dashed ${C.border}` }}>
                  <Layers size={28} style={{ color: C.border }} />
                  <p className="text-xs mt-2 font-semibold" style={{ color: C.textMuted }}>
                    Belum ada kelas untuk tahun ajaran ini
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                    Gunakan generator di sebelah kanan →
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gradeGroups.map(g => (
                    <div key={g.value} className="rounded-xl overflow-hidden"
                      style={{ border: `1px solid ${C.border}` }}>
                      <div className="px-3 py-2 flex items-center gap-2"
                        style={{ background: `${C.primary}08` }}>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: '#FFF4ED', color: C.primary }}>
                          Kelas {g.roman}
                        </span>
                        <span className="text-[10px]" style={{ color: C.textMuted }}>
                          {g.classes.length} kelas
                        </span>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {g.classes.map(cls => {
                          const color = majorColor(cls.major?.code ?? '');
                          return (
                            <div key={cls.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
                              <span>{cls.name}</span>
                              {cls._count && (
                                <span className="text-[9px] font-bold opacity-70">
                                  {cls._count.students}s
                                </span>
                              )}
                              <button
                                onClick={() => deleteClass(cls.id, cls.name)}
                                disabled={deletingId === cls.id}
                                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
                                title="Hapus kelas ini">
                                {deletingId === cls.id
                                  ? <Loader2 size={10} className="animate-spin" />
                                  : <X size={10} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Generator ── */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
                Generator Kelas
              </p>

              {majors.length === 0 ? (
                <div className="flex flex-col items-center py-8 rounded-xl"
                  style={{ background: C.card, border: `1px dashed ${C.border}` }}>
                  <BookOpen size={28} style={{ color: C.border }} />
                  <p className="text-xs mt-2 font-semibold" style={{ color: C.textMuted }}>
                    Belum ada program studi
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>
                    Tambahkan jurusan di modul Program Studi terlebih dahulu.
                  </p>
                </div>
              ) : (
                <>
                  {/* Major selection */}
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                    <div className="px-3 py-2" style={{ background: `${C.primary}08` }}>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
                        1. Pilih Program Studi
                      </p>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                      {majors.map(m => {
                        const sel   = selectedCodes.includes(m.code);
                        const color = majorColor(m.code);
                        return (
                          <button key={m.code} onClick={() => toggleMajor(m.code)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                              background: sel ? color : C.card,
                              color:      sel ? '#fff' : C.textMuted,
                              border:     `1.5px solid ${sel ? color : C.border}`,
                            }}>
                            {sel && <Check size={11} />}
                            {m.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rombel steppers — only shown when at least 1 major selected */}
                  <AnimatePresence>
                    {selectedCodes.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${C.border}` }}>
                        <div className="px-3 py-2" style={{ background: `${C.primary}08` }}>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
                            2. Atur Jumlah Rombel per Tingkat
                          </p>
                        </div>
                        <div className="divide-y" style={{ borderColor: C.border }}>
                          {selectedCodes.map(code => {
                            const major = majors.find(m => m.code === code);
                            const color = majorColor(code);
                            return (
                              <div key={code}>
                                <div className="px-3 py-2 flex items-center gap-2"
                                  style={{ background: `${color}08` }}>
                                  <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white"
                                    style={{ background: color }}>
                                    {code.slice(0, 1)}
                                  </div>
                                  <span className="text-[10px] font-bold" style={{ color: C.text }}>
                                    {major?.name ?? code}
                                  </span>
                                </div>
                                <div className="px-3 pb-2 pt-1 grid grid-cols-3 gap-2">
                                  {GRADES.map(g => {
                                    const count = rombelMap[code]?.[g.value] ?? 1;
                                    return (
                                      <div key={g.value} className="flex flex-col items-center gap-1">
                                        <span className="text-[9px] font-bold" style={{ color: C.textMuted }}>
                                          Kelas {g.roman}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => adjust(code, g.value, -1)}
                                            disabled={count === 0}
                                            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                            style={{
                                              background: count === 0 ? C.border : `${color}18`,
                                              color:      count === 0 ? C.textMuted : color,
                                            }}>
                                            <Minus size={10} />
                                          </button>
                                          <span className="w-5 text-center text-sm font-black"
                                            style={{ color: C.text }}>{count}</span>
                                          <button onClick={() => adjust(code, g.value, 1)}
                                            disabled={count >= 6}
                                            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                            style={{
                                              background: count >= 6 ? C.border : `${color}18`,
                                              color:      count >= 6 ? C.textMuted : color,
                                            }}>
                                            <Plus size={10} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Preview */}
                  <AnimatePresence>
                    {previewClasses.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="rounded-xl overflow-hidden"
                        style={{ border: `1px solid ${C.border}` }}>
                        <div className="px-3 py-2 flex items-center justify-between"
                          style={{ background: `${C.primary}08` }}>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.textMuted }}>
                            3. Preview — {previewClasses.length} kelas akan dibuat
                          </p>
                        </div>
                        <div className="p-3 flex flex-wrap gap-1.5">
                          {previewClasses.map(c => (
                            <span key={c.name}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg"
                              style={{ background: `${c.color}14`, color: c.color }}>
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
                      <AlertTriangle size={12} />
                      {error}
                    </div>
                  )}

                  {/* Gen result */}
                  <AnimatePresence>
                    {genResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                        <CheckCircle2 size={13} />
                        {genResult.created} kelas berhasil dibuat
                        {genResult.skipped > 0 && `, ${genResult.skipped} dilewati (sudah ada)`}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generate button */}
                  <button
                    onClick={generate}
                    disabled={previewClasses.length === 0 || generating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: previewClasses.length > 0 && !generating ? C.primary : C.border,
                      color:      previewClasses.length > 0 && !generating ? '#fff' : C.textMuted,
                    }}>
                    {generating
                      ? <><Loader2 size={14} className="animate-spin" /> Membuat kelas...</>
                      : <><Zap size={14} /> Buat {previewClasses.length > 0 ? `${previewClasses.length} ` : ''}Kelas</>}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Empty Form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name:      '',
  term:      '1',
  startDate: '',
  endDate:   '',
  isActive:  false,
};

// ─── Main Module ──────────────────────────────────────────────────────────────

export default function TahunAjaranModule({ authToken }: { authToken: string }) {
  const [years,       setYears]       = useState<AcademicYear[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editing,     setEditing]     = useState<AcademicYear | null>(null);
  const [form,        setForm]        = useState({ ...EMPTY_FORM });
  const [saving,      setSaving]      = useState(false);
  const [activating,  setActivating]  = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);
  const [toast,       setToast]       = useState('');
  const [toastOk,     setToastOk]     = useState(true);
  const [showWizard,  setShowWizard]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [classPanel,  setClassPanel]  = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // ── Fetch years with class counts ──────────────────────────────────────────

  const fetchYears = useCallback(async () => {
    setLoading(true);
    try {
      const [ayRes, clsRes] = await Promise.all([
        fetch('/api/academic/years', { headers }),
        fetch('/api/classes',        { headers }),
      ]);
      if (ayRes.ok) {
        const data: AcademicYear[] = await ayRes.json();
        if (clsRes.ok) {
          const cls: any[] = await clsRes.json();
          const countMap: Record<string, number> = {};
          cls.forEach(c => { countMap[c.academicYearId] = (countMap[c.academicYearId] ?? 0) + 1; });
          setYears(data.map(y => ({ ...y, _count: { classes: countMap[y.id] ?? 0 } })));
        } else {
          setYears(data);
        }
      }
    } catch { /* no-op */ }
    finally { setLoading(false); }
  }, [authToken]);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  // ── Toast ──────────────────────────────────────────────────────────────────

  const showToast = (msg: string, ok = true) => {
    setToast(msg); setToastOk(ok);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (ay: AcademicYear) => {
    setEditing(ay);
    setForm({
      name:      ay.name,
      term:      String(ay.term),
      startDate: ay.startDate.slice(0, 10),
      endDate:   ay.endDate.slice(0, 10),
      isActive:  ay.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  // ── Save (create / edit) ───────────────────────────────────────────────────

  const save = async () => {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      showToast('Nama, tanggal mulai, dan tanggal selesai wajib diisi.', false);
      return;
    }
    if (new Date(form.startDate) >= new Date(form.endDate)) {
      showToast('Tanggal selesai harus setelah tanggal mulai.', false);
      return;
    }
    setSaving(true);
    try {
      const body = {
        name:      form.name.trim(),
        term:      parseInt(form.term),
        startDate: form.startDate,
        endDate:   form.endDate,
        isActive:  form.isActive,
      };
      const res = editing
        ? await fetch(`/api/academic/years/${editing.id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
        : await fetch('/api/academic/years',               { method: 'POST',  headers, body: JSON.stringify(body) });

      if (res.ok) {
        showToast(editing ? 'Tahun ajaran diperbarui.' : 'Tahun ajaran berhasil dibuat.');
        closeForm();
        fetchYears();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Gagal menyimpan.', false);
      }
    } finally { setSaving(false); }
  };

  // ── Activate ───────────────────────────────────────────────────────────────

  const activate = async (id: string) => {
    setActivating(id);
    try {
      const res = await fetch(`/api/academic/years/${id}/activate`, { method: 'PATCH', headers });
      if (res.ok) {
        showToast('Tahun ajaran diaktifkan.');
        fetchYears();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Gagal mengaktifkan.', false);
      }
    } finally { setActivating(null); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteYear = async (ay: AcademicYear) => {
    const n = ay._count?.classes ?? 0;
    const msg = n > 0
      ? `"${ay.name}" memiliki ${n} kelas. Semua kelas akan ikut terhapus. Lanjutkan?`
      : `Hapus tahun ajaran "${ay.name}"?`;
    if (!confirm(msg)) return;
    setDeleting(ay.id);
    try {
      const res = await fetch(`/api/academic/years/${ay.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast('Tahun ajaran dihapus.');
        if (classPanel === ay.id) setClassPanel(null);
        if (expandedId === ay.id) setExpandedId(null);
        fetchYears();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Gagal menghapus.', false);
      }
    } finally { setDeleting(null); }
  };

  // ── Toggle panels (detail vs class manager — mutually exclusive) ───────────

  const toggleDetail = (id: string) => {
    setClassPanel(null);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const toggleClassPanel = (id: string) => {
    setExpandedId(null);
    setClassPanel(prev => (prev === id ? null : id));
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeYear  = years.find(y => y.isActive);
  const ongoingYear = years.find(y => isOngoing(y));
  const totalKelas  = years.reduce((s, y) => s + (y._count?.classes ?? 0), 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, x: 12 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -12, x: 12 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold text-white"
            style={{ background: toastOk ? '#10B981' : '#EF4444' }}
          >
            {toastOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup Wizard modal */}
      <AnimatePresence>
        {showWizard && (
          <SetupWizardModal
            authToken={authToken}
            onClose={() => setShowWizard(false)}
            onSuccess={fetchYears}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Tahun Ajaran</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>
            Kelola periode akademik · Satu tahun ajaran aktif dalam satu waktu
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all hover:opacity-80"
            style={{ borderColor: C.primary, color: C.primary, background: `${C.primary}0c` }}
          >
            <Sparkles size={12} /> Setup Wizard
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: C.primary }}
          >
            <Plus size={13} /> Tambah
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Tahun Ajaran" value={loading ? '—' : years.length} icon={Calendar} color={C.primary} />
        <StatCard
          label="Tahun Ajaran Aktif"
          value={loading ? '—' : (activeYear?.name ?? '—')}
          sub={activeYear ? termLabel(activeYear.term) : undefined}
          icon={Star} color="#F59E0B"
        />
        <StatCard
          label="Sedang Berjalan"
          value={loading ? '—' : (ongoingYear?.name ?? 'Tidak ada')}
          sub={ongoingYear ? `Berakhir ${fmtDate(ongoingYear.endDate)}` : undefined}
          icon={Clock} color="#10B981"
        />
        <StatCard
          label="Total Kelas"
          value={loading ? '—' : totalKelas}
          sub="Semua tahun ajaran"
          icon={Layers} color="#7c3aed"
        />
      </div>

      {/* ── Create / Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-5"
            style={{ background: C.card, border: `1.5px solid ${C.primary}40` }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black" style={{ color: C.text }}>
                {editing ? `Edit: ${editing.name}` : 'Tambah Tahun Ajaran Baru'}
              </p>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={14} style={{ color: C.textMuted }} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Name */}
              <div className="lg:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Nama Tahun Ajaran *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="2024/2025"
                  autoFocus
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none transition-all"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }}
                />
              </div>

              {/* Term */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Semester *
                </label>
                <select
                  value={form.term}
                  onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }}
                >
                  <option value="1">Semester 1 — Gasal</option>
                  <option value="2">Semester 2 — Genap</option>
                </select>
              </div>

              {/* Aktif toggle */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all"
                  style={{ background: form.isActive ? `${C.primary}12` : `${C.border}40`, border: `1px solid ${form.isActive ? C.primary : C.border}` }}
                >
                  <div className="w-9 h-5 rounded-full relative flex-shrink-0 transition-colors"
                    style={{ background: form.isActive ? C.primary : C.border }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: form.isActive ? '20px' : '2px' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>Jadikan Aktif</span>
                </button>
              </div>

              {/* Start */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Tanggal Mulai *
                </label>
                <input type="date" value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }} />
              </div>

              {/* End */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Tanggal Selesai *
                </label>
                <input type="date" value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }} />
              </div>
            </div>

            {form.isActive && !editing?.isActive && (
              <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                <AlertTriangle size={12} />
                Semua tahun ajaran lain akan dinonaktifkan secara otomatis.
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ background: C.primary }}>
                {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={closeForm}
                className="px-4 py-2 rounded-lg text-xs font-semibold border"
                style={{ borderColor: C.border, color: C.textMuted }}>
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: `${C.primary}30`, borderTopColor: C.primary }} />
        </div>
      ) : years.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-xl"
          style={{ background: C.card, border: `1px dashed ${C.border}` }}>
          <Calendar size={36} style={{ color: C.border }} />
          <p className="text-sm font-bold mt-3" style={{ color: C.text }}>Belum ada tahun ajaran</p>
          <p className="text-xs mt-1" style={{ color: C.textMuted }}>Gunakan Setup Wizard atau tombol "Tambah" untuk memulai.</p>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all"
              style={{ borderColor: C.primary, color: C.primary, background: `${C.primary}0c` }}>
              <Sparkles size={12} /> Setup Wizard
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: C.primary }}>
              <Plus size={12} /> Tambah Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(ay => {
            const ongoing      = isOngoing(ay);
            const classCount   = ay._count?.classes ?? 0;
            const isExpanded   = expandedId  === ay.id;
            const hasClassPane = classPanel  === ay.id;

            return (
              <motion.div key={ay.id} layout
                className="rounded-xl overflow-hidden"
                style={{
                  background: C.card,
                  border: `1.5px solid ${ay.isActive ? `${C.primary}50` : C.border}`,
                }}>

                {/* ── Card row ── */}
                <div className="flex items-center gap-3 px-5 py-4">

                  {/* Active dot */}
                  <div className="flex-shrink-0">
                    {ay.isActive ? (
                      <div className="w-2.5 h-2.5 rounded-full"
                        style={{ background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: C.border }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black" style={{ color: C.text }}>{ay.name}</span>
                      {ay.isActive && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: '#F0FDF4', color: '#15803D' }}>AKTIF</span>
                      )}
                      {ongoing && !ay.isActive && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: '#EFF6FF', color: '#1D4ED8' }}>BERJALAN</span>
                      )}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${termColor(ay.term)}14`, color: termColor(ay.term) }}>
                        {termLabel(ay.term)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                      {fmtDate(ay.startDate)} — {fmtDate(ay.endDate)}
                      <span className="mx-1.5">·</span>
                      <Layers size={9} className="inline mb-0.5 mr-0.5" />
                      {classCount} kelas
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">

                    {/* Kelola kelas button */}
                    <button
                      onClick={() => toggleClassPanel(ay.id)}
                      title="Kelola kelas tahun ajaran ini"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{
                        background: hasClassPane ? C.primary : `${C.primary}12`,
                        color:      hasClassPane ? '#fff' : C.primary,
                        border:     `1px solid ${hasClassPane ? C.primary : `${C.primary}30`}`,
                      }}>
                      <Layers size={11} />
                      Kelas
                    </button>

                    {/* Activate */}
                    {!ay.isActive && (
                      <button onClick={() => activate(ay.id)} disabled={activating === ay.id}
                        title="Jadikan tahun ajaran aktif"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                        {activating === ay.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Star size={11} />}
                        Aktifkan
                      </button>
                    )}

                    {/* Edit */}
                    <button onClick={() => openEdit(ay)} title="Edit tahun ajaran"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100">
                      <Edit size={13} style={{ color: C.textMuted }} />
                    </button>

                    {/* Delete */}
                    <button onClick={() => deleteYear(ay)} disabled={deleting === ay.id}
                      title="Hapus tahun ajaran"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-red-50">
                      {deleting === ay.id
                        ? <Loader2 size={13} className="animate-spin" style={{ color: '#EF4444' }} />
                        : <Trash2 size={13} style={{ color: '#EF4444' }} />}
                    </button>

                    {/* Detail toggle */}
                    <button onClick={() => toggleDetail(ay.id)} title="Detail"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100">
                      {isExpanded
                        ? <ChevronUp size={13} style={{ color: C.textMuted }} />
                        : <ChevronDown size={13} style={{ color: C.textMuted }} />}
                    </button>
                  </div>
                </div>

                {/* ── Detail panel ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', borderTop: `1px solid ${C.border}` }}
                    >
                      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                          { label: 'ID', value: `${ay.id.slice(0, 8)}…` },
                          { label: 'Semester', value: termLabel(ay.term) },
                          { label: 'Kelas Terdaftar', value: `${classCount} kelas` },
                          {
                            label: 'Durasi',
                            value: (() => {
                              const ms = new Date(ay.endDate).getTime() - new Date(ay.startDate).getTime();
                              return `${Math.round(ms / 86400000)} hari`;
                            })(),
                          },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
                              style={{ color: C.textMuted }}>{item.label}</p>
                            <p className="text-xs font-bold" style={{ color: C.text }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {ay.isActive && (
                        <div className="px-5 pb-4">
                          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                            style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                            <CheckCircle2 size={12} />
                            Tahun ajaran aktif — semua operasi (absensi, jadwal, SPP) mengacu ke periode ini.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Class Manager Panel ── */}
                <AnimatePresence>
                  {hasClassPane && (
                    <ClassManagerPanel
                      key={`cmp-${ay.id}`}
                      ay={ay}
                      authToken={authToken}
                      onClose={() => setClassPanel(null)}
                      onRefresh={fetchYears}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {years.length > 0 && !loading && (
        <p className="text-[10px] text-center pb-2" style={{ color: C.textMuted }}>
          {years.length} tahun ajaran terdaftar
          {activeYear ? ` · Aktif: ${activeYear.name}` : ' · Tidak ada tahun ajaran aktif'}
        </p>
      )}
    </div>
  );
}
