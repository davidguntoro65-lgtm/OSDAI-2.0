import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, Download, FileSpreadsheet, CheckCircle2,
  AlertCircle, Loader2, Users, ChevronDown, ChevronUp,
  Eye, ArrowLeft, ShieldCheck,
} from 'lucide-react';

interface PreviewRow {
  row: number;
  nama: string;
  nis: string;
  kelas: string;
  className: string | null;
  status: 'valid' | 'error';
  message?: string;
}

interface PreviewResult {
  total: number;
  validCount: number;
  invalidCount: number;
  rows: PreviewRow[];
}

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

type Step = 'upload' | 'preview' | 'importing' | 'result';

interface Props {
  authToken: string;
  onClose: () => void;
  onDone: () => void;
}

export default function BulkUploadModal({ authToken, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [filterInvalid, setFilterInvalid] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    fetch('/api/students/bulk-template', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'template_import_siswa.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError('Gagal mengunduh template.'));
  };

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      setError('File harus berformat .xlsx atau .xls');
      return;
    }
    setError('');
    setPreview(null);
    setResult(null);
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/students/bulk-preview', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal membaca file.');
      } else {
        setPreview(data);
        setStep('preview');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;
    setStep('importing');
    setError('');
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
        setStep('preview');
      } else {
        setResult(data);
        if (data.success > 0) onDone();
        setStep('result');
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    setShowErrors(false);
    setFilterInvalid(false);
  };

  const errorRows = result?.rows.filter(r => r.status === 'error') ?? [];
  const displayedPreviewRows = preview
    ? (filterInvalid ? preview.rows.filter(r => r.status === 'error') : preview.rows)
    : [];

  const stepLabels: Record<Step, string> = {
    upload: 'Upload File',
    preview: 'Preview Data',
    importing: 'Mengimpor...',
    result: 'Hasil Import',
  };

  const stepNumbers: Record<Step, number> = {
    upload: 1,
    preview: 2,
    importing: 3,
    result: 3,
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget && step !== 'importing') onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: '#FDFDFC',
          border: '1px solid #EBEBE8',
          maxWidth: step === 'preview' ? '720px' : '520px',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBE8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
              <Users size={16} className="text-[#1A1A1A]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#1A1A1A]">Import Siswa Massal</h2>
              <p className="text-[10px] text-[#8E8E8E] font-medium">{stepLabels[step]}</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mr-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="w-6 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: n <= stepNumbers[step]
                    ? '#1A1A1A'
                    : '#EBEBE8',
                }}
              />
            ))}
          </div>

          {step !== 'importing' && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F3] transition-colors"
            >
              <X size={15} className="text-[#8E8E8E]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: UPLOAD ─────────────────────────────────── */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-6 space-y-5"
              >
                {/* Download template */}
                <div className="rounded-xl border border-[#EBEBE8] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">Download Template</span>
                  </div>
                  <p className="text-xs text-[#8E8E8E] leading-relaxed">
                    Unduh template Excel, isi data siswa, lalu upload. Kolom:{' '}
                    <strong className="text-[#1A1A1A]">Nama, NIS, Password, Kelas</strong>.
                  </p>
                  <div className="text-[10px] text-[#8E8E8E] space-y-0.5">
                    <p>• <strong>Kelas</strong>: <code className="bg-[#F5F5F3] px-1 rounded">XAKL</code> <code className="bg-[#F5F5F3] px-1 rounded">XIPM</code> <code className="bg-[#F5F5F3] px-1 rounded">XIIMPLB</code></p>
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

                {/* Upload file */}
                <div className="rounded-xl border border-[#EBEBE8] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-white text-[10px] font-black flex items-center justify-center">2</span>
                    <span className="text-sm font-bold text-[#1A1A1A]">Pilih File Excel</span>
                  </div>

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

                  {error && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handlePreview}
                    disabled={!file || previewing}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                    style={{
                      background: file && !previewing ? '#1A1A1A' : '#F5F5F3',
                      color: file && !previewing ? '#fff' : '#A1A1A1',
                      cursor: file && !previewing ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {previewing ? (
                      <><Loader2 size={15} className="animate-spin" /> Membaca file...</>
                    ) : (
                      <><Eye size={15} /> Preview & Validasi Data</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: PREVIEW ────────────────────────────────── */}
            {step === 'preview' && preview && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 space-y-4"
              >
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 text-center border border-[#EBEBE8]">
                    <p className="text-2xl font-black text-[#1A1A1A]">{preview.total}</p>
                    <p className="text-[10px] font-semibold text-[#8E8E8E] mt-0.5">Total Baris</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border border-green-100 bg-green-50">
                    <p className="text-2xl font-black text-green-600">{preview.validCount}</p>
                    <p className="text-[10px] font-semibold text-green-500 mt-0.5">Siap Diimport</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{
                    background: preview.invalidCount > 0 ? '#fef2f2' : '#F8F8F7',
                    border: `1px solid ${preview.invalidCount > 0 ? '#fecaca' : '#EBEBE8'}`,
                  }}>
                    <p className={`text-2xl font-black ${preview.invalidCount > 0 ? 'text-red-500' : 'text-[#8E8E8E]'}`}>
                      {preview.invalidCount}
                    </p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${preview.invalidCount > 0 ? 'text-red-400' : 'text-[#8E8E8E]'}`}>
                      Perlu Diperbaiki
                    </p>
                  </div>
                </div>

                {/* Warning if there are invalid rows */}
                {preview.invalidCount > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>
                      {preview.invalidCount} baris memiliki error dan akan <strong>dilewati</strong> saat import.
                      {preview.validCount === 0 ? ' Tidak ada data yang bisa diimport.' : ` Hanya ${preview.validCount} baris valid yang akan diimport.`}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 border border-red-100">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                {/* Filter toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#1A1A1A]">
                    Pratinjau Data ({displayedPreviewRows.length} ditampilkan)
                  </p>
                  {preview.invalidCount > 0 && (
                    <button
                      onClick={() => setFilterInvalid(v => !v)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                      style={{
                        background: filterInvalid ? '#fef2f2' : '#F5F5F3',
                        color: filterInvalid ? '#ef4444' : '#8E8E8E',
                      }}
                    >
                      {filterInvalid ? 'Tampilkan Semua' : `Tampilkan Error Saja (${preview.invalidCount})`}
                    </button>
                  )}
                </div>

                {/* Data table */}
                <div className="rounded-xl border border-[#EBEBE8] overflow-hidden">
                  {/* Table header */}
                  <div
                    className="grid text-[10px] font-black text-[#8E8E8E] uppercase tracking-wide"
                    style={{
                      gridTemplateColumns: '40px 1fr 100px 100px 1fr',
                      background: '#F8F8F7',
                      borderBottom: '1px solid #EBEBE8',
                      padding: '8px 12px',
                    }}
                  >
                    <span>#</span>
                    <span>Nama</span>
                    <span>NIS</span>
                    <span>Kelas</span>
                    <span>Status</span>
                  </div>

                  {/* Table rows */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#F5F5F3]">
                    {displayedPreviewRows.length === 0 && (
                      <div className="py-8 text-center text-xs text-[#A1A1A1]">Tidak ada data untuk ditampilkan.</div>
                    )}
                    {displayedPreviewRows.map((row) => (
                      <div
                        key={row.row}
                        className="grid items-start py-2.5 px-3 text-xs transition-colors hover:bg-[#FAFAFA]"
                        style={{
                          gridTemplateColumns: '40px 1fr 100px 100px 1fr',
                          background: row.status === 'error' ? '#fff8f8' : undefined,
                        }}
                      >
                        <span className="text-[10px] text-[#A1A1A1] font-bold pt-0.5">{row.row}</span>

                        <span className="font-semibold text-[#1A1A1A] truncate pr-2">{row.nama || <span className="text-[#C0C0C0] italic">kosong</span>}</span>

                        <span className="text-[#4A4A4A] font-mono text-[11px]">{row.nis || '—'}</span>

                        <span className="text-[#4A4A4A]">{row.className || row.kelas || '—'}</span>

                        <span>
                          {row.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                              <CheckCircle2 size={11} /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1 text-[10px] font-semibold text-red-500 leading-snug">
                              <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />
                              <span>{row.message}</span>
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: IMPORTING ──────────────────────────────── */}
            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-16 px-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F5F5F3] flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-[#1A1A1A]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#1A1A1A]">Mengimpor data siswa...</p>
                  <p className="text-xs text-[#8E8E8E] mt-1">Mohon tunggu, jangan tutup jendela ini.</p>
                </div>
                {preview && (
                  <p className="text-xs text-[#A1A1A1]">
                    Memproses {preview.validCount} siswa valid
                  </p>
                )}
              </motion.div>
            )}

            {/* ── STEP 4: RESULT ─────────────────────────────────── */}
            {step === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 space-y-4"
              >
                {/* Success banner */}
                {result.success > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-green-50 border border-green-100">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-700">
                        {result.success} siswa berhasil diimport
                      </p>
                      <p className="text-[10px] text-green-600">Data tersimpan ke database.</p>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 text-center border border-[#EBEBE8]">
                    <p className="text-2xl font-black text-[#1A1A1A]">{result.total}</p>
                    <p className="text-[10px] font-semibold text-[#8E8E8E] mt-0.5">Total Baris</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border border-green-100 bg-green-50">
                    <p className="text-2xl font-black text-green-600">{result.success}</p>
                    <p className="text-[10px] font-semibold text-green-500 mt-0.5">Berhasil</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{
                    background: result.failed > 0 ? '#fef2f2' : '#F8F8F7',
                    border: `1px solid ${result.failed > 0 ? '#fecaca' : '#EBEBE8'}`,
                  }}>
                    <p className={`text-2xl font-black ${result.failed > 0 ? 'text-red-500' : 'text-[#8E8E8E]'}`}>{result.failed}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${result.failed > 0 ? 'text-red-400' : 'text-[#8E8E8E]'}`}>Gagal</p>
                  </div>
                </div>

                {/* Error detail */}
                {errorRows.length > 0 && (
                  <div className="rounded-xl border border-[#EBEBE8] overflow-hidden">
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
                          <div className="max-h-48 overflow-y-auto border-t border-[#EBEBE8] divide-y divide-[#F5F5F3]">
                            {errorRows.map((r, i) => (
                              <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                                <span className="text-[10px] font-black text-[#A1A1A1] w-10 flex-shrink-0">Baris {r.row}</span>
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

                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#1A1A1A] hover:bg-[#F5F5F3] border border-[#EBEBE8] transition-colors"
                >
                  <Upload size={13} />
                  Import File Lagi
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBE8] flex-shrink-0">
          <div>
            {step === 'preview' && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#8E8E8E] hover:bg-[#F5F5F3] hover:text-[#1A1A1A] transition-colors"
              >
                <ArrowLeft size={13} />
                Ganti File
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step !== 'importing' && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold text-[#1A1A1A] hover:bg-[#F5F5F3] transition-colors"
              >
                {step === 'result' ? 'Selesai' : 'Tutup'}
              </button>
            )}

            {step === 'preview' && preview && preview.validCount > 0 && (
              <button
                onClick={handleConfirmUpload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                style={{ background: '#1A1A1A', color: '#fff' }}
              >
                <ShieldCheck size={15} />
                Konfirmasi Import ({preview.validCount} siswa)
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
