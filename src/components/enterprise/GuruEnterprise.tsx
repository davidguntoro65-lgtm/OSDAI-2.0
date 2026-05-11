import EnterpriseLayout from './EnterpriseLayout';
import type { EnterpriseModule } from './EnterpriseLayout';
import GuruDashboardHome from './GuruDashboardHome';
import GuruPresensiKelas from './GuruPresensiKelas';
import GuruPenilaian from './GuruPenilaian';
import GuruRekap from './GuruRekap';
import GuruJadwal from './GuruJadwal';
import LMSModule from '../LMSModule';
import AIAnalyticsModule from '../AIAnalyticsModule';

interface Props {
  user: any;
  authToken: string;
  onLogout: () => void;
  onSwitchMobile: () => void;
}

const C = { bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', text: '#111827', textMuted: '#6B7280', primary: '#FF6A00' };

const PlaceholderModule = ({ title, desc }: { title: string; desc: string }) => (
  <div className="p-6 flex flex-col items-center justify-center min-h-96">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FFF4ED' }}>
      <span className="text-2xl">🔧</span>
    </div>
    <h2 className="text-base font-black" style={{ color: C.text }}>{title}</h2>
    <p className="text-sm mt-1" style={{ color: C.textMuted }}>{desc}</p>
    <div className="mt-4 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: '#FFF4ED', color: C.primary }}>
      Modul dalam pengembangan
    </div>
  </div>
);

const KomunikasiModule = ({ authToken }: { authToken: string }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-black mb-2" style={{ color: C.text }}>Komunikasi</h1>
      <p className="text-xs mb-6" style={{ color: C.textMuted }}>Pesan dan komunikasi dengan siswa & wali murid</p>
      <div className="flex flex-col items-center py-16" style={{ color: C.textMuted }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FFF4ED' }}>
          <span className="text-2xl">💬</span>
        </div>
        <p className="text-sm font-semibold">Modul komunikasi segera hadir</p>
        <p className="text-xs mt-1">Fitur pesan real-time dengan siswa dan wali murid</p>
      </div>
    </div>
  );
};

const LaporanGuruModule = ({ authToken }: { authToken: string }) => (
  <div className="p-6">
    <h1 className="text-lg font-black mb-2" style={{ color: C.text }}>Laporan Pembelajaran</h1>
    <p className="text-xs mb-6" style={{ color: C.textMuted }}>Laporan dan ringkasan kegiatan pembelajaran</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Total Mengajar Bulan Ini', value: '—', desc: 'Jam efektif', color: C.primary },
        { label: 'Rata-rata Kehadiran', value: '—', desc: 'Kelas diampu', color: '#10B981' },
        { label: 'Tugas Dinilai', value: '—', desc: 'Dari LMS', color: '#0ea5e9' },
      ].map(s => (
        <div key={s.label} className="p-4 rounded-xl" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
          <p className="text-xs font-bold" style={{ color: C.text }}>{s.label}</p>
          <p className="text-[10px]" style={{ color: C.textMuted }}>{s.desc}</p>
        </div>
      ))}
    </div>
    <div className="mt-6 p-4 rounded-xl" style={{ background: '#FFF4ED', border: '1px solid #FED7AA' }}>
      <p className="text-xs font-bold" style={{ color: C.primary }}>Laporan lengkap tersedia di versi mendatang</p>
      <p className="text-xs mt-1" style={{ color: '#92400E' }}>Fitur ekspor PDF dan laporan periodik sedang dikembangkan.</p>
    </div>
  </div>
);

const MateriModule = ({ authToken, userRole }: { authToken: string; userRole: string }) => (
  <LMSModule authToken={authToken} userRole={userRole} />
);

export default function GuruEnterprise({ user, authToken, onLogout, onSwitchMobile }: Props) {
  const renderModule = (activeModule: EnterpriseModule, setModule: (m: EnterpriseModule) => void) => {
    switch (activeModule) {
      case 'dashboard':
        return <GuruDashboardHome authToken={authToken} user={user} onNavigate={setModule} />;
      case 'jadwal-mengajar':
        return <GuruJadwal authToken={authToken} />;
      case 'presensi-kelas':
        return <GuruPresensiKelas authToken={authToken} user={user} />;
      case 'rekap-kehadiran':
        return <GuruRekap authToken={authToken} />;
      case 'penilaian':
        return <GuruPenilaian authToken={authToken} user={user} />;
      case 'lms':
        return <LMSModule authToken={authToken} userRole={user?.role || 'GURU'} />;
      case 'materi':
        return <MateriModule authToken={authToken} userRole={user?.role || 'GURU'} />;
      case 'ai-analytics':
        return <AIAnalyticsModule authToken={authToken} />;
      case 'komunikasi':
        return <KomunikasiModule authToken={authToken} />;
      case 'laporan-guru':
        return <LaporanGuruModule authToken={authToken} />;
      default:
        return <GuruDashboardHome authToken={authToken} user={user} onNavigate={setModule} />;
    }
  };

  return (
    <EnterpriseLayout user={user} authToken={authToken} onLogout={onLogout} onSwitchMobile={onSwitchMobile}>
      {renderModule}
    </EnterpriseLayout>
  );
}
