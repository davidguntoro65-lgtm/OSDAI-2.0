import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Download, 
  Printer, 
  Filter, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Settings2,
  GraduationCap,
  Briefcase,
  Award
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const teacherSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email'),
  nuptk: z.string().min(10, 'NUPTK required'),
  department: z.string().optional(),
  specialization: z.string().optional(),
  certification: z.string().optional(),
  gender: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  basicSalary: z.any().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function TeacherModule({ authToken }: { authToken: string }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema)
  });

  useEffect(() => {
    fetchTeachers();
  }, [page, search]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers?page=${page}&search=${search}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setTeachers(data.items || []);
      setMeta(data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: TeacherFormValues) => {
    try {
      const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : '/api/teachers';
      const method = editingTeacher ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(values)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save teacher');
      }
      
      setIsModalOpen(false);
      setEditingTeacher(null);
      reset();
      fetchTeachers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this teacher?')) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) fetchTeachers();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,NUPTK,Department,Specialization"].join(",") + "\n"
      + teachers.map(t => `${t.user.name},${t.nuptk},${t.department},${t.specialization}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "teacher_registry.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Teacher Management</h2>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">Enterprise registry for faculty and vocational instructors.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-[#EBEBE8] h-11" onClick={handleExport}>
            <Download size={18} className="mr-2" /> Export
          </Button>
          <Button className="rounded-xl bg-[#FF6B2C] hover:bg-orange-600 h-11 text-white shadow-lg shadow-orange-100" onClick={() => { setEditingTeacher(null); reset(); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Add Faculty
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-[#EBEBE8] bg-[#FDFDFC]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#FF6B2C]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#8E8E8E] tracking-wider">Total Faculty</p>
              <p className="text-2xl font-black">{meta.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-[#EBEBE8] bg-[#FDFDFC]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
              <Award size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#8E8E8E] tracking-wider">Certified</p>
              <p className="text-2xl font-black">82%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-[#EBEBE8] bg-[#FDFDFC]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-[#8E8E8E] tracking-wider">Avg. Load</p>
              <p className="text-2xl font-black">24h / wk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-[#EBEBE8] shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-[#F5F5F3] flex flex-row items-center justify-between bg-[#FDFDFC]">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]" size={16} />
              <Input 
                placeholder="Search by name, NUPTK, or specialization..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-[#EBEBE8] bg-[#F8F8F7]"
              />
            </div>
            <Button variant="outline" size="icon" className="rounded-xl border-[#EBEBE8]">
              <Filter size={18} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={handlePrint}>
              <Printer size={18} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#F8F8F7]">
              <TableRow className="hover:bg-transparent border-[#EBEBE8]">
                <TableHead className="py-4 px-8 text-[10px] uppercase font-bold tracking-wider">Faculty Member</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">NUPTK / Status</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Department</TableHead>
                <TableHead className="text-right px-8 text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="p-12 text-center text-[#A1A1A1]"><Loader2 className="animate-spin inline mr-2" /> Synchronizing faculty records...</TableCell>
                  </TableRow>
                ))
              ) : teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id} className="group hover:bg-[#FDFDFC] border-[#EBEBE8] transition-colors">
                    <TableCell className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F5F5F3] rounded-full flex items-center justify-center font-bold text-[#1A1A1A]">
                          {teacher.user.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{teacher.user.name}</p>
                          <p className="text-[10px] font-medium text-[#8E8E8E]">{teacher.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] font-mono font-bold text-[#1A1A1A] mb-1">{teacher.nuptk}</p>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full text-[9px] px-2 py-0.5">
                        {teacher.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-bold text-[#1A1A1A]">{teacher.department || 'General'}</p>
                      <p className="text-[10px] text-[#A1A1A1] font-medium italic">{teacher.specialization}</p>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-orange-50 hover:text-orange-600"
                          onClick={() => { 
                            setEditingTeacher(teacher); 
                            reset({
                              name: teacher.user.name,
                              email: teacher.user.email,
                              nuptk: teacher.nuptk,
                              department: teacher.department,
                              specialization: teacher.specialization,
                              certification: teacher.certification,
                              gender: teacher.gender,
                              religion: teacher.religion,
                              address: teacher.address,
                              phone: teacher.phone,
                              basicSalary: teacher.basicSalary
                            }); 
                            setIsModalOpen(true); 
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleArchive(teacher.id)}
                        >
                          <Archive size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="p-12 text-center text-[#8E8E8E] italic font-medium">
                    No matching faculty records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="p-6 border-t border-[#F5F5F3] flex items-center justify-between bg-[#FDFDFC]">
            <p className="text-xs font-semibold text-[#8E8E8E]">
              Showing <span className="text-[#1A1A1A]">{((page - 1) * meta.limit) + 1}</span> to <span className="text-[#1A1A1A]">{Math.min(page * meta.limit, meta.total)}</span> of <span className="text-[#1A1A1A]">{meta.total}</span> faculty
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg h-9 w-9 p-0" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: meta.totalPages }).map((_, i) => (
                  <Button 
                    key={i} 
                    variant={page === i + 1 ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg h-9 w-9 p-0 text-xs font-bold"
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-lg h-9 w-9 p-0" 
                disabled={page === meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-[#F8F8F7] border-b border-[#EBEBE8]">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">{editingTeacher ? 'Update Faculty Registry' : 'New Teacher Onboarding'}</DialogTitle>
            <DialogDescription className="text-sm font-medium">Verified credentials and NUPTK required for enrollment.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Full Legal Name</label>
                <Input {...register('name')} placeholder="Dr. Jane Doe" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Enterprise Email</label>
                <Input {...register('email')} type="email" placeholder="jane@faculty.smk.id" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.email && <p className="text-[10px] font-bold text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">NUPTK (National ID)</label>
                <Input {...register('nuptk')} placeholder="1234567890123" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.nuptk && <p className="text-[10px] font-bold text-red-500">{errors.nuptk.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Department</label>
                <Input {...register('department')} placeholder="Teknik Informatika" className="rounded-xl h-11 border-[#EBEBE8]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Vocational Specialization</label>
                <Input {...register('specialization')} placeholder="Backend Architecture / Microservices" className="rounded-xl h-11 border-[#EBEBE8]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Certifications</label>
                <Input {...register('certification')} placeholder="CompTIA A+, Cisco CCNA" className="rounded-xl h-11 border-[#EBEBE8]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Gender</label>
                <select 
                   {...register('gender')} 
                   className="w-full h-11 rounded-xl border border-[#EBEBE8] bg-[#F8F8F7] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Basic Salary (Base)</label>
                <Input {...register('basicSalary', { valueAsNumber: true })} type="number" placeholder="5000000" className="rounded-xl h-11 border-[#EBEBE8]" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Verified Residence Address</label>
              <Input {...register('address')} placeholder="456 Teacher Row, Wonogiri" className="rounded-xl h-11 border-[#EBEBE8]" />
            </div>

            <DialogFooter className="pt-6 border-t border-[#F5F5F3] flex items-center justify-between">
              <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl bg-[#1A1A1A] h-11 px-8 shadow-xl shadow-gray-200" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : (editingTeacher ? 'Update Registry' : 'Onboard Faculty')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
