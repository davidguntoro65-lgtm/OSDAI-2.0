import EnterpriseLayout from './EnterpriseLayout';
import type { EnterpriseModule } from './EnterpriseLayout';
import AdminDashboardHome from './AdminDashboardHome';
import StudentModule from '../StudentModule';
import TeacherModule from '../TeacherModule';
import SubjectModule from '../AcademicModule';
import TimetableModule from '../TimetableModule';
import FinanceModule from '../FinanceModule';
import ArchiveModule from '../ArchiveModule';
import SuratModule from '../SuratModule';
import AIAnalyticsModule from '../AIAnalyticsModule';
import LMSModule from '../LMSModule';
import ProgramStudiModule from './ProgramStudiModule';
import KelasRombelModule from './KelasRombelModule';
import {
  ServerMonitorModule,
  ApiMonitorModule,
  AuditLogModule,
  InventoryModule,
  BackupRestoreModule,
  KalenderModule,
} from './SystemMonitorModule';

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
      Modul tersedia di versi berikutnya
    </div>
  </div>
);

export default function AdminEnterprise({ user, authToken, onLogout, onSwitchMobile }: Props) {
  const renderModule = (activeModule: EnterpriseModule, setModule: (m: EnterpriseModule) => void) => {
    const commonProps = { authToken };
    switch (activeModule) {
      case 'dashboard':
        return <AdminDashboardHome authToken={authToken} user={user} onNavigate={setModule} />;
      case 'siswa':
        return <StudentModule authToken={authToken} />;
      case 'guru':
        return <TeacherModule authToken={authToken} />;
      case 'program-studi':
        return <ProgramStudiModule authToken={authToken} />;
      case 'mata-pelajaran':
        return <SubjectModule authToken={authToken} />;
      case 'kelas-rombel':
        return <KelasRombelModule authToken={authToken} />;
      case 'penjadwalan':
        return <TimetableModule authToken={authToken} />;
      case 'kalender':
        return <KalenderModule authToken={authToken} />;
      case 'keuangan':
        return <FinanceModule authToken={authToken} userRole={user?.role || 'SUPER_ADMIN'} />;
      case 'lms':
        return <LMSModule authToken={authToken} userRole={user?.role || 'SUPER_ADMIN'} />;
      case 'ai-analytics':
        return <AIAnalyticsModule authToken={authToken} />;
      case 'arsip-digital':
        return <ArchiveModule authToken={authToken} />;
      case 'surat-digital':
        return <SuratModule authToken={authToken} />;
      case 'server-monitor':
        return <ServerMonitorModule authToken={authToken} />;
      case 'api-monitor':
        return <ApiMonitorModule authToken={authToken} />;
      case 'audit-log':
        return <AuditLogModule authToken={authToken} />;
      case 'inventory':
        return <InventoryModule authToken={authToken} />;
      case 'backup':
        return <BackupRestoreModule authToken={authToken} />;
      case 'ai-engine':
        return <PlaceholderModule title="AI Engine Control" desc="Monitor dan kontrol Gemini AI engine" />;
      case 'login-monitor':
        return <AuditLogModule authToken={authToken} />;
      case 'otp-monitor':
        return <PlaceholderModule title="OTP Monitor" desc="Monitor permintaan dan status OTP" />;
      case 'permission':
        return <PlaceholderModule title="Permission Control" desc="Kelola hak akses pengguna sistem" />;
      case 'restore':
        return <BackupRestoreModule authToken={authToken} />;
      case 'sinkronisasi':
        return <PlaceholderModule title="Sinkronisasi Data" desc="Sinkronisasi data Dapodik & pusat" />;
      case 'db-health':
        return <ServerMonitorModule authToken={authToken} />;
      case 'queue':
        return <PlaceholderModule title="Queue Monitor" desc="Monitor antrian tugas background" />;
      default:
        return <AdminDashboardHome authToken={authToken} user={user} onNavigate={setModule} />;
    }
  };

  return (
    <EnterpriseLayout user={user} authToken={authToken} onLogout={onLogout} onSwitchMobile={onSwitchMobile}>
      {renderModule}
    </EnterpriseLayout>
  );
}
