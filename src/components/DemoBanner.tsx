import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, X, ChevronRight, Loader2 } from 'lucide-react';

interface DemoStatus {
  isDemoMode: boolean;
  hasRealSchedule: boolean;
  seededAt?: string;
  totalStudents?: number;
  totalTeachers?: number;
  totalSchedules?: number;
}

interface Props {
  authToken?: string;
  onSeed?: () => void;
}

export default function DemoBanner({ authToken, onSeed }: Props) {
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => {
    fetch('/api/demo/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('Menyiapkan data demo...');
    try {
      const r = await fetch('/api/demo/seed', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const d = await r.json();
      if (d.success) {
        setSeedMsg('Data demo berhasil dimuat!');
        setStatus(d.status);
        onSeed?.();
        setTimeout(() => setSeedMsg(''), 3000);
      } else {
        setSeedMsg(d.error || 'Gagal memuat demo data');
        setTimeout(() => setSeedMsg(''), 3000);
      }
    } catch {
      setSeedMsg('Gagal terhubung ke server');
      setTimeout(() => setSeedMsg(''), 3000);
    } finally {
      setSeeding(false);
    }
  };

  // Hide banner if: not demo mode, has real schedule, or dismissed
  if (!status || status.hasRealSchedule || dismissed) return null;
  if (!status.isDemoMode && status.seededAt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', zIndex: 50 }}
      >
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            >
              <FlaskConical size={14} className="text-purple-200" />
            </motion.div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white">
              MODE DEMO OSDAI
            </span>
          </div>

          <div className="w-px h-4 bg-white/20 flex-shrink-0" />

          <span className="text-[10px] text-purple-200 flex-1 min-w-0 truncate">
            {status.seededAt
              ? `Data demo aktif · ${status.totalStudents ?? 0} siswa · ${status.totalTeachers ?? 0} guru · ${status.totalSchedules ?? 0} jadwal`
              : 'Data demo belum dimuat. Klik Muat Demo untuk mengisi data awal sistem.'}
          </span>

          {seedMsg && (
            <span className="text-[10px] font-semibold text-yellow-300 flex-shrink-0 truncate max-w-[200px]">
              {seedMsg}
            </span>
          )}

          {!status.seededAt && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold flex-shrink-0 transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              {seeding ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
              {seeding ? 'Memuat...' : 'Muat Demo'}
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 flex items-center justify-center rounded flex-shrink-0 hover:bg-white/10 transition-colors"
          >
            <X size={11} className="text-purple-300" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
