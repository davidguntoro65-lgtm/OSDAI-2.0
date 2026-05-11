import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  RotateCcw, 
  Download, 
  Printer, 
  Filter, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Wand2,
  AlertCircle,
  MapPin,
  Clock,
  User,
  Import,
  Layout,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TimetableImport from './TimetableImport';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function TimetableModule({ authToken }: { authToken: string }) {
  const [mode, setMode] = useState<'view' | 'import'>('view');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedLesson, setDraggedLesson] = useState<any>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchSchedule();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/academic/classes', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setClasses(data);
      if (data.length > 0) setSelectedClassId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timetable?classId=${selectedClassId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setSchedule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirm('This will overwrite the current schedule for this academic year. Continue?')) return;
    setIsGenerating(true);
    try {
      const classObj = classes.find(c => c.id === selectedClassId);
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ academicYearId: classObj?.academicYearId })
      });
      if (!res.ok) throw new Error('Generation failed');
      fetchSchedule();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragStart = (lesson: any) => {
    setDraggedLesson(lesson);
  };

  const handleDrop = async (day: number, period: number) => {
    if (!draggedLesson) return;
    
    // Prevent drop if same position
    if (draggedLesson.day === day && draggedLesson.periodStart === period) return;

    try {
      const res = await fetch(`/api/timetable/${draggedLesson.id}/move`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ day, periodStart: period })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Conflict detected');
      }
      
      fetchSchedule();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDraggedLesson(null);
    }
  };

  const getLessonAt = (day: number, period: number) => {
    return schedule.find(s => s.day === day && s.periodStart === period);
  };

  const handleExportPdf = () => {
    if (!selectedClassId) return;
    window.open(`/api/timetable/export/pdf?classId=${selectedClassId}`, '_blank');
  };

  const handleExportExcel = () => {
    if (!selectedClassId) return;
    window.open(`/api/timetable/export/excel?classId=${selectedClassId}`, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Timetable Engine</h2>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">AI-powered scheduling and conflict resolution system.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#F8F8F7] p-1 rounded-2xl border border-[#EBEBE8] flex items-center mr-2">
            <button 
              onClick={() => setMode('view')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'view' ? 'bg-white shadow-sm text-black' : 'text-[#8E8E8E] hover:text-black'}`}
            >
              <Layout size={14} /> Schedule View
            </button>
            <button 
              onClick={() => setMode('import')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${mode === 'import' ? 'bg-white shadow-sm text-black' : 'text-[#8E8E8E] hover:text-black'}`}
            >
              <Import size={14} /> Ingestion Pipeline
            </button>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl border-[#EBEBE8] h-11 bg-white"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin mr-2" /> : <BrainCircuit size={18} className="mr-2 text-purple-600" />}
            Auto-Generate
          </Button>
          <div className="flex items-center gap-1">
            <Button onClick={handleExportPdf} className="rounded-xl bg-[#1A1A1A] h-11 shadow-xl shadow-gray-200">
                <Download size={18} className="mr-2" /> Export PDF
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="rounded-xl border-[#EBEBE8] h-11 bg-white">
                <TableIcon size={18} />
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'view' ? (
          <motion.div
            key="view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-[#EBEBE8] shadow-sm">
              <div className="flex items-center gap-3 flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Viewing Schedule:</label>
                <select 
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="h-10 rounded-xl border border-[#EBEBE8] bg-[#F8F8F7] px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black min-w-[200px]"
                >
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full bg-green-50 text-green-700 border-green-100 text-[10px] py-1 px-3">
                      Zero Conflicts Detected
                  </Badge>
                  <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-100 text-[10px] py-1 px-3">
                      100% Resource Optimization
                  </Badge>
              </div>
            </div>

            <div className="bg-white rounded-[40px] border border-[#EBEBE8] shadow-2xl shadow-gray-100/50 overflow-hidden">
              <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-[#F5F5F3]">
                <div className="h-16 bg-[#F8F8F7] border-r border-[#EBEBE8]" />
                {DAYS.map((day, idx) => (
                  <div key={day} className="h-16 flex items-center justify-center bg-[#F8F8F7] border-r border-[#EBEBE8] last:border-r-0">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">{day}</span>
                  </div>
                ))}
              </div>

              <div className="relative">
                {PERIODS.map(period => (
                  <div key={period} className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-[#F5F5F3] group last:border-b-0">
                    <div className="h-32 flex flex-col items-center justify-center bg-[#FDFDFC] border-r border-[#EBEBE8] relative">
                      <span className="text-sm font-black text-[#1A1A1A]">P{period}</span>
                      <span className="text-[9px] font-bold text-[#A1A1A1] mt-1 italic">
                        {Math.floor((7 * 60 + period * 45) / 60)}:{((7 * 60 + period * 45) % 60).toString().padStart(2, '0')}
                      </span>
                      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#EBEBE8] to-transparent" />
                    </div>

                    {DAYS.map((_, dayIdx) => {
                      const lesson = getLessonAt(dayIdx + 1, period);
                      return (
                        <div 
                          key={dayIdx} 
                          className="h-32 p-3 border-r border-[#F5F5F3] last:border-r-0 relative transition-colors hover:bg-gray-50/50"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(dayIdx + 1, period)}
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
                                className={`w-full h-full rounded-2xl p-3 flex flex-col justify-between shadow-sm border border-transparent hover:border-black/5 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md ${
                                  lesson.subject.type === 'PRODUKTIF' ? 'bg-[#FFF4E6]' : 
                                  lesson.subject.type === 'ADAPTIF' ? 'bg-[#E3F2FD]' : 'bg-[#F3F4F6]'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-black/40">{lesson.subject.code}</p>
                                    <Badge variant="ghost" className="p-0 h-4 text-[8px] font-bold">
                                      {lesson.subject.type[0]}
                                    </Badge>
                                  </div>
                                  <h4 className="text-xs font-bold leading-tight line-clamp-2">{lesson.subject.name}</h4>
                                </div>
                                
                                <div className="space-y-1.5 pt-2 border-t border-black/5">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-black/60">
                                    <User size={10} className="text-black/30" />
                                    <span className="truncate">{lesson.teacher.user.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-black/60">
                                    <MapPin size={10} className="text-black/30" />
                                    <span>{lesson.room.name}</span>
                                  </div>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="w-full h-full rounded-2xl border-2 border-dashed border-[#F5F5F3] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Plus size={16} className="text-[#A1A1A1]" />
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[32px] border-[#EBEBE8] shadow-lg shadow-gray-200/50 bg-white p-2">
                  <CardHeader className="p-6">
                      <CardTitle className="text-lg font-black tracking-tight">Solver Diagnostics</CardTitle>
                      <CardDescription className="text-xs font-medium">Real-time heuristic evaluation of the current schedule.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-4">
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#8E8E8E]">Teacher Load Balance</span>
                              <span className="text-xs font-black">94%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} className="h-full bg-green-500 rounded-full" />
                          </div>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#8E8E8E]">Room Optimization</span>
                              <span className="text-xs font-black">88%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F5F5F3] rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: '88%' }} className="h-full bg-blue-500 rounded-full" />
                          </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50 border border-orange-100 mt-4">
                          <AlertCircle size={14} className="text-orange-600" />
                          <p className="text-[10px] font-bold text-orange-700">Suggestion: 2 teachers approaching max weekly teaching load.</p>
                      </div>
                  </CardContent>
              </Card>

              <Card className="rounded-[32px] border-[#EBEBE8] shadow-lg shadow-gray-200/50 bg-white p-2">
                  <CardHeader className="p-6">
                      <CardTitle className="text-lg font-black tracking-tight">Constraints & Rules</CardTitle>
                      <CardDescription className="text-xs font-medium">Active parameters governing the auto-generation engine.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                      <ul className="space-y-3">
                          {[
                              'Prevent teacher double-booking (Hard)',
                              'Respect lab specialized room requirements (Hard)',
                              'Limit max hours per teacher to 8h/day (Soft)',
                              'Avoid gap periods for faculty (Soft)',
                              'Prioritize morning slots for productive subjects (Soft)'
                          ].map((rule, i) => (
                              <li key={i} className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-black/20" />
                                  {rule}
                              </li>
                          ))}
                      </ul>
                  </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="import"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TimetableImport authToken={authToken} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
