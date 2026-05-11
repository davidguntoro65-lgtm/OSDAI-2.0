import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Eye,
  Download,
  Loader2,
  Send,
  CheckCircle2,
  X,
  AlertCircle,
  Mail,
  MailOpen,
  Calendar,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  { key: '', label: 'Semua Surat', icon: FileText },
  { key: 'SURAT_MASUK', label: 'Surat Masuk', icon: ArrowDownLeft },
  { key: 'SURAT_KELUAR', label: 'Surat Keluar', icon: ArrowUpRight },
  { key: 'SURAT_EDARAN', label: 'Surat Edaran', icon: Mail },
  { key: 'SK', label: 'SK / Keterangan', icon: FileText },
];

const CAT_COLORS: Record<string, string> = {
  SURAT_MASUK: 'bg-blue-50 text-blue-700 border-blue-100',
  SURAT_KELUAR: 'bg-orange-50 text-orange-700 border-orange-100',
  SURAT_EDARAN: 'bg-purple-50 text-purple-700 border-purple-100',
  SK: 'bg-green-50 text-green-700 border-green-100',
};

const CAT_ICONS: Record<string, any> = {
  SURAT_MASUK: ArrowDownLeft,
  SURAT_KELUAR: ArrowUpRight,
  SURAT_EDARAN: Mail,
  SK: FileText,
};

export default function SuratModule({ authToken }: { authToken: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCat, setFormCat] = useState('SURAT_KELUAR');
  const [formUrl, setFormUrl] = useState('');
  const [formRef, setFormRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail view
  const [detailDoc, setDetailDoc] = useState<any>(null);

  useEffect(() => { fetchDocs(); }, [category]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const url = `/api/surat${category ? `?category=${category}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) { setFormError('Perihal/judul surat wajib diisi.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/surat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCat,
          fileUrl: formUrl.trim() || '#',
          referenceNo: formRef.trim() || undefined,
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal menyimpan surat'); }
      setCreateModal(false);
      setFormTitle(''); setFormUrl(''); setFormCat('SURAT_KELUAR'); setFormRef('');
      fetchDocs();
      showToast('Surat berhasil disimpan!');
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/surat/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setDeleteTarget(null);
      fetchDocs();
      showToast('Surat berhasil dihapus.');
    } catch (err: any) { showToast(err.message, 'error'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const filtered = docs.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.referenceNo?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const suratMasuk = docs.filter(d => d.category === 'SURAT_MASUK').length;
  const suratKeluar = docs.filter(d => d.category === 'SURAT_KELUAR').length;
  const suratEdaran = docs.filter(d => d.category === 'SURAT_EDARAN').length;
  const skDocs = docs.filter(d => d.category === 'SK').length;

  return (
    <div className="space-y-6 pb-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold text-white ${toastType === 'success' ? 'bg-slate-900' : 'bg-red-500'}`}
          >
            {toastType === 'success' ? <CheckCircle2 size={16} className="text-green-400" /> : <AlertCircle size={16} />}
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pusat Surat Digital</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">Kelola surat masuk, keluar, edaran, dan SK sekolah secara digital.</p>
        </div>
        <Button
          onClick={() => { setFormTitle(''); setFormUrl(''); setFormCat('SURAT_KELUAR'); setFormRef(''); setFormError(''); setCreateModal(true); }}
          className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white h-11 px-5 font-black shadow-lg shadow-slate-900/20"
        >
          <Plus size={15} className="mr-2" /> Buat Surat
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Surat Masuk', count: suratMasuk, Icon: ArrowDownLeft, color: 'text-blue-500 bg-blue-50' },
          { label: 'Surat Keluar', count: suratKeluar, Icon: ArrowUpRight, color: 'text-orange-500 bg-orange-50' },
          { label: 'Surat Edaran', count: suratEdaran, Icon: Mail, color: 'text-purple-500 bg-purple-50' },
          { label: 'SK / Keterangan', count: skDocs, Icon: FileText, color: 'text-green-500 bg-green-50' },
        ].map(({ label, count, Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={16} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{count}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari perihal, nomor surat..."
            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                category === cat.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
              }`}
            >
              <cat.icon size={10} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-slate-200" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-4 text-center">
          <FileText size={40} className="text-slate-200" />
          <div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Tidak Ada Surat</p>
            <p className="text-xs text-slate-300 font-bold mt-1">Buat surat baru atau ubah filter yang dipilih.</p>
          </div>
          <Button onClick={() => setCreateModal(true)} className="rounded-2xl bg-slate-900 text-white h-10 px-5 font-black text-xs mt-2">
            <Plus size={13} className="mr-1.5" /> Buat Surat
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((doc, i) => {
              const CatIcon = CAT_ICONS[doc.category] || FileText;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-all group cursor-pointer"
                  onClick={() => setDetailDoc(doc)}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${CAT_COLORS[doc.category] || 'bg-slate-50 border-slate-100'}`}>
                    <CatIcon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-900 truncate">{doc.title}</p>
                      {doc.isVerified && <Shield size={11} className="text-green-500 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {doc.referenceNo && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Hash size={8} />{doc.referenceNo}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Calendar size={8} />{formatDate(doc.createdAt)}
                      </span>
                      {doc.uploader?.name && (
                        <span className="text-[10px] font-bold text-slate-300">{doc.uploader.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className={`text-[9px] font-black rounded-full border ${CAT_COLORS[doc.category] || ''}`}>
                      {CATEGORIES.find(c => c.key === doc.category)?.label || doc.category}
                    </Badge>
                    <a
                      href={doc.fileUrl !== '#' ? doc.fileUrl : undefined}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all"
                    >
                      <Eye size={12} />
                    </a>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }}
                      className="h-8 w-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setCreateModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manajemen Surat</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Buat Surat Baru</h3>
                </div>
                <button onClick={() => setCreateModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-100">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-600">{formError}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Perihal / Judul Surat *</label>
                  <Input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Undangan Rapat Dinas"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Jenis Surat</label>
                  <select
                    value={formCat}
                    onChange={e => setFormCat(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nomor Surat (opsional)</label>
                  <Input
                    value={formRef}
                    onChange={e => setFormRef(e.target.value)}
                    placeholder="e.g. 005/KS/VI/2024"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">URL Dokumen (opsional)</label>
                  <Input
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-2xl border-slate-200 font-black" onClick={() => setCreateModal(false)}>Batal</Button>
                  <Button
                    className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black shadow-lg shadow-slate-900/20"
                    onClick={handleCreate}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Send size={15} className="mr-1.5" />}
                    Simpan Surat
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDetailDoc(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Detail Surat</span>
                <button onClick={() => setDetailDoc(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                  <X size={15} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <Badge className={`text-[10px] font-black rounded-full border ${CAT_COLORS[detailDoc.category] || ''}`}>
                  {CATEGORIES.find(c => c.key === detailDoc.category)?.label || detailDoc.category}
                </Badge>
                <h3 className="text-lg font-black text-slate-900">{detailDoc.title}</h3>
                <div className="space-y-2 text-xs font-bold text-slate-500">
                  {detailDoc.referenceNo && <div className="flex items-center gap-2"><Hash size={12} />{detailDoc.referenceNo}</div>}
                  <div className="flex items-center gap-2"><Calendar size={12} />{formatDate(detailDoc.createdAt)}</div>
                  {detailDoc.uploader?.name && <div className="flex items-center gap-2"><FileText size={12} />{detailDoc.uploader.name}</div>}
                  {detailDoc.isVerified && <div className="flex items-center gap-2 text-green-600"><Shield size={12} />Terverifikasi</div>}
                </div>
                <div className="flex gap-2 pt-2">
                  {detailDoc.fileUrl && detailDoc.fileUrl !== '#' && (
                    <a
                      href={detailDoc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <Eye size={13} /> Buka Dokumen
                    </a>
                  )}
                  <button
                    onClick={() => { setDetailDoc(null); setDeleteTarget(detailDoc); }}
                    className="h-10 w-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-all shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm p-7 text-center"
            >
              <div className="w-14 h-14 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Hapus Surat?</h3>
              <p className="text-xs font-bold text-slate-400 mt-2">"{deleteTarget.title}"</p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-11 rounded-2xl border-slate-200 font-black" onClick={() => setDeleteTarget(null)}>Batal</Button>
                <Button
                  className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/20"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                  Hapus
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
