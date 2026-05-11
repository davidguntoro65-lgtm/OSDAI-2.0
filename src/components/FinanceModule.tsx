import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  Plus, 
  Receipt, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Filter,
  Search,
  ExternalLink,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function FinanceModule({ authToken, userRole }: { authToken: string, userRole: string }) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'generate' | 'reports'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/invoices', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSPP = async () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const academicYearId = 'current'; // Simplified

    if (!confirm(`Generate SPP invoices for ${month}/${year}?`)) return;

    try {
      const res = await fetch('/api/finance/spp/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ month, year, academicYearId })
      });
      const data = await res.json();
      alert(`Generated ${data.count} invoices.`);
      fetchInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayment = async (invoiceId: string) => {
    try {
      const res = await fetch('/api/finance/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ invoiceId })
      });
      const data = await res.json();
      if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
      } else {
          alert('Offline payment initiated. Payment reference: ' + data.transactionId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
      const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const end = new Date().toISOString();
      try {
          const res = await fetch(`/api/finance/report?start=${start}&end=${end}`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const data = await res.json();
          setReport(data);
      } catch (err) {
          console.error(err);
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge className="bg-green-100 text-green-700 border-green-200">PAID</Badge>;
      case 'UNPAID': return <Badge className="bg-red-100 text-red-700 border-red-200">UNPAID</Badge>;
      case 'PARTIAL': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">PARTIAL</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.externalId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.student.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Financial Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#1A1A1A]">Financial Control Center</h1>
          <p className="text-sm text-[#8E8E8E] font-medium mt-1">Enterprise billing, reconciliation, and reporting engine.</p>
        </div>
        <div className="flex items-center gap-3">
          {(userRole === 'SUPER_ADMIN' || userRole === 'BENDAHARA') && (
            <Button 
                onClick={handleGenerateSPP}
                className="rounded-2xl bg-orange-600 hover:bg-orange-700 text-white h-12 px-6 font-bold shadow-lg shadow-orange-600/20"
            >
                <Plus size={18} className="mr-2" /> Generate Monthly SPP
            </Button>
          )}
          <Button variant="outline" className="rounded-2xl border-[#EBEBE8] h-12 bg-white px-6 font-bold">
            <TrendingUp size={18} className="mr-2" /> View Dashboard
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1 bg-[#F8F8F7] p-1.5 rounded-[24px] border border-[#EBEBE8] w-fit">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'invoices' ? 'bg-white shadow-sm text-black' : 'text-[#8E8E8E] hover:text-black'}`}
        >
          <Receipt size={14} /> Invoices & Billing
        </button>
        {(userRole === 'SUPER_ADMIN' || userRole === 'BENDAHARA') && (
            <button 
                onClick={() => { setActiveTab('reports'); fetchReport(); }}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'reports' ? 'bg-white shadow-sm text-black' : 'text-[#8E8E8E] hover:text-black'}`}
            >
                <FileText size={14} /> Financial Reports
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeTab === 'invoices' && (
              <motion.div
                key="invoices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1A1]" size={18} />
                    <Input 
                      placeholder="Search invoice or student name..." 
                      className="pl-12 h-12 p-6 rounded-[20px] bg-white border-[#EBEBE8] shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="h-12 w-12 rounded-[20px] border-[#EBEBE8] flex items-center justify-center bg-white">
                    <Filter size={18} />
                  </Button>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center bg-white rounded-[40px] border border-[#EBEBE8]">
                      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-black text-[#1A1A1A] mt-4">Fetching financial records...</p>
                    </div>
                  ) : filteredInvoices.map((inv) => (
                    <motion.div
                      key={inv.id}
                      className="bg-white p-6 rounded-[32px] border border-[#EBEBE8] shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${inv.status === 'PAID' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <CreditCard size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase text-[#8E8E8E] tracking-wider">{inv.type}</span>
                                {getStatusBadge(inv.status)}
                            </div>
                            <h3 className="text-lg font-black text-[#1A1A1A]">{inv.student.user.name}</h3>
                            <p className="text-xs font-bold text-[#8E8E8E] flex items-center gap-1.5 mt-0.5">
                                <Briefcase size={12} /> {inv.student.class?.name || 'No Class'} • {inv.externalId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-end flex-col text-right">
                          <span className="text-[10px] font-black text-[#8E8E8E] uppercase tracking-widest mb-1">Total Amount</span>
                          <p className="text-2xl font-black text-[#1A1A1A]">
                            Rp {Number(inv.totalAmount).toLocaleString('id-ID')}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            {inv.status !== 'PAID' && (
                                <Button 
                                    onClick={() => handlePayment(inv.id)}
                                    className="h-9 px-4 rounded-xl bg-black text-white text-[10px] font-black"
                                >
                                    PAY NOW <ChevronRight size={14} className="ml-1" />
                                </Button>
                            )}
                            <Button 
                                onClick={() => window.open(`/api/finance/receipt/${inv.id}`, '_blank')}
                                variant="outline" 
                                className="h-9 w-9 rounded-xl border-[#EBEBE8] p-0"
                            >
                                <Printer size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && report && (
                <motion.div
                    key="reports"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="rounded-[32px] bg-white border-[#EBEBE8] p-4">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black text-[#8E8E8E] uppercase">Total Revenue (Month)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black text-green-600">Rp {Number(report.summary.totalIncome).toLocaleString('id-ID')}</p>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 mt-2">
                                    <ArrowUpRight size={12} /> +12.5% from last month
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="rounded-[32px] bg-white border-[#EBEBE8] p-4">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black text-[#8E8E8E] uppercase">Reconciliation Rate</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-black text-blue-600">98.2%</p>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-2">
                                    <CheckCircle2 size={12} /> Transaction health optimal
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-[40px] bg-white border-[#EBEBE8] overflow-hidden shadow-sm">
                        <CardHeader className="p-8 border-b border-[#F5F5F3]">
                            <CardTitle className="text-xl font-black">Daily Journal Ledger</CardTitle>
                            <CardDescription>Consolidated double-entry records for the current period.</CardDescription>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#F8F9FA] border-b border-[#EBEBE8]">
                                    <tr>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Date</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Description</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Acc Debit</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Acc Credit</th>
                                        <th className="p-5 text-right text-[10px] font-black uppercase tracking-wider text-[#8E8E8E]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F5F5F3]">
                                    {report.journals.map((j: any) => (
                                        <tr key={j.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-5 text-xs font-bold">{new Date(j.date).toLocaleDateString()}</td>
                                            <td className="p-5 text-xs font-black">{j.description}</td>
                                            <td className="p-5 text-xs font-bold text-green-600">{j.debitAccount.name}</td>
                                            <td className="p-5 text-xs font-bold text-red-600">{j.creditAccount.name}</td>
                                            <td className="p-5 text-right font-black">Rp {Number(j.amount).toLocaleString('id-ID')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[32px] bg-black text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <TrendingUp size={120} />
            </div>
            <CardHeader className="p-8 pb-0">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-[#8E8E8E]">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div>
                    <h3 className="text-4xl font-black">Rp 128M</h3>
                    <p className="text-sm font-bold text-[#8E8E8E] mt-1">Outstanding Receivables</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[10px] font-black uppercase text-[#8E8E8E]">Total Paid</span>
                        <p className="text-lg font-black text-green-400">1,240</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-[10px] font-black uppercase text-[#8E8E8E]">Pending</span>
                        <p className="text-lg font-black text-orange-400">45</p>
                    </div>
                </div>
                <Button className="w-full bg-white text-black h-12 rounded-2xl font-black shadow-xl">
                    Generate Year-End Report
                </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] bg-white border-[#EBEBE8] p-2 overflow-hidden shadow-sm">
            <CardHeader className="p-6">
              <CardTitle className="text-lg font-black tracking-tight">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F5F3] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#1A1A1A]">Payment Reconciled</p>
                      <p className="text-[9px] font-bold text-[#8E8E8E]">Student: Ahmad Kurniawan</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-green-600">+ Rp 500k</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
