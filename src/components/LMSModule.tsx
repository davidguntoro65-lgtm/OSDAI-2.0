import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  FileText, 
  CheckCircle, 
  Clock, 
  Plus, 
  Search, 
  MessageSquare, 
  Send, 
  Download, 
  Upload, 
  Layout, 
  ChevronRight, 
  MoreVertical,
  Star,
  Zap,
  Users,
  Trophy,
  Filter,
  FileQuestion,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LMSModule({ authToken, userRole }: { authToken: string, userRole: string }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseContent, setCourseContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'catalog' | 'course'>('catalog');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lms/courses', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseContent = async (courseId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lms/course/${courseId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setCourseContent(data);
      setSelectedCourse(courses.find(c => c.id === courseId));
      setView('course');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* LMS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#1A1A1A]">Enterprise LMS</h1>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">
            {view === 'catalog' ? 'Modern learning, assignments, and automated grading.' : `${selectedCourse?.subject.name} - ${selectedCourse?.class.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {view === 'course' && (
            <Button variant="outline" onClick={() => setView('catalog')} className="rounded-2xl border-[#EBEBE8] h-12 bg-white px-6 font-bold">
              Back to Catalog
            </Button>
          )}
          {userRole === 'GURU' && view === 'course' && (
            <Button className="rounded-2xl bg-black text-white h-12 px-6 font-bold shadow-lg">
                <Plus size={18} className="mr-2" /> Add Material/Task
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'catalog' ? (
          <motion.div
            key="catalog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
                <div className="col-span-full py-20 flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                </div>
            ) : courses.map((course) => (
              <motion.div
                key={course.id}
                whileHover={{ y: -5 }}
                className="bg-white border border-[#EBEBE8] rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                onClick={() => fetchCourseContent(course.id)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <Badge variant="outline" className="rounded-full border-[#EBEBE8] font-bold text-[10px] py-1 px-3">
                    {course.class.name}
                  </Badge>
                </div>
                
                <h3 className="text-xl font-black text-[#1A1A1A] mb-1 group-hover:text-orange-600 transition-colors">
                  {course.subject.name}
                </h3>
                <p className="text-sm font-bold text-[#8E8E8E] mb-6">
                  Instructor: {course.teacher.user.name}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-[#F8F8F7] border border-[#EBEBE8]">
                        <p className="text-[10px] font-black uppercase text-[#8E8E8E]">Materials</p>
                        <p className="text-lg font-black">{Math.floor(Math.random() * 10) + 5}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F8F8F7] border border-[#EBEBE8]">
                        <p className="text-[10px] font-black uppercase text-[#8E8E8E]">Students</p>
                        <p className="text-lg font-black">36</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-black flex items-center justify-center text-[10px] font-bold text-white">
                            +33
                        </div>
                    </div>
                    <ChevronRight className="text-[#A1A1A1] group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="course-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            <div className="lg:col-span-8 space-y-6">
                <Tabs defaultValue="materials" className="w-full">
                    <TabsList className="bg-[#F8F8F7] p-1.5 rounded-[24px] border border-[#EBEBE8] h-auto w-fit mb-8">
                        <TabsTrigger value="materials" className="px-6 py-2.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#8E8E8E] font-black text-xs">
                            Materials
                        </TabsTrigger>
                        <TabsTrigger value="assignments" className="px-6 py-2.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#8E8E8E] font-black text-xs">
                            Assignments
                        </TabsTrigger>
                        <TabsTrigger value="quizzes" className="px-6 py-2.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#8E8E8E] font-black text-xs">
                            Quizzes
                        </TabsTrigger>
                        <TabsTrigger value="discussions" className="px-6 py-2.5 rounded-2xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#8E8E8E] font-black text-xs">
                            Discussions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="materials" className="space-y-4">
                        {courseContent?.materials.map((m: any) => (
                            <div key={m.id} className="bg-white p-5 rounded-[28px] border border-[#EBEBE8] shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-[#1A1A1A]">{m.title}</h4>
                                        <p className="text-[10px] font-bold text-[#8E8E8E] uppercase mt-0.5">{m.contentType} • {new Date(m.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="h-10 w-10 rounded-xl">
                                    <Download size={18} className="text-[#8E8E8E]" />
                                </Button>
                            </div>
                        ))}
                        {courseContent?.materials.length === 0 && (
                            <div className="p-12 text-center bg-[#F8F8F7] rounded-[32px] border border-dashed border-[#EBEBE8]">
                                <p className="text-sm font-bold text-[#8E8E8E]">No materials uploaded yet.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-4">
                        {courseContent?.assignments.map((a: any) => (
                            <div key={a.id} className="bg-white p-6 rounded-[32px] border border-[#EBEBE8] shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-[#1A1A1A]">{a.title}</h4>
                                        <p className="text-xs font-bold text-[#8E8E8E] mt-1 line-clamp-2">{a.description}</p>
                                    </div>
                                    <Badge className="bg-orange-600">DUE SOON</Badge>
                                </div>
                                <div className="flex items-center justify-between border-t border-[#F5F5F3] pt-4 mt-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8E8E8E]">
                                            <Clock size={14} /> {new Date(a.dueDate).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8E8E8E]">
                                            <Trophy size={14} /> Max {a.maxScore} pts
                                        </div>
                                    </div>
                                    <Button className="h-9 px-6 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-wider">
                                        Submit Work
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="quizzes" className="space-y-4">
                        {courseContent?.quizzes.map((q: any) => (
                            <div key={q.id} className="bg-white p-6 rounded-[32px] border border-[#EBEBE8] shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                        <FileQuestion size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-[#1A1A1A]">{q.title}</h4>
                                        <p className="text-xs font-bold text-[#8E8E8E] flex items-center gap-2 mt-1">
                                            <Clock size={14} /> {q.duration} mins • {q.maxAttempts} Attempts Max
                                        </p>
                                    </div>
                                </div>
                                <Button className="rounded-2xl border-purple-200 text-purple-600 border-2 hover:bg-purple-50 h-11 px-6 font-bold">
                                    Start Quiz
                                </Button>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="discussions" className="space-y-6">
                        <div className="bg-[#F8F8F7] p-4 rounded-[28px] border border-[#EBEBE8] flex gap-3">
                            <Input placeholder="Type your message or question..." className="flex-1 bg-white h-12 rounded-2xl border-[#EBEBE8]" />
                            <Button className="h-12 w-12 rounded-2xl bg-black text-white p-0">
                                <Send size={20} />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {courseContent?.discussions.map((d: any) => (
                                <div key={d.id} className="bg-white p-5 rounded-[28px] border border-[#EBEBE8]">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                                        <div>
                                            <p className="text-xs font-black">{d.user.name}</p>
                                            <p className="text-[10px] text-[#8E8E8E] font-bold">{new Date(d.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-[#1A1A1A] leading-relaxed">{d.content}</p>
                                    <div className="flex items-center gap-4 mt-4">
                                        <button className="text-[10px] font-black text-[#8E8E8E] hover:text-black uppercase">Like</button>
                                        <button className="text-[10px] font-black text-[#8E8E8E] hover:text-black uppercase">Reply</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <Card className="rounded-[40px] bg-white border-[#EBEBE8] p-6 shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <GraduationCap size={160} />
                    </div>
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-lg font-black">Course Overview</CardTitle>
                    </CardHeader>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#8E8E8E]">Progress Score</span>
                            <span className="text-xs font-black">84/100</span>
                        </div>
                        <div className="w-full bg-[#F5F5F3] h-2 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} className="h-full bg-green-500 rounded-full" />
                        </div>
                        
                        <div className="pt-4 space-y-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
                                <CheckCircle size={16} className="text-green-500" /> 12 Lessons Completed
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
                                <Layout size={16} className="text-blue-500" /> 4 Active Projects
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
                                <Zap size={16} className="text-orange-500" /> 2 Quizzes Pending
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="rounded-[40px] bg-black text-white p-8 shadow-xl">
                    <h3 className="text-xl font-black mb-2">Teacher's Office</h3>
                    <p className="text-xs font-bold text-[#8E8E8E] mb-6">Direct line to your instructor.</p>
                    
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/10" />
                        <div>
                            <p className="text-sm font-black">{selectedCourse?.teacher.user.name}</p>
                            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Online Now</p>
                        </div>
                    </div>

                    <Button className="w-full h-12 rounded-2xl bg-white text-black font-black hover:bg-gray-100 transition-colors">
                        Message Teacher
                    </Button>
                </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
