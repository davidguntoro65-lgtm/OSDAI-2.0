import { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Loader2,
  AlertTriangle,
  FileCode,
  Table as TableIcon,
  ShieldCheck,
  Activity,
  History,
  Zap,
  FlaskConical,
  TriangleAlert,
  X,
  Database,
  Users,
  CalendarDays,
  BookOpen,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// ── Demo Replacement Confirmation Dialog ─────────────────────────────────────

interface PreflightData {
  incomingRecords: number;
  isDemoActive: boolean;
  activeDemoVersion: {
    id: string;
    versionName: string;
    scheduleCount: number;
    studentCount: number;
    attendanceCount: number;
  } | null;
  activeRealVersion: {
    id: string;
    versionName: string;
    scheduleCount: number;
    source: string;
  } | null;
}

function DemoReplaceDialog({
  preflight,
  onConfirm,
  onCancel,
  loading,
}: {
  preflight: PreflightData;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#EBEBE8]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                <FlaskConical size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1A1A1A]">Ganti Data Demo</h2>
                <p className="text-[11px] text-[#8E8E8E] font-medium mt-0.5">
                  Smart CSV Replacement Engine
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
              <X size={16} className="text-[#8E8E8E]" />
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Warning notice */}
          <div className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)' }}>
            <TriangleAlert size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-purple-800 leading-relaxed">
              Sistem mendeteksi <strong>jadwal demo aktif</strong>. CSV Anda akan menggantikan seluruh data demo
              secara otomatis. Data demo akan diarsipkan dan jadwal produksi Anda akan diaktifkan.
            </p>
          </div>

          {/* What will be replaced */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8E8E8E] mb-3">
              Data Demo Yang Akan Diarsipkan
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl border border-[#EBEBE8] text-center">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-2">
                  <CalendarDays size={16} className="text-purple-600" />
                </div>
                <p className="text-lg font-black text-[#1A1A1A]">
                  {preflight.activeDemoVersion?.scheduleCount ?? 0}
                </p>
                <p className="text-[9px] font-bold text-[#8E8E8E] uppercase">Jadwal Demo</p>
              </div>
              <div className="p-3 rounded-2xl border border-[#EBEBE8] text-center">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Users size={16} className="text-blue-600" />
                </div>
                <p className="text-lg font-black text-[#1A1A1A]">
                  {preflight.activeDemoVersion?.studentCount ?? 0}
                </p>
                <p className="text-[9px] font-bold text-[#8E8E8E] uppercase">Siswa Demo</p>
              </div>
              <div className="p-3 rounded-2xl border border-[#EBEBE8] text-center">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-2">
                  <Database size={16} className="text-green-600" />
                </div>
                <p className="text-lg font-black text-[#1A1A1A]">
                  {preflight.activeDemoVersion?.attendanceCount ?? 0}
                </p>
                <p className="text-[9px] font-bold text-[#8E8E8E] uppercase">Presensi Demo</p>
              </div>
            </div>
          </div>

          {/* What will be activated */}
          <div className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <CheckCheck size={16} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-green-800">
                {preflight.incomingRecords} jadwal baru akan diaktifkan ke produksi
              </p>
              <p className="text-[10px] text-green-600 mt-0.5">
                Versi: CSV-Import · Sumber: UPLOADED · Status: ACTIVE
              </p>
            </div>
          </div>

          {/* Important notes */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#8E8E8E]">Catatan Penting</p>
            {[
              'Jadwal demo diarsipkan (tidak dihapus), dapat dipulihkan oleh SUPER_ADMIN',
              'Data siswa dan guru demo TIDAK dihapus — hanya versi jadwal yang diganti',
              'Riwayat presensi demo tetap tersimpan untuk keperluan audit',
              'Banner MODE DEMO akan hilang otomatis setelah commit berhasil',
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0 mt-1.5" />
                <p className="text-[11px] text-[#8E8E8E]">{note}</p>
              </div>
            ))}
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5 ${
                agreed ? 'bg-orange-500 border-orange-500' : 'border-[#EBEBE8] group-hover:border-orange-300'
              }`}
            >
              {agreed && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className="text-xs font-semibold text-[#1A1A1A] leading-relaxed">
              Saya mengerti bahwa jadwal demo akan diarsipkan dan CSV ini akan menjadi jadwal produksi aktif
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 rounded-2xl h-12 font-bold border-[#EBEBE8]"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!agreed || loading}
            className="flex-1 rounded-2xl h-12 font-black bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/25 disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin mr-2" /> Memproses...</>
            ) : (
              <><ArrowRight size={15} className="mr-2" /> Ganti & Aktifkan</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Standard Confirm Dialog (no demo detected) ────────────────────────────────

function StandardConfirmDialog({
  preflight,
  onConfirm,
  onCancel,
  loading,
}: {
  preflight: PreflightData;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden"
      >
        <div className="px-7 pt-7 pb-5 border-b border-[#EBEBE8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1A1A1A]">Konfirmasi Penggantian Jadwal</h2>
              <p className="text-[11px] text-[#8E8E8E] font-medium">Versi jadwal aktif akan diarsipkan</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 space-y-4">
          {preflight.activeRealVersion && (
            <div className="p-4 rounded-2xl border border-[#EBEBE8]">
              <p className="text-[10px] font-black text-[#8E8E8E] uppercase mb-2">Versi Aktif Saat Ini</p>
              <p className="text-sm font-black text-[#1A1A1A]">{preflight.activeRealVersion.versionName}</p>
              <p className="text-xs text-[#8E8E8E]">{preflight.activeRealVersion.scheduleCount} jadwal · Sumber: {preflight.activeRealVersion.source}</p>
            </div>
          )}
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <p className="text-xs font-black text-green-800">{preflight.incomingRecords} jadwal baru akan diaktifkan</p>
          </div>
          <p className="text-xs text-[#8E8E8E]">
            Versi aktif saat ini akan diarsipkan. Tindakan ini dapat dipulihkan oleh SUPER_ADMIN.
          </p>
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1 rounded-2xl h-11 font-bold border-[#EBEBE8]">
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-2xl h-11 font-black bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Memproses...</> : 'Aktifkan'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TimetableImport({ authToken }: { authToken: string }) {
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<any>(null);
  const [stagingRecords, setStagingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');

  // Smart commit flow state
  const [preflight, setPreflight] = useState<PreflightData | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<{ replacedDemo: boolean; versionName: string } | null>(null);

  useEffect(() => {
    fetchUploads();
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const res = await fetch('/api/academic/years', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setAcademicYears(data);
      if (data.length > 0) setSelectedYearId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUploads = async () => {
    try {
      const res = await fetch('/api/timetable/uploads', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaging = async (uploadId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable/staging/${uploadId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setStagingRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/timetable/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      fetchUploads();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Step 1: Run preflight check — detect demo version and build confirmation UI
  const handleCommitClick = async () => {
    if (!selectedYearId || !selectedUpload) return;
    setCommitResult(null);

    try {
      const res = await fetch('/api/timetable/commit/preflight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ uploadId: selectedUpload.id, academicYearId: selectedYearId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preflight check failed');
      setPreflight(data);
      setShowConfirmDialog(true);
    } catch (err: any) {
      alert(`Preflight gagal: ${err.message}`);
    }
  };

  // Step 2: User confirmed — execute the actual commit
  const handleConfirmCommit = async () => {
    if (!selectedYearId || !selectedUpload || !preflight) return;
    setCommitLoading(true);
    try {
      const res = await fetch('/api/timetable/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ uploadId: selectedUpload.id, academicYearId: selectedYearId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Commit failed');

      setShowConfirmDialog(false);
      setCommitResult({
        replacedDemo: data.result?.replacedDemo ?? false,
        versionName: data.result?.version?.versionName ?? 'CSV-Import',
      });
      fetchUploads();
      setSelectedUpload(null);
      setStagingRecords([]);
      setPreflight(null);
    } catch (err: any) {
      alert(`Commit gagal: ${err.message}`);
    } finally {
      setCommitLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MATCHED': return <Badge className="bg-green-100 text-green-700 border-green-200">MATCHED</Badge>;
      case 'NEW_ENTITY': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">NEW ENTITY</Badge>;
      case 'CONFLICT': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">CONFLICT</Badge>;
      case 'INVALID': return <Badge className="bg-red-100 text-red-700 border-red-200">INVALID</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    matched: stagingRecords.filter(r => r.status === 'MATCHED').length,
    unresolved: stagingRecords.filter(r => r.status === 'NEW_ENTITY').length,
    conflicts: stagingRecords.filter(r => r.conflicts.length > 0).length,
    accuracy: stagingRecords.length > 0 ? (stagingRecords.filter(r => r.status === 'MATCHED').length / stagingRecords.length * 100).toFixed(1) : 0
  };

  return (
    <>
      {/* Smart Confirmation Dialogs */}
      <AnimatePresence>
        {showConfirmDialog && preflight && (
          preflight.isDemoActive ? (
            <DemoReplaceDialog
              preflight={preflight}
              onConfirm={handleConfirmCommit}
              onCancel={() => { setShowConfirmDialog(false); setPreflight(null); }}
              loading={commitLoading}
            />
          ) : (
            <StandardConfirmDialog
              preflight={preflight}
              onConfirm={handleConfirmCommit}
              onCancel={() => { setShowConfirmDialog(false); setPreflight(null); }}
              loading={commitLoading}
            />
          )
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Upload Queue */}
        <div className="lg:col-span-4 space-y-8">

          {/* Success notification */}
          <AnimatePresence>
            {commitResult && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                className="p-5 rounded-[24px] border"
                style={{
                  background: commitResult.replacedDemo
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.05))'
                    : 'rgba(34,197,94,0.06)',
                  borderColor: commitResult.replacedDemo ? 'rgba(124,58,237,0.25)' : 'rgba(34,197,94,0.25)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: commitResult.replacedDemo ? 'rgba(124,58,237,0.15)' : 'rgba(34,197,94,0.15)' }}>
                    {commitResult.replacedDemo
                      ? <FlaskConical size={16} className="text-purple-600" />
                      : <CheckCheck size={16} className="text-green-600" />
                    }
                  </div>
                  <div>
                    <p className="text-xs font-black" style={{ color: commitResult.replacedDemo ? '#7c3aed' : '#16a34a' }}>
                      {commitResult.replacedDemo
                        ? 'Demo berhasil digantikan!'
                        : 'Jadwal berhasil diaktifkan!'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: commitResult.replacedDemo ? '#6d28d9' : '#15803d' }}>
                      {commitResult.replacedDemo
                        ? 'Data demo diarsipkan · Banner MODE DEMO akan hilang otomatis'
                        : `Versi "${commitResult.versionName}" kini aktif di produksi`}
                    </p>
                  </div>
                  <button
                    onClick={() => setCommitResult(null)}
                    className="ml-auto w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <X size={12} className="text-gray-400" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/50 shadow-2xl shadow-orange-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-black">Ingestion Loop</h3>
                <p className="text-[10px] font-bold text-[#8E8E8E]">Neural-Pulse File Extraction</p>
              </div>
            </div>

            <label className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#EBEBE8] rounded-[32px] cursor-pointer hover:border-orange-500 hover:bg-orange-50/50 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-orange-100 transition-all">
                  <Upload className="w-6 h-6 text-[#A1A1A1] group-hover:text-orange-600" />
                </div>
                <p className="mb-1 text-xs font-black text-[#1A1A1A]">AI-Powered Import</p>
                <p className="text-[10px] text-[#A1A1A1] font-bold">PDF, XML, atau CSV</p>
              </div>
              <input type="file" className="hidden" multiple onChange={handleFileUpload} accept=".pdf,.xml,.csv" />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8E8E8E]">History Logs</h3>
              <History size={14} className="text-[#8E8E8E]" />
            </div>
            <div className="space-y-3">
              {uploads.map((upload) => (
                <motion.div
                  key={upload.id}
                  layoutId={upload.id}
                  onClick={() => {
                    setSelectedUpload(upload);
                    fetchStaging(upload.id);
                    setCommitResult(null);
                  }}
                  className={`p-5 rounded-[28px] border transition-all cursor-pointer relative overflow-hidden group ${
                    selectedUpload?.id === upload.id
                      ? 'bg-white border-orange-500 shadow-2xl shadow-orange-500/20'
                      : 'bg-white border-[#EBEBE8] hover:border-gray-300'
                  }`}
                >
                  {selectedUpload?.id === upload.id && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500" />
                  )}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      upload.mimeType.includes('pdf') ? 'bg-red-50 text-red-600' :
                        upload.mimeType.includes('xml') ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {upload.mimeType.includes('pdf') ? <FileText size={24} /> :
                        upload.mimeType.includes('xml') ? <FileCode size={24} /> : <TableIcon size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#1A1A1A] truncate">{upload.originalName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          upload.uploadStatus === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            upload.uploadStatus === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {upload.uploadStatus}
                        </span>
                        <span className="text-[10px] font-bold text-[#8E8E8E]">
                          {upload._count.stagingRecords} records
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content: Staging Area */}
        <div className="lg:col-span-8">
          {selectedUpload ? (
            <div className="space-y-8">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="rounded-full bg-white text-[10px] font-black uppercase text-orange-600 border-orange-500">
                      {selectedUpload.mimeType.split('/')[1]} Extraction
                    </Badge>
                    <span className="text-[10px] font-bold text-[#A1A1A1]">ID: {selectedUpload.id.slice(0, 8)}</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-[#1A1A1A]">{selectedUpload.originalName}</h2>
                </div>
                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-2 rounded-3xl border border-white/50 shadow-xl">
                  <div className="px-4">
                    <span className="text-[9px] font-black text-[#8E8E8E] uppercase block mb-1">Target Year</span>
                    <select
                      value={selectedYearId}
                      onChange={(e) => setSelectedYearId(e.target.value)}
                      className="h-9 rounded-xl border border-[#EBEBE8] bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <Button
                    onClick={handleCommitClick}
                    disabled={loading || selectedUpload.uploadStatus !== 'COMPLETED'}
                    className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white h-12 px-8 font-black shadow-xl shadow-orange-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    Commit to Production <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>

              {/* Staging Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-[28px] border-[#EBEBE8] shadow-sm bg-white p-4">
                  <span className="text-[9px] font-black text-[#8E8E8E] uppercase">Mapping Accuracy</span>
                  <p className="text-xl font-black mt-1 text-green-600">{stats.accuracy}%</p>
                </Card>
                <Card className="rounded-[28px] border-[#EBEBE8] shadow-sm bg-white p-4">
                  <span className="text-[9px] font-black text-[#8E8E8E] uppercase">Resolved Entities</span>
                  <p className="text-xl font-black mt-1 text-[#1A1A1A]">{stats.matched}</p>
                </Card>
                <Card className="rounded-[28px] border-[#EBEBE8] shadow-sm bg-white p-4">
                  <span className="text-[9px] font-black text-[#8E8E8E] uppercase">Conflicts</span>
                  <p className="text-xl font-black mt-1 text-orange-600">{stats.conflicts}</p>
                </Card>
                <Card className="rounded-[28px] border-[#EBEBE8] shadow-sm bg-white p-4">
                  <span className="text-[9px] font-black text-[#8E8E8E] uppercase">Status</span>
                  <p className="text-xl font-black mt-1 text-blue-600">VALIDATED</p>
                </Card>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-24 bg-white rounded-[48px] border border-[#EBEBE8] shadow-2xl shadow-gray-100">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
                    <Loader2 className="animate-spin w-16 h-16 text-orange-600 relative" />
                  </div>
                  <h3 className="text-lg font-black text-[#1A1A1A]">Geometric Reconstruction</h3>
                  <p className="text-sm text-[#8E8E8E] font-medium mt-2 max-w-[300px] text-center">
                    Building matrix coordinate maps and resolving fuzzy teacher/class associations.
                  </p>
                </div>
              ) : (
                <Card className="rounded-[40px] border-[#EBEBE8] shadow-2xl shadow-gray-100 overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8F9FA] border-b border-[#EBEBE8]">
                          <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Day/Period</th>
                          <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Extracted Entity Mapping</th>
                          <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Class Target</th>
                          <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Resolution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5F5F3]">
                        {stagingRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-orange-50/20 transition-colors group">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black">
                                  D{record.day}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black">P{record.period}</span>
                                  <span className="text-[9px] font-bold text-[#A1A1A1] uppercase tracking-tighter">Slot {record.period}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-[#8E8E8E] uppercase w-12">Teacher:</span>
                                  <span className="text-xs font-black text-[#1A1A1A]">{record.rawTeacherName || 'N/A'}</span>
                                  {record.normalizedTeacherId ? <ShieldCheck size={12} className="text-green-500" /> : <AlertTriangle size={12} className="text-orange-500" />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-[#8E8E8E] uppercase w-12">Subject:</span>
                                  <span className="text-xs font-bold text-[#1A1A1A]">{record.rawSubjectCode}</span>
                                  {record.normalizedSubjectId ? <ShieldCheck size={12} className="text-green-500" /> : <AlertTriangle size={12} className="text-orange-500" />}
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex flex-col">
                                <span className="text-xs font-black">{record.rawClassName}</span>
                                <span className="text-[9px] font-bold text-[#A1A1A1] mt-0.5">Physical Class Unit</span>
                              </div>
                            </td>
                            <td className="p-5">
                              <div className="flex flex-col items-start gap-1.5">
                                {getStatusBadge(record.status)}
                                {record.conflicts.length > 0 && (
                                  <div className="flex items-center gap-1 text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                    <Activity size={10} /> {record.conflicts.length} Overlaps
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] border-2 border-dashed border-[#EBEBE8] rounded-[48px] bg-white/40 backdrop-blur-sm">
              <div className="w-24 h-24 rounded-[32px] bg-white shadow-2xl flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-orange-100 blur-2xl rounded-full scale-150 opacity-50" />
                <FileCode size={40} className="text-[#A1A1A1] relative" />
              </div>
              <h3 className="text-xl font-black text-[#1A1A1A]">Ready for Ingestion</h3>
              <p className="text-sm text-[#8E8E8E] font-medium mt-3 max-w-[320px] text-center leading-relaxed">
                Upload CSV untuk memulai proses normalisasi multi-layer. Sistem akan mendeteksi data demo secara otomatis.
              </p>
              <div className="mt-8 flex gap-3">
                <Badge variant="outline" className="h-8 rounded-xl px-4 border-[#EBEBE8] bg-white">aSc TimeTables</Badge>
                <Badge variant="outline" className="h-8 rounded-xl px-4 border-[#EBEBE8] bg-white">FET Schedule</Badge>
                <Badge variant="outline" className="h-8 rounded-xl px-4 border-[#EBEBE8] bg-white">Excel CSV</Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
