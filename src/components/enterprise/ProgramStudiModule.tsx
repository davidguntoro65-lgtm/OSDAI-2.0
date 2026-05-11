import { useState, useEffect } from 'react';
import { Award, Plus, Edit, Trash2, Search, CheckCircle2, Loader2 } from 'lucide-react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

export default function ProgramStudiModule({ authToken }: { authToken: string }) {
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', accreditation: 'A' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchMajors(); }, [authToken]);

  const fetchMajors = async () => {
    setLoading(true);
    const res = await fetch('/api/majors', { headers });
    if (res.ok) setMajors(await res.json()); else setMajors([]);
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/majors/${editing.id}` : '/api/majors';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        showToast(editing ? 'Program studi diperbarui' : 'Program studi berhasil dibuat');
        setShowForm(false); setEditing(null); setForm({ name: '', code: '', description: '', accreditation: 'A' });
        fetchMajors();
      }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Hapus program studi ini?')) return;
    await fetch(`/api/majors/${id}`, { method: 'DELETE', headers });
    showToast('Program studi dihapus'); fetchMajors();
  };

  const startEdit = (m: any) => {
    setEditing(m);
    setForm({ name: m.name, code: m.code || '', description: m.description || '', accreditation: m.accreditation || 'A' });
    setShowForm(true);
  };

  const filtered = majors.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.code?.toLowerCase().includes(search.toLowerCase()));

  const acredColors: Record<string, string> = { A: '#10B981', B: '#0ea5e9', C: '#F59E0B' };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white" style={{ background: '#10B981' }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Program Studi / Jurusan</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Kelola program studi dan jurusan SMK</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', code: '', description: '', accreditation: 'A' }); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
          <Plus size={13} /> Tambah Program Studi
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>{editing ? 'Edit Program Studi' : 'Tambah Program Studi Baru'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Nama Program Studi *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Akuntansi dan Keuangan Lembaga"
                className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kode *</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. AKL"
                className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Akreditasi</label>
              <select value={form.accreditation} onChange={e => setForm(p => ({ ...p, accreditation: e.target.value }))} className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="A">A — Unggul</option><option value="B">B — Baik Sekali</option><option value="C">C — Baik</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Deskripsi</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Deskripsi singkat program studi..."
                className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-2" style={{ background: C.primary }}>
              {saving && <Loader2 size={11} className="animate-spin" />} {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: C.border, color: C.textMuted }}>Batal</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <Search size={13} style={{ color: C.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari program studi..." className="flex-1 text-xs outline-none" style={{ background: 'transparent', color: C.text }} />
        <span className="text-xs" style={{ color: C.textMuted }}>{filtered.length} program studi</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12" style={{ color: C.textMuted }}>
              <Award size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p className="text-sm">Belum ada program studi</p>
            </div>
          ) : filtered.map(m => (
            <div key={m.id} className="p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg text-xs font-black" style={{ background: '#FFF4ED', color: C.primary }}>{m.code}</div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${acredColors[m.accreditation || 'A']}15`, color: acredColors[m.accreditation || 'A'] }}>
                    Akreditasi {m.accreditation || 'A'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(m)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
                    <Edit size={12} style={{ color: C.textMuted }} />
                  </button>
                  <button onClick={() => del(m.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50">
                    <Trash2 size={12} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-black" style={{ color: C.text }}>{m.name}</h3>
              {m.description && <p className="text-[10px] mt-1 leading-relaxed" style={{ color: C.textMuted }}>{m.description}</p>}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t" style={{ borderColor: C.border }}>
                <span className="text-[10px]" style={{ color: C.textMuted }}>{m._count?.classes || 0} kelas</span>
                <span className="text-[10px]" style={{ color: C.textMuted }}>{m._count?.subjects || 0} mata pelajaran</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
