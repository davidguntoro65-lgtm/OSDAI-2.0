import { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  BarChart3, 
  BrainCircuit, 
  MessageSquare, 
  ArrowRight,
  ShieldCheck,
  Activity,
  FileSearch,
  Sparkles,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function AIAnalyticsModule({ authToken }: { authToken: string }) {
  const [stats, setStats] = useState<any>(null);
  const [riskStudents, setRiskStudents] = useState<any[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, riskRes, teacherRes] = await Promise.all([
        fetch('/api/analytics/overall-stats', { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch('/api/analytics/risk-students', { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch('/api/analytics/teacher-performance', { headers: { 'Authorization': `Bearer ${authToken}` } })
      ]);
      
      const statsData = await statsRes.json();
      const riskData = await riskRes.json();
      const teacherData = await teacherRes.json();

      setStats(statsData);
      setRiskStudents(riskData);
      setTeacherPerformance(teacherData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    setAnalyzing(true);
    const context = {
      overall: stats,
      riskCount: riskStudents.length,
      topRisk: riskStudents.slice(0, 3),
      teachers: teacherPerformance.length
    };

    const prompt = `System: You are an Enterprise AI School Consultant for EduNexus SMK Platform.
    Context Data: ${JSON.stringify(context)}
    
    Task: Provide a high-level strategic executive summary for the School Principal. 
    Include:
    1. A summary of current school health (Student population: ${stats.studentCount}, Revenue: ${stats.revenue}).
    2. Specific advice on mitigating risks for the ${riskStudents.length} identified high-risk students.
    3. A brief comment on teacher utilization.
    
    Format: Use professional, data-driven language. Use bullet points for recommendations.`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      setAiAnalysis(result.text);
    } catch (err) {
      console.error('AI Error:', err);
      setAiAnalysis("AI analysis failed to load. Please check your data or try again later.");
    } finally {
      setAnalyzing(false);
    }
  };

  const attendanceData = useMemo(() => {
    if (!stats?.attendance) return [];
    return stats.attendance.map((a: any) => ({
      name: a.status,
      count: a._count
    }));
  }, [stats]);

  const teacherColors = ['#1a1a1a', '#4a4a4a', '#8e8e8e', '#d1d1d1'];

  return (
    <div className="space-y-8 pb-20">
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
              <BrainCircuit size={18} />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#1A1A1A]">AI Analytics Hub</h1>
          </div>
          <p className="text-sm text-[#8E8E8E] font-medium">
            Real-time school intelligence, predictive risk scoring & resource optimization.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchAllData} variant="outline" className="rounded-2xl border-[#EBEBE8] h-12 bg-white px-6 font-bold">
            Refresh Data
          </Button>
          <Button 
            onClick={runAiAnalysis}
            disabled={analyzing || loading}
            className="rounded-2xl bg-black text-white h-12 px-6 font-bold shadow-lg flex items-center gap-2"
          >
            {analyzing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
            Smart Insights
          </Button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Students', value: stats?.studentCount || 0, icon: Users, color: 'blue' },
          { label: 'Operational Teachers', value: stats?.teacherCount || 0, icon: Activity, color: 'orange' },
          { label: 'Revenue (YTD)', value: `Rp ${(stats?.revenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'green' },
          { label: 'At-Risk Students', value: riskStudents.length, icon: AlertTriangle, color: 'red' },
        ].map((item, idx) => (
          <Card key={item.label} className="rounded-[32px] border-[#EBEBE8] shadow-sm overflow-hidden bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-${item.color}-50 text-${item.color}-600`}>
                  <item.icon size={24} />
                </div>
                <Badge variant="ghost" className="font-bold text-[10px] text-green-500 uppercase">+12% vs LW</Badge>
              </div>
              <p className="text-[10px] font-black uppercase text-[#8E8E8E] tracking-widest leading-none mb-1">{item.label}</p>
              <p className="text-2xl font-black text-[#1A1A1A]">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Charts area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Attendance Heatmap / Distribution */}
          <Card className="rounded-[40px] border-[#EBEBE8] bg-white shadow-sm overflow-hidden p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-[#1A1A1A]">Daily Attendance Status</h3>
                <p className="text-xs font-bold text-[#8E8E8E]">Snapshot of today's attendance across all classes.</p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <Download size={16} />
              </Button>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#8E8E8E' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 900, fill: '#8E8E8E' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #EBEBE8', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                    cursor={{ fill: '#F8F8F7' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'PRESENT' ? '#10b981' : entry.name === 'ABSENT' ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Student Risk Intelligence */}
          <div className="bg-[#1A1A1A] rounded-[48px] p-8 text-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black">Student Risk Intelligence</h3>
                <p className="text-sm font-bold text-white/50">Early warning system for potential dropouts.</p>
              </div>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-1 px-4 font-black">
                {riskStudents.length} CRITICAL ALERTS
              </Badge>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : riskStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-5 rounded-[28px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-white/50">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-white">{student.name}</h4>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{student.class}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black uppercase text-white/30">Attendance</p>
                      <p className={`text-sm font-black ${student.attendanceRate < 50 ? 'text-red-400' : 'text-orange-400'}`}>
                        {student.attendanceRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black uppercase text-white/30">Grade Avg</p>
                      <p className="text-sm font-black text-white">{student.avgGrade.toFixed(1)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-red-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle size={18} />
                    </div>
                  </div>
                </div>
              ))}
              {riskStudents.length === 0 && !loading && (
                <div className="py-20 text-center text-white/30 font-bold">
                  All systems green. No students at immediate risk.
                </div>
              )}
            </div>
            
            <Button className="w-full mt-8 h-12 rounded-2xl bg-white text-black font-black hover:bg-gray-200 transition-colors">
              Full Risk Assessment
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="lg:col-span-4 space-y-8">
          {/* AI Strategy Box */}
          <Card className="rounded-[40px] border-black border-2 shadow-2xl relative overflow-hidden bg-white">
             <div className="absolute top-0 right-0 p-4">
               <Zap className="text-black/5" size={120} />
             </div>
             <CardHeader className="relative z-10 px-8 pt-8 pb-4">
                <div className="flex items-center gap-2 mb-2">
                   <Sparkles size={20} className="text-black" />
                   <Badge variant="outline" className="rounded-full border-black font-black text-[10px] shadow-sm">AI POWERED</Badge>
                </div>
                <CardTitle className="text-2xl font-black">Strategic Advisory</CardTitle>
             </CardHeader>
             <CardContent className="px-8 pb-8">
               <div className="prose prose-sm prose-black max-w-none">
                 {analyzing ? (
                   <div className="space-y-4 animate-pulse">
                     <div className="h-4 bg-gray-100 rounded w-full" />
                     <div className="h-4 bg-gray-100 rounded w-5/6" />
                     <div className="h-4 bg-gray-100 rounded w-4/6" />
                   </div>
                 ) : aiAnalysis ? (
                   <div className="text-sm font-bold text-[#1A1A1A] leading-relaxed whitespace-pre-line">
                     {aiAnalysis}
                   </div>
                 ) : (
                   <div className="text-sm font-bold text-[#8E8E8E] italic">
                     Click "Smart Insights" to generate an AI-driven school performance report.
                   </div>
                 )}
               </div>
             </CardContent>
          </Card>

          {/* Teacher Load Chart */}
          <Card className="rounded-[40px] border-[#EBEBE8] bg-white shadow-sm overflow-hidden p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-[#1A1A1A]">Teacher Efficiency</h3>
              <Badge variant="outline" className="rounded-full font-black text-[10px]">KPI TRACKING</Badge>
            </div>
            
            <div className="space-y-5">
              {teacherPerformance.slice(0, 5).map((teacher, i) => (
                <div key={teacher.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-[#1A1A1A]">{teacher.name}</span>
                    <span className="text-xs font-bold text-[#8E8E8E]">{teacher.kpi}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F8F8F7] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${teacher.kpi}%` }} 
                      transition={{ delay: i * 0.1, duration: 1 }}
                      className="h-full bg-black rounded-full" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Real-time Events */}
          <div className="bg-[#F8F8F7] border border-[#EBEBE8] rounded-[40px] p-8">
            <h3 className="text-lg font-black text-[#1A1A1A] mb-6 flex items-center gap-2">
              <Activity size={20} className="text-[#8E8E8E]" />
              System Heartbeat
            </h3>
            <div className="space-y-6">
              {[
                { time: '10:45 AM', event: 'Daily attendance reconciliation', status: 'COMPLETE' },
                { time: '09:30 AM', event: 'Financial transaction sync', status: 'SYNCED' },
                { time: '08:00 AM', event: 'AI Risk prediction engine run', status: 'STABLE' },
              ].map((log, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-[10px] font-black text-[#8E8E8E] w-14 pt-1">{log.time}</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#1A1A1A]">{log.event}</p>
                    <p className="text-[9px] font-black text-green-500 uppercase mt-0.5 tracking-widest">{log.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
