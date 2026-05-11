import { useState, useEffect, useRef } from 'react';
import {
  Archive,
  Upload,
  Search,
  Trash2,
  Eye,
  Download,
  FileText,
  Image,
  File,
  Loader2,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
  FolderOpen,
  Shield,
  Calendar,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  { key: '', label: 'Semua Arsip' },
  { key: 'ARSIP_IJAZAH', label: 'Ijazah' },
  { key: 'ARSIP_SK', label: 'SK Pegawai' },
  { key: 'SERTIFIKAT', label: 'Sertifikat Siswa' },
  { key: 'DOKUMEN_UMUM', label: 'Dokumen Umum' },
  { key: 'RAPOR', label: 'Rapor' },
];

const CAT_COLORS: Record<string, string> = {
  ARSIP_IJAZAH: 'bg-orange-50 text-orange-700 border-orange-100',
  ARSIP_SK: 'bg-blue-50 text-blue-700 border-blue-100',
  SERTIFIKAT: 'bg-purple-50 text-purple-700 border-purple-100',
  DOKUMEN_UMUM: 'bg-slate-50 text-slate-700 border-slate-100',
  RAPOR: 'bg-green-50 text-green-700 border-green-100',
};

const FileIcon = ({ url }: { url: string }) => {
  const ext = url?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image size={20} className="text-blue-400" />;
  if (['pdf'].includes(ext || '')) return <FileText size={20} className="text-red-400" />;
  return <File size={20} className="text-slate-400" />;
};

export default function ArchiveModule({ authToken }: { authToken: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCat, setFormCat] = useState('DOKUMEN_UMUM');
  const [formUrl, setFormUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchDocs(); }, [category]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const url = `/api/archive${category ? `?category=${category}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!formTitle.trim()) { setFormError('Judul dokumen wajib diisi.'); return; }
    if (!formUrl.trim()) { setFormError('URL/Tautan dokumen wajib diisi.'); return; }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/archive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ title: formTitle.trim(), category: formCat, fileUrl: formUrl.trim() })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal menyimpan'); }
      setUploadModal(false);
      setFormTitle(''); setFormUrl(''); setFormCat('DOKUMEN_UMUM');
      fetchDocs();
      showToast('Dokumen berhasil diarsipkan!');
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/archive/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setDeleteTarget(null);
      fetchDocs();
      showToast('Dokumen berhasil dihapus.');
    } catch (err: any) { showToast(err.message, 'error'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const filtered = docs.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.referenceNo?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Arsip Digital</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">Kelola dan simpan dokumen sekolah secara digital dan terstruktur.</p>
        </div>
        <Button
          onClick={() => { setFormTitle(''); setFormUrl(''); setFormCat('DOKUMEN_UMUM'); setFormError(''); setUploadModal(true); }}
          className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white h-11 px-5 font-black shadow-lg shadow-orange-500/20"
        >
          <Upload size={15} className="mr-2" /> Unggah Arsip
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.slice(1).map(cat => {
          const count = docs.filter(d => d.category === cat.key).length;
          return (
            <div key={cat.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <FolderOpen size={16} className="text-slate-300 mb-2" />
              <div className="text-xl font-black text-slate-900">{count}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{cat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari dokumen, nomor referensi..."
            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                category === cat.key
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
              }`}
            >
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
          <Archive size={40} className="text-slate-200" />
          <div>
            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Arsip Kosong</p>
            <p className="text-xs text-slate-300 font-bold mt-1">Mulai unggah dokumen untuk diarsipkan di sini.</p>
          </div>
          <Button
            onClick={() => setUploadModal(true)}
            className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white h-10 px-5 font-black text-xs mt-2"
          >
            <Plus size={13} className="mr-1.5" /> Unggah Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <FileIcon url={doc.fileUrl} />
                </div>
                <Badge className={`text-[9px] font-black rounded-full border ${CAT_COLORS[doc.category] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                  {CATEGORIES.find(c => c.key === doc.category)?.label || doc.category}
                </Badge>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-900 leading-tight line-clamp-2">{doc.title}</h4>
                {doc.referenceNo && (
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{doc.referenceNo}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                  <Calendar size={10} />
                  {formatDate(doc.createdAt)}
                </div>
                {doc.isVerified && (
                  <div className="flex items-center gap-1 text-[10px] font-black text-green-600">
                    <Shield size={10} /> Terverifikasi
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Eye size={12} /> Lihat
                </a>
                <a
                  href={doc.fileUrl}
                  download
                  className="flex-1 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Download size={12} /> Unduh
                </a>
                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="h-8 w-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setUploadModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Arsip Digital</span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">Unggah Dokumen Baru</h3>
                </div>
                <button onClick={() => setUploadModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Judul Dokumen *</label>
                  <Input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Ijazah Budi Santoso 2024"
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Kategori</label>
                  <select
                    value={formCat}
                    onChange={e => setFormCat(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {CATEGORIES.slice(1).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    <Link size={10} className="inline mr-1" />URL/Tautan Dokumen *
                  </label>
                  <Input
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-sm"
                  />
                  <p className="text-[9px] font-bold text-slate-300 mt-1.5 ml-1">Gunakan Google Drive, OneDrive, atau link langsung ke file.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-12 rounded-2xl border-slate-200 font-black" onClick={() => setUploadModal(false)}>Batal</Button>
                  <Button
                    className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20"
                    onClick={handleUpload}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Upload size={15} className="mr-1.5" />}
                    Simpan Arsip
                  </Button>
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
              <h3 className="text-lg font-black text-slate-900">Hapus Arsip?</h3>
              <p className="text-xs font-bold text-slate-400 mt-2">"{deleteTarget.title}"</p>
              <p className="text-xs text-slate-300 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
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
