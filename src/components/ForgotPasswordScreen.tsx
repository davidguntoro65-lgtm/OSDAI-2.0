import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Mail, KeyRound, Eye, EyeOff, CheckCircle2, ArrowLeft, RefreshCw, Lock, Loader2, ShieldCheck } from 'lucide-react';

type Step = 'email' | 'otp' | 'password' | 'success';

interface Props {
  onBack: () => void;
}

const ORANGE = '#FF6A00';
const RESEND_COOLDOWN = 60; // seconds

export default function ForgotPasswordScreen({ onBack }: Props) {
  const [step, setStep] = useState<Step>('email');

  // Step 1
  const [email, setEmail] = useState('');

  // Step 2
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  // Step 3
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Common
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }, [step]);

  const otp = otpDigits.join('');

  // Password strength
  const passStrength = (() => {
    if (!newPassword) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { score, label: 'Lemah', color: '#ef4444' };
    if (score === 3) return { score, label: 'Sedang', color: '#f59e0b' };
    if (score === 4) return { score, label: 'Kuat', color: '#22c55e' };
    return { score, label: 'Sangat Kuat', color: '#10b981' };
  })();

  // ── Step 1: Request OTP ─────────────────────────────────────────
  const handleRequestOTP = async () => {
    setError(''); setInfo('');
    if (!email.trim() || !email.includes('@')) { setError('Masukkan alamat email yang valid.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || 'Gagal mengirim OTP.'); return; }
      setInfo(data.message);
      setStep('otp');
      setResendTimer(RESEND_COOLDOWN);
      setResendCount(0);
    } catch { setError('Gagal terhubung ke server. Periksa koneksi Anda.'); }
    finally { setLoading(false); }
  };

  // ── Step 2a: Resend OTP ──────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0 || resendCount >= 3) return;
    setError(''); setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Gagal mengirim ulang OTP.'); return; }
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      setInfo('Kode OTP baru telah dikirim.');
      setResendTimer(RESEND_COOLDOWN);
      setResendCount(c => c + 1);
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setLoading(false); }
  };

  // ── Step 2b: Verify OTP ──────────────────────────────────────────
  const handleVerifyOTP = async () => {
    setError(''); setInfo('');
    if (otp.length < 6) { setError('Masukkan 6 digit kode OTP.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || 'Verifikasi gagal.'); return; }
      setResetToken(data.resetToken);
      setStep('password');
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setLoading(false); }
  };

  // ── Step 3: Reset Password ────────────────────────────────────────
  const handleResetPassword = async () => {
    setError(''); setInfo('');
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok.'); return; }
    if (passStrength.score < 3) { setError('Password terlalu lemah. Gunakan kombinasi huruf besar, kecil, dan angka.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || data.error || 'Gagal mereset password.'); return; }
      setStep('success');
    } catch { setError('Gagal terhubung ke server.'); }
    finally { setLoading(false); }
  };

  // OTP digit input handler
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter' && otp.length === 6) handleVerifyOTP();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const stepProgress = { email: 1, otp: 2, password: 3, success: 4 }[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0a05 0%, #1a0d06 100%)' }}>

      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Back Button */}
        {step !== 'success' && (
          <button
            onClick={step === 'email' ? onBack : () => { setStep(step === 'password' ? 'otp' : 'email'); setError(''); }}
            className="flex items-center gap-2 mb-6 text-sm font-black transition-all active:scale-95"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <ArrowLeft size={16} />
            {step === 'email' ? 'Kembali ke Login' : 'Kembali'}
          </button>
        )}

        {/* Card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(42,23,8,0.9)', border: '1px solid rgba(255,106,0,0.18)', backdropFilter: 'blur(24px)' }}>

          {/* Header */}
          <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(255,106,0,0.4)', '0 0 16px rgba(255,106,0,0.7)', '0 0 0px rgba(255,106,0,0.4)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF6A00, #e55a00)' }}
              >
                <BrainCircuit size={18} className="text-white" />
              </motion.div>
              <div>
                <h1 className="text-base font-black text-white leading-tight">Lupa Password</h1>
                <p className="text-[10px] font-bold" style={{ color: 'rgba(255,106,0,0.7)' }}>OSDAI · SMK Negeri 1 Wonogiri</p>
              </div>
            </div>

            {/* Progress Steps */}
            {step !== 'success' && (
              <div className="flex items-center gap-2">
                {['Email', 'OTP', 'Password'].map((label, i) => {
                  const num = i + 1;
                  const done = stepProgress > num;
                  const active = stepProgress === num;
                  return (
                    <div key={label} className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all"
                          style={{
                            background: done ? '#22c55e' : active ? ORANGE : 'rgba(255,255,255,0.08)',
                            color: done || active ? 'white' : 'rgba(255,255,255,0.3)',
                          }}
                        >
                          {done ? '✓' : num}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: active ? ORANGE : 'rgba(255,255,255,0.25)' }}>{label}</span>
                      </div>
                      {i < 2 && <div className="flex-1 h-px mb-4" style={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="px-7 py-6">
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Email ── */}
              {step === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,106,0,0.12)' }}>
                      <Mail size={22} style={{ color: ORANGE }} />
                    </div>
                    <h2 className="text-lg font-black text-white mb-1">Verifikasi Email</h2>
                    <p className="text-xs font-bold leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Masukkan email terdaftar Anda. Kami akan mengirim kode OTP 6 digit untuk mereset password.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Alamat Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRequestOTP()}
                        placeholder="nama@smk.id"
                        autoComplete="email"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm font-bold text-white placeholder:font-normal outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: ORANGE }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRequestOTP}
                    disabled={loading || !email.trim()}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #e55a00)` }}
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Mengirim...</> : <><Mail size={16} /> Kirim Kode OTP</>}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,106,0,0.12)' }}>
                      <KeyRound size={22} style={{ color: ORANGE }} />
                    </div>
                    <h2 className="text-lg font-black text-white mb-1">Masukkan Kode OTP</h2>
                    <p className="text-xs font-bold leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Kode 6 digit telah dikirim ke <span className="text-white font-black">{email}</span>. Berlaku 5 menit.
                    </p>
                  </div>

                  {/* 6-Digit OTP Input */}
                  <div className="flex gap-2.5 mb-5 justify-center">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className="w-11 h-13 text-center text-xl font-black text-white rounded-2xl outline-none transition-all"
                        style={{
                          height: '52px',
                          background: digit ? 'rgba(255,106,0,0.15)' : 'rgba(255,255,255,0.06)',
                          border: `2px solid ${digit ? 'rgba(255,106,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          caretColor: ORANGE,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.7)')}
                        onBlur={e => (e.currentTarget.style.borderColor = digit ? 'rgba(255,106,0,0.5)' : 'rgba(255,255,255,0.1)')}
                      />
                    ))}
                  </div>

                  {/* Resend + Timer */}
                  <div className="flex items-center justify-center gap-2 mb-5">
                    <button
                      onClick={handleResend}
                      disabled={resendTimer > 0 || resendCount >= 3 || loading}
                      className="flex items-center gap-1.5 text-xs font-black transition-all disabled:opacity-40"
                      style={{ color: resendTimer > 0 || resendCount >= 3 ? 'rgba(255,255,255,0.3)' : ORANGE }}
                    >
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      {resendCount >= 3 ? 'Batas pengiriman tercapai' : resendTimer > 0 ? `Kirim ulang (${resendTimer}s)` : 'Kirim ulang kode'}
                    </button>
                    {resendCount > 0 && resendCount < 3 && (
                      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>({resendCount}/3)</span>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #e55a00)` }}
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Memverifikasi...</> : <><ShieldCheck size={16} /> Verifikasi OTP</>}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 3: New Password ── */}
              {step === 'password' && (
                <motion.div key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <div className="mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,106,0,0.12)' }}>
                      <Lock size={22} style={{ color: ORANGE }} />
                    </div>
                    <h2 className="text-lg font-black text-white mb-1">Password Baru</h2>
                    <p className="text-xs font-bold leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Buat password baru yang kuat. Min. 8 karakter dengan huruf besar, huruf kecil, dan angka.
                    </p>
                  </div>

                  {/* New Password */}
                  <div className="mb-3">
                    <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Password Baru</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm font-bold text-white placeholder:font-normal outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: ORANGE }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                      <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Strength Bar */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{ background: s <= passStrength.score ? passStrength.color : 'rgba(255,255,255,0.08)' }} />
                          ))}
                        </div>
                        <span className="text-[10px] font-black" style={{ color: passStrength.color }}>{passStrength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-5">
                    <label className="text-[9px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.4)' }}>Konfirmasi Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-sm font-bold text-white placeholder:font-normal outline-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? 'rgba(239,68,68,0.5)' : confirmPassword && confirmPassword === newPassword ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          caretColor: ORANGE,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,106,0,0.5)')}
                        onBlur={e => (e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== newPassword ? 'rgba(239,68,68,0.5)' : confirmPassword && confirmPassword === newPassword ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)')}
                      />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword === newPassword && (
                      <p className="text-[10px] font-black mt-1.5 flex items-center gap-1" style={{ color: '#22c55e' }}>
                        <CheckCircle2 size={10} /> Password cocok
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleResetPassword}
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #e55a00)` }}
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><ShieldCheck size={16} /> Simpan Password Baru</>}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 4: Success ── */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="py-4 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}
                  >
                    <CheckCircle2 size={36} style={{ color: '#22c55e' }} />
                  </motion.div>
                  <h2 className="text-xl font-black text-white mb-2">Password Diperbarui!</h2>
                  <p className="text-sm font-bold mb-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Password Anda berhasil diperbarui. Email konfirmasi telah dikirim.
                  </p>
                  <p className="text-xs font-bold mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Semua sesi aktif telah dinonaktifkan untuk keamanan Anda.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onBack}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #e55a00)` }}
                  >
                    Masuk ke Sistem
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Error / Info Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 px-4 py-3 rounded-2xl text-xs font-bold text-center"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                >
                  {error}
                </motion.div>
              )}
              {info && !error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 px-4 py-3 rounded-2xl text-xs font-bold text-center"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
                >
                  {info}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-black mt-5 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
          OSDAI · SMK Negeri 1 Wonogiri
        </p>
      </motion.div>
    </div>
  );
}
