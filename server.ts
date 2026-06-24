import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { createHash } from 'crypto';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { StudentService, AcademicService, AiService, TeacherService, SubjectService, MajorService, TimetableService } from './src/services/enterprise';
import { TimetableIngestionService } from './src/services/timetableIngestion';
import { TimetableExportService } from './src/services/timetableExport';
import { FinanceService } from './src/services/finance';
import { LMSService } from './src/services/lms';
import { ParentService } from './src/services/parent';
import { InventoryService } from './src/services/inventory';
import { DocumentService } from './src/services/document';
import { GpsService } from './src/services/gps';
import { AuthService } from './src/services/auth';
import { OTPService } from './src/services/otpService';
import { IntelligenceService } from './src/services/intelligence';
import { createServer } from "http";
import { Server } from "socket.io";
import { Role } from '@prisma/client';
import { prisma } from './src/lib/prisma';
import { initEnv } from './src/lib/env';
import { buildCorsOrigins, buildQrUrl, isProduction } from './src/lib/domain';
import { logger } from './src/lib/logger';
import { ensureSuperAdmin } from './src/lib/ensureSuperAdmin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Custom Types for Request ---
interface AuthRequest extends Request {
  user?: { userId: string; role: Role };
}

async function startServer() {
  // ── Env Validation ────────────────────────────────────────
  const appEnv = initEnv();
  const PORT = appEnv.APP_PORT;

  const corsOrigins = buildCorsOrigins();
  const prod = isProduction();

  logger.info('SERVER', `Starting OSDAI v2.0 [${appEnv.APP_ENV}] on port ${PORT}`);
  logger.info('SERVER', `App URL: ${appEnv.APP_URL}`);

  // ── Hardcoded Superadmin Bootstrap ────────────────────────
  await ensureSuperAdmin();

  const app = express();
  const httpServer = createServer(app);

  // ── Socket.IO — dynamic CORS ───────────────────────────────
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 ? corsOrigins : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // cPanel/Passenger shared hosting: start with polling, upgrade to websocket if available
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Security ──────────────────────────────────────────────
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: prod ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS — dynamic, no hardcoded domains ──────────────────
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = corsOrigins;
      const match = allowed.some(o =>
        typeof o === 'string' ? o === origin || o === '*'
          : (o as RegExp).test(origin)
      );
      if (match || allowed.includes('*') || !prod) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }));

  // ── Compression ───────────────────────────────────────────
  app.use(compression());

  // ── Rate Limiting ─────────────────────────────────────────
  const limiter = rateLimit({
    windowMs: appEnv.RATE_LIMIT_WINDOW_MS,
    max: appEnv.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
    skip: (req) => req.path.startsWith('/assets') || req.path.startsWith('/favicon'),
  });
  app.use('/api', limiter);

  // ── Body Parser ───────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Socket.IO Events
  io.on("connection", (socket) => {
    socket.on("join-session", (sessionId) => {
      socket.join(`session-${sessionId}`);
    });
  });

  // Configure multer for timetable ingestion
  const storage = multer.memoryStorage();
  const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // --- Middleware ---
  
  const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = payload;
    next();
  };

  const authorize = (roles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      next();
    };
  };

  // --- API Routes ---

  // Health check — used to verify Passenger/Node.js is running (not serving static files)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', env: process.env.APP_ENV || process.env.NODE_ENV || 'unknown', version: '2.0.0' });
  });

  // Auth Endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };
      const result = await AuthService.login(email, password, deviceInfo);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: AuthRequest, res) => {
    try {
      // Use $queryRaw for core fields — avoids schema-version errors on cPanel
      // where `theme` column may not yet exist.
      const rows = await prisma.$queryRaw<Array<{
        id: string; email: string; name: string; role: string;
        avatarUrl: string | null; createdAt: Date;
      }>>`SELECT id, email, name, role, "avatarUrl", "createdAt" FROM "User" WHERE id = ${req.user!.userId} LIMIT 1`;

      if (!rows[0]) return res.status(404).json({ error: 'User not found' });

      // Fetch theme separately with fallback
      let theme = 'light';
      try {
        const themeRows = await prisma.$queryRaw<Array<{ theme: string }>>`
          SELECT theme FROM "User" WHERE id = ${req.user!.userId} LIMIT 1
        `;
        theme = themeRows[0]?.theme ?? 'light';
      } catch { /* theme column missing — use default */ }

      res.json({ ...rows[0], theme });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.patch('/api/auth/preferences', authenticate, async (req: AuthRequest, res) => {
    try {
      const { theme } = req.body;
      if (!['light', 'dark'].includes(theme)) return res.status(400).json({ error: 'Invalid theme value' });
      try {
        await prisma.$executeRaw`UPDATE "User" SET theme = ${theme} WHERE id = ${req.user!.userId}`;
        res.json({ id: req.user!.userId, theme });
      } catch {
        // theme column missing — acknowledge gracefully without crashing
        res.json({ id: req.user!.userId, theme });
      }
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/auth/change-password — authenticated password change
  app.post('/api/auth/change-password', authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Password saat ini dan password baru wajib diisi.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Password baru minimal 8 karakter.' });
      }
      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ message: 'Password baru harus mengandung huruf besar, huruf kecil, dan angka.' });
      }
      const rows = await prisma.$queryRaw<Array<{ password: string }>>`
        SELECT password FROM "User" WHERE id = ${req.user!.userId} LIMIT 1
      `;
      if (!rows[0]) return res.status(404).json({ message: 'User tidak ditemukan.' });
      const { AuthService } = await import('./src/services/auth');
      const valid = await AuthService.verifyPassword(currentPassword, rows[0].password);
      if (!valid) {
        return res.status(401).json({ message: 'Password saat ini tidak sesuai.' });
      }
      const hashed = await AuthService.hashPassword(newPassword);
      await prisma.$executeRaw`UPDATE "User" SET password = ${hashed}, "updatedAt" = NOW() WHERE id = ${req.user!.userId}`;
      logger.info('AUTH', `Password changed for user ${req.user!.userId}`);
      return res.json({ success: true, message: 'Password berhasil diubah.' });
    } catch (err: any) {
      logger.info('AUTH', `change-password error: ${err.message}`);
      return res.status(500).json({ message: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
  });

  // ── OTP / Forgot Password Routes ─────────────────────────────────

  // POST /api/auth/forgot-password — request OTP
  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email wajib diisi.' });
      }
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'];
      const result = await OTPService.requestOTP({ email: email.trim(), ip, userAgent });
      return res.status(result.success ? 200 : 429).json(result);
    } catch (err: any) {
      console.error('[OTP] forgot-password error:', err.message);
      return res.status(500).json({ message: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
  });

  // POST /api/auth/verify-otp — verify OTP, get reset token
  app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: 'Email dan kode OTP wajib diisi.' });
      }
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'];
      const result = await OTPService.verifyOTP({ email: email.trim(), otp: String(otp).trim(), ip, userAgent });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      console.error('[OTP] verify-otp error:', err.message);
      return res.status(500).json({ message: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
  });

  // POST /api/auth/reset-password — set new password using reset token
  app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, resetToken, newPassword } = req.body;
      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ message: 'Semua field wajib diisi.' });
      }
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
      const userAgent = req.headers['user-agent'];
      const result = await OTPService.resetPassword({ email: email.trim(), resetToken, newPassword, ip, userAgent });
      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      console.error('[OTP] reset-password error:', err.message);
      return res.status(500).json({ message: 'Terjadi kesalahan sistem. Coba lagi.' });
    }
  });

  // GET /api/auth/security-logs — admin security monitoring (SUPER_ADMIN only)
  app.get('/api/auth/security-logs', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await OTPService.getSecurityLogs(limit);
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: 'Gagal memuat log keamanan.' });
    }
  });
  
  // NOTE: full /api/classes CRUD is defined after intelligence routes below

  // Student SIS Endpoints
  app.get('/api/students', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH, Role.GURU]), async (req: AuthRequest, res) => {
    try {
      const { search, majorId, classId, status, page, limit, includeDeleted } = req.query;
      const students = await StudentService.getAll({
        search: search as string,
        majorId: majorId as string,
        classId: classId as string,
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        includeDeleted: includeDeleted === 'true',
      });
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });

  app.get('/api/students/:id', authenticate, async (req, res) => {
    try {
      const student = await StudentService.getById(req.params.id);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch student details' });
    }
  });

  app.post('/api/students', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const student = await StudentService.create(req.body);
      res.json(student);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/students/bulk-template — download Excel import template
  app.get('/api/students/bulk-template', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (_req, res) => {
    try {
      const ExcelJS = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'OSDAI';
      const ws = wb.addWorksheet('Import Siswa');

      // Column widths & headers
      ws.columns = [
        { header: 'Nama', key: 'nama', width: 30 },
        { header: 'NIS', key: 'nis', width: 15 },
        { header: 'Password', key: 'password', width: 20 },
        { header: 'Kelas', key: 'kelas', width: 12 },
      ];

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFEBEBE8' } },
        };
      });
      headerRow.height = 24;

      // Example rows
      const examples = [
        { nama: 'Budi Santoso', nis: '2024001', password: 'Budi2024!', kelas: 'XAKL' },
        { nama: 'Siti Rahayu', nis: '2024002', password: 'Siti2024!', kelas: 'XIPM' },
        { nama: 'Andi Pratama', nis: '2024003', password: 'Andi2024!', kelas: 'XIIMPLB' },
      ];
      examples.forEach((ex, i) => {
        const row = ws.addRow(ex);
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFAFAF9' : 'FFFFFFFF' } };
          cell.alignment = { vertical: 'middle' };
        });
        row.height = 20;
      });

      // Info sheet
      const ws2 = wb.addWorksheet('Panduan');
      ws2.getColumn(1).width = 60;
      [
        ['PANDUAN IMPORT SISWA MASSAL - OSDAI'],
        [''],
        ['Kolom yang tersedia:'],
        ['  Nama     : Nama lengkap siswa (wajib)'],
        ['  NIS      : Nomor Induk Siswa, harus unik (wajib)'],
        ['  Password : Password login siswa (wajib, min 6 karakter)'],
        ['  Kelas    : Kode kelas (wajib, lihat contoh di bawah)'],
        [''],
        ['Format kode Kelas:'],
        ['  X   = Kelas 10  → contoh: XAKL, XPM, XTBS'],
        ['  XI  = Kelas 11  → contoh: XIAKL, XIPM, XIMPLB'],
        ['  XII = Kelas 12  → contoh: XIIAKL, XIIPM, XIIMPLB'],
        [''],
        ['Kode Jurusan yang tersedia:'],
        ['  AKL   = Akuntansi dan Keuangan Lembaga'],
        ['  MPLB  = Manajemen Perkantoran dan Layanan Bisnis'],
        ['  PM    = Pemasaran'],
        ['  TB    = Tata Busana'],
        ['  TBS   = Tata Boga dan Sanitasi'],
        [''],
        ['Catatan:'],
        ['  - Email & NISN dibuat otomatis dari NIS'],
        ['  - NIS harus unik, tidak boleh duplikat'],
        ['  - Baris kosong akan dilewati otomatis'],
      ].forEach(([text], i) => {
        const cell = ws2.getCell(`A${i + 1}`);
        cell.value = text || '';
        if (i === 0) cell.font = { bold: true, size: 13 };
        else if (text?.startsWith('Kolom') || text?.startsWith('Format') || text?.startsWith('Kode') || text?.startsWith('Catatan')) {
          cell.font = { bold: true };
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="template_import_siswa.xlsx"');
      await wb.xlsx.write(res);
      res.end();
    } catch (err: any) {
      logger.info('BULK', `Template error: ${err.message}`);
      res.status(500).json({ error: 'Gagal membuat template.' });
    }
  });

  // POST /api/students/bulk-upload — import students from Excel
  app.post('/api/students/bulk-upload', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan. Pilih file .xlsx terlebih dahulu.' });

      const ExcelJS = await import('exceljs');
      const bcrypt = await import('bcryptjs');

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(req.file.buffer);
      const ws = wb.worksheets[0];
      if (!ws) return res.status(400).json({ error: 'Sheet tidak ditemukan dalam file Excel.' });

      // Load all classes with majors for matching
      const allClasses = await prisma.class.findMany({ include: { major: true } });

      // Build lookup: normalizedKey → classId
      // "XAKL" → {grade:10, majorCode:"AKL"} → find class
      function parseKelas(raw: string): { grade: number; majorCode: string } | null {
        const s = raw.trim().toUpperCase().replace(/\s+/g, '');
        if (s.startsWith('XII')) return { grade: 12, majorCode: s.slice(3) };
        if (s.startsWith('XI'))  return { grade: 11, majorCode: s.slice(2) };
        if (s.startsWith('X'))   return { grade: 10, majorCode: s.slice(1) };
        return null;
      }

      function findClass(kelas: string) {
        // Try grade+major code match first
        const parsed = parseKelas(kelas);
        if (parsed) {
          const match = allClasses.find(c =>
            c.grade === parsed.grade &&
            c.major?.code?.toUpperCase() === parsed.majorCode
          );
          if (match) return match;
        }
        // Fallback: normalize class name directly
        const norm = kelas.toUpperCase().replace(/\s+/g, '');
        return allClasses.find(c => c.name.toUpperCase().replace(/\s+/g, '') === norm) || null;
      }

      const rows: Array<{ row: number; nama: string; nis: string; status: 'success' | 'error'; message?: string }> = [];
      let success = 0;
      let failed = 0;
      let dataRowIndex = 0;

      ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (rowNum === 1) return; // Skip header

        const vals = row.values as any[];
        const nama     = String(vals[1] ?? '').trim();
        const nis      = String(vals[2] ?? '').trim();
        const password = String(vals[3] ?? '').trim();
        const kelas    = String(vals[4] ?? '').trim();

        if (!nama && !nis) return; // skip blank rows

        rows.push({ row: rowNum, nama, nis, status: 'error', message: '' });
      });

      // Process each row
      for (const entry of rows) {
        const rowData = ws.getRow(entry.row).values as any[];
        const nama     = String(rowData[1] ?? '').trim();
        const nis      = String(rowData[2] ?? '').trim();
        const password = String(rowData[3] ?? '').trim();
        const kelas    = String(rowData[4] ?? '').trim();

        // Validation
        if (!nama) { entry.status = 'error'; entry.message = 'Nama wajib diisi.'; failed++; continue; }
        if (!nis)  { entry.status = 'error'; entry.message = 'NIS wajib diisi.'; failed++; continue; }
        if (!password || password.length < 6) { entry.status = 'error'; entry.message = 'Password minimal 6 karakter.'; failed++; continue; }
        if (!kelas) { entry.status = 'error'; entry.message = 'Kelas wajib diisi.'; failed++; continue; }

        const cls = findClass(kelas);
        if (!cls) {
          entry.status = 'error';
          entry.message = `Kelas "${kelas}" tidak ditemukan. Gunakan format seperti XAKL, XIPM, XIIMPLB.`;
          failed++;
          continue;
        }

        const email = `${nis.toLowerCase()}@siswa.osdai.id`;
        const nisn  = nis.length >= 10 ? nis : nis.padStart(10, '0');

        try {
          const hashedPwd = await bcrypt.hash(password, 10);
          await prisma.$transaction(async (tx) => {
            // Check duplicates
            const dupUser = await tx.user.findUnique({ where: { email } });
            if (dupUser) throw new Error(`Email ${email} sudah terdaftar.`);

            const dupNis = await tx.student.findFirst({ where: { nis } });
            if (dupNis) throw new Error(`NIS ${nis} sudah terdaftar.`);

            const dupNisn = await tx.student.findFirst({ where: { nisn } });
            if (dupNisn) throw new Error(`NISN ${nisn} sudah digunakan.`);

            const user = await tx.user.create({
              data: { name: nama, email, password: hashedPwd, role: 'SISWA' },
            });

            await tx.student.create({
              data: { userId: user.id, nis, nisn, classId: cls.id, status: 'ACTIVE' },
            });

            await tx.auditLog.create({
              data: {
                userId: req.user!.userId,
                action: 'CREATE',
                entity: 'Student',
                entityId: user.id,
                newValue: JSON.stringify({ nama, nis, kelas }),
              },
            });
          });

          entry.status = 'success';
          success++;
        } catch (err: any) {
          entry.status = 'error';
          entry.message = err.message || 'Gagal menyimpan data siswa.';
          failed++;
        }
      }

      return res.json({ total: rows.length, success, failed, rows });
    } catch (err: any) {
      logger.info('BULK', `Upload error: ${err.message}`);
      return res.status(500).json({ error: 'Gagal memproses file. Pastikan format file sesuai template.' });
    }
  });

  app.patch('/api/students/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const student = await StudentService.update(req.params.id, req.body, req.user!.userId);
      res.json(student);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/students/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      await StudentService.archive(req.params.id, req.user!.userId);
      res.json({ message: 'Student archived successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/students/:id/restore', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      await StudentService.restore(req.params.id, req.user!.userId);
      res.json({ message: 'Student restored successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Teacher Management Endpoints
  app.get('/api/teachers', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH, Role.BENDAHARA]), async (req: AuthRequest, res) => {
    try {
      const { search, department, status, page, limit, includeDeleted } = req.query;
      const teachers = await TeacherService.getAll({
        search: search as string,
        department: department as string,
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        includeDeleted: includeDeleted === 'true',
      });
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch teachers' });
    }
  });

  app.get('/api/teachers/:id', authenticate, async (req, res) => {
    try {
      const teacher = await TeacherService.getById(req.params.id);
      if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch teacher details' });
    }
  });

  app.post('/api/teachers', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const teacher = await TeacherService.create(req.body);
      res.json(teacher);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/teachers/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const teacher = await TeacherService.update(req.params.id, req.body, req.user!.userId);
      res.json(teacher);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/teachers/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      await TeacherService.archive(req.params.id, req.user!.userId);
      res.json({ message: 'Teacher archived successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/teachers/:id/restore', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      await TeacherService.restore(req.params.id, req.user!.userId);
      res.json({ message: 'Teacher restored successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Subject & Major Endpoints
  app.get('/api/majors', authenticate, async (req, res) => {
    try {
      const majors = await MajorService.getAll();
      res.json(majors);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch majors' });
    }
  });

  app.get('/api/subjects', authenticate, async (req, res) => {
    try {
      const { search, type, majorId } = req.query;
      const subjects = await SubjectService.getAll({
        search: search as string,
        type: type as any,
        majorId: majorId as string,
      });
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  });

  app.post('/api/subjects', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const subject = await SubjectService.create(req.body);
      res.json(subject);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/subjects/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const subject = await SubjectService.update(req.params.id, req.body);
      res.json(subject);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/subjects/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      await SubjectService.delete(req.params.id);
      res.json({ message: 'Subject deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Timetable Engine Endpoints
  app.get('/api/timetable', authenticate, async (req, res) => {
    try {
      const { classId, teacherId, roomId } = req.query;
      const schedule = await TimetableService.getSchedule(
        classId as string,
        teacherId as string,
        roomId as string
      );
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch timetable' });
    }
  });

  app.post('/api/timetable/generate', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const { academicYearId } = req.body;
      if (!academicYearId) return res.status(400).json({ error: 'Academic Year ID is required' });
      const result = await TimetableService.solve(academicYearId);
      res.json({ message: 'Timetable generated successfully', result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/timetable/:id/move', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { day, periodStart } = req.body;
      const updated = await TimetableService.moveLesson(req.params.id, day, periodStart);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Timetable Ingestion Endpoints
  app.post('/api/timetable/upload', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), upload.array('files'), async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

      const results = [];
      for (const file of files) {
        const checksum = createHash('sha256').update(file.buffer).digest('hex');
        
        // Use findFirst instead of findUnique since checksum is not unique in schema yet
        const existing = await prisma.uploadedFile.findFirst({ where: { checksumSha256: checksum } });
        if (existing) {
          results.push({ filename: file.originalname, status: 'EXISTS', id: existing.id });
          continue;
        }

        const uploadedFile = await prisma.uploadedFile.create({
          data: {
            filename: file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            checksumSha256: checksum,
            uploadStatus: 'PENDING',
            uploadedBy: req.user!.userId,
          }
        });

        // Trigger processing
        TimetableIngestionService.processUpload(uploadedFile.id, req.user!.userId).catch(console.error);

        results.push({ filename: file.originalname, status: 'UPLOADING', id: uploadedFile.id });
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/timetable/uploads', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const uploads = await prisma.uploadedFile.findMany({
        orderBy: { uploadedAt: 'desc' },
        include: { _count: { select: { stagingRecords: true } } }
      });
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch uploads' });
    }
  });

  app.get('/api/timetable/staging/:uploadId', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const staging = await prisma.importedScheduleStaging.findMany({
        where: { uploadId: req.params.uploadId },
        include: { conflicts: true }
      });
      res.json(staging);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch staging records' });
    }
  });

  // Preflight: check if demo version is active before committing a new CSV
  app.post('/api/timetable/commit/preflight', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { uploadId, academicYearId } = req.body;
      if (!uploadId || !academicYearId) return res.status(400).json({ error: 'uploadId and academicYearId required' });
      const result = await TimetableIngestionService.commitPreflight(uploadId, academicYearId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/timetable/commit', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const { uploadId, academicYearId } = req.body;
      const result = await TimetableIngestionService.commitToProduction(uploadId, academicYearId, req.user!.userId);
      res.json({ message: 'Timetable committed successfully', result });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/timetable/export/excel', authenticate, async (req, res) => {
    try {
      const { classId } = req.query;
      const buffer = await TimetableExportService.exportToExcel(classId as string);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=timetable-${classId}.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/timetable/export/pdf', authenticate, async (req, res) => {
    try {
      const { classId } = req.query;
      const buffer = await TimetableExportService.exportToPdf(classId as string);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=timetable-${classId}.pdf`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Rooms Endpoint
  app.get('/api/rooms', authenticate, async (_req, res) => {
    try {
      const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Timetable CRUD — Create & Delete individual schedule entries
  app.post('/api/timetable', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { day, periodStart, periodEnd, teacherId, subjectId, roomId, classId } = req.body;
      if (!day || !periodStart || !teacherId || !subjectId || !roomId || !classId) {
        return res.status(400).json({ error: 'Semua field wajib diisi (day, periodStart, teacherId, subjectId, roomId, classId).' });
      }
      // Conflict check
      const conflict = await prisma.schedule.findFirst({
        where: {
          day: Number(day),
          periodStart: Number(periodStart),
          deletedAt: null,
          OR: [
            { teacherId },
            { roomId },
            { classId },
          ],
        },
        include: { subject: true, teacher: { include: { user: true } }, class: true }
      });
      if (conflict) {
        const who = conflict.teacherId === teacherId ? `Guru (${conflict.teacher?.user?.name})` :
                    conflict.roomId === roomId ? `Ruangan (${conflict.roomId})` :
                    `Kelas (${conflict.class?.name})`;
        return res.status(409).json({ error: `Konflik jadwal: ${who} sudah dijadwalkan di slot ini (${conflict.subject?.name}).` });
      }
      const schedule = await prisma.schedule.create({
        data: {
          day: Number(day),
          periodStart: Number(periodStart),
          periodEnd: Number(periodEnd || periodStart),
          teacherId,
          subjectId,
          roomId,
          classId,
        },
        include: { subject: true, teacher: { include: { user: true } }, room: true, class: true }
      });
      res.status(201).json(schedule);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/timetable/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      await prisma.schedule.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Announcements Endpoints
  app.get('/api/announcements', authenticate, async (_req, res) => {
    try {
      const docs = await prisma.digitalDocument.findMany({
        where: { category: 'PENGUMUMAN', isArchived: false },
        include: { uploader: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/announcements', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req: AuthRequest, res) => {
    try {
      const { title, targets } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'Judul pengumuman wajib diisi.' });
      const refNo = `PGM-${Date.now()}`;
      const doc = await prisma.digitalDocument.create({
        data: {
          title: title.trim(),
          category: 'PENGUMUMAN',
          fileUrl: '#',
          metadata: JSON.stringify({ targets: targets || [] }),
          referenceNo: refNo,
          qrCode: buildQrUrl(refNo),
          uploaderId: req.user!.userId,
        }
      });
      res.status(201).json(doc);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Surat Digital Endpoints
  app.get('/api/surat', authenticate, async (req, res) => {
    try {
      const { category } = req.query;
      const suratCategories = ['SURAT_MASUK', 'SURAT_KELUAR', 'SURAT_EDARAN', 'SK'];
      const docs = await prisma.digitalDocument.findMany({
        where: {
          isArchived: false,
          category: category ? String(category) : { in: suratCategories },
        },
        include: { uploader: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/surat', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req: AuthRequest, res) => {
    try {
      const { title, category, fileUrl, referenceNo } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'Perihal/judul surat wajib diisi.' });
      const refNo = referenceNo?.trim() || `${category?.split('_')[1] || 'DOC'}-${Date.now()}`;
      const doc = await prisma.digitalDocument.create({
        data: {
          title: title.trim(),
          category: category || 'SURAT_KELUAR',
          fileUrl: fileUrl?.trim() || '#',
          referenceNo: refNo,
          qrCode: buildQrUrl(refNo),
          uploaderId: req.user!.userId,
        }
      });
      res.status(201).json(doc);
    } catch (error: any) {
      if ((error as any).code === 'P2002') {
        return res.status(409).json({ error: 'Nomor surat sudah digunakan. Gunakan nomor berbeda.' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/surat/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      await prisma.digitalDocument.update({
        where: { id: req.params.id },
        data: { isArchived: true }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Archive delete
  app.delete('/api/archive/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      await prisma.digitalDocument.update({
        where: { id: req.params.id },
        data: { isArchived: true }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Analytics Endpoints
  app.get('/api/analytics/risk-students', authenticate, authorize([Role.SUPER_ADMIN, Role.BK, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      // Risk scoring: uses BOTH real-time StudentAttendance (primary) and legacy Attendance (fallback)
      const students = await prisma.student.findMany({
        include: {
          user: true,
          class: true,
          attendance: true,
          studentAttendances: true,
          grades: true
        }
      });

      const riskStudents = students.map(s => {
        // Prefer real-time studentAttendances; fall back to legacy attendance
        let attendanceRate = 100;
        if (s.studentAttendances.length > 0) {
          const hadirCount = s.studentAttendances.filter(
            a => a.attendanceStatus === 'HADIR' || a.attendanceStatus === 'TERLAMBAT'
          ).length;
          attendanceRate = (hadirCount / s.studentAttendances.length) * 100;
        } else if (s.attendance.length > 0) {
          const presentCount = s.attendance.filter(a => a.status === 'PRESENT').length;
          attendanceRate = (presentCount / s.attendance.length) * 100;
        }

        const alfaCount = s.studentAttendances.filter(a => a.attendanceStatus === 'ALFA').length;
        const invalidCount = s.studentAttendances.filter(a => a.attendanceStatus === 'INVALID').length;

        const avgGrade = s.grades.length > 0
          ? s.grades.reduce((acc, curr) => acc + Number(curr.value), 0) / s.grades.length
          : 0;

        let riskScore = 0;
        if (attendanceRate < 75) riskScore += 40;
        if (attendanceRate < 50) riskScore += 30;
        if (alfaCount >= 5)      riskScore += 15;
        if (invalidCount >= 3)   riskScore += 15;
        if (avgGrade < 60)       riskScore += 30;

        return {
          id: s.id,
          name: s.user.name,
          class: s.class?.name,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          avgGrade: Math.round(avgGrade * 10) / 10,
          alfaCount,
          invalidCount,
          riskScore: Math.min(100, riskScore),
          status: riskScore > 60 ? 'HIGH RISK' : riskScore > 30 ? 'MEDIUM RISK' : 'LOW RISK',
          attendanceSource: s.studentAttendances.length > 0 ? 'REALTIME' : 'LEGACY'
        };
      }).filter(s => s.riskScore > 30).sort((a, b) => b.riskScore - a.riskScore);

      res.json(riskStudents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/analytics/overall-stats', authenticate, authorize([Role.SUPER_ADMIN, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const [studentCount, teacherCount, activeClasses, totalRevenue] = await Promise.all([
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.teacher.count({ where: { status: 'ACTIVE' } }),
        prisma.class.count(),
        prisma.transaction.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true }
        })
      ]);

      // Daily attendance — uses BOTH real-time StudentAttendance (primary) + legacy groupBy (secondary)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [realtimeSummary, legacySummary] = await Promise.all([
        prisma.studentAttendance.groupBy({
          by: ['attendanceStatus'],
          where: { timestamp: { gte: today } },
          _count: true
        }),
        prisma.attendance.groupBy({
          by: ['status'],
          where: { timestamp: { gte: today } },
          _count: true
        })
      ]);

      // Prefer real-time data; fall back to legacy if school hasn't used sessions today
      const useRealtime = realtimeSummary.length > 0;
      const attendanceSummary = useRealtime
        ? realtimeSummary.map(r => ({ status: r.attendanceStatus, _count: r._count }))
        : legacySummary;

      res.json({
        studentCount,
        teacherCount,
        activeClasses,
        revenue: totalRevenue._sum.amount || 0,
        attendance: attendanceSummary,
        attendanceSource: useRealtime ? 'REALTIME' : 'LEGACY'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/analytics/teacher-performance', authenticate, authorize([Role.SUPER_ADMIN, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: true,
          courses: {
            include: {
              class: true,
              subject: true
            }
          }
        }
      });

      const performance = teachers.map(t => ({
        id: t.id,
        name: t.user.name,
        load: t.courses.length,
        subjects: t.courses.map(c => c.subject.name),
        // simplified KPI
        kpi: Math.floor(Math.random() * 20) + 80 
      }));

      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get('/api/lms/course/:courseId', authenticate, async (req, res) => {
    try {
      const result = await LMSService.getCourseContent(req.params.courseId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/materials', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req, res) => {
    try {
      const result = await LMSService.createMaterial(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/assignments', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req, res) => {
    try {
      const result = await LMSService.createAssignment(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/submissions', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user?.userId } });
      if (!student) return res.status(404).json({ error: 'Student profile not found' });
      const result = await LMSService.submitAssignment({ ...req.body, studentId: student.id });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/submissions/:id/grade', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req, res) => {
    try {
      const { value, feedback } = req.body;
      const result = await LMSService.gradeSubmission(req.params.id, value, feedback);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/quizzes', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req, res) => {
    try {
      const result = await LMSService.createQuiz(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/quizzes/:id/start', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user?.userId } });
      if (!student) return res.status(404).json({ error: 'Student profile not found' });
      const result = await LMSService.startQuizAttempt(req.params.id, student.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/attempts/:id/submit', authenticate, authorize([Role.SISWA]), async (req, res) => {
    try {
      const result = await LMSService.submitQuizAttempt(req.params.id, req.body.answers);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/lms/discussions', authenticate, async (req: AuthRequest, res) => {
    try {
      const { courseId, content, parentId } = req.body;
      const result = await LMSService.postDiscussion(courseId, req.user!.userId, content, parentId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/lms/courses', authenticate, async (req: AuthRequest, res) => {
    try {
      const { role, userId } = req.user!;
      let where: any = {};
      if (role === Role.SISWA) {
          const student = await prisma.student.findUnique({ where: { userId } });
          if (student?.classId) where.classId = student.classId;
      } else if (role === Role.GURU) {
          const teacher = await prisma.teacher.findUnique({ where: { userId } });
          if (teacher) where.teacherId = teacher.id;
      }
      
      const courses = await prisma.course.findMany({
        where,
        include: { subject: true, class: true, teacher: { include: { user: true } } }
      });
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Parent Mobile App Endpoints
  app.get('/api/parent/children', authenticate, authorize([Role.ORANG_TUA]), async (req: AuthRequest, res) => {
      try {
          const children = await ParentService.getChildren(req.user!.userId);
          res.json(children);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.get('/api/parent/child/:studentId/attendance', authenticate, authorize([Role.ORANG_TUA]), async (req, res) => {
      try {
          const attendance = await ParentService.getChildAttendance(req.params.studentId);
          res.json(attendance);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  app.get('/api/parent/child/:studentId/grades', authenticate, authorize([Role.ORANG_TUA]), async (req, res) => {
    try {
        const grades = await ParentService.getChildGrades(req.params.studentId);
        res.json(grades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/parent/child/:studentId/finance', authenticate, authorize([Role.ORANG_TUA]), async (req, res) => {
    try {
        const finance = await ParentService.getChildFinance(req.params.studentId);
        res.json(finance);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/parent/notifications', authenticate, authorize([Role.ORANG_TUA]), async (req: AuthRequest, res) => {
      try {
          const notifications = await ParentService.getNotifications(req.user!.userId);
          res.json(notifications);
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  // Inventory Endpoints
  app.get('/api/inventory', authenticate, async (req, res) => {
    try {
      const items = await InventoryService.getAllItems();
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/inventory', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const item = await InventoryService.createItem(req.body);
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Archive & Digital Surat Endpoints
  app.get('/api/archive', authenticate, async (req, res) => {
    try {
      const docs = await DocumentService.getArchive(req.query.category as string);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/archive/upload', authenticate, async (req: AuthRequest, res) => {
    try {
      const doc = await DocumentService.uploadDocument({ ...req.body, uploaderId: req.user!.userId });
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GPS Integrity Endpoints
  app.post('/api/gps/log', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
      if (!student) return res.status(404).json({ error: 'Student profile not found' });

      const validation = await GpsService.validateGeofenceAsync(req.body.lat, req.body.lng);
      const log = await GpsService.logLocation(student.id, req.body);

      res.json({ log, validation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GPS Geofence Config ──────────────────────────────────────────────────────

  app.get('/api/gps/geofence', authenticate, async (_req, res) => {
    try {
      const config = await GpsService.getGeofenceDetail();
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/gps/geofence', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req: AuthRequest, res) => {
    try {
      const { name, latitude, longitude, radiusMeters, description, reason } = req.body;
      if (!latitude || !longitude || !radiusMeters) {
        return res.status(400).json({ error: 'latitude, longitude, dan radiusMeters wajib diisi' });
      }
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = parseInt(radiusMeters, 10);
      if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        return res.status(400).json({ error: 'Nilai koordinat tidak valid' });
      }
      if (lat < -90 || lat > 90) return res.status(400).json({ error: 'Latitude harus antara -90 dan 90' });
      if (lng < -180 || lng > 180) return res.status(400).json({ error: 'Longitude harus antara -180 dan 180' });
      if (radius < 10 || radius > 10000) return res.status(400).json({ error: 'Radius harus antara 10 dan 10000 meter' });

      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { name: true } });
      const result = await GpsService.saveGeofence({
        name: name || 'SMKN 1 Wonogiri',
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        description,
        reason,
        changedBy: req.user!.userId,
        changedByName: user?.name,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gps/geofence/history', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit || '100'), 10);
      const history = await GpsService.getChangeHistory(limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── GPS Integrity Reports ────────────────────────────────────────────────────

  app.get('/api/gps/reports', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH, Role.BK, Role.SATPAM]), async (req, res) => {
    try {
      const { dateFrom, dateTo, studentId, classId, isMock, page, limit } = req.query;
      const result = await GpsService.getIntegrityLogs({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        studentId: studentId as string,
        classId: classId as string,
        isMock: isMock !== undefined ? isMock === 'true' : undefined,
        page: page ? parseInt(String(page), 10) : 1,
        limit: limit ? parseInt(String(limit), 10) : 50,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gps/reports/summary', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH, Role.BK]), async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const summary = await GpsService.getIntegritySummary(dateFrom as string, dateTo as string);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gps/reports/export', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const { dateFrom, dateTo, studentId, classId, isMock } = req.query;
      const result = await GpsService.getIntegrityLogs({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        studentId: studentId as string,
        classId: classId as string,
        isMock: isMock !== undefined ? isMock === 'true' : undefined,
        page: 1,
        limit: 5000,
      });

      const geofence = await GpsService.getActiveGeofence();
      const headers = ['No', 'Nama Siswa', 'Kelas', 'Timestamp', 'Latitude', 'Longitude', 'Akurasi (m)', 'Jarak ke Sekolah (m)', 'Di Dalam Radius', 'Mock GPS', 'Info Perangkat'];
      const rows = result.logs.map((l: any, i: number) => [
        i + 1,
        l.student?.user?.name || l.studentId,
        l.student?.class?.name || '-',
        new Date(l.timestamp).toLocaleString('id-ID'),
        l.lat,
        l.lng,
        l.accuracy,
        l.distance,
        l.isInside ? 'YA' : 'TIDAK',
        l.isMock ? 'YA' : 'TIDAK',
        l.deviceInfo || '-',
      ]);

      const csv = [
        `# LAPORAN INTEGRITAS GPS - OSDAI v2.0`,
        `# SMK Negeri 1 Wonogiri`,
        `# Dicetak: ${new Date().toLocaleString('id-ID')}`,
        `# Geofence Aktif: ${geofence.name} | Radius: ${geofence.radius}m`,
        `# Total Data: ${result.total}`,
        '',
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="laporan-gps-${Date.now()}.csv"`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Financial Endpoints
  app.post('/api/finance/spp/generate', authenticate, authorize([Role.SUPER_ADMIN, Role.BENDAHARA]), async (req, res) => {
    try {
      const { month, year, academicYearId } = req.body;
      const result = await FinanceService.generateMonthlySPP(month, year, academicYearId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/finance/invoices', authenticate, async (req: AuthRequest, res) => {
    try {
      const { studentId, status } = req.query;
      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (status) where.status = status;
      
      // If student, only show their own invoices
      if (req.user?.role === Role.SISWA) {
          const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
          if (student) where.studentId = student.id;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: { student: { include: { user: true, class: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/finance/pay', authenticate, async (req, res) => {
    try {
      const { invoiceId } = req.body;
      const result = await FinanceService.createPaymentSession(invoiceId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/finance/webhook/midtrans', async (req, res) => {
    try {
      await FinanceService.handleWebhook(req.body);
      res.json({ status: 'OK' });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).send('Internal Error');
    }
  });

  app.get('/api/finance/report', authenticate, authorize([Role.SUPER_ADMIN, Role.BENDAHARA]), async (req, res) => {
    try {
      const { start, end } = req.query;
      const result = await FinanceService.getFinancialReport(new Date(start as string), new Date(end as string));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/finance/receipt/:invoiceId', authenticate, async (req, res) => {
    try {
      const buffer = await FinanceService.exportReceipt(req.params.invoiceId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=receipt-${req.params.invoiceId}.pdf`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/finance/accounts/init', authenticate, authorize([Role.SUPER_ADMIN]), async (req, res) => {
      try {
          const accounts = [
              { code: '101', name: 'Kas/Bank', type: 'ASSET' },
              { code: '401', name: 'Pendapatan SPP', type: 'INCOME' },
              { code: '402', name: 'Pendapatan Uang Bangunan', type: 'INCOME' }
          ];

          for (const acc of accounts) {
              await prisma.financialAccount.upsert({
                  where: { code: acc.code },
                  update: {},
                  create: acc
              });
          }
          res.json({ status: 'Accounts Initialized' });
      } catch (error: any) {
          res.status(500).json({ error: error.message });
      }
  });

  // --- Intelligence Endpoints ---

  // ACTIVATE signal — teacher identity always from JWT, never from body
  app.post('/api/intelligence/signal/activate', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req: AuthRequest, res) => {
    try {
      // SUPER_ADMIN can pass teacherId explicitly; regular GURU resolved from JWT
      let teacher;
      if (req.user!.role === Role.SUPER_ADMIN && req.body.teacherId) {
        teacher = await prisma.teacher.findUnique({ where: { id: req.body.teacherId } });
      } else {
        teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      }
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan. SUPER_ADMIN harus menyertakan teacherId dalam body request.' });
      const session = await IntelligenceService.activateSignal(
        teacher.id,
        req.body.classId,
        req.body.subjectId,
        req.body.scheduleId
      );
      // Notify all connected clients that a new session has been opened
      io.emit('session-opened', {
        sessionId: session.id,
        classId: session.classId,
        subjectName: (session as any).subject?.name ?? '',
        teacherName: (session as any).teacher?.user?.name ?? '',
      });
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // CLOSE signal — only the owning teacher can close; auto-marks absent as ALFA
  app.post('/api/intelligence/signal/close', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req: AuthRequest, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
      const session = await IntelligenceService.closeSignal(req.body.sessionId, teacher.id);
      // Notify all clients in the session room that it is now closed
      io.to(`session-${req.body.sessionId}`).emit('session-closed', { sessionId: req.body.sessionId });
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // STUDENT RESPOND — validates session token + class membership + GPS + duplicate
  app.post('/api/intelligence/respond', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
      if (!student) return res.status(404).json({ error: 'Profil siswa tidak ditemukan.' });
      if (!req.body.sessionToken) return res.status(400).json({ error: 'Token sesi wajib diisi.' });

      const result = await IntelligenceService.respondToSignal(
        student.id,
        req.user!.userId,
        req.body.sessionId,
        req.body
      );

      if (result.status === 'SUCCESS') {
        io.to(`session-${req.body.sessionId}`).emit('attendance-update', result.attendance);
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET active session for the authenticated student's class
  app.get('/api/intelligence/active-session', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
      if (!student) return res.status(404).json({ error: 'Profil siswa tidak ditemukan.' });
      const session = await IntelligenceService.getActiveSessionForStudent(student.id);
      if (!session) return res.status(204).end();
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET student's own attendance history
  app.get('/api/intelligence/my-history', authenticate, authorize([Role.SISWA]), async (req: AuthRequest, res) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } });
      if (!student) return res.status(404).json({ error: 'Profil siswa tidak ditemukan.' });
      const history = await IntelligenceService.getStudentHistory(student.id, 20);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET active sessions for the current GURU (so teacher can resume a session)
  app.get('/api/intelligence/my-sessions', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
      const sessions = await prisma.classSession.findMany({
        where: { teacherId: teacher.id, signalStatus: 'ACTIVE' },
        include: { class: true, subject: true },
        orderBy: { startTime: 'desc' }
      });
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET today's schedule for authenticated teacher — auto-derives class+subject from live timetable
  app.get('/api/intelligence/today-schedule', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });

      const now = new Date();
      // JS getDay(): 0=Sun,1=Mon...6=Sat → DB day: 1=Mon...7=Sun
      const jsDay = now.getDay();
      const dbDay = jsDay === 0 ? 7 : jsDay;

      // Derive current period from TimetableConfig or defaults
      const config = await prisma.timetableConfig.findFirst();
      const startAt = config?.startAt || '07:00';
      const periodDuration = config?.periodDuration || 45;
      const [startH, startM] = startAt.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const currentPeriod = Math.max(1, Math.floor((nowMinutes - startMinutes) / periodDuration) + 1);

      // Find schedule active RIGHT NOW (periodStart <= current <= periodEnd)
      let schedule = await prisma.schedule.findFirst({
        where: {
          teacherId: teacher.id,
          day: dbDay,
          periodStart: { lte: currentPeriod },
          periodEnd: { gte: currentPeriod },
          deletedAt: null,
        },
        include: { class: true, subject: true },
      });

      // Fall back to next upcoming period today
      if (!schedule) {
        schedule = await prisma.schedule.findFirst({
          where: {
            teacherId: teacher.id,
            day: dbDay,
            periodStart: { gt: currentPeriod },
            deletedAt: null,
          },
          include: { class: true, subject: true },
          orderBy: { periodStart: 'asc' },
        });
      }

      // Compute period start time string for display
      const periodStartMin = startMinutes + ((schedule?.periodStart ?? currentPeriod) - 1) * periodDuration;
      const ph = Math.floor(periodStartMin / 60).toString().padStart(2, '0');
      const pm = (periodStartMin % 60).toString().padStart(2, '0');

      res.json({ schedule, currentPeriod, day: dbDay, periodTime: `${ph}:${pm}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TEACHER validates a PENDING student's attendance — only the session owner may validate
  app.post('/api/intelligence/attendance/:id/validate', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      // Fetch the attendance record to verify session ownership
      const record = await prisma.studentAttendance.findUnique({
        where: { id: req.params.id },
        include: { session: true },
      });
      if (!record) return res.status(404).json({ error: 'Catatan absensi tidak ditemukan.' });

      // Non-admin: verify this teacher owns the session
      if (req.user!.role !== Role.SUPER_ADMIN) {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
        if (!teacher || record.session.teacherId !== teacher.id) {
          return res.status(403).json({ error: 'Anda tidak berhak memvalidasi absensi dari sesi ini.' });
        }
      }

      // Compute a dynamic integrity score: base 0.6, +0.2 if GPS valid, +0.2 if not late
      const gpsBonus    = record.gpsValidated ? 0.2 : 0;
      const punctuality = record.responseLatency !== null && record.responseLatency <= 600 ? 0.2 : 0;
      const newScore    = Math.min(1.0, 0.6 + gpsBonus + punctuality);

      const updated = await prisma.studentAttendance.update({
        where: { id: req.params.id },
        data: {
          confirmationStatus: 'CONFIRMED',
          attendanceStatus: 'HADIR',
          integrityScore: newScore,
        },
        include: { student: { include: { user: true } } },
      });
      // Broadcast to the session room so teacher dashboard badge updates in real-time
      io.to(`session-${updated.sessionId}`).emit('attendance-update', updated);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // SEED test accounts — idempotent, safe to call multiple times
  app.post('/api/seed', async (_req, res) => {
    try {
      const accounts = [
        { email: 'superadmin@osdai.id',         password: 'osdai123',    role: Role.SUPER_ADMIN,    name: 'Super Admin OSDAI' },
        { email: 'admin@osdai.id',               password: 'osdai123',    role: Role.TU,             name: 'Admin Tata Usaha OSDAI' },
        { email: 'kepsek@smkn1wonogiri.id',      password: 'wonogiri123', role: Role.KEPALA_SEKOLAH, name: 'Drs. Kepala Sekolah SMKN 1 Wonogiri' },
        { email: 'guru.akl@smkn1wonogiri.id',    password: 'guru123',     role: Role.GURU,           name: 'Budi Santoso, S.Pd' },
        { email: 'siswa.akl1@smkn1wonogiri.id',  password: 'siswa123',    role: Role.SISWA,          name: 'Andi Pratama' },
        { email: 'bendahara@smkn1wonogiri.id',   password: 'osdai123',    role: Role.BENDAHARA,      name: 'Bendahara SMKN 1 Wonogiri' },
        { email: 'bk@smkn1wonogiri.id',          password: 'osdai123',    role: Role.BK,             name: 'Guru BK SMKN 1 Wonogiri' },
      ];
      const results: any[] = [];
      for (const acc of accounts) {
        const existing = await prisma.user.findUnique({ where: { email: acc.email } });
        if (existing) { results.push({ status: 'EXISTS', email: acc.email, role: acc.role }); continue; }
        const { AuthService } = await import('./src/services/auth.js');
        const hashed = await AuthService.hashPassword(acc.password);
        const user = await prisma.user.create({ data: { email: acc.email, password: hashed, role: acc.role, name: acc.name } });
        // Create linked profiles
        if (acc.role === Role.GURU) {
          await prisma.teacher.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, nuptk: `NUPTK-${Date.now()}`, status: 'ACTIVE', department: 'Akuntansi', specialization: 'Akuntansi Dasar' },
          });
        }
        if (acc.role === Role.SISWA) {
          await prisma.student.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, nis: `NIS${Date.now()}`, nisn: `NISN${Date.now()}`, status: 'ACTIVE' },
          });
        }
        results.push({ status: 'CREATED', email: acc.email, role: acc.role });
      }
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/reset-demo — reset test accounts to seed defaults (SUPER_ADMIN only)
  app.post('/api/admin/reset-demo', authenticate, authorize([Role.SUPER_ADMIN]), async (_req, res) => {
    try {
      const { AuthService } = await import('./src/services/auth.js');
      const hashedPassword = await AuthService.hashPassword('password123');

      const accounts = [
        { email: 'admin@smk.id', name: 'Super Admin', role: Role.SUPER_ADMIN },
        { email: 'guru@smk.id',  name: 'Guru Demo',   role: Role.GURU },
        { email: 'siswa@smk.id', name: 'Siswa Demo',  role: Role.SISWA },
      ];

      const results: { email: string; status: string }[] = [];
      for (const acc of accounts) {
        await prisma.user.upsert({
          where: { email: acc.email },
          update: { password: hashedPassword, name: acc.name, deletedAt: null, archivedAt: null },
          create: { email: acc.email, password: hashedPassword, name: acc.name, role: acc.role },
        });
        results.push({ email: acc.email, status: 'RESET' });
      }

      res.json({ success: true, results, resetAt: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── DEMO MODE API ────────────────────────────────────────────────────────

  /** GET /api/demo/status — public, returns demo mode state */
  app.get('/api/demo/status', async (_req, res) => {
    try {
      const [modeConfig, seededAt, versionId] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'DEMO_MODE' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEMO_SEEDED_AT' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEMO_VERSION_ID' } }),
      ]);

      const isDemoMode = modeConfig?.value === 'true';
      const demoVersionId = versionId?.value;

      // Check if any REAL schedule version is active (overrides demo)
      const realVersion = await prisma.timetableVersion.findFirst({
        where: { source: 'REAL', isActive: true },
      });

      const [totalStudents, totalTeachers, totalSchedules] = await Promise.all([
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.teacher.count({ where: { status: 'ACTIVE' } }),
        demoVersionId ? prisma.schedule.count({ where: { versionId: demoVersionId } }) : Promise.resolve(0),
      ]);

      res.json({
        isDemoMode,
        hasRealSchedule: !!realVersion,
        seededAt: seededAt?.value || null,
        totalStudents,
        totalTeachers,
        totalSchedules,
        demoVersionId: demoVersionId || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** POST /api/demo/seed — run full demo seeder (idempotent) */
  app.post('/api/demo/seed', async (_req, res) => {
    try {
      const { execFileSync } = await import('child_process');
      execFileSync(
        'node_modules/.bin/tsx',
        ['prisma/seeds/demo.ts'],
        { stdio: 'pipe', timeout: 120_000 }
      );

      // Re-fetch status after seed
      const [seededAt, versionId] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'DEMO_SEEDED_AT' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEMO_VERSION_ID' } }),
      ]);
      const demoVersionId = versionId?.value;
      const [totalStudents, totalTeachers, totalSchedules] = await Promise.all([
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.teacher.count({ where: { status: 'ACTIVE' } }),
        demoVersionId ? prisma.schedule.count({ where: { versionId: demoVersionId } }) : Promise.resolve(0),
      ]);

      res.json({
        success: true,
        message: 'Demo data seeded successfully',
        status: { isDemoMode: true, hasRealSchedule: false, seededAt: seededAt?.value, totalStudents, totalTeachers, totalSchedules },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Seeder failed' });
    }
  });

  /** DELETE /api/demo/reset-schedule — remove DEMO schedules only (protect real data) */
  app.delete('/api/demo/reset-schedule', authenticate, authorize([Role.SUPER_ADMIN]), async (_req, res) => {
    try {
      const demoVersionConfig = await prisma.systemConfig.findUnique({ where: { key: 'DEMO_VERSION_ID' } });
      if (!demoVersionConfig?.value) {
        return res.status(404).json({ error: 'No demo version found' });
      }
      const vId = demoVersionConfig.value;
      // Delete attendance linked to demo schedules
      const demoSchedules = await prisma.schedule.findMany({ where: { versionId: vId }, select: { id: true } });
      const sIds = demoSchedules.map(s => s.id);
      if (sIds.length) {
        await prisma.attendance.deleteMany({ where: { scheduleId: { in: sIds } } });
        await prisma.schedule.deleteMany({ where: { versionId: vId } });
      }
      await prisma.timetableVersion.update({ where: { id: vId }, data: { isActive: false, archivedAt: new Date() } });
      await prisma.systemConfig.upsert({
        where: { key: 'DEMO_MODE' },
        update: { value: 'false' },
        create: { key: 'DEMO_MODE', value: 'false' },
      });
      res.json({ success: true, message: 'Demo schedule reset. Real data preserved.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /** GET /api/demo/analytics — demo analytics data for dashboards */
  app.get('/api/demo/analytics', authenticate, async (_req, res) => {
    try {
      const demoVersionId = (await prisma.systemConfig.findUnique({ where: { key: 'DEMO_VERSION_ID' } }))?.value;

      const [classes, subjects, attendanceSummary] = await Promise.all([
        prisma.class.findMany({
          include: {
            major: { select: { name: true, code: true } },
            students: { select: { id: true } },
            _count: { select: { students: true } },
          },
        }),
        prisma.subject.findMany({ select: { id: true, name: true, code: true, type: true, credits: true } }),
        prisma.attendance.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
      ]);

      // Build attendance chart data
      const statusMap: Record<string, number> = {};
      for (const row of attendanceSummary) {
        statusMap[row.status] = row._count.status;
      }

      const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
      const attendanceChart = [
        { label: 'Hadir',     value: statusMap['PRESENT']    || 0, color: '#10B981', percent: total ? Math.round(((statusMap['PRESENT'] || 0) / total) * 100) : 0 },
        { label: 'Terlambat', value: statusMap['LATE']       || 0, color: '#F59E0B', percent: total ? Math.round(((statusMap['LATE']    || 0) / total) * 100) : 0 },
        { label: 'Sakit',     value: statusMap['SICK']       || 0, color: '#6366F1', percent: total ? Math.round(((statusMap['SICK']    || 0) / total) * 100) : 0 },
        { label: 'Izin',      value: statusMap['PERMISSION'] || 0, color: '#8B5CF6', percent: total ? Math.round(((statusMap['PERMISSION'] || 0) / total) * 100) : 0 },
        { label: 'Alfa',      value: statusMap['ABSENT']     || 0, color: '#EF4444', percent: total ? Math.round(((statusMap['ABSENT']  || 0) / total) * 100) : 0 },
      ];

      res.json({
        classes: classes.map(c => ({ id: c.id, name: c.name, major: c.major, studentCount: c._count.students })),
        subjects: subjects.slice(0, 20),
        attendanceChart,
        totalAttendance: total,
        scheduleSource: demoVersionId ? 'DEMO' : 'NONE',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── END DEMO MODE API ─────────────────────────────────────────────────────

  app.get('/api/intelligence/session/:sessionId/metrics', authenticate, async (req, res) => {
    try {
      const metrics = await IntelligenceService.getSessionMetrics(req.params.sessionId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/intelligence/session/:sessionId/ai-insights', authenticate, async (req, res) => {
    try {
      const insights = await IntelligenceService.generateAiInsights(req.params.sessionId);
      res.json({ insights });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kepala Sekolah: semua sesi aktif + ringkasan
  app.get('/api/intelligence/semua-sesi-aktif', authenticate, authorize([Role.KEPALA_SEKOLAH, Role.SUPER_ADMIN]), async (req, res) => {
    try {
      const sessions = await prisma.classSession.findMany({
        where: { signalStatus: 'ACTIVE' },
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          subject: { select: { name: true } },
          class: { select: { name: true } },
          attendances: true,
        },
        orderBy: { startTime: 'desc' },
      });
      const result = sessions.map(s => ({
        id: s.id,
        guru: s.teacher.user.name,
        mapel: s.subject.name,
        kelas: s.class.name,
        jamMulai: s.startTime,
        status: s.signalStatus,
        hadir: s.attendances.filter(a => a.attendanceStatus === 'HADIR').length,
        terlambat: s.attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length,
        alfa: s.attendances.filter(a => a.attendanceStatus === 'ALFA').length,
        totalRespond: s.attendances.filter(a => a.attendanceStatus !== 'ALFA').length,
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Kepala Sekolah: statistik presensi hari ini
  app.get('/api/intelligence/statistik-hari-ini', authenticate, authorize([Role.KEPALA_SEKOLAH, Role.SUPER_ADMIN]), async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [totalSesi, totalHadir, totalTerlambat, totalAlfa, guruAktif] = await Promise.all([
        prisma.classSession.count({ where: { startTime: { gte: today } } }),
        prisma.studentAttendance.count({ where: { attendanceStatus: 'HADIR', timestamp: { gte: today } } }),
        prisma.studentAttendance.count({ where: { attendanceStatus: 'TERLAMBAT', timestamp: { gte: today } } }),
        prisma.studentAttendance.count({ where: { attendanceStatus: 'ALFA', timestamp: { gte: today } } }),
        prisma.classSession.findMany({ where: { startTime: { gte: today } }, select: { teacherId: true }, distinct: ['teacherId'] }),
      ]);
      res.json({ totalSesi, totalHadir, totalTerlambat, totalAlfa, guruAktif: guruAktif.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Guru: get all schedules for authenticated teacher
  app.get('/api/timetable/guru/my-schedule', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
      const schedules = await prisma.schedule.findMany({
        where: { teacherId: teacher.id, deletedAt: null },
        include: { subject: true, class: true, room: true },
        orderBy: [{ day: 'asc' }, { periodStart: 'asc' }],
      });
      res.json(schedules);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Guru: get sessions history (for rekap)
  app.get('/api/intelligence/sessions', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
      const where: any = { teacherId: teacher.id };
      // Filter by subjectId (ClassSession has no courseId field — use subjectId instead)
      if (req.query.subjectId) where.subjectId = req.query.subjectId as string;
      if (req.query.classId) where.classId = req.query.classId as string;
      const sessions = await prisma.classSession.findMany({
        where,
        include: { class: true, subject: true, attendances: true },
        orderBy: { startTime: 'desc' },
        take: 100,
      });
      const result = sessions.map(s => ({
        ...s,
        hadir: s.attendances.filter(a => a.attendanceStatus === 'HADIR').length,
        terlambat: s.attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length,
        alfa: s.attendances.filter(a => a.attendanceStatus === 'ALFA').length,
      }));
      res.json(result);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // PATCH — guru override status (IZIN/SAKIT/HADIR/dll) + catatan keterangan
  app.patch('/api/intelligence/attendance/:id/status', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const { status, note } = req.body;
      const VALID_STATUSES = ['HADIR', 'TERLAMBAT', 'ALFA', 'IZIN', 'SAKIT', 'INVALID'];
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Status tidak valid. Pilih: ${VALID_STATUSES.join(', ')}` });
      }

      // Ownership check — non-SUPER_ADMIN hanya bisa edit sesi miliknya sendiri
      const record = await prisma.studentAttendance.findUnique({
        where: { id: req.params.id },
        include: { session: true },
      });
      if (!record) return res.status(404).json({ error: 'Catatan absensi tidak ditemukan.' });
      if (req.user!.role !== Role.SUPER_ADMIN) {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
        if (!teacher || record.session.teacherId !== teacher.id) {
          return res.status(403).json({ error: 'Anda tidak berhak mengubah absensi dari sesi ini.' });
        }
      }

      const updated = await prisma.studentAttendance.update({
        where: { id: req.params.id },
        data: {
          attendanceStatus: status,
          note: note ?? null,
          confirmationStatus: 'CONFIRMED',
        },
        include: { student: { include: { user: true } } },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'STATUS_OVERRIDE',
          entity: 'StudentAttendance',
          entityId: updated.id,
          newValue: JSON.stringify({ status, note }),
        }
      });

      // Broadcast ke session room
      io.to(`session-${updated.sessionId}`).emit('attendance-update', updated);
      res.json(updated);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  });

  // POST — guru input absensi manual (tanpa sesi aktif: buat ClassSession CLOSED langsung)
  app.post('/api/intelligence/attendance/manual', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const { classId, subjectId, scheduleId, date, attendances, reason } = req.body;
      // attendances: Array<{ studentId: string; status: string; note?: string }>
      if (!classId || !subjectId || !Array.isArray(attendances) || attendances.length === 0) {
        return res.status(400).json({ error: 'classId, subjectId, dan attendances wajib diisi.' });
      }

      let teacherId: string;
      if (req.user!.role === Role.SUPER_ADMIN && req.body.teacherId) {
        teacherId = req.body.teacherId;
      } else {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
        if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
        teacherId = teacher.id;
      }

      const sessionDate = date ? new Date(date) : new Date();
      const sessionToken = 'MAN-' + Math.random().toString(36).slice(2, 6).toUpperCase();

      const result = await prisma.$transaction(async (tx) => {
        const session = await tx.classSession.create({
          data: {
            teacherId,
            classId,
            subjectId,
            scheduleId: scheduleId ?? null,
            sessionToken,
            signalStatus: 'CLOSED',
            startTime: sessionDate,
            endTime: sessionDate,
          }
        });

        const records = await tx.studentAttendance.createMany({
          data: attendances.map((a: any) => ({
            studentId: a.studentId,
            sessionId: session.id,
            attendanceStatus: a.status ?? 'ALFA',
            note: a.note ?? (reason ?? 'Input manual guru'),
            confirmationStatus: 'CONFIRMED',
            gpsValidated: false,
            integrityScore: 0.5,
          })),
          skipDuplicates: true,
        });

        await tx.auditLog.create({
          data: {
            userId: req.user!.userId,
            action: 'MANUAL_INPUT',
            entity: 'ClassSession',
            entityId: session.id,
            newValue: JSON.stringify({ reason, attendanceCount: records.count, classId, subjectId }),
          }
        });

        // Bridge sync if scheduleId provided
        if (scheduleId) {
          for (const a of attendances) {
            const STATUS_MAP: Record<string, string> = { HADIR: 'PRESENT', TERLAMBAT: 'LATE', ALFA: 'ABSENT', IZIN: 'PERMISSION', SAKIT: 'SICK', INVALID: 'ABSENT' };
            const legacyStatus = STATUS_MAP[a.status] ?? 'ABSENT';
            const existing = await tx.attendance.findFirst({ where: { studentId: a.studentId, scheduleId } });
            if (existing) {
              await tx.attendance.update({ where: { id: existing.id }, data: { status: legacyStatus as any, note: a.note ?? reason } });
            } else {
              await tx.attendance.create({ data: { studentId: a.studentId, scheduleId, status: legacyStatus as any, note: a.note ?? reason } });
            }
          }
        }

        return { session, count: records.count };
      });

      res.status(201).json({ success: true, sessionId: result.session.id, created: result.count });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
  });

  // GET — rekap absensi per siswa per kelas (untuk raport & laporan semester)
  app.get('/api/intelligence/rekap/kelas/:classId', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN, Role.KEPALA_SEKOLAH, Role.BK]), async (req: AuthRequest, res) => {
    try {
      const { classId } = req.params;
      const { from, to, subjectId } = req.query;

      const dateFilter: any = {};
      if (from) dateFilter.gte = new Date(from as string);
      if (to)   dateFilter.lte = new Date(to as string);

      // Get all students in the class
      const students = await prisma.student.findMany({
        where: { classId, status: 'ACTIVE' },
        include: { user: { select: { name: true } } },
        orderBy: { user: { name: 'asc' } }
      });

      // Get all StudentAttendances for the class in the period
      const sessionFilter: any = { classId, signalStatus: 'CLOSED' };
      if (subjectId) sessionFilter.subjectId = subjectId as string;
      if (Object.keys(dateFilter).length > 0) sessionFilter.startTime = dateFilter;

      const sessions = await prisma.classSession.findMany({
        where: sessionFilter,
        select: { id: true, startTime: true, subjectId: true, subject: { select: { name: true } } }
      });

      const sessionIds = sessions.map(s => s.id);
      const allAttendances = await prisma.studentAttendance.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { studentId: true, attendanceStatus: true, sessionId: true }
      });

      // Group by studentId
      const result = students.map(student => {
        const studentAtts = allAttendances.filter(a => a.studentId === student.id);
        const total = studentAtts.length;
        const hadir   = studentAtts.filter(a => a.attendanceStatus === 'HADIR').length;
        const terlambat = studentAtts.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
        const izin    = studentAtts.filter(a => a.attendanceStatus === 'IZIN').length;
        const sakit   = studentAtts.filter(a => a.attendanceStatus === 'SAKIT').length;
        const alfa    = studentAtts.filter(a => a.attendanceStatus === 'ALFA').length;
        const invalid = studentAtts.filter(a => a.attendanceStatus === 'INVALID').length;
        const presentTotal = hadir + terlambat;
        const persen  = total > 0 ? Math.round((presentTotal / total) * 100) : 0;

        return {
          studentId: student.id,
          name: student.user.name,
          total,
          hadir,
          terlambat,
          izin,
          sakit,
          alfa,
          invalid,
          presentTotal,
          persen,
        };
      });

      res.json({
        classId,
        totalSessions: sessions.length,
        period: { from: from ?? null, to: to ?? null },
        students: result,
      });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // ─── ClassroomEngagement Endpoints ──────────────────────────────────────────
  // GET all engagement records for a session
  app.get('/api/intelligence/session/:sessionId/engagement', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req, res) => {
    try {
      const engagements = await prisma.classroomEngagement.findMany({
        where: { sessionId: req.params.sessionId },
        include: { student: { include: { user: { select: { name: true } } } } },
        orderBy: { timestamp: 'desc' }
      });
      res.json(engagements);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // POST create/update engagement record for a student in a session
  app.post('/api/intelligence/session/:sessionId/engagement', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const { studentId, engagementScore, participationLevel, focusScore, note } = req.body;
      if (!studentId) return res.status(400).json({ error: 'studentId wajib diisi.' });

      // Upsert: one record per student per session
      const existing = await prisma.classroomEngagement.findFirst({
        where: { sessionId: req.params.sessionId, studentId }
      });

      const data = {
        engagementScore: engagementScore ?? null,
        participationLevel: participationLevel ?? null,
        focusScore: focusScore ?? null,
        note: note ?? null,
      };

      let record;
      if (existing) {
        record = await prisma.classroomEngagement.update({ where: { id: existing.id }, data });
      } else {
        record = await prisma.classroomEngagement.create({
          data: { ...data, sessionId: req.params.sessionId, studentId }
        });
      }
      res.json(record);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // ─── TeacherClassAnalytics Endpoints ─────────────────────────────────────────
  // GET analytics summary per teacher per class (admin / kepsek)
  app.get('/api/intelligence/analytics/class', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN, Role.KEPALA_SEKOLAH]), async (req: AuthRequest, res) => {
    try {
      const where: any = {};
      if (req.query.teacherId) where.teacherId = req.query.teacherId as string;
      if (req.query.classId)   where.classId   = req.query.classId as string;

      // If GURU, restrict to own analytics
      if (req.user!.role === Role.GURU) {
        const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
        if (teacher) where.teacherId = teacher.id;
      }

      const analytics = await prisma.teacherClassAnalytics.findMany({
        where,
        include: {
          teacher: { include: { user: { select: { name: true } } } },
          class: { select: { name: true } },
          subject: { select: { name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 200
      });
      res.json(analytics);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // POST upsert analytics after a session closes (called internally or by admin)
  app.post('/api/intelligence/analytics/class', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU]), async (req: AuthRequest, res) => {
    try {
      const { teacherId, classId, subjectId, period, totalSessions, avgAttendanceRate, avgAlfa, avgTerlambat, trend } = req.body;
      if (!teacherId || !classId || !subjectId || !period) {
        return res.status(400).json({ error: 'teacherId, classId, subjectId, period wajib diisi.' });
      }
      const record = await prisma.teacherClassAnalytics.upsert({
        where: { teacherId_classId_subjectId_period: { teacherId, classId, subjectId, period } },
        update: { totalSessions, avgAttendanceRate, avgAlfa, avgTerlambat, trend, updatedAt: new Date() },
        create: { teacherId, classId, subjectId, period, totalSessions, avgAttendanceRate, avgAlfa, avgTerlambat, trend }
      });
      res.json(record);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Grades API (schema: studentId, submissionId?, value, weight, category)
  app.post('/api/grades', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const { studentId, value, category, weight } = req.body;
      if (!studentId || value === undefined) return res.status(400).json({ error: 'Missing required fields.' });
      const grade = await prisma.grade.create({
        data: { studentId, value: parseFloat(value), category: category || 'HARIAN', weight: parseInt(weight) || 1 }
      });
      res.status(201).json(grade);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/grades', authenticate, async (req: AuthRequest, res) => {
    try {
      const where: any = {};
      if (req.query.studentId) where.studentId = req.query.studentId;
      if (req.query.category) where.category = req.query.category;
      const grades = await prisma.grade.findMany({ where, include: { student: { include: { user: true } } } });
      res.json(grades);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Classes API (schema requires: name, grade, majorId, academicYearId)
  app.get('/api/classes', authenticate, async (req, res) => {
    try {
      const classes = await prisma.class.findMany({
        include: { major: true, academicYear: true, _count: { select: { students: true } } },
        orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      });
      res.json(classes);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/classes', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { name, grade, majorId, academicYearId } = req.body;
      if (!name?.trim() || !majorId) return res.status(400).json({ error: 'Nama kelas dan jurusan wajib diisi.' });
      let ayId = academicYearId;
      if (!ayId) {
        const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
        if (!activeYear) return res.status(400).json({ error: 'Tidak ada tahun ajaran aktif.' });
        ayId = activeYear.id;
      }
      const cls = await prisma.class.create({ data: { name: name.trim(), grade: parseInt(grade) || 10, majorId, academicYearId: ayId } });
      res.status(201).json(cls);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.patch('/api/classes/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { name, grade, majorId } = req.body;
      const data: any = {};
      if (name) data.name = name;
      if (grade) data.grade = parseInt(grade);
      if (majorId) data.majorId = majorId;
      const cls = await prisma.class.update({ where: { id: req.params.id }, data });
      res.json(cls);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete('/api/classes/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      await prisma.class.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Majors API (code is MajorCode enum: AKL, MPLB, PM, TB, TBS)
  app.post('/api/majors', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { name, code, description } = req.body;
      if (!name?.trim() || !code?.trim()) return res.status(400).json({ error: 'Nama dan kode wajib diisi.' });
      const major = await prisma.major.create({ data: { name: name.trim(), code, description } });
      res.status(201).json(major);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.patch('/api/majors/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      const { name, description } = req.body;
      const major = await prisma.major.update({ where: { id: req.params.id }, data: { name, description } });
      res.json(major);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.delete('/api/majors/:id', authenticate, authorize([Role.SUPER_ADMIN, Role.TU]), async (req, res) => {
    try {
      await prisma.major.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // Academic Endpoints
  app.get('/api/timetable/:classId', authenticate, async (req, res) => {
    try {
      const timetable = await AcademicService.getSchedules(req.params.classId);
      res.json(timetable);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch timetable' });
    }
  });

  // AI Analytics Endpoints
  app.get('/api/analytics/student/:nisn', authenticate, authorize([Role.SUPER_ADMIN, Role.GURU, Role.KEPALA_SEKOLAH]), async (req, res) => {
    try {
      const analysis = await AiService.analyzeStudentPerformance(req.params.nisn);
      res.json({ analysis });
    } catch (error) {
      res.status(500).json({ error: 'AI analysis failed' });
    }
  });

  // --- Vite Integration ---

  const isProd = (process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase() === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Use __dirname (derived from import.meta.url at top of file) so the path
    // is always relative to server.ts itself — never process.cwd(), which is
    // unreliable under Phusion Passenger on cPanel.
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info('SERVER', `✓ OSDAI v2.0 ready`);
    logger.info('SERVER', `  URL    : ${appEnv.APP_URL}`);
    logger.info('SERVER', `  Env    : ${appEnv.APP_ENV}`);
    logger.info('SERVER', `  Port   : ${PORT}`);
  });
}

startServer();
