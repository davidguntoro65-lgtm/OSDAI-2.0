import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

export async function sendOTPEmail(opts: {
  to: string;
  name: string;
  otp: string;
  expiryMinutes: number;
  ipAddress?: string;
}): Promise<void> {
  const { to, name, otp, expiryMinutes, ipAddress } = opts;
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kode OTP OSDAI</title>
</head>
<body style="margin:0;padding:0;background:#0f0a05;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a05;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#1a0d06;border-radius:20px;overflow:hidden;border:1px solid rgba(255,106,0,0.2);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0d06,#2a1708);padding:36px 40px;text-align:center;border-bottom:1px solid rgba(255,106,0,0.15);">
              <div style="display:inline-block;background:linear-gradient(135deg,#FF6A00,#e55a00);width:56px;height:56px;border-radius:16px;margin-bottom:16px;line-height:56px;font-size:26px;">🧠</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">OSDAI</h1>
              <p style="margin:6px 0 0;color:rgba(255,106,0,0.8);font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Otomatisasi Sekolah Digital Berbasis AI</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Kepada Yth.</p>
              <p style="margin:0 0 24px;color:#ffffff;font-size:18px;font-weight:800;">${name}</p>

              <p style="margin:0 0 20px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;">
                Kami menerima permintaan reset kata sandi untuk akun Anda di sistem <strong style="color:#FF6A00;">OSDAI SMK Negeri 1 Wonogiri</strong>. Gunakan kode OTP berikut untuk melanjutkan proses verifikasi:
              </p>

              <!-- OTP Box -->
              <div style="background:linear-gradient(135deg,rgba(255,106,0,0.12),rgba(255,106,0,0.05));border:2px solid rgba(255,106,0,0.35);border-radius:16px;padding:28px;text-align:center;margin:24px 0;">
                <p style="margin:0 0 8px;color:rgba(255,255,255,0.4);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:3px;">Kode OTP Anda</p>
                <div style="font-size:44px;font-weight:900;letter-spacing:14px;color:#FF6A00;font-family:monospace;text-shadow:0 0 20px rgba(255,106,0,0.5);">${otp}</div>
                <p style="margin:12px 0 0;color:rgba(255,255,255,0.4);font-size:12px;">Berlaku selama <strong style="color:#FF6A00;">${expiryMinutes} menit</strong></p>
              </div>

              <!-- Info List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
                <tr>
                  <td style="padding:10px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid #FF6A00;">
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Waktu Permintaan</p>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;">${now} WIB</p>
                  </td>
                </tr>
                ${ipAddress ? `
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px;background:rgba(255,255,255,0.03);border-radius:10px;border-left:3px solid rgba(255,106,0,0.5);">
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Alamat IP</p>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:600;">${ipAddress}</p>
                  </td>
                </tr>` : ''}
              </table>

              <!-- Warning -->
              <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
                <p style="margin:0;color:rgba(239,68,68,0.9);font-size:13px;font-weight:700;">⚠️ Peringatan Keamanan</p>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">
                  Jangan bagikan kode OTP ini kepada siapa pun, termasuk staf OSDAI. Jika Anda tidak meminta reset kata sandi, abaikan email ini dan pastikan akun Anda aman. Kode ini hanya dapat digunakan sekali.
                </p>
              </div>

              <p style="margin:20px 0 0;color:rgba(255,255,255,0.5);font-size:13px;line-height:1.7;">
                Jika Anda mengalami kendala, silakan hubungi Administrator sistem di sekolah Anda.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.25);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">OSDAI · SMK Negeri 1 Wonogiri</p>
              <p style="margin:0;color:rgba(255,255,255,0.15);font-size:10px;">Email ini dikirim secara otomatis oleh sistem. Mohon tidak membalas email ini.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"OSDAI SMK N 1 Wonogiri" <${process.env.SMTP_USER}>`,
    to,
    subject: `[OSDAI] Kode OTP Reset Password — ${otp}`,
    html,
    text: `Kode OTP Reset Password OSDAI Anda: ${otp}\nBerlaku ${expiryMinutes} menit.\nJangan bagikan ke siapapun.`,
  });
}

export async function sendPasswordChangedEmail(opts: { to: string; name: string; ipAddress?: string }): Promise<void> {
  const { to, name, ipAddress } = opts;
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' });

  const html = `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0a05;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a05;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a0d06;border-radius:20px;overflow:hidden;border:1px solid rgba(34,197,94,0.2);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a0d06,#0a1f10);padding:36px 40px;text-align:center;border-bottom:1px solid rgba(34,197,94,0.15);">
            <div style="font-size:36px;margin-bottom:12px;">✅</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;">Password Berhasil Diperbarui</h1>
            <p style="margin:8px 0 0;color:rgba(34,197,94,0.7);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">OSDAI · SMK Negeri 1 Wonogiri</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:14px;line-height:1.7;">
              Halo <strong style="color:#ffffff;">${name}</strong>, kata sandi akun OSDAI Anda berhasil diperbarui pada:
            </p>
            <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:16px 20px;margin:16px 0;">
              <p style="margin:0;color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;">Waktu</p>
              <p style="margin:4px 0 0;color:#22c55e;font-size:14px;font-weight:700;">${now} WIB${ipAddress ? ` · IP: ${ipAddress}` : ''}</p>
            </div>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 20px;margin:16px 0;">
              <p style="margin:0;color:rgba(239,68,68,0.9);font-size:13px;font-weight:700;">⚠️ Bukan Anda yang melakukan ini?</p>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">Segera hubungi Administrator sekolah Anda. Semua sesi aktif telah dinonaktifkan secara otomatis.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.2);font-size:10px;">OSDAI · Sistem Otomatis · Jangan Balas Email Ini</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"OSDAI SMK N 1 Wonogiri" <${process.env.SMTP_USER}>`,
    to,
    subject: '[OSDAI] Password Anda Berhasil Diperbarui',
    html,
    text: `Password akun OSDAI Anda berhasil diperbarui pada ${now} WIB. Jika bukan Anda, segera hubungi administrator.`,
  });
}
