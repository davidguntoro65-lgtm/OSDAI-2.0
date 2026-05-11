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
  Settings2
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

const studentSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  email: z.string().email('Invalid email'),
  nis: z.string().min(5, 'NIS required'),
  nisn: z.string().min(10, 'NISN required'),
  classId: z.string().uuid('Selection required'),
  gender: z.string().optional(),
  religion: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function StudentModule({ authToken }: { authToken: string }) {
  const [students, setStudents] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema)
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [page, search]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setClasses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?page=${page}&search=${search}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setStudents(data.items || []);
      setMeta(data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: StudentFormValues) => {
    try {
      const url = editingStudent ? `/api/students/${editingStudent.id}` : '/api/students';
      const method = editingStudent ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(values)
      });
      
      if (!res.ok) throw new Error('Failed to save student');
      
      setIsModalOpen(false);
      setEditingStudent(null);
      reset();
      fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this student?')) return;
    try {
      await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchStudents();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Name,NIS,NISN,Major,Class"].join(",") + "\n"
      + students.map(s => `${s.user.name},${s.nis},${s.nisn},${s.class?.major?.name},${s.class?.name}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">SIS Management</h2>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">Manage and track student records enterprise-wide.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-[#EBEBE8] h-11" onClick={handleExport}>
            <Download size={18} className="mr-2" /> Export
          </Button>
          <Button className="rounded-xl bg-[#1A1A1A] h-11" onClick={() => { setEditingStudent(null); reset(); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-[#EBEBE8] shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-[#F5F5F3] flex flex-row items-center justify-between bg-[#FDFDFC]">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]" size={16} />
              <Input 
                placeholder="Search by name, NIS, or NISN..." 
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
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Settings2 size={18} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#F8F8F7]">
              <TableRow className="hover:bg-transparent border-[#EBEBE8]">
                <TableHead className="py-4 px-8 text-[10px] uppercase font-bold tracking-wider">Student Profile</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Academic Track</TableHead>
                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Status</TableHead>
                <TableHead className="text-right px-8 text-[10px] uppercase font-bold tracking-wider">Registry Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="p-12 text-center text-[#A1A1A1]"><Loader2 className="animate-spin inline mr-2" /> Loading records...</TableCell>
                  </TableRow>
                ))
              ) : students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id} className="group hover:bg-[#FDFDFC] border-[#EBEBE8] transition-colors">
                    <TableCell className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#F5F5F3] rounded-full flex items-center justify-center font-bold text-[#1A1A1A]">
                          {student.user.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{student.user.name}</p>
                          <p className="text-[10px] font-mono text-[#8E8E8E] uppercase">NIS: {student.nis} • NISN: {student.nisn}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-md bg-orange-50 text-[#FF6B2C] border-none font-bold text-[10px] mb-1">
                        {student.class?.major?.name}
                      </Badge>
                      <p className="text-[10px] text-[#A1A1A1] font-medium">Grade {student.class?.grade} • {student.class?.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none rounded-full text-[9px] px-2 py-0.5">
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-orange-50 hover:text-orange-600"
                          onClick={() => { setEditingStudent(student); reset({
                            name: student.user.name,
                            email: student.user.email,
                            nis: student.nis,
                            nisn: student.nisn,
                            classId: student.classId,
                            gender: student.gender,
                            religion: student.religion,
                            address: student.address,
                            medicalNotes: student.medicalNotes
                          }); setIsModalOpen(true); }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleArchive(student.id)}
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
                    No matching student records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="p-6 border-t border-[#F5F5F3] flex items-center justify-between bg-[#FDFDFC]">
            <p className="text-xs font-semibold text-[#8E8E8E] invisible md:visible">
              Showing <span className="text-[#1A1A1A]">{((page - 1) * meta.limit) + 1}</span> to <span className="text-[#1A1A1A]">{Math.min(page * meta.limit, meta.total)}</span> of <span className="text-[#1A1A1A]">{meta.total}</span> records
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
            <DialogTitle className="text-2xl font-extrabold tracking-tight">{editingStudent ? 'Update Record' : 'Enroll New Student'}</DialogTitle>
            <DialogDescription className="text-sm font-medium">Ensure all identity data matches official documents.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Full Name</label>
                <Input {...register('name')} placeholder="Alpha Smith" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Email Address</label>
                <Input {...register('email')} type="email" placeholder="alpha@student.smk.id" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.email && <p className="text-[10px] font-bold text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">NIS (School ID)</label>
                <Input {...register('nis')} placeholder="2023001" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.nis && <p className="text-[10px] font-bold text-red-500">{errors.nis.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">NISN (National ID)</label>
                <Input {...register('nisn')} placeholder="001001001" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.nisn && <p className="text-[10px] font-bold text-red-500">{errors.nisn.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Class Assignment</label>
                <select 
                  {...register('classId')} 
                  className="w-full h-11 rounded-xl border border-[#EBEBE8] bg-[#F8F8F7] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.major?.name})
                    </option>
                  ))}
                </select>
                {errors.classId && <p className="text-[10px] font-bold text-red-500">{errors.classId.message}</p>}
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
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Current Residential Address</label>
              <Input {...register('address')} placeholder="123 SMK Lane, Wonogiri" className="rounded-xl h-11 border-[#EBEBE8]" />
            </div>

            <DialogFooter className="pt-6 border-t border-[#F5F5F3] flex items-center justify-between">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl bg-[#1A1A1A] h-11 px-8 shadow-xl shadow-gray-200" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : (editingStudent ? 'Update Registry' : 'Confirm Enrollment')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
