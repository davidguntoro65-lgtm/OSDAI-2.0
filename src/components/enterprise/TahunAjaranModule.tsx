import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, Edit, Trash2, CheckCircle2, Loader2,
  Layers, Sparkles, Star, StarOff, ChevronDown, ChevronUp,
  AlertTriangle, Clock, BookOpen, RefreshCcw, X,
} from 'lucide-react';
import { C } from '@/lib/themeC';
import SetupWizardModal from './SetupWizardModal';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const termLabel = (t: number) => (t === 1 ? 'Semester 1 · Gasal' : 'Semester 2 · Genap');

const termColor = (t: number) => (t === 1 ? '#7c3aed' : '#0ea5e9');

const today = new Date();
const isOngoing = (ay: AcademicYear) =>
  new Date(ay.startDate) <= today && today <= new Date(ay.endDate);

// ─── Empty Form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '',
  term: '1',
  startDate: '',
  endDate: '',
  isActive: false,
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color, icon: Icon }: any) => (
  <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-lg font-black leading-none" style={{ color: C.text }}>{value}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: C.textMuted }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TahunAjaranModule({ authToken }: { authToken: string }) {
  const [years, setYears]           = useState<AcademicYear[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<AcademicYear | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [toast, setToast]           = useState('');
  const [toastOk, setToastOk]       = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/years', { headers });
      if (res.ok) {
        const data: AcademicYear[] = await res.json();
        // Fetch class counts per year
        const classRes = await fetch('/api/classes', { headers });
        if (classRes.ok) {
          const classes: any[] = await classRes.json();
          const countMap: Record<string, number> = {};
          classes.forEach(c => { countMap[c.academicYearId] = (countMap[c.academicYearId] ?? 0) + 1; });
          setYears(data.map(y => ({ ...y, _count: { classes: countMap[y.id] ?? 0 } })));
        } else {
          setYears(data);
        }
      }
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchYears(); }, [authToken]);

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

  // ── Save ───────────────────────────────────────────────────────────────────

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
      const method = editing ? 'PATCH' : 'POST';
      const url    = editing ? `/api/academic/years` : '/api/academic/years';

      // PATCH doesn't exist yet for individual year — use PUT-style via upsert approach
      // For edit, we use the activate endpoint + name change workaround:
      // The backend POST upserts by name, so for edit we send a "new" year entry with same id
      // Actually let's just use POST for both (upsert) for now
      const payload = editing
        ? { ...body }  // will use setup/initialize upsert approach via dedicated endpoint below
        : body;

      let res: Response;
      if (editing) {
        // Use PATCH /api/academic/years/:id (we need to add this to backend)
        res = await fetch(`/api/academic/years/${editing.id}`, {
          method: 'PATCH', headers, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/academic/years', {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
      }

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

  const del = async (ay: AcademicYear) => {
    const classCount = ay._count?.classes ?? 0;
    const warning = classCount > 0
      ? `Tahun ajaran "${ay.name}" memiliki ${classCount} kelas yang akan ikut terhapus. Lanjutkan?`
      : `Hapus tahun ajaran "${ay.name}"?`;
    if (!confirm(warning)) return;
    setDeleting(ay.id);
    try {
      const res = await fetch(`/api/academic/years/${ay.id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast('Tahun ajaran dihapus.');
        fetchYears();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Gagal menghapus — mungkin masih ada data terkait.', false);
      }
    } finally { setDeleting(null); }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const activeYear  = years.find(y => y.isActive);
  const totalKelas  = years.reduce((s, y) => s + (y._count?.classes ?? 0), 0);
  const ongoingYear = years.find(y => isOngoing(y));

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white"
            style={{ background: toastOk ? '#10B981' : '#EF4444' }}
          >
            {toastOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard modal */}
      <AnimatePresence>
        {showWizard && (
          <SetupWizardModal
            authToken={authToken}
            onClose={() => setShowWizard(false)}
            onSuccess={() => fetchYears()}
          />
        )}
      </AnimatePresence>

      {/* Header */}
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all"
            style={{ borderColor: C.primary, color: C.primary, background: `${C.primary}0c` }}
          >
            <Sparkles size={12} /> Setup Wizard
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: C.primary }}
          >
            <Plus size={13} /> Tambah Tahun Ajaran
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Tahun Ajaran"
          value={loading ? '—' : years.length}
          icon={Calendar}
          color={C.primary}
        />
        <StatCard
          label="Tahun Ajaran Aktif"
          value={loading ? '—' : (activeYear?.name ?? '—')}
          sub={activeYear ? termLabel(activeYear.term) : undefined}
          icon={Star}
          color="#F59E0B"
        />
        <StatCard
          label="Sedang Berjalan"
          value={loading ? '—' : (ongoingYear?.name ?? 'Tidak ada')}
          sub={ongoingYear ? `Berakhir ${fmtDate(ongoingYear.endDate)}` : undefined}
          icon={Clock}
          color="#10B981"
        />
        <StatCard
          label="Total Kelas"
          value={loading ? '—' : totalKelas}
          sub="Semua tahun ajaran"
          icon={Layers}
          color="#7c3aed"
        />
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl p-5"
            style={{ background: C.card, border: `1.5px solid ${C.primary}40` }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black" style={{ color: C.text }}>
                {editing ? `Edit: ${editing.name}` : 'Tambah Tahun Ajaran Baru'}
              </p>
              <button onClick={closeForm} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
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
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none focus:ring-2 transition-all"
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

              {/* Active toggle */}
              <div className="flex items-end">
                <label
                  className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg w-full"
                  style={{ background: `${C.primary}08` }}
                >
                  <div
                    onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                    className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0 cursor-pointer"
                    style={{ background: form.isActive ? C.primary : C.border }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: form.isActive ? '22px' : '2px' }}
                    />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: C.text }}>Jadikan Aktif</span>
                </label>
              </div>

              {/* Start date */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }}
                />
              </div>

              {/* End date */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: C.textMuted }}>
                  Tanggal Selesai *
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg text-xs border outline-none"
                  style={{ borderColor: C.border, color: C.text, background: C.bg }}
                />
              </div>
            </div>

            {/* Warning if setting active */}
            {form.isActive && !editing?.isActive && (
              <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                <AlertTriangle size={12} />
                Semua tahun ajaran lain akan dinonaktifkan secara otomatis.
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ background: C.primary }}
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-xs font-semibold border"
                style={{ borderColor: C.border, color: C.textMuted }}
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${C.primary}40`, borderTopColor: C.primary }} />
        </div>
      ) : years.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-xl" style={{ background: C.card, border: `1px dashed ${C.border}` }}>
          <Calendar size={36} style={{ color: C.border }} />
          <p className="text-sm font-bold mt-3" style={{ color: C.text }}>Belum ada tahun ajaran</p>
          <p className="text-xs mt-1" style={{ color: C.textMuted }}>Gunakan Setup Wizard atau tombol "Tambah" untuk memulai.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold" style={{ background: `${C.primary}14`, color: C.primary }}>
              <Sparkles size={12} /> Setup Wizard
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
              <Plus size={12} /> Tambah Manual
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {years.map(ay => {
            const ongoing  = isOngoing(ay);
            const expanded = expandedId === ay.id;
            const classCount = ay._count?.classes ?? 0;

            return (
              <motion.div
                key={ay.id}
                layout
                className="rounded-xl overflow-hidden"
                style={{ background: C.card, border: `1.5px solid ${ay.isActive ? `${C.primary}50` : C.border}` }}
              >
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4">

                  {/* Status indicator */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {ay.isActive ? (
                      <div className="w-3 h-3 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ background: C.border }} />
                    )}
                  </div>

                  {/* Year name & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black" style={{ color: C.text }}>{ay.name}</span>
                      {ay.isActive && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#F0FDF4', color: '#15803D' }}>
                          AKTIF
                        </span>
                      )}
                      {ongoing && !ay.isActive && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                          BERJALAN
                        </span>
                      )}
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${termColor(ay.term)}14`, color: termColor(ay.term) }}
                      >
                        {termLabel(ay.term)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                      {fmtDate(ay.startDate)} — {fmtDate(ay.endDate)}
                      <span className="mx-2">·</span>
                      <Layers size={10} className="inline mr-0.5" />{classCount} kelas
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">

                    {/* Activate */}
                    {!ay.isActive && (
                      <button
                        onClick={() => activate(ay.id)}
                        disabled={activating === ay.id}
                        title="Jadikan aktif"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        style={{ background: '#FFF4ED', color: C.primary, border: `1px solid ${C.primary}30` }}
                      >
                        {activating === ay.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Star size={11} />}
                        Aktifkan
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(ay)}
                      title="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100"
                    >
                      <Edit size={13} style={{ color: C.textMuted }} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => del(ay)}
                      disabled={deleting === ay.id}
                      title="Hapus"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-red-50"
                    >
                      {deleting === ay.id
                        ? <Loader2 size={13} className="animate-spin" style={{ color: '#EF4444' }} />
                        : <Trash2 size={13} style={{ color: '#EF4444' }} />}
                    </button>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(expanded ? null : ay.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-gray-100"
                    >
                      {expanded
                        ? <ChevronUp size={13} style={{ color: C.textMuted }} />
                        : <ChevronDown size={13} style={{ color: C.textMuted }} />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', borderTop: `1px solid ${C.border}` }}
                    >
                      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'ID', value: ay.id.slice(0, 8) + '…' },
                          { label: 'Semester', value: termLabel(ay.term) },
                          { label: 'Kelas Terdaftar', value: `${classCount} kelas` },
                          {
                            label: 'Durasi',
                            value: (() => {
                              const ms = new Date(ay.endDate).getTime() - new Date(ay.startDate).getTime();
                              const days = Math.round(ms / 86400000);
                              return `${days} hari`;
                            })(),
                          },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: C.textMuted }}>{item.label}</p>
                            <p className="text-xs font-bold" style={{ color: C.text }}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {ay.isActive && (
                        <div className="px-5 pb-4">
                          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#F0FDF4', color: '#15803D' }}>
                            <CheckCircle2 size={12} />
                            Ini adalah tahun ajaran yang sedang aktif. Semua operasi akademik (absensi, jadwal, SPP) mengacu ke tahun ajaran ini.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {years.length > 0 && (
        <p className="text-[10px] text-center" style={{ color: C.textMuted }}>
          {years.length} tahun ajaran terdaftar · {activeYear ? `Aktif: ${activeYear.name}` : 'Tidak ada tahun ajaran aktif'}
        </p>
      )}
    </div>
  );
}
