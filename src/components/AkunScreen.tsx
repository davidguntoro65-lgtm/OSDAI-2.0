import { motion } from 'motion/react';
import {
  LogOut, Shield, Navigation, BrainCircuit, ChevronRight,
  User, Key, Bell, HelpCircle, Info, ShieldCheck,
} from 'lucide-react';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrator',
  TU: 'Tata Usaha',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  BK: 'Bimbingan Konseling',
  BENDAHARA: 'Bendahara',
  ORANG_TUA: 'Orang Tua',
  SATPAM: 'Satpam',
};

const roleBadgeColor: Record<string, string> = {
  SUPER_ADMIN: '#FF6A00',
  KEPALA_SEKOLAH: '#7c3aed',
  GURU: '#0ea5e9',
  SISWA: '#10b981',
  TU: '#f59e0b',
  BK: '#ec4899',
  BENDAHARA: '#14b8a6',
};

interface Props {
  user: any;
  onLogout: () => void;
}

export default function AkunScreen({ user, onLogout }: Props) {
  const initials = (user?.name || 'U').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const badgeColor = roleBadgeColor[user?.role] || '#FF6A00';

  const menuItems = [
    { icon: User, label: 'Profil Pengguna', sub: user?.name, color: '#FF6A00' },
    { icon: Key, label: 'Keamanan Akun', sub: 'Ubah kata sandi', color: '#7c3aed' },
    { icon: Bell, label: 'Notifikasi', sub: 'Atur preferensi', color: '#0ea5e9' },
    { icon: ShieldCheck, label: 'Privasi & GPS', sub: 'Izin lokasi & perangkat', color: '#10b981' },
    { icon: HelpCircle, label: 'Bantuan & Dukungan', sub: 'FAQ & kontak admin', color: '#f59e0b' },
    { icon: Info, label: 'Tentang OSDAI', sub: 'v1.0.0 · SMK Negeri 1 Wonogiri', color: '#64748b' },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#1C100A' }}>

      {/* Profile Card */}
      <div className="px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #2A1708 0%, #1C100A 100%)', border: '1px solid rgba(255,106,0,0.18)' }}
        >
          {/* Background glow */}
          <div
            className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.2) 0%, transparent 70%)' }}
          />

          <div className="flex items-center gap-4 relative z-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${badgeColor}, ${badgeColor}aa)` }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white truncate">{user?.name || '—'}</h2>
              <p className="text-[11px] font-bold truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {user?.userId || user?.email || '—'}
              </p>
              <div
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{ background: `${badgeColor}22`, border: `1px solid ${badgeColor}44`, color: badgeColor }}
              >
                <Shield size={10} />
                {roleLabel[user?.role] || user?.role}
              </div>
            </div>
          </div>

          {/* System status */}
          <div
            className="mt-4 pt-4 flex items-center gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-1.5">
              <Navigation size={11} style={{ color: '#3b82f6' }} />
              <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.4)' }}>GPS Aktif</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={11} style={{ color: '#10b981' }} />
              <span className="text-[10px] font-black" style={{ color: 'rgba(255,255,255,0.4)' }}>Audit Log</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-green-500"
              />
              <span className="text-[10px] font-black" style={{ color: '#10b981' }}>Online</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-3 space-y-2">
        {menuItems.map(({ icon: Icon, label, sub, color }, i) => (
          <motion.button
            key={label}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18` }}
            >
              <Icon size={17} style={{ color }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-white">{label}</p>
              <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
            </div>
            <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.button>
        ))}
      </div>

      {/* OSDAI Branding */}
      <div className="px-4 py-4 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
          >
            <BrainCircuit size={15} className="text-white" />
          </div>
          <span className="text-sm font-black text-white">OSDAI</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Otomatisasi Sekolah Digital Berbasis AI
        </p>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm transition-all"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
          }}
        >
          <LogOut size={17} />
          Keluar dari Sistem
        </motion.button>
      </div>
    </div>
  );
}
