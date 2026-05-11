import { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, Users, Search, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

export default function KelasRombelModule({ authToken }: { authToken: string }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', grade: '10', majorId: '', capacity: '36' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchData(); }, [authToken]);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, mRes] = await Promise.allSettled([
      fetch('/api/classes', { headers }),
      fetch('/api/majors', { headers }),
    ]);
    if (cRes.status === 'fulfilled' && cRes.value.ok) setClasses(await cRes.value.json());
    if (mRes.status === 'fulfilled' && mRes.value.ok) setMajors(await mRes.value.json());
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/classes/${editing.id}` : '/api/classes';
      const res = await fetch(url, { method, headers, body: JSON.stringify({ ...form, grade: parseInt(form.grade), capacity: parseInt(form.capacity) }) });
      if (res.ok) {
        showToast(editing ? 'Kelas diperbarui' : 'Kelas berhasil dibuat');
        setShowForm(false); setEditing(null); setForm({ name: '', grade: '10', majorId: '', capacity: '36' });
        fetchData();
      }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Hapus kelas ini?')) return;
    await fetch(`/api/classes/${id}`, { method: 'DELETE', headers });
    showToast('Kelas dihapus'); fetchData();
  };

  const startEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, grade: String(c.grade || '10'), majorId: c.majorId || '', capacity: String(c.capacity || '36') });
    setShowForm(true);
  };

  const filtered = classes.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white" style={{ background: '#10B981' }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Kelas & Rombongan Belajar</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Kelola struktur kelas dan rombel</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', grade: '10', majorId: '', capacity: '36' }); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
          <Plus size={13} /> Tambah Kelas
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>{editing ? 'Edit Kelas' : 'Tambah Kelas Baru'}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Nama Kelas *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. XI AKL 1"
                className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Tingkat</label>
              <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="10">Kelas X</option><option value="11">Kelas XI</option><option value="12">Kelas XII</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Program Studi</label>
              <select value={form.majorId} onChange={e => setForm(p => ({ ...p, majorId: e.target.value }))} className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="">— Pilih Jurusan —</option>
                {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kapasitas</label>
              <input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
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

      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: C.border }}>
          <Search size={13} style={{ color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kelas..." className="flex-1 text-xs outline-none" style={{ background: 'transparent', color: C.text }} />
          <span className="text-xs" style={{ color: C.textMuted }}>{filtered.length} kelas</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-12" style={{ color: C.textMuted }}>
                <Layers size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p className="text-sm">Belum ada kelas terdaftar</p>
              </div>
            ) : filtered.map(c => {
              const major = majors.find(m => m.id === c.majorId);
              return (
                <div key={c.id} className="p-4 rounded-xl" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)' }}>
                      {c.grade || '?'}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition-colors">
                        <Edit size={12} style={{ color: C.textMuted }} />
                      </button>
                      <button onClick={() => del(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={12} style={{ color: '#EF4444' }} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-black" style={{ color: C.text }}>{c.name}</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{major?.name || 'Belum ada jurusan'}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Users size={11} style={{ color: C.textMuted }} />
                    <span className="text-[10px]" style={{ color: C.textMuted }}>{c._count?.students || 0} siswa · Kapasitas {c.capacity || 36}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
