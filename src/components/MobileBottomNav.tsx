import { motion } from 'motion/react';
import { Home, Radio, Calendar, BarChart3, UserCircle } from 'lucide-react';

export type MobileTab = 'beranda' | 'presensi' | 'jadwal' | 'laporan' | 'akun';

const NAV_ITEMS = [
  { id: 'beranda',  label: 'Beranda',  Icon: Home },
  { id: 'presensi', label: 'Presensi', Icon: Radio },
  { id: 'jadwal',   label: 'Jadwal',   Icon: Calendar },
  { id: 'laporan',  label: 'Laporan',  Icon: BarChart3 },
  { id: 'akun',     label: 'Akun',     Icon: UserCircle },
] as const;

interface Props {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  badge?: Partial<Record<MobileTab, number>>;
}

export default function MobileBottomNav({ active, onChange, badge = {} }: Props) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(15,10,5,0.92)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,106,0,0.12)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-3 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          const count = badge[id as MobileTab] || 0;
          return (
            <button
              key={id}
              onClick={() => onChange(id as MobileTab)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1 min-w-[56px] transition-all duration-150 active:scale-95"
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute -inset-2 rounded-2xl"
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(255,106,0,0.25) 0%, transparent 70%)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={22}
                  style={{
                    color: isActive ? '#FF6A00' : 'rgba(255,255,255,0.35)',
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(255,106,0,0.7))' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                    style={{ background: '#FF6A00', color: 'white' }}
                  >
                    {count > 9 ? '9+' : count}
                  </motion.span>
                )}
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-wider transition-colors duration-200"
                style={{ color: isActive ? '#FF6A00' : 'rgba(255,255,255,0.3)' }}
              >
                {label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: '#FF6A00' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
