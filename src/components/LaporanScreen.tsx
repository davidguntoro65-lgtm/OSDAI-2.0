import { motion } from 'motion/react';
import AIAnalyticsModule from './AIAnalyticsModule';
import FinanceModule from './FinanceModule';
import ArchiveModule from './ArchiveModule';
import SuratModule from './SuratModule';
import LMSModule from './LMSModule';
import { BarChart3, DollarSign, Archive, FileText, BookOpen, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Props {
  authToken: string;
  role: string;
}

const ORANGE = '#FF6A00';

type SubTab = 'analitik' | 'keuangan' | 'arsip' | 'surat' | 'lms';

export default function LaporanScreen({ authToken, role }: Props) {
  const getDefaultTab = (): SubTab => {
    if (role === 'BENDAHARA') return 'keuangan';
    if (role === 'SISWA' || role === 'GURU') return 'lms';
    return 'analitik';
  };

  const [sub, setSub] = useState<SubTab>(getDefaultTab());

  const tabs: { id: SubTab; label: string; icon: any; roles: string[] }[] = [
    { id: 'analitik', label: 'Analitik', icon: Sparkles, roles: ['SUPER_ADMIN', 'KEPALA_SEKOLAH', 'BK', 'GURU', 'SISWA', 'TU'] },
    { id: 'lms', label: 'LMS', icon: BookOpen, roles: ['GURU', 'SISWA', 'SUPER_ADMIN'] },
    { id: 'keuangan', label: 'Keuangan', icon: DollarSign, roles: ['SUPER_ADMIN', 'TU', 'BENDAHARA'] },
    { id: 'arsip', label: 'Arsip', icon: Archive, roles: ['SUPER_ADMIN', 'TU'] },
    { id: 'surat', label: 'Surat', icon: FileText, roles: ['SUPER_ADMIN', 'TU', 'KEPALA_SEKOLAH'] },
  ];

  const visibleTabs = tabs.filter(t => t.roles.includes(role));

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#1C100A' }}>

      {/* Sub-tab Chips */}
      {visibleTabs.length > 1 && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const isActive = sub === id;
              return (
                <button
                  key={id}
                  onClick={() => setSub(id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl whitespace-nowrap transition-all active:scale-95 shrink-0"
                  style={{
                    background: isActive ? ORANGE : 'rgba(255,255,255,0.06)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.09)',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  <Icon size={12} />
                  <span className="text-[11px] font-black">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-3">
        <motion.div
          key={sub}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {sub === 'analitik' && <AIAnalyticsModule authToken={authToken} />}
          {sub === 'lms' && <LMSModule authToken={authToken} userRole={role} />}
          {sub === 'keuangan' && <FinanceModule authToken={authToken} userRole={role} />}
          {sub === 'arsip' && <ArchiveModule authToken={authToken} />}
          {sub === 'surat' && <SuratModule authToken={authToken} />}
        </motion.div>
      </div>
    </div>
  );
}
