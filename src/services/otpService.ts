import { randomInt, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { sendOTPEmail, sendPasswordChangedEmail } from './emailService';

const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_RESEND = 3;

// In-memory rate limiter: ip -> { count, resetAt }
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function generateOTP(): string {
  return String(randomInt(100000, 999999));
}

async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

async function logSecurity(opts: {
  userId?: string;
  action: string;
  ipAddress?: string;
  deviceInfo?: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'INFO';
  metadata?: Record<string, unknown>;
}) {
  await prisma.securityAuditLog.create({
    data: {
      userId: opts.userId,
      action: opts.action,
      ipAddress: opts.ipAddress,
      deviceInfo: opts.deviceInfo,
      status: opts.status,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : undefined,
    },
  });
}

export const OTPService = {

  async requestOTP(opts: {
    email: string;
    ip: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { email, ip, userAgent } = opts;

    // Rate limit: max 5 OTP requests per minute per IP
    if (!checkRateLimit(ip, 5, 60_000)) {
      await logSecurity({ action: 'REQUEST_OTP', ipAddress: ip, deviceInfo: userAgent, status: 'BLOCKED', metadata: { email } });
      return { success: false, message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      // Always return success-like message to prevent email enumeration
      await logSecurity({ action: 'REQUEST_OTP', ipAddress: ip, deviceInfo: userAgent, status: 'FAILED', metadata: { email, reason: 'user_not_found' } });
      return { success: true, message: 'Jika email terdaftar, kode OTP akan dikirim.' };
    }

    // Check existing active OTP and resend count
    const existingOTP = await prisma.passwordResetOTP.findFirst({
      where: { userId: user.id, isUsed: false, expiredAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOTP) {
      if (existingOTP.resendCount >= MAX_RESEND) {
        await logSecurity({ userId: user.id, action: 'RESEND_OTP', ipAddress: ip, deviceInfo: userAgent, status: 'BLOCKED', metadata: { reason: 'max_resend_exceeded' } });
        return { success: false, message: `Batas pengiriman ulang (${MAX_RESEND}x) telah tercapai. Tunggu OTP sebelumnya kadaluarsa.` };
      }
      // Increment resend count on existing record
      await prisma.passwordResetOTP.update({
        where: { id: existingOTP.id },
        data: { resendCount: { increment: 1 }, isUsed: true }, // invalidate old
      });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiredAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetOTP.create({
      data: {
        userId: user.id,
        otpHash,
        expiredAt,
        ipAddress: ip,
        deviceInfo: userAgent,
        resendCount: existingOTP ? existingOTP.resendCount + 1 : 0,
      },
    });

    // Send email (non-blocking on failure, log the error)
    try {
      await sendOTPEmail({
        to: user.email,
        name: user.name,
        otp,
        expiryMinutes: OTP_EXPIRY_MINUTES,
        ipAddress: ip,
      });
    } catch (err: any) {
      console.error('[EmailService] Failed to send OTP email:', err.message);
      await logSecurity({ userId: user.id, action: 'SEND_OTP_EMAIL', ipAddress: ip, status: 'FAILED', metadata: { error: err.message } });
      return { success: false, message: 'Gagal mengirim email. Periksa konfigurasi SMTP atau coba lagi.' };
    }

    await logSecurity({ userId: user.id, action: existingOTP ? 'RESEND_OTP' : 'REQUEST_OTP', ipAddress: ip, deviceInfo: userAgent, status: 'SUCCESS' });
    return { success: true, message: 'Kode OTP telah dikirim ke email Anda.' };
  },

  async verifyOTP(opts: {
    email: string;
    otp: string;
    ip: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const { email, otp, ip, userAgent } = opts;

    if (!checkRateLimit(`verify:${ip}`, 10, 60_000)) {
      return { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, message: 'Email tidak ditemukan dalam sistem.' };
    }

    const record = await prisma.passwordResetOTP.findFirst({
      where: { userId: user.id, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      await logSecurity({ userId: user.id, action: 'VERIFY_OTP', ipAddress: ip, status: 'FAILED', metadata: { reason: 'no_active_otp' } });
      return { success: false, message: 'Tidak ada kode OTP aktif. Minta kode baru.' };
    }

    if (record.expiredAt < new Date()) {
      await prisma.passwordResetOTP.update({ where: { id: record.id }, data: { isUsed: true } });
      await logSecurity({ userId: user.id, action: 'VERIFY_OTP', ipAddress: ip, status: 'FAILED', metadata: { reason: 'expired' } });
      return { success: false, message: 'Masa berlaku kode OTP telah habis. Minta kode baru.' };
    }

    if (record.attemptCount >= MAX_VERIFY_ATTEMPTS) {
      await prisma.passwordResetOTP.update({ where: { id: record.id }, data: { isUsed: true } });
      await logSecurity({ userId: user.id, action: 'VERIFY_OTP', ipAddress: ip, status: 'BLOCKED', metadata: { reason: 'max_attempts' } });
      return { success: false, message: `Terlalu banyak percobaan (${MAX_VERIFY_ATTEMPTS}x). Minta kode OTP baru.` };
    }

    const isValid = await verifyOTP(otp, record.otpHash);

    if (!isValid) {
      await prisma.passwordResetOTP.update({
        where: { id: record.id },
        data: { attemptCount: { increment: 1 } },
      });
      const remaining = MAX_VERIFY_ATTEMPTS - record.attemptCount - 1;
      await logSecurity({ userId: user.id, action: 'VERIFY_OTP', ipAddress: ip, status: 'FAILED', metadata: { reason: 'wrong_otp', remaining } });
      return { success: false, message: `Kode OTP tidak valid. Sisa percobaan: ${remaining}.` };
    }

    // Mark as used
    await prisma.passwordResetOTP.update({ where: { id: record.id }, data: { isUsed: true } });

    // Generate a short-lived signed reset token (UUID stored in DB)
    const resetToken = createHash('sha256')
      .update(`${user.id}:${Date.now()}:${Math.random()}`)
      .digest('hex');

    const resetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min to set new password

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    });

    await logSecurity({ userId: user.id, action: 'VERIFY_OTP', ipAddress: ip, deviceInfo: userAgent, status: 'SUCCESS' });
    return { success: true, message: 'Verifikasi berhasil.', resetToken };
  },

  async resetPassword(opts: {
    email: string;
    resetToken: string;
    newPassword: string;
    ip: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    const { email, resetToken, newPassword, ip, userAgent } = opts;

    // Validate password strength
    if (newPassword.length < 8) return { success: false, message: 'Password minimal 8 karakter.' };
    if (!/[A-Z]/.test(newPassword)) return { success: false, message: 'Password harus mengandung huruf besar.' };
    if (!/[a-z]/.test(newPassword)) return { success: false, message: 'Password harus mengandung huruf kecil.' };
    if (!/[0-9]/.test(newPassword)) return { success: false, message: 'Password harus mengandung angka.' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, message: 'Email tidak ditemukan.' };

    if (
      !user.resetToken ||
      user.resetToken !== resetToken ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date()
    ) {
      await logSecurity({ userId: user.id, action: 'RESET_PASSWORD', ipAddress: ip, status: 'FAILED', metadata: { reason: 'invalid_or_expired_token' } });
      return { success: false, message: 'Token reset tidak valid atau sudah kadaluarsa. Mulai proses dari awal.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    // Invalidate ALL sessions (logout all devices)
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { isRevoked: true } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      },
    });

    await logSecurity({ userId: user.id, action: 'RESET_PASSWORD', ipAddress: ip, deviceInfo: userAgent, status: 'SUCCESS' });

    // Send confirmation email (fire-and-forget)
    sendPasswordChangedEmail({ to: user.email, name: user.name, ipAddress: ip }).catch(() => {});

    return { success: true, message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.' };
  },

  async getSecurityLogs(limit = 50): Promise<any[]> {
    return prisma.securityAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true, email: true, role: true } } },
    });
  },
};
