import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  authToken: string;
  onClose: () => void;
}

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'Minimal 8 karakter', test: v => v.length >= 8 },
  { label: 'Mengandung huruf besar', test: v => /[A-Z]/.test(v) },
  { label: 'Mengandung huruf kecil', test: v => /[a-z]/.test(v) },
  { label: 'Mengandung angka', test: v => /[0-9]/.test(v) },
];

export default function ChangePasswordModal({ authToken, onClose }: Props) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rulesPassed = RULES.every(r => r.test(newPwd));
  const passwordsMatch = newPwd.length > 0 && newPwd === confirmPwd;
  const canSubmit = currentPwd.length > 0 && rulesPassed && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Gagal mengubah password.');
      } else {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#1C1917', border: '1px solid rgba(255,106,0,0.2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,106,0,0.15)' }}
            >
              <Lock size={16} style={{ color: '#FF6A00' }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Ubah Password</h2>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Keamanan akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 px-5 py-10"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)' }}
              >
                <CheckCircle2 size={32} style={{ color: '#10b981' }} />
              </div>
              <p className="text-base font-black text-white">Password berhasil diubah!</p>
              <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Menutup otomatis...
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="px-5 py-5 space-y-4"
            >
              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                >
                  <AlertCircle size={13} />
                  {error}
                </motion.div>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Password Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => { setCurrentPwd(e.target.value); setError(''); }}
                    placeholder="Masukkan password saat ini"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-semibold text-white placeholder:font-normal outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      caretColor: '#FF6A00',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showCurrent
                      ? <EyeOff size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      : <Eye size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Buat password baru"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-semibold text-white placeholder:font-normal outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      caretColor: '#FF6A00',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showNew
                      ? <EyeOff size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      : <Eye size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </button>
                </div>

                {/* Rules */}
                {newPwd.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-1 pt-1"
                  >
                    {RULES.map(rule => {
                      const passed = rule.test(newPwd);
                      return (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                            style={{ background: passed ? '#10b981' : 'rgba(255,255,255,0.2)' }}
                          />
                          <span
                            className="text-[10px] font-semibold transition-colors"
                            style={{ color: passed ? '#10b981' : 'rgba(255,255,255,0.35)' }}
                          >
                            {rule.label}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-semibold text-white placeholder:font-normal outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${confirmPwd.length > 0 ? (passwordsMatch ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)') : 'rgba(255,255,255,0.1)'}`,
                      caretColor: '#FF6A00',
                    }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showConfirm
                      ? <EyeOff size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      : <Eye size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                  </button>
                </div>
                {confirmPwd.length > 0 && !passwordsMatch && (
                  <p className="text-[10px] font-semibold" style={{ color: '#ef4444' }}>
                    Password tidak cocok
                  </p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileTap={canSubmit ? { scale: 0.97 } : {}}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all mt-2"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, #FF6A00, #e55a00)'
                    : 'rgba(255,255,255,0.07)',
                  color: canSubmit ? '#fff' : 'rgba(255,255,255,0.25)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    Simpan Password Baru
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
