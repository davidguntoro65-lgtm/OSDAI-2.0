import { motion } from 'motion/react';
import { Monitor, Smartphone, BrainCircuit, Zap, Shield, ChevronRight, Globe } from 'lucide-react';

interface Props {
  onSelectMode: (mode: 'mobile' | 'web') => void;
  userName?: string;
  userRole?: string;
}

const C = {
  primary: '#FF6A00',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
};

export default function ModeSelector({ onSelectMode, userName, userRole }: Props) {
  const isAdmin = ['SUPER_ADMIN', 'TU', 'BK', 'BENDAHARA'].includes(userRole || '');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0a0604 0%, #130b05 50%, #0a0604 100%)' }}
    >
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.12) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FF6A00,#cc4a00)', boxShadow: '0 0 24px rgba(255,106,0,0.35)' }}
            >
              <BrainCircuit size={22} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">OSDAI</h1>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'rgba(255,106,0,0.7)' }}>
            Otomatisasi Sekolah Digital · AI
          </p>
          {userName && (
            <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Selamat datang, <span className="font-bold text-white">{userName.split(' ')[0]}</span>
              {' '}·{' '}
              <span className="font-semibold" style={{ color: 'rgba(255,106,0,0.8)' }}>{userRole?.replace('_', ' ')}</span>
            </p>
          )}
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Pilih mode tampilan</p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 gap-4">
          {/* Web Enterprise Mode */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectMode('web')}
            className="relative overflow-hidden rounded-2xl p-5 text-left group"
            style={{
              background: 'linear-gradient(135deg, rgba(255,106,0,0.15) 0%, rgba(255,106,0,0.05) 100%)',
              border: '1px solid rgba(255,106,0,0.35)',
            }}
          >
            {/* Corner accent */}
            <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: 'radial-gradient(circle, #FF6A00, transparent)' }} />

            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,106,0,0.2)', border: '1px solid rgba(255,106,0,0.3)' }}>
                  <Monitor size={22} style={{ color: '#FF6A00' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-black text-white">Mode Web Enterprise</h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider" style={{ background: 'rgba(255,106,0,0.25)', color: '#FF6A00', border: '1px solid rgba(255,106,0,0.3)' }}>
                      BARU
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Antarmuka desktop penuh dengan sidebar navigasi, multi-modul, dan dashboard enterprise lengkap.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { icon: Globe, text: 'Full Desktop' },
                      { icon: Shield, text: 'Multi Modul' },
                      { icon: Zap, text: 'Realtime' },
                    ].map(f => (
                      <div key={f.text} className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <f.icon size={10} style={{ color: 'rgba(255,106,0,0.8)' }} />
                        <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'rgba(255,106,0,0.6)' }} className="flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Recommended badge */}
            {isAdmin && (
              <div className="mt-3 pt-3 border-t relative z-10" style={{ borderColor: 'rgba(255,106,0,0.15)' }}>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,106,0,0.6)' }}>
                  ✓ Direkomendasikan untuk peran {userRole?.replace('_', ' ')}
                </p>
              </div>
            )}
          </motion.button>

          {/* Mobile Mode */}
          <motion.button
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectMode('mobile')}
            className="relative overflow-hidden rounded-2xl p-5 text-left group"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Smartphone size={22} style={{ color: 'rgba(255,255,255,0.6)' }} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white mb-1">Mode Mobile</h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Tampilan mobile-first dengan navigasi tab bawah, dioptimalkan untuk smartphone.
                  </p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.3)' }} className="flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>
          SMK Negeri 1 Wonogiri · OSDAI v2.0 Enterprise
        </p>
      </motion.div>
    </div>
  );
}
