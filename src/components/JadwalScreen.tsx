import { motion } from 'motion/react';
import TimetableModule from './TimetableModule';

interface Props {
  authToken: string;
  role: string;
}

export default function JadwalScreen({ authToken, role }: Props) {
  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#1C100A' }}>
      <div className="px-3 pt-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <TimetableModule authToken={authToken} />
        </motion.div>
      </div>
    </div>
  );
}
