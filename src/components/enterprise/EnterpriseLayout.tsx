import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar,
  Settings, Shield, Database, Archive, FileText, BrainCircuit,
  ChevronDown, ChevronRight, Bell, Search, LogOut, Menu, X,
  Activity, Server, Key, Cpu, Radio, BarChart3, DollarSign,
  Layers, FolderOpen, Lock, Eye, Wifi, Package, Zap,
  ClipboardList, TrendingUp, MessageSquare, Award, Clock,
  RefreshCcw, ChevronLeft, User, Globe, AlertTriangle,
  CheckCircle2, Monitor
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type EnterpriseModule =
  | 'dashboard' | 'siswa' | 'guru' | 'program-studi' | 'mata-pelajaran'
  | 'kelas-rombel' | 'penjadwalan' | 'kalender' | 'sinkronisasi'
  | 'server-monitor' | 'api-monitor' | 'queue' | 'db-health' | 'ai-engine'
  | 'audit-log' | 'login-monitor' | 'otp-monitor' | 'device-monitor' | 'permission'
  | 'backup' | 'restore' | 'arsip-digital' | 'keuangan' | 'surat-digital'
  | 'ai-analytics' | 'lms' | 'inventory'
  // Guru modules
  | 'jadwal-mengajar' | 'presensi-kelas' | 'penilaian' | 'materi'
  | 'rekap-kehadiran' | 'komunikasi' | 'laporan-guru';

interface SidebarItem {
  id: EnterpriseModule;
  label: string;
  icon: any;
  badge?: number | string;
}
interface SidebarGroup {
  label: string;
  icon: any;
  items: SidebarItem[];
}

// ── Admin sidebar config ───────────────────────────────────────────────────────
const ADMIN_SIDEBAR: SidebarGroup[] = [
  {
    label: 'Master Data',
    icon: Database,
    items: [
      { id: 'siswa', label: 'Data Siswa', icon: Users },
      { id: 'guru', label: 'Data Guru', icon: GraduationCap },
      { id: 'program-studi', label: 'Program Studi', icon: Award },
      { id: 'mata-pelajaran', label: 'Mata Pelajaran', icon: BookOpen },
      { id: 'kelas-rombel', label: 'Kelas & Rombel', icon: Layers },
    ]
  },
  {
    label: 'Akademik',
    icon: Calendar,
    items: [
      { id: 'penjadwalan', label: 'Penjadwalan', icon: Calendar },
      { id: 'kalender', label: 'Kalender Akademik', icon: Clock },
    ]
  },
  {
    label: 'Keuangan',
    icon: DollarSign,
    items: [
      { id: 'keuangan', label: 'Keuangan & SPP', icon: DollarSign },
    ]
  },
  {
    label: 'Pembelajaran',
    icon: BookOpen,
    items: [
      { id: 'lms', label: 'LMS & Materi', icon: BookOpen },
      { id: 'ai-analytics', label: 'Analitik AI', icon: BrainCircuit },
    ]
  },
  {
    label: 'Sistem',
    icon: Server,
    items: [
      { id: 'server-monitor', label: 'Monitoring Server', icon: Server },
      { id: 'api-monitor', label: 'Monitoring API', icon: Activity },
      { id: 'ai-engine', label: 'AI Engine', icon: Cpu },
      { id: 'inventory', label: 'Inventaris', icon: Package },
    ]
  },
  {
    label: 'Keamanan',
    icon: Shield,
    items: [
      { id: 'audit-log', label: 'Audit Log', icon: ClipboardList },
      { id: 'login-monitor', label: 'Login Monitor', icon: Eye },
      { id: 'otp-monitor', label: 'OTP Monitor', icon: Key },
      { id: 'permission', label: 'Permission Control', icon: Lock },
    ]
  },
  {
    label: 'Arsip',
    icon: FolderOpen,
    items: [
      { id: 'arsip-digital', label: 'Arsip Digital', icon: Archive },
      { id: 'surat-digital', label: 'Surat Digital', icon: FileText },
      { id: 'backup', label: 'Backup & Restore', icon: RefreshCcw },
    ]
  },
];

// ── Guru sidebar config ────────────────────────────────────────────────────────
const GURU_SIDEBAR: SidebarGroup[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Beranda Guru', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Kelas',
    icon: Radio,
    items: [
      { id: 'jadwal-mengajar', label: 'Jadwal Mengajar', icon: Calendar },
      { id: 'presensi-kelas', label: 'Presensi Kelas', icon: Radio },
      { id: 'rekap-kehadiran', label: 'Rekap Kehadiran', icon: BarChart3 },
    ]
  },
  {
    label: 'Pembelajaran',
    icon: BookOpen,
    items: [
      { id: 'lms', label: 'Ruang Kelas LMS', icon: BookOpen },
      { id: 'materi', label: 'Materi & Tugas', icon: FileText },
      { id: 'penilaian', label: 'Penilaian Siswa', icon: Award },
    ]
  },
  {
    label: 'Laporan',
    icon: BarChart3,
    items: [
      { id: 'laporan-guru', label: 'Laporan Pembelajaran', icon: TrendingUp },
      { id: 'ai-analytics', label: 'Analitik AI', icon: BrainCircuit },
      { id: 'komunikasi', label: 'Komunikasi', icon: MessageSquare },
    ]
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['SUPER_ADMIN', 'TU', 'BK', 'BENDAHARA'];
const isAdminRole = (role: string) => ADMIN_ROLES.includes(role);

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  primary: '#FF6A00',
  bg: '#F5F7FA',
  sidebar: '#FFFFFF',
  header: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  textSub: '#374151',
  active: '#FFF4ED',
  activeBorder: '#FF6A00',
};

// ── OsdaiLogo (compact enterprise version) ────────────────────────────────────
const OsdaiLogo = ({ collapsed }: { collapsed: boolean }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)', boxShadow: '0 2px 8px rgba(255,106,0,0.35)' }}
    >
      <BrainCircuit size={16} className="text-white" strokeWidth={2.5} />
    </div>
    <AnimatePresence>
      {!collapsed && (
        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="min-w-0">
          <div className="text-sm font-black tracking-tight" style={{ color: C.text }}>OSDAI</div>
          <div className="text-[9px] font-bold tracking-wide uppercase" style={{ color: C.textMuted }}>Enterprise v2.0</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ── SidebarGroupItem ──────────────────────────────────────────────────────────
const SidebarGroupComp = ({
  group, activeModule, onSelect, collapsed, defaultOpen
}: {
  group: SidebarGroup;
  activeModule: EnterpriseModule;
  onSelect: (id: EnterpriseModule) => void;
  collapsed: boolean;
  defaultOpen?: boolean;
}) => {
  const isAnyActive = group.items.some(i => i.id === activeModule);
  const [open, setOpen] = useState(defaultOpen || isAnyActive);
  const GroupIcon = group.icon;

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        {group.items.map(item => {
          const Icon = item.icon;
          const active = item.id === activeModule;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => onSelect(item.id)}
              className="w-full flex items-center justify-center h-9 rounded-lg mb-0.5 transition-all"
              style={{
                background: active ? C.active : 'transparent',
                color: active ? C.primary : C.textMuted,
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-3 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all mb-0.5"
        style={{ color: C.textMuted }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <GroupIcon size={13} />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {group.items.map(item => {
              const Icon = item.icon;
              const active = item.id === activeModule;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all relative"
                  style={{
                    background: active ? C.active : 'transparent',
                    color: active ? C.primary : C.textSub,
                    fontWeight: active ? 700 : 500,
                    borderLeft: active ? `2px solid ${C.primary}` : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Notification Dropdown ─────────────────────────────────────────────────────
const NotifPanel = ({ onClose }: { onClose: () => void }) => {
  const items = [
    { icon: Users, color: '#0ea5e9', title: 'Data siswa baru ditambahkan', time: '2 menit lalu' },
    { icon: Calendar, color: C.primary, title: 'Jadwal pelajaran diperbarui', time: '15 menit lalu' },
    { icon: Shield, color: '#10B981', title: 'Login berhasil — Admin', time: '1 jam lalu' },
    { icon: AlertTriangle, color: '#F59E0B', title: '3 siswa berisiko terdeteksi', time: '2 jam lalu' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full right-0 mt-2 w-80 rounded-xl shadow-xl border z-50 overflow-hidden"
      style={{ background: '#fff', borderColor: C.border }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.border }}>
        <span className="text-sm font-bold" style={{ color: C.text }}>Notifikasi</span>
        <button onClick={onClose}><X size={14} style={{ color: C.textMuted }} /></button>
      </div>
      {items.map((n, i) => {
        const Icon = n.icon;
        return (
          <div key={i} className="flex items-start gap-3 px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors" style={{ borderColor: '#F3F4F6' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${n.color}15` }}>
              <Icon size={14} style={{ color: n.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{n.title}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{n.time}</p>
            </div>
          </div>
        );
      })}
      <div className="px-4 py-2.5">
        <button className="text-xs font-semibold w-full text-center" style={{ color: C.primary }}>Lihat semua notifikasi</button>
      </div>
    </motion.div>
  );
};

// ── Profile Dropdown ──────────────────────────────────────────────────────────
const ProfileDropdown = ({ user, onLogout, onClose }: { user: any; onLogout: () => void; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 8, scale: 0.97 }}
    transition={{ duration: 0.15 }}
    className="absolute top-full right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 overflow-hidden"
    style={{ background: '#fff', borderColor: C.border }}
  >
    <div className="px-4 py-3 border-b" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)' }}>
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: C.text }}>{user?.name || 'Pengguna'}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.primary }}>{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>
    </div>
    <div className="py-1">
      {[
        { icon: User, label: 'Profil Saya' },
        { icon: Settings, label: 'Pengaturan' },
        { icon: Key, label: 'Ubah Password' },
      ].map(item => (
        <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left" style={{ color: C.textSub }}>
          <item.icon size={14} style={{ color: C.textMuted }} />
          {item.label}
        </button>
      ))}
    </div>
    <div className="border-t py-1" style={{ borderColor: C.border }}>
      <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors text-left" style={{ color: '#EF4444' }}>
        <LogOut size={14} />
        Keluar
      </button>
    </div>
  </motion.div>
);

// ── Main EnterpriseLayout ─────────────────────────────────────────────────────
interface Props {
  user: any;
  authToken: string;
  onLogout: () => void;
  onSwitchMobile: () => void;
  children: (activeModule: EnterpriseModule, setModule: (m: EnterpriseModule) => void) => React.ReactNode;
}

export default function EnterpriseLayout({ user, authToken, onLogout, onSwitchMobile, children }: Props) {
  const role = user?.role || 'GURU';
  const isAdmin = isAdminRole(role);
  const sidebar = isAdmin ? ADMIN_SIDEBAR : GURU_SIDEBAR;
  const defaultModule: EnterpriseModule = 'dashboard';

  const [activeModule, setActiveModule] = useState<EnterpriseModule>(defaultModule);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [time, setTime] = useState(new Date());
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectModule = (id: EnterpriseModule) => {
    setActiveModule(id);
    setSearch('');
  };

  // All sidebar items flattened for search
  const allItems = sidebar.flatMap(g => g.items);
  const searchResults = search.trim().length > 1
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const moduleName = allItems.find(i => i.id === activeModule)?.label
    || (activeModule === 'dashboard' ? 'Dashboard' : activeModule);

  const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: C.bg, fontFamily: "'Inter', 'Poppins', sans-serif" }}>

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex flex-col border-r flex-shrink-0 overflow-hidden h-full"
        style={{ background: C.sidebar, borderColor: C.border }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-3 py-3.5 border-b flex-shrink-0" style={{ borderColor: C.border, minHeight: 56 }}>
          {!collapsed && <OsdaiLogo collapsed={false} />}
          {collapsed && <OsdaiLogo collapsed={true} />}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <ChevronLeft size={14} style={{ color: C.textMuted }} />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors absolute left-3 bottom-4"
            >
              <ChevronRight size={13} style={{ color: C.textMuted }} />
            </button>
          )}
        </div>

        {/* Dashboard quick link */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => selectModule('dashboard')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-1 transition-all"
              style={{
                background: activeModule === 'dashboard' ? C.active : 'transparent',
                color: activeModule === 'dashboard' ? C.primary : C.textSub,
                fontWeight: activeModule === 'dashboard' ? 700 : 500,
                borderLeft: activeModule === 'dashboard' ? `2px solid ${C.primary}` : '2px solid transparent',
              }}
              onMouseEnter={e => { if (activeModule !== 'dashboard') (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; }}
              onMouseLeave={e => { if (activeModule !== 'dashboard') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </button>
          </div>
        )}

        {/* Scrollable menu */}
        <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
          {sidebar.map((group, i) => (
            <SidebarGroupComp
              key={group.label}
              group={group}
              activeModule={activeModule}
              onSelect={selectModule}
              collapsed={collapsed}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        {/* Bottom: Switch mode */}
        {!collapsed && (
          <div className="border-t p-3 flex-shrink-0" style={{ borderColor: C.border }}>
            <button
              onClick={onSwitchMobile}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              style={{ color: C.textMuted }}
            >
              <Monitor size={13} />
              Beralih ke Mode Mobile
            </button>
          </div>
        )}
      </motion.aside>

      {/* ── Right side: header + content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Top Header ── */}
        <header
          className="flex items-center gap-4 px-5 border-b flex-shrink-0"
          style={{ background: C.header, borderColor: C.border, height: 56, minHeight: 56 }}
        >
          {/* Breadcrumb / title */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] font-semibold" style={{ color: C.textMuted }}>OSDAI</span>
            <ChevronRight size={12} style={{ color: C.textMuted }} />
            <span className="text-[11px] font-bold" style={{ color: C.text }}>{moduleName}</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.textMuted }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari modul, fitur, data..."
              className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none transition-all"
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
              onBlur={e => (e.currentTarget.style.borderColor = C.border)}
            />
            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl border z-50 overflow-hidden" style={{ background: '#fff', borderColor: C.border }}>
                {searchResults.map(r => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { selectModule(r.id); setSearch(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors text-left"
                    >
                      <Icon size={13} style={{ color: C.textMuted }} />
                      <span style={{ color: C.text }}>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* System status */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' }} />
            <span className="text-[10px] font-bold" style={{ color: '#15803D' }}>SISTEM ONLINE</span>
          </div>

          {/* Time */}
          <div className="hidden xl:block text-right flex-shrink-0">
            <div className="text-xs font-bold tabular-nums" style={{ color: C.text }}>{timeStr}</div>
            <div className="text-[9px]" style={{ color: C.textMuted }}>{dateStr}</div>
          </div>

          {/* Notifications */}
          <div ref={notifRef} className="relative flex-shrink-0">
            <button
              onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell size={16} style={{ color: C.textMuted }} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
            </button>
            <AnimatePresence>
              {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative flex-shrink-0">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)' }}>
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold truncate max-w-[100px]" style={{ color: C.text }}>{user?.name?.split(' ')[0]}</div>
                <div className="text-[9px] uppercase font-semibold" style={{ color: C.primary }}>{user?.role?.replace('_', ' ')}</div>
              </div>
              <ChevronDown size={12} style={{ color: C.textMuted }} />
            </button>
            <AnimatePresence>
              {showProfile && <ProfileDropdown user={user} onLogout={onLogout} onClose={() => setShowProfile(false)} />}
            </AnimatePresence>
          </div>
        </header>

        {/* ── Content Area ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: C.bg }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              {children(activeModule, setActiveModule)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
