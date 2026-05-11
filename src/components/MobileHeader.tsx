import { motion } from 'motion/react';
import { BrainCircuit, Bell, Search } from 'lucide-react';

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TU: 'Tata Usaha',
  KEPALA_SEKOLAH: 'Kepala Sekolah',
  GURU: 'Guru',
  SISWA: 'Siswa',
  BK: 'BK',
  BENDAHARA: 'Bendahara',
  ORANG_TUA: 'Orang Tua',
  SATPAM: 'Satpam',
};

interface Props {
  user: any;
  title?: string;
  subtitle?: string;
  onSearch?: () => void;
  onNotif?: () => void;
  notifCount?: number;
}

export default function MobileHeader({ user, title, subtitle, onSearch, onNotif, notifCount = 0 }: Props) {
  const initials = (user?.name || 'U').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  })();

  return (
    <div
      className="sticky top-0 z-40 px-4 pt-4 pb-3"
      style={{
        background: 'rgba(15,10,5,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,106,0,0.08)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left: Brand + Greeting */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 14px rgba(255,106,0,0.7)', '0 0 0px rgba(255,106,0,0.4)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
          >
            <BrainCircuit size={18} className="text-white" />
          </motion.div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,106,0,0.8)' }}>
              {greeting}, {roleLabel[user?.role] || 'Pengguna'}
            </p>
            <h1 className="text-sm font-black text-white leading-tight truncate max-w-[160px]">
              {title || (user?.name?.split(' ')[0]) || 'OSDAI'}
            </h1>
            {subtitle && (
              <p className="text-[9px] font-bold truncate max-w-[160px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Search size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          )}
          <button
            onClick={onNotif}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Bell size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
            {notifCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: '#FF6A00', color: 'white' }}
              >
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Live status bar */}
      <div className="flex items-center gap-2 mt-2">
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-green-500"
          style={{ boxShadow: '0 0 6px rgba(34,197,94,0.7)' }}
        />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          OSDAI · SMK Negeri 1 Wonogiri · Sistem Aktif
        </span>
      </div>
    </div>
  );
}
