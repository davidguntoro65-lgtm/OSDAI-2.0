import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles, Calendar,
  BookOpen, Layers, Plus, Minus, Loader2, PartyPopper,
} from 'lucide-react';
import { C } from '@/lib/themeC';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_MAJORS = [
  { code: 'AKL',  name: 'Akuntansi dan Keuangan Lembaga',           short: 'AKL',  color: '#0ea5e9' },
  { code: 'MPLB', name: 'Manajemen Perkantoran dan Layanan Bisnis',  short: 'MPLB', color: '#7c3aed' },
  { code: 'PM',   name: 'Pemasaran',                                 short: 'PM',   color: '#10B981' },
  { code: 'TB',   name: 'Tata Busana',                               short: 'TB',   color: '#ec4899' },
  { code: 'TBS',  name: 'Tata Boga Sanitasi',                        short: 'TBS',  color: '#f59e0b' },
];

const GRADES = [
  { value: 10, label: 'Kelas X',   roman: 'X'   },
  { value: 11, label: 'Kelas XI',  roman: 'XI'  },
  { value: 12, label: 'Kelas XII', roman: 'XII' },
];

const currentYear = new Date().getFullYear();
const defaultAY = `${currentYear}/${currentYear + 1}`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RombelMap { [majorCode: string]: { [grade: number]: number } }

interface Props {
  authToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const StepDot = ({ idx, active, done }: { idx: number; active: boolean; done: boolean }) => (
  <div
    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
    style={{
      background: done ? '#10B981' : active ? C.primary : C.border,
      color: done || active ? '#fff' : C.textMuted,
    }}
  >
    {done ? <Check size={14} /> : idx + 1}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupWizardModal({ authToken, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0);  // 0=tahun ajaran, 1=jurusan, 2=kelas, 3=done
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingMajorCodes, setExistingMajorCodes] = useState<string[]>([]);

  // Step 1 state — Tahun Ajaran
  const [ayName,      setAyName]      = useState(defaultAY);
  const [ayTerm,      setAyTerm]      = useState(1);
  const [ayStart,     setAyStart]     = useState(`${currentYear}-07-15`);
  const [ayEnd,       setAyEnd]       = useState(`${currentYear + 1}-06-30`);
  const [ayActive,    setAyActive]    = useState(true);

  // Step 2 state — Jurusan
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // Step 3 state — Kelas & Rombel
  const [rombelMap, setRombelMap] = useState<RombelMap>({});

  // Step 4 state — result
  const [result, setResult] = useState<any>(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // Fetch existing majors so we can pre-check and disable them
  useEffect(() => {
    fetch('/api/majors', { headers })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const codes = data.map((m: any) => m.code);
        setExistingMajorCodes(codes);
        setSelectedCodes(codes);
      })
      .catch(() => {});
  }, []);

  // Initialise rombel map whenever selected codes change
  useEffect(() => {
    setRombelMap(prev => {
      const next: RombelMap = {};
      for (const code of selectedCodes) {
        next[code] = {};
        for (const g of GRADES) {
          next[code][g.value] = prev[code]?.[g.value] ?? 1;
        }
      }
      return next;
    });
  }, [selectedCodes]);

  // ── Computed classes list ──────────────────────────────────────────────────
  const buildClasses = () => {
    const list: { name: string; grade: number; majorCode: string }[] = [];
    for (const code of selectedCodes) {
      for (const g of GRADES) {
        const count = rombelMap[code]?.[g.value] ?? 1;
        for (let r = 1; r <= count; r++) {
          list.push({ name: `${g.roman} ${code} ${count > 1 ? r : ''}`.trim(), grade: g.value, majorCode: code });
        }
      }
    }
    return list;
  };

  const classes = buildClasses();

  // ── Rombel helpers ─────────────────────────────────────────────────────────
  const adjustRombel = (code: string, grade: number, delta: number) => {
    setRombelMap(prev => {
      const cur = prev[code]?.[grade] ?? 1;
      const next = Math.max(0, Math.min(4, cur + delta));
      return { ...prev, [code]: { ...prev[code], [grade]: next } };
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const body = {
        academicYear: { name: ayName, term: ayTerm, startDate: ayStart, endDate: ayEnd, isActive: ayActive },
        majors: selectedCodes.map(code => {
          const preset = PRESET_MAJORS.find(p => p.code === code);
          return { code, name: preset?.name ?? code };
        }),
        classes,
      };
      const res = await fetch('/api/setup/initialize', {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
      setResult(data.summary);
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const canNext0 = ayName.trim().length >= 6 && ayStart && ayEnd;
  const canNext1 = selectedCodes.length > 0;
  const canNext2 = classes.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden"
        style={{ background: C.bg, border: `1px solid ${C.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.primary}18` }}>
              <Sparkles size={18} style={{ color: C.primary }} />
            </div>
            <div>
              <h2 className="text-sm font-black" style={{ color: C.text }}>Setup Awal Sekolah</h2>
              <p className="text-[10px]" style={{ color: C.textMuted }}>Wizard inisialisasi data master</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: C.textMuted }} />
          </button>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="px-6 py-4 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {['Tahun Ajaran', 'Jurusan', 'Kelas & Rombel'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <StepDot idx={i} active={step === i} done={step > i} />
                <span className="text-xs font-semibold hidden sm:block" style={{ color: step === i ? C.text : C.textMuted }}>{label}</span>
                {i < 2 && <ChevronRight size={14} style={{ color: C.border }} />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Tahun Ajaran ── */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} style={{ color: C.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: C.text }}>Tahun Ajaran</h3>
                </div>
                <p className="text-xs" style={{ color: C.textMuted }}>Atur periode aktif tahun ajaran sekolah.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: C.text }}>Nama Tahun Ajaran</label>
                    <input
                      value={ayName}
                      onChange={e => setAyName(e.target.value)}
                      placeholder="2024/2025"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 transition-all"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, '--tw-ring-color': `${C.primary}40` } as any}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: C.text }}>Semester</label>
                    <select
                      value={ayTerm}
                      onChange={e => setAyTerm(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    >
                      <option value={1}>Semester 1 (Gasal)</option>
                      <option value={2}>Semester 2 (Genap)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => setAyActive(!ayActive)}
                        className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                        style={{ background: ayActive ? C.primary : C.border }}
                      >
                        <div
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                          style={{ left: ayActive ? '22px' : '2px' }}
                        />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: C.text }}>Jadikan tahun ajaran aktif</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: C.text }}>Tanggal Mulai</label>
                    <input
                      type="date"
                      value={ayStart}
                      onChange={e => setAyStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1.5" style={{ color: C.text }}>Tanggal Selesai</label>
                    <input
                      type="date"
                      value={ayEnd}
                      onChange={e => setAyEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Jurusan ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={16} style={{ color: C.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: C.text }}>Program Studi (Jurusan)</h3>
                </div>
                <p className="text-xs" style={{ color: C.textMuted }}>Pilih jurusan yang aktif di sekolah ini. Jurusan yang sudah ada di database ditandai ✓.</p>

                <div className="grid grid-cols-1 gap-2">
                  {PRESET_MAJORS.map(m => {
                    const checked   = selectedCodes.includes(m.code);
                    const existing  = existingMajorCodes.includes(m.code);
                    return (
                      <button
                        key={m.code}
                        onClick={() => {
                          setSelectedCodes(prev =>
                            prev.includes(m.code) ? prev.filter(c => c !== m.code) : [...prev, m.code]
                          );
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                        style={{
                          background: checked ? `${m.color}12` : C.card,
                          border: `1.5px solid ${checked ? m.color : C.border}`,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-[10px]"
                          style={{ background: checked ? m.color : C.border, color: '#fff' }}
                        >
                          {m.short}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold" style={{ color: C.text }}>{m.name}</p>
                          <p className="text-[10px]" style={{ color: C.textMuted }}>Kode: {m.code}{existing ? ' · Sudah ada di database ✓' : ''}</p>
                        </div>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ borderColor: checked ? m.color : C.border, background: checked ? m.color : 'transparent' }}
                        >
                          {checked && <Check size={11} color="#fff" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Kelas & Rombel ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Layers size={16} style={{ color: C.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: C.text }}>Kelas & Rombel</h3>
                </div>
                <p className="text-xs" style={{ color: C.textMuted }}>Atur berapa rombongan belajar (rombel) per kelas per jurusan. 0 = tidak dibuat.</p>

                <div className="space-y-4">
                  {selectedCodes.map(code => {
                    const preset = PRESET_MAJORS.find(p => p.code === code);
                    return (
                      <div key={code} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `${preset?.color ?? C.primary}10` }}>
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black text-white" style={{ background: preset?.color ?? C.primary }}>
                            {code}
                          </div>
                          <span className="text-xs font-bold" style={{ color: C.text }}>{preset?.name ?? code}</span>
                        </div>
                        <div className="divide-y" style={{ borderColor: C.border }}>
                          {GRADES.map(g => {
                            const count = rombelMap[code]?.[g.value] ?? 1;
                            const names = Array.from({ length: count }, (_, i) =>
                              `${g.roman} ${code}${count > 1 ? ` ${i + 1}` : ''}`
                            );
                            return (
                              <div key={g.value} className="flex items-center gap-4 px-4 py-3">
                                <div className="w-16 flex-shrink-0">
                                  <p className="text-xs font-bold" style={{ color: C.text }}>Kelas {g.roman}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => adjustRombel(code, g.value, -1)}
                                    disabled={count === 0}
                                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                    style={{ background: count === 0 ? C.border : `${C.primary}18`, color: count === 0 ? C.textMuted : C.primary }}
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="text-sm font-black w-4 text-center" style={{ color: C.text }}>{count}</span>
                                  <button
                                    onClick={() => adjustRombel(code, g.value, 1)}
                                    disabled={count >= 4}
                                    className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
                                    style={{ background: count >= 4 ? C.border : `${C.primary}18`, color: count >= 4 ? C.textMuted : C.primary }}
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-1">
                                  {names.length === 0 ? (
                                    <span className="text-[10px]" style={{ color: C.textMuted }}>Tidak dibuat</span>
                                  ) : names.map(n => (
                                    <span key={n} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${preset?.color ?? C.primary}14`, color: preset?.color ?? C.primary }}>
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: `${C.primary}0c`, border: `1px dashed ${C.primary}40` }}>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>Total kelas yang akan dibuat:</span>
                  <span className="text-lg font-black" style={{ color: C.primary }}>{classes.length}</span>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Done ── */}
            {step === 3 && result && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: '#F0FDF4' }}>
                  <PartyPopper size={32} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: C.text }}>Setup Berhasil! 🎉</h3>
                  <p className="text-xs mt-1" style={{ color: C.textMuted }}>Data master sekolah berhasil diinisialisasi.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {[
                    { label: 'Tahun Ajaran', value: result.academicYear },
                    { label: 'Jurusan', value: `${result.majorsCreated} jurusan` },
                    { label: 'Kelas Dibuat', value: `${result.classesCreated} kelas` },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <p className="text-base font-black" style={{ color: C.primary }}>{item.value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
          {step < 3 ? (
            <>
              <button
                onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all hover:bg-gray-50"
                style={{ borderColor: C.border, color: C.textMuted }}
              >
                <ChevronLeft size={14} />
                {step === 0 ? 'Batal' : 'Kembali'}
              </button>

              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 0 ? !canNext0 : !canNext1}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: C.primary, color: '#fff', opacity: (step === 0 ? canNext0 : canNext1) ? 1 : 0.4 }}
                >
                  Lanjut <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canNext2 || saving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: '#10B981', color: '#fff', opacity: canNext2 && !saving ? 1 : 0.4 }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Menyimpan...' : `Buat ${classes.length} Kelas`}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="ml-auto flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ background: C.primary, color: '#fff' }}
            >
              Selesai <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
