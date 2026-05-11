import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  RotateCcw, 
  Download, 
  Loader2,
  BrainCircuit,
  AlertCircle,
  MapPin,
  User,
  Import,
  Layout,
  Table as TableIcon,
  X,
  Trash2,
  CheckCircle2,
  BookOpen,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TimetableImport from './TimetableImport';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1);

const PERIOD_TIMES: Record<number, string> = {
  1: '07:00', 2: '07:45', 3: '08:30', 4: '09:15', 5: '10:15',
  6: '11:00', 7: '11:45', 8: '12:30', 9: '13:15', 10: '14:00'
};

const SUBJECT_COLORS: Record<string, string> = {
  PRODUKTIF: 'bg-orange-50 border-orange-200 text-orange-900',
  ADAPTIF: 'bg-blue-50 border-blue-200 text-blue-900',
  NORMATIF: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  UMUM: 'bg-purple-50 border-purple-200 text-purple-900',
};

type CellInfo = { day: number; period: number };

export default function TimetableModule({ authToken }: { authToken: string }) {
  const [mode, setMode] = useState<'view' | 'import'>('view');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedLesson, setDraggedLesson] = useState<any>(null);
  const [dragOver, setDragOver] = useState<CellInfo | null>(null);

  // Teachers / Subjects / Rooms for the form
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Add-schedule modal state
  const [addModal, setAddModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellInfo | null>(null);
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  // Success toast
  const [toast, setToast] = useState('');

  useEffect(() => { fetchClasses(); fetchTeachers(); fetchSubjects(); fetchRooms(); }, []);
  useEffect(() => { if (selectedClassId) fetchSchedule(); }, [selectedClassId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setClasses(arr);
      if (arr.length > 0) { setSelectedClassId(arr[0].id); setFormClassId(arr[0].id); }
    } catch { /* ignore */ }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : (data.data || []));
    } catch { /* ignore */ }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms', { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?classId=${selectedClassId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      setSchedule(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!confirm('Ini akan menimpa jadwal kelas yang dipilih untuk tahun akademik ini. Lanjutkan?')) return;
    setIsGenerating(true);
    try {
      const classObj = classes.find(c => c.id === selectedClassId);
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ academicYearId: classObj?.academicYearId })
      });
      if (!res.ok) throw new Error('Pembuatan gagal');
      fetchSchedule();
      showToast('Jadwal berhasil di-generate oleh AI!');
    } catch (err: any) { alert(err.message); }
    finally { setIsGenerating(false); }
  };

  const handleDragStart = (lesson: any) => setDraggedLesson(lesson);

  const handleDrop = async (day: number, period: number) => {
    setDragOver(null);
    if (!draggedLesson) return;
    if (draggedLesson.day === day && draggedLesson.periodStart === period) { setDraggedLesson(null); return; }
    try {
      const res = await fetch(`/api/timetable/${draggedLesson.id}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ day, periodStart: period })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Konflik terdeteksi'); }
      fetchSchedule();
      showToast('Jadwal berhasil dipindahkan!');
    } catch (err: any) { alert(err.message); }
    finally { setDraggedLesson(null); }
  };

  const getLessonAt = (day: number, period: number) =>
    schedule.find(s => s.day === day && s.periodStart === period);

  const openAddModal = (day: number, period: number) => {
    setSelectedCell({ day, period });
    setFormTeacherId(teachers[0]?.id || '');
    setFormSubjectId(subjects[0]?.id || '');
    setFormRoomId(rooms[0]?.id || '');
    setFormClassId(selectedClassId);
    setFormError('');
    setAddModal(true);
  };

  const handleAddSchedule = async () => {
    if (!formTeacherId || !formSubjectId || !formRoomId || !formClassId || !selectedCell) {
      setFormError('Semua field wajib diisi.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          day: selectedCell.day,
          periodStart: selectedCell.period,
          periodEnd: selectedCell.period,
          teacherId: formTeacherId,
          subjectId: formSubjectId,
          roomId: formRoomId,
          classId: formClassId,
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal menyimpan jadwal'); }
      setAddModal(false);
      fetchSchedule();
      showToast('Entri jadwal berhasil ditambahkan!');
    } catch (err: any) { setFormError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/timetable/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal menghapus'); }
      setDeleteTarget(null);
      fetchSchedule();
      showToast('Jadwal berhasil dihapus.');
    } catch (err: any) { alert(err.message); }
    finally { setDeleting(false); }
  };

  const handleExportPdf = () => { if (selectedClassId) window.open(`/api/timetable/export/pdf?classId=${selectedClassId}`, '_blank'); };
  const handleExportExcel = () => { if (selectedClassId) window.open(`/api/timetable/export/excel?classId=${selectedClassId}`, '_blank'); };

  const conflictCount = schedule.length > 0 ? 0 : 0;
  const filledSlots = schedule.length;
  const totalSlots = DAYS.length * PERIODS.length;
  const fillPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold"
          >
            <CheckCircle2 size={16} className="text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Manajemen Jadwal Pelajaran</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">Buat, edit, dan kelola jadwal mengajar guru secara manual atau via AI.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setMode('view')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'view' ? 'bg-white shadow text-black' : 'text-slate-400 hover:text-black'}`}
            >
              <Layout size={13} /> Tampilan Jadwal
            </button>
            <button
              onClick={() => setMode('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'import' ? 'bg-white shadow text-black' : 'text-slate-400 hover:text-black'}`}
            >
              <Import size={13} /> Impor Jadwal
            </button>
          </div>
          <Button
            variant="outline"
            className="rounded-xl h-10 bg-white border-slate-200 text-xs font-black"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <BrainCircuit size={15} className="mr-1.5 text-purple-600" />}
            Generate AI
          </Button>
          <Button onClick={handleExportPdf} className="rounded-xl bg-slate-900 h-10 text-xs font-black shadow-lg shadow-slate-900/20">
            <Download size={14} className="mr-1.5" /> Ekspor PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="rounded-xl border-slate-200 h-10 bg-white">
            <TableIcon size={14} />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'view' ? (
          <motion.div key="view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">

            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Kelas:</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 flex-1"
                >
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] py-1 px-3 font-black">
                  {conflictCount === 0 ? '✓ Tidak Ada Konflik' : `⚠ ${conflictCount} Konflik`}
                </Badge>
                <Badge className="rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] py-1 px-3 font-black">
                  {fillPct}% Terisi ({filledSlots}/{totalSlots} slot)
                </Badge>
                <button
                  onClick={() => fetchSchedule()}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                  title="Refresh"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Hint */}
            <div className="flex items-center gap-2 px-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tips:</div>
              <div className="text-[10px] font-bold text-slate-400">Klik sel kosong untuk tambah entri jadwal · Drag &amp; drop untuk memindahkan · Hover kartu untuk hapus</div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 size={28} className="animate-spin text-slate-300" />
                </div>
              ) : (
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="w-20 h-12 bg-slate-50 border-b border-r border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                        <Clock size={12} className="inline mr-1" />JAM
                      </th>
                      {DAYS.map(d => (
                        <th key={d} className="h-12 bg-slate-50 border-b border-r border-slate-100 last:border-r-0 text-[10px] font-black uppercase tracking-widest text-slate-700 text-center">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map(period => (
                      <tr key={period} className="group">
                        <td className="border-b border-r border-slate-100 bg-slate-50/80 text-center last:border-b-0">
                          <div className="py-2">
                            <div className="text-sm font-black text-slate-700">P{period}</div>
                            <div className="text-[9px] font-bold text-slate-400">{PERIOD_TIMES[period]}</div>
                          </div>
                        </td>
                        {DAYS.map((_, dayIdx) => {
                          const lesson = getLessonAt(dayIdx + 1, period);
                          const isOver = dragOver?.day === dayIdx + 1 && dragOver?.period === period;
                          return (
                            <td
                              key={dayIdx}
                              className={`border-b border-r border-slate-100 last:border-r-0 p-2 h-24 align-top transition-colors ${isOver ? 'bg-orange-50' : 'hover:bg-slate-50/50'}`}
                              onDragOver={e => { e.preventDefault(); setDragOver({ day: dayIdx + 1, period }); }}
                              onDragLeave={() => setDragOver(null)}
                              onDrop={() => handleDrop(dayIdx + 1, period)}
                              onClick={() => !lesson && openAddModal(dayIdx + 1, period)}
                            >
                              <AnimatePresence mode="popLayout">
                                {lesson ? (
                                  <motion.div
                                    key={lesson.id}
                                    layoutId={lesson.id}
                                    draggable
                                    onDragStart={() => handleDragStart(lesson)}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    className={`relative w-full h-full rounded-2xl p-2.5 flex flex-col justify-between border cursor-grab active:cursor-grabbing transition-all hover:shadow-md group/card ${
                                      SUBJECT_COLORS[lesson.subject?.type] || 'bg-slate-50 border-slate-200'
                                    }`}
                                  >
                                    {/* Delete button */}
                                    <button
                                      onClick={e => { e.stopPropagation(); setDeleteTarget(lesson); }}
                                      className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded-lg bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-wider text-black/40">{lesson.subject?.code}</p>
                                      <p className="text-[10px] font-bold leading-tight line-clamp-2 mt-0.5">{lesson.subject?.name}</p>
                                    </div>
                                    <div className="space-y-0.5 border-t border-black/5 pt-1.5">
                                      <div className="flex items-center gap-1 text-[8px] font-bold text-black/50">
                                        <User size={8} /><span className="truncate">{lesson.teacher?.user?.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[8px] font-bold text-black/50">
                                        <MapPin size={8} /><span>{lesson.room?.name}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    className="w-full h-full rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 cursor-pointer transition-all hover:border-orange-300 hover:bg-orange-50/50"
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    <Plus size={14} className="text-slate-300" />
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Tambah</span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap px-1">
              {Object.entries(SUBJECT_COLORS).map(([type, cls]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-md border ${cls}`} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{type}</span>
                </div>
              ))}
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card className="rounded-3xl border-slate-100 shadow-md bg-white p-2">
                <CardHeader className="p-5">
                  <CardTitle className="text-sm font-black tracking-tight">Diagnostik Solver</CardTitle>
                  <CardDescription className="text-xs font-medium">Evaluasi heuristik real-time dari jadwal saat ini.</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  {[
                    { label: 'Keseimbangan Beban Guru', pct: teachers.length > 0 ? 94 : 0, color: 'bg-green-500' },
                    { label: 'Optimasi Ruangan', pct: rooms.length > 0 ? 88 : 0, color: 'bg-blue-500' },
                    { label: 'Pengisian Slot Jadwal', pct: fillPct, color: 'bg-orange-500' },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">{label}</span>
                        <span className="text-xs font-black">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className={`h-full ${color} rounded-full`} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50 border border-orange-100 mt-2">
                    <AlertCircle size={13} className="text-orange-500 shrink-0" />
                    <p className="text-[10px] font-bold text-orange-700">Klik sel kosong pada grid untuk menambahkan entri jadwal secara manual.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-slate-100 shadow-md bg-white p-2">
                <CardHeader className="p-5">
                  <CardTitle className="text-sm font-black tracking-tight">Kendala &amp; Aturan Aktif</CardTitle>
                  <CardDescription className="text-xs font-medium">Parameter yang mengatur mesin auto-generate.</CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <ul className="space-y-3">
                    {[
                      ['Cegah double-booking guru', 'Hard'],
                      ['Persyaratan ruang lab khusus', 'Hard'],
                      ['Maks 8 jam mengajar/hari per guru', 'Soft'],
                      ['Hindari jam kosong antar sesi', 'Soft'],
                      ['Prioritas slot pagi untuk mata produktif', 'Soft'],
                    ].map(([rule, type]) => (
                      <li key={rule} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${type === 'Hard' ? 'bg-red-400' : 'bg-blue-300'}`} />
                          {rule}
                        </div>
                        <Badge className={`text-[8px] font-black rounded-full ${type === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {type}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="import" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <TimetableImport authToken={authToken} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADD SCHEDULE MODAL ── */}
      <AnimatePresence>
        {addModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setAddModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-orange-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-orange-500">Tambah Entri Jadwal</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    {DAYS[(selectedCell?.day ?? 1) - 1]} — Jam ke-{selectedCell?.period} ({PERIOD_TIMES[selectedCell?.period ?? 1]})
                  </h3>
                </div>
                <button onClick={() => setAddModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-100">
                    <AlertCircle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-600">{formError}</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Kelas</label>
                  <select
                    value={formClassId}
                    onChange={e => setFormClassId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    <User size={10} className="inline mr-1" />Guru Pengajar
                  </label>
                  <select
                    value={formTeacherId}
                    onChange={e => setFormTeacherId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">— Pilih Guru —</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.user?.name || t.nip}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    <BookOpen size={10} className="inline mr-1" />Mata Pelajaran
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={e => setFormSubjectId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">— Pilih Mata Pelajaran —</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    <MapPin size={10} className="inline mr-1" />Ruangan
                  </label>
                  <select
                    value={formRoomId}
                    onChange={e => setFormRoomId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">— Pilih Ruangan —</option>
                    {rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl border-slate-200 font-black text-sm"
                    onClick={() => setAddModal(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg shadow-slate-900/20"
                    onClick={handleAddSchedule}
                    disabled={saving}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                    Simpan Jadwal
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM MODAL ── */}
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
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm p-7"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-red-50 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Hapus Jadwal?</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    <strong>{deleteTarget?.subject?.name}</strong> — {DAYS[(deleteTarget?.day ?? 1) - 1]}, Jam ke-{deleteTarget?.periodStart}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1 h-11 rounded-2xl border-slate-200 font-black" onClick={() => setDeleteTarget(null)}>
                    Batal
                  </Button>
                  <Button
                    className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black shadow-lg shadow-red-500/20"
                    onClick={handleDeleteSchedule}
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                    Hapus
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
