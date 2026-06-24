import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2, Users, ChevronDown, ChevronUp,
} from 'lucide-react';

interface RowResult {
  row: number;
  nama: string;
  nis: string;
  status: 'success' | 'error';
  message?: string;
}

interface UploadResult {
  total: number;
  success: number;
  failed: number;
  rows: RowResult[];
}

interface Props {
  authToken: string;
  onClose: () => void;
  onDone: () => void;
}

export default function BulkUploadModal({ authToken, onClose, onDone }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const a = document.createElement('a');
    a.href = '/api/students/bulk-template';
    a.download = 'template_import_siswa.xlsx';
    const headers = new Headers({ Authorization: `Bearer ${authToken}` });
    fetch('/api/students/bulk-template', { headers })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      setError('File harus berformat .xlsx atau .xls');
      return;
    }
    setError('');
    setResult(null);
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Upload gagal.');
      } else {
        setResult(data);
        if (data.success > 0) onDone();
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const successRows = result?.rows.filter(r => r.status === 'success') ?? [];
  const errorRows = result?.rows.filter(r => r.status === 'error') ?? [];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: '#FDFDFC', border: '1px solid #EBEBE8' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBE8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
              <Users size={16} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Import Siswa Massal</h2>
              <p className="text-[10px] text-[#8E8E8E] font-medium">Upload file Excel dengan data siswa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F3] transition-colors"
          >
            <X size={15} className="text-[#8E8E8E]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">

            {/* Step 1: Download template */}
            <div className="rounded-xl border border-[#EBEBE8] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">1</span>
                <span className="text-sm font-bold text-[#1A1A1A]">Download Template</span>
              </div>
              <p className="text-xs text-[#8E8E8E] leading-relaxed">
                Unduh template Excel, isi data siswa, lalu upload kembali.
                Kolom yang tersedia: <strong className="text-[#1A1A1A]">Nama, NIS, Password, Kelas</strong>.
              </p>
              <div className="text-[10px] text-[#8E8E8E] space-y-0.5">
                <p>• Format kolom <strong>Kelas</strong>: <code className="bg-[#F5F5F3] px-1 rounded">XAKL</code> <code className="bg-[#F5F5F3] px-1 rounded">XIPM</code> <code className="bg-[#F5F5F3] px-1 rounded">XIIMPLB</code></p>
                <p>• Email & NISN dibuat otomatis dari NIS</p>
                <p>• NIS harus unik per siswa</p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95"
                style={{ background: '#1A1A1A', color: '#fff' }}
              >
                <Download size={13} />
                Download Template (.xlsx)
              </button>
            </div>

            {/* Step 2: Upload */}
            <div className="rounded-xl border border-[#EBEBE8] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">2</span>
                <span className="text-sm font-bold text-[#1A1A1A]">Upload File</span>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 py-8"
                style={{
                  borderColor: dragging ? '#1A1A1A' : file ? '#10b981' : '#DEDEDE',
                  background: dragging ? '#F5F5F3' : file ? '#f0fdf4' : '#FAFAFA',
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
                {file ? (
                  <>
                    <FileSpreadsheet size={28} style={{ color: '#10b981' }} />
                    <p className="text-sm font-bold text-[#1A1A1A]">{file.name}</p>
                    <p className="text-[10px] text-[#8E8E8E]">{(file.size / 1024).toFixed(1)} KB · Klik untuk ganti</p>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-[#A1A1A1]" />
                    <p className="text-sm font-semibold text-[#1A1A1A]">Drag & drop file di sini</p>
                    <p className="text-[10px] text-[#8E8E8E]">atau klik untuk pilih file (.xlsx / .xls)</p>
                  </>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: file && !uploading ? '#1A1A1A' : '#F5F5F3',
                  color: file && !uploading ? '#fff' : '#A1A1A1',
                  cursor: file && !uploading ? 'pointer' : 'not-allowed',
                }}
              >
                {uploading ? (
                  <><Loader2 size={15} className="animate-spin" /> Mengupload & Memproses...</>
                ) : (
                  <><Upload size={15} /> Proses Upload</>
                )}
              </button>
            </div>

            {/* Step 3: Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[#EBEBE8] overflow-hidden"
                >
                  {/* Summary */}
                  <div className="p-4 border-b border-[#EBEBE8]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">3</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">Hasil Import</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-3 text-center" style={{ background: '#F8F8F7' }}>
                        <p className="text-xl font-black text-[#1A1A1A]">{result.total}</p>
                        <p className="text-[10px] font-semibold text-[#8E8E8E]">Total Baris</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: '#f0fdf4' }}>
                        <p className="text-xl font-black text-green-600">{result.success}</p>
                        <p className="text-[10px] font-semibold text-green-500">Berhasil</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: result.failed > 0 ? '#fef2f2' : '#F8F8F7' }}>
                        <p className={`text-xl font-black ${result.failed > 0 ? 'text-red-500' : 'text-[#8E8E8E]'}`}>{result.failed}</p>
                        <p className={`text-[10px] font-semibold ${result.failed > 0 ? 'text-red-400' : 'text-[#8E8E8E]'}`}>Gagal</p>
                      </div>
                    </div>
                  </div>

                  {/* Error rows */}
                  {errorRows.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowErrors(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          {errorRows.length} baris gagal diimport
                        </span>
                        {showErrors ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <AnimatePresence>
                        {showErrors && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="max-h-48 overflow-y-auto border-t border-[#EBEBE8]">
                              {errorRows.map((r, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 px-4 py-2.5 border-b border-[#F5F5F3] last:border-0"
                                >
                                  <span className="text-[10px] font-black text-[#A1A1A1] w-8 flex-shrink-0">
                                    Baris {r.row}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-[#1A1A1A] truncate">{r.nama || '—'}</p>
                                    <p className="text-[10px] text-red-500">{r.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* All success message */}
                  {result.failed === 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-green-600">
                      <CheckCircle2 size={14} />
                      Semua siswa berhasil diimport!
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#EBEBE8] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#1A1A1A] hover:bg-[#F5F5F3] transition-colors"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
