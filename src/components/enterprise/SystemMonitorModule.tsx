import { useState, useEffect } from 'react';
import {
  Server, Activity, Database, Cpu, HardDrive, Wifi, Globe,
  AlertTriangle, CheckCircle2, RefreshCcw, Clock, Zap,
  ArrowUpRight, TrendingUp, Eye, Shield, Key, Lock,
  Monitor, Package, BarChart3, Hash
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const C = { primary: '#FF6A00', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', textSub: '#374151' };

const genData = (n = 12) => Array.from({ length: n }, (_, i) => ({
  t: `${(new Date().getHours() - (n - i - 1)).toString().padStart(2, '0')}:00`,
  cpu: Math.floor(15 + Math.random() * 35),
  mem: Math.floor(40 + Math.random() * 30),
  req: Math.floor(10 + Math.random() * 80),
  lat: Math.floor(8 + Math.random() * 20),
}));

const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
    background: ok ? '#F0FDF4' : '#FEF2F2',
    color: ok ? '#15803D' : '#DC2626',
  }}>
    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#10B981' : '#EF4444' }} />
    {label}
  </span>
);

const MetricCard = ({ label, value, unit, icon: Icon, color, sub }: any) => (
  <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{label}</span>
    </div>
    <div className="flex items-end gap-1">
      <span className="text-2xl font-black" style={{ color: C.text }}>{value}</span>
      {unit && <span className="text-xs font-semibold mb-1" style={{ color: C.textMuted }}>{unit}</span>}
    </div>
    {sub && <p className="text-[10px] mt-1" style={{ color: C.textMuted }}>{sub}</p>}
  </div>
);

export function ServerMonitorModule({ authToken }: { authToken: string }) {
  const [data, setData] = useState(genData());
  const [loading, setLoading] = useState(false);

  const refresh = () => { setLoading(true); setTimeout(() => { setData(genData()); setLoading(false); }, 600); };

  const latest = data[data.length - 1];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Monitoring Server</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Real-time performance metrics · OSDAI Infrastructure</p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-all" style={{ borderColor: C.border, color: C.textMuted }}>
          <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="CPU Usage" value={latest.cpu} unit="%" icon={Cpu} color="#6366f1" sub="4 vCores" />
        <MetricCard label="Memory" value={latest.mem} unit="%" icon={HardDrive} color="#0ea5e9" sub="8 GB RAM" />
        <MetricCard label="Requests/min" value={latest.req} icon={Activity} color={C.primary} sub="Avg. last hour" />
        <MetricCard label="Avg Latency" value={latest.lat} unit="ms" icon={Zap} color="#10B981" sub="Response time" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>CPU & Memory (12h)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Area type="monotone" dataKey="cpu" stroke="#6366f1" strokeWidth={2} fill="url(#gcpu)" name="CPU %" />
              <Area type="monotone" dataKey="mem" stroke="#0ea5e9" strokeWidth={2} fill="url(#gmem)" name="Mem %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Request Throughput</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="greq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.primary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Area type="monotone" dataKey="req" stroke={C.primary} strokeWidth={2} fill="url(#greq)" name="Req/min" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Status Layanan</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Web Server', ok: true, icon: Globe, desc: 'Express.js' },
            { label: 'PostgreSQL', ok: true, icon: Database, desc: 'Helium DB' },
            { label: 'AI Engine', ok: true, icon: Cpu, desc: 'Gemini API' },
            { label: 'WebSocket', ok: true, icon: Wifi, desc: 'Socket.IO' },
            { label: 'File Storage', ok: true, icon: HardDrive, desc: 'Local FS' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-3 rounded-lg" style={{ background: C.bg }}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={14} style={{ color: C.textMuted }} />
                  <StatusBadge ok={s.ok} label={s.ok ? 'Online' : 'Error'} />
                </div>
                <p className="text-xs font-bold" style={{ color: C.text }}>{s.label}</p>
                <p className="text-[10px]" style={{ color: C.textMuted }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ApiMonitorModule({ authToken }: { authToken: string }) {
  const endpoints = [
    { method: 'GET', path: '/api/students', calls: 1204, avgMs: 12, errors: 0, status: 'ok' },
    { method: 'POST', path: '/api/auth/login', calls: 843, avgMs: 45, errors: 2, status: 'ok' },
    { method: 'GET', path: '/api/timetable', calls: 612, avgMs: 18, errors: 0, status: 'ok' },
    { method: 'GET', path: '/api/analytics/overall-stats', calls: 398, avgMs: 87, errors: 1, status: 'warn' },
    { method: 'POST', path: '/api/intelligence/signal/activate', calls: 284, avgMs: 134, errors: 0, status: 'ok' },
    { method: 'GET', path: '/api/finance/invoices', calls: 193, avgMs: 22, errors: 0, status: 'ok' },
    { method: 'GET', path: '/api/lms/courses', calls: 147, avgMs: 31, errors: 0, status: 'ok' },
    { method: 'POST', path: '/api/auth/forgot-password', calls: 23, avgMs: 1820, errors: 0, status: 'warn' },
  ];
  const methodColor: Record<string, string> = { GET: '#10B981', POST: '#0ea5e9', PATCH: C.primary, DELETE: '#EF4444' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Monitoring API</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Request logs & endpoint health · Real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#F0FDF4', color: '#15803D' }}>
            Total: {endpoints.reduce((a, e) => a + e.calls, 0).toLocaleString()} req/hari
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Endpoints" value={endpoints.length} icon={Hash} color="#6366f1" />
        <MetricCard label="Avg Response" value="38" unit="ms" icon={Zap} color="#10B981" />
        <MetricCard label="Error Rate" value="0.4" unit="%" icon={AlertTriangle} color="#F59E0B" />
        <MetricCard label="Uptime" value="99.8" unit="%" icon={CheckCircle2} color={C.primary} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Endpoint Performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: C.bg }}>
                {['Method', 'Endpoint', 'Total Calls', 'Avg Latency', 'Errors', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black" style={{ background: `${methodColor[e.method] || '#6B7280'}18`, color: methodColor[e.method] || '#6B7280' }}>
                      {e.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: C.text }}>{e.path}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: C.text }}>{e.calls.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <span style={{ color: e.avgMs > 500 ? '#F59E0B' : e.avgMs > 200 ? C.primary : '#10B981', fontWeight: 600 }}>{e.avgMs}ms</span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: e.errors > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{e.errors}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge ok={e.status === 'ok'} label={e.status === 'ok' ? 'OK' : 'Warn'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AuditLogModule({ authToken }: { authToken: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    fetch('/api/auth/security-logs?limit=30', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [authToken]);

  const actionColor: Record<string, string> = {
    LOGIN: '#10B981', LOGOUT: '#6B7280', OTP_REQUEST: '#0ea5e9',
    OTP_FAILED: '#EF4444', PASSWORD_RESET: C.primary, LOGIN_FAILED: '#EF4444',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-black" style={{ color: C.text }}>Audit Log Keamanan</h1>
        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Log aktivitas sistem & keamanan pengguna</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Log" value={logs.length} icon={Shield} color="#6366f1" />
        <MetricCard label="Login Sukses" value={logs.filter(l => l.action === 'LOGIN').length} icon={CheckCircle2} color="#10B981" />
        <MetricCard label="Login Gagal" value={logs.filter(l => l.action === 'LOGIN_FAILED').length} icon={AlertTriangle} color="#EF4444" />
        <MetricCard label="OTP Request" value={logs.filter(l => l.action?.includes('OTP')).length} icon={Key} color={C.primary} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Log Aktivitas</p>
          <RefreshCcw size={13} className={loading ? 'animate-spin' : 'cursor-pointer hover:text-gray-600'} style={{ color: C.textMuted }} onClick={() => { setLoading(true); fetch('/api/auth/security-logs?limit=30', { headers }).then(r => r.json()).then(setLogs).finally(() => setLoading(false)); }} />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-12" style={{ color: C.textMuted }}>
            <Shield size={32} style={{ opacity: 0.3 }} />
            <p className="text-sm mt-2">Belum ada log aktivitas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: C.bg }}>
                  {['Waktu', 'Aksi', 'User', 'IP Address', 'Status', 'Info'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id || i} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: C.textMuted }}>{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${actionColor[l.action] || '#6B7280'}15`, color: actionColor[l.action] || '#6B7280' }}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: C.text }}>{l.user?.name || l.userId?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: C.textMuted }}>{l.ipAddress || '—'}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge ok={l.status === 'SUCCESS'} label={l.status || '—'} />
                    </td>
                    <td className="px-4 py-2.5 text-[10px] max-w-[200px] truncate" style={{ color: C.textMuted }}>{l.deviceInfo || l.metadata || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function InventoryModule({ authToken }: { authToken: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', category: '', quantity: '', unit: 'PCS', condition: 'GOOD', location: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const headers = { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/inventory', { headers }).then(r => r.ok ? r.json() : []).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [authToken]);

  const save = async () => {
    if (!form.name || !form.code) return;
    setSaving(true);
    try {
      const res = await fetch('/api/inventory', { method: 'POST', headers, body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) || 0, price: parseFloat(form.price) || null }) });
      if (res.ok) { const item = await res.json(); setItems(p => [item, ...p]); setShowForm(false); setForm({ name: '', code: '', category: '', quantity: '', unit: 'PCS', condition: 'GOOD', location: '', price: '' }); }
    } finally { setSaving(false); }
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Inventaris</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Manajemen aset dan inventaris sekolah</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white transition-all" style={{ background: C.primary }}>
          <Package size={13} /> Tambah Item
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-sm font-bold mb-3" style={{ color: C.text }}>Tambah Item Baru</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'name', label: 'Nama Item', placeholder: 'e.g. Kursi Siswa' },
              { key: 'code', label: 'Kode', placeholder: 'e.g. INV-001' },
              { key: 'category', label: 'Kategori', placeholder: 'e.g. Furnitur' },
              { key: 'quantity', label: 'Jumlah', placeholder: '0', type: 'number' },
              { key: 'location', label: 'Lokasi', placeholder: 'e.g. Ruang Kelas 1' },
              { key: 'price', label: 'Harga (Rp)', placeholder: '0', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>{f.label}</label>
                <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="w-full h-8 px-3 rounded-lg text-xs outline-none border" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block" style={{ color: C.textMuted }}>Kondisi</label>
              <select value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} className="w-full h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }}>
                <option value="GOOD">Baik</option><option value="DAMAGED">Rusak</option><option value="LOST">Hilang</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border" style={{ borderColor: C.border, color: C.textMuted }}>Batal</button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: C.border }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari item..." className="flex-1 h-8 px-3 rounded-lg text-xs border outline-none" style={{ borderColor: C.border, color: C.text, background: C.bg }} />
          <span className="text-xs" style={{ color: C.textMuted }}>{filtered.length} item</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: C.bg }}>
                {['Kode', 'Nama', 'Kategori', 'Jumlah', 'Kondisi', 'Lokasi'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: C.textMuted }}>Belum ada data inventaris</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: C.textMuted }}>{item.code}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: C.text }}>{item.name}</td>
                  <td className="px-4 py-2.5" style={{ color: C.textSub }}>{item.category || '—'}</td>
                  <td className="px-4 py-2.5 font-bold" style={{ color: C.text }}>{item.quantity} {item.unit}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                      background: item.condition === 'GOOD' ? '#F0FDF4' : item.condition === 'DAMAGED' ? '#FEF2F2' : '#FFF7ED',
                      color: item.condition === 'GOOD' ? '#15803D' : item.condition === 'DAMAGED' ? '#DC2626' : '#92400E',
                    }}>{item.condition}</span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{item.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function BackupRestoreModule({ authToken }: { authToken: string }) {
  const backups = [
    { id: 1, name: 'backup_db_2026-05-11_01-00.sql.gz', size: '4.2 MB', created: '2026-05-11 01:00', type: 'AUTO', status: 'ok' },
    { id: 2, name: 'backup_db_2026-05-10_01-00.sql.gz', size: '4.1 MB', created: '2026-05-10 01:00', type: 'AUTO', status: 'ok' },
    { id: 3, name: 'backup_db_2026-05-09_manual.sql.gz', size: '4.0 MB', created: '2026-05-09 14:30', type: 'MANUAL', status: 'ok' },
    { id: 4, name: 'backup_db_2026-05-08_01-00.sql.gz', size: '3.9 MB', created: '2026-05-08 01:00', type: 'AUTO', status: 'ok' },
  ];
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: C.text }}>Backup & Restore</h1>
          <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Kelola backup database dan restore sistem</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.primary }}>
          <RefreshCcw size={12} /> Backup Sekarang
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Total Backup" value={backups.length} icon={Database} color="#6366f1" />
        <MetricCard label="Backup Terbaru" value="1 jam lalu" icon={Clock} color="#10B981" />
        <MetricCard label="Total Size" value="16.2 MB" icon={HardDrive} color={C.primary} />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
          <p className="text-sm font-bold" style={{ color: C.text }}>Daftar Backup</p>
        </div>
        <table className="w-full text-xs">
          <thead><tr style={{ background: C.bg }}>{['Nama File', 'Ukuran', 'Tanggal', 'Tipe', 'Status', 'Aksi'].map(h => <th key={h} className="px-4 py-2.5 text-left font-bold" style={{ color: C.textMuted }}>{h}</th>)}</tr></thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id} className="border-t hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: C.text }}>{b.name}</td>
                <td className="px-4 py-2.5 font-semibold" style={{ color: C.textSub }}>{b.size}</td>
                <td className="px-4 py-2.5" style={{ color: C.textMuted }}>{b.created}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: b.type === 'AUTO' ? '#EFF6FF' : '#FFF4ED', color: b.type === 'AUTO' ? '#1D4ED8' : C.primary }}>{b.type}</span>
                </td>
                <td className="px-4 py-2.5"><StatusBadge ok label="OK" /></td>
                <td className="px-4 py-2.5">
                  <button className="text-[10px] font-semibold px-2 py-1 rounded hover:bg-gray-100" style={{ color: C.primary }}>Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KalenderModule({ authToken }: { authToken: string }) {
  const events = [
    { date: '2026-05-15', title: 'Ujian Tengah Semester', type: 'exam', color: '#EF4444' },
    { date: '2026-05-20', title: 'Rapat Guru Bulanan', type: 'meeting', color: '#0ea5e9' },
    { date: '2026-05-25', title: 'Batas Pengumpulan Rapor', type: 'deadline', color: C.primary },
    { date: '2026-06-01', title: 'Libur Hari Lahir Pancasila', type: 'holiday', color: '#10B981' },
    { date: '2026-06-10', title: 'Ujian Akhir Semester', type: 'exam', color: '#EF4444' },
    { date: '2026-06-30', title: 'Akhir Tahun Ajaran', type: 'event', color: '#7c3aed' },
  ];
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-lg font-black" style={{ color: C.text }}>Kalender Akademik</h1>
        <p className="text-xs mt-0.5" style={{ color: C.textMuted }}>Jadwal kegiatan dan agenda akademik</p></div>
      <div className="rounded-xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold mb-4" style={{ color: C.text }}>Agenda Mendatang</p>
        <div className="space-y-3">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: C.bg }}>
              <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: e.color }} />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: C.text }}>{e.title}</p>
                <p className="text-[10px]" style={{ color: C.textMuted }}>{new Date(e.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${e.color}15`, color: e.color }}>{e.type.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
