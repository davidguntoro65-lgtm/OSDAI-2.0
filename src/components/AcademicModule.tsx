import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Printer, 
  Filter, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Layers,
  GraduationCap,
  Clock,
  Link as LinkIcon
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

const subjectSchema = z.object({
  name: z.string().min(3, 'Name is too short'),
  code: z.string().min(2, 'Code is too short'),
  type: z.enum(['NORMATIF', 'ADAPTIF', 'PRODUKTIF', 'UMUM']),
  credits: z.any(),
  majorIds: z.array(z.string()).min(1, 'Select at least one major'),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function SubjectModule({ authToken }: { authToken: string }) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
        majorIds: []
    }
  });

  const selectedMajorIds = watch('majorIds');

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subjRes, majorRes] = await Promise.all([
        fetch(`/api/subjects?search=${search}`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch(`/api/majors`, { headers: { 'Authorization': `Bearer ${authToken}` } })
      ]);
      const subjectsData = await subjRes.json();
      const majorsData = await majorRes.json();
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setMajors(Array.isArray(majorsData) ? majorsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      const url = editingSubject ? `/api/subjects/${editingSubject.id}` : '/api/subjects';
      const method = editingSubject ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(values)
      });
      
      if (!res.ok) throw new Error('Failed to save subject');
      
      setIsModalOpen(false);
      setEditingSubject(null);
      reset();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this curriculum entry?')) return;
    try {
      await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMajor = (majorId: string) => {
    const current = selectedMajorIds || [];
    if (current.includes(majorId)) {
        setValue('majorIds', current.filter(id => id !== majorId));
    } else {
        setValue('majorIds', [...current, majorId]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Curriculum Engine</h2>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">Map vocational subjects and academic credits across departments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="rounded-xl bg-[#1A1A1A] h-11" onClick={() => { setEditingSubject(null); reset(); setIsModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Add Subject
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E8E8E]">SMK Departments</h3>
            <div className="space-y-3">
                {majors.map(major => (
                    <Card key={major.id} className="rounded-2xl border-[#EBEBE8] shadow-none hover:border-[#1A1A1A] transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center font-bold text-[10px]">
                                    {major.code}
                                </div>
                                <p className="text-xs font-bold leading-tight">{major.name}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-mono border-[#EBEBE8]">{major._count.subjects}</Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        <div className="lg:col-span-3">
            <Card className="rounded-3xl border-[#EBEBE8] shadow-sm overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-[#F5F5F3] bg-[#FDFDFC] flex flex-row items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]" size={16} />
                    <Input 
                        placeholder="Search subjects or curriculum codes..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl border-[#EBEBE8] bg-[#F8F8F7]"
                    />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-xl border-[#EBEBE8]">
                            <Filter size={18} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-[#F8F8F7]">
                        <TableRow className="hover:bg-transparent border-[#EBEBE8]">
                            <TableHead className="py-4 px-8 text-[10px] uppercase font-bold tracking-wider">Subject Title</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Classification</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Allocation</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Mapping</TableHead>
                            <TableHead className="text-right px-8 text-[10px] uppercase font-bold tracking-wider">Registry</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {loading ? (
                            Array(4).fill(0).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={5} className="p-12 text-center text-[#A1A1A1]"><Loader2 className="animate-spin inline mr-2" /> Syncing curriculum data...</TableCell>
                            </TableRow>
                            ))
                        ) : subjects.length > 0 ? (
                            subjects.map((subject) => (
                            <TableRow key={subject.id} className="group hover:bg-[#FDFDFC] border-[#EBEBE8] transition-colors">
                                <TableCell className="py-5 px-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#F5F5F3] rounded-xl flex items-center justify-center font-bold text-[#1A1A1A]">
                                    <BookOpen size={18} />
                                    </div>
                                    <div>
                                    <p className="font-bold text-sm tracking-tight">{subject.name}</p>
                                    <p className="text-[10px] font-mono text-[#8E8E8E] uppercase">{subject.code}</p>
                                    </div>
                                </div>
                                </TableCell>
                                <TableCell>
                                <Badge className={`rounded-full text-[9px] px-2 py-0.5 border-none ${
                                    subject.type === 'PRODUKTIF' ? 'bg-orange-100 text-orange-700' :
                                    subject.type === 'ADAPTIF' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {subject.type}
                                </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <Clock size={14} className="text-[#A1A1A1]" />
                                        {subject.credits} JP / Week
                                    </div>
                                </TableCell>
                                <TableCell>
                                <div className="flex -space-x-2">
                                    {subject.majors.map((sm: any) => (
                                        <div key={sm.major.id} title={sm.major.name} className="w-6 h-6 rounded-full border-2 border-white bg-[#1A1A1A] text-[8px] font-bold text-white flex items-center justify-center">
                                            {sm.major.code}
                                        </div>
                                    ))}
                                </div>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-full hover:bg-[#F5F5F3]"
                                    onClick={() => { 
                                        setEditingSubject(subject); 
                                        reset({
                                            name: subject.name,
                                            code: subject.code,
                                            type: subject.type,
                                            credits: subject.credits,
                                            majorIds: subject.majors.map((m: any) => m.majorId)
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
                                    onClick={() => handleDelete(subject.id)}
                                    >
                                    <Trash2 size={16} />
                                    </Button>
                                </div>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow>
                            <TableCell colSpan={5} className="p-12 text-center text-[#8E8E8E] italic font-medium">
                                No curriculum records found.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-[#F8F8F7] border-b border-[#EBEBE8]">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">{editingSubject ? 'Edit Curriculum' : 'Define New Subject'}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#8E8E8E]">Configure subject requirements and department mappings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Subject Name</label>
                <Input {...register('name')} placeholder="Dasar Program Keahlian" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.name && <p className="text-[10px] font-bold text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Registry Code</label>
                <Input {...register('code')} placeholder="C3-RPL-01" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.code && <p className="text-[10px] font-bold text-red-500">{errors.code.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Classification</label>
                <select 
                   {...register('type')} 
                   className="w-full h-11 rounded-xl border border-[#EBEBE8] bg-[#F8F8F7] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]"
                >
                  <option value="PRODUKTIF">Produktif (Vocational)</option>
                  <option value="ADAPTIF">Adaptif (Basic Science)</option>
                  <option value="NORMATIF">Normatif (General)</option>
                  <option value="UMUM">Umum (Local Content)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Allocation (Hours/Week)</label>
                <Input {...register('credits', { valueAsNumber: true })} type="number" placeholder="4" className="rounded-xl h-11 border-[#EBEBE8]" />
                {errors.credits && <p className="text-[10px] font-bold text-red-500">{errors.credits.message as string}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#8E8E8E]">Major / Department Availability</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {majors.map(major => (
                    <div 
                        key={major.id} 
                        onClick={() => toggleMajor(major.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                            selectedMajorIds?.includes(major.id) 
                            ? 'border-[#1A1A1A] bg-[#FDFDFC] ring-1 ring-[#1A1A1A]' 
                            : 'border-[#EBEBE8] hover:bg-[#F8F8F7]'
                        }`}
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedMajorIds?.includes(major.id) ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#A1A1A1]'}`}>
                            {selectedMajorIds?.includes(major.id) && <div className="w-1 h-1 bg-white rounded-full" />}
                        </div>
                        <span className="text-xs font-bold">{major.name}</span>
                    </div>
                ))}
              </div>
              {errors.majorIds && <p className="text-[10px] font-bold text-red-500">{errors.majorIds.message}</p>}
            </div>

            <DialogFooter className="pt-6 border-t border-[#F5F5F3] flex items-center justify-between">
              <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsModalOpen(false)}>Discard</Button>
              <Button type="submit" className="rounded-xl bg-[#1A1A1A] h-11 px-8 shadow-xl shadow-gray-200" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : (editingSubject ? 'Update Curriculum' : 'Confirm Registry')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
