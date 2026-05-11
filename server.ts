import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import { createHash } from 'crypto';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Custom Types for Request ---
interface AuthRequest extends Request {
  user?: { userId: string; role: Role };
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

  app.use(express.json());

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

  app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => {
    res.json(req.user);
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
  
  app.get('/api/classes', authenticate, async (req, res) => {
    try {
      const classes = await prisma.class.findMany({
        include: { major: true }
      });
      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  // Student SIS Endpoints
  app.get('/api/students', authenticate, authorize([Role.SUPER_ADMIN, Role.TU, Role.KEPALA_SEKOLAH]), async (req: AuthRequest, res) => {
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
          qrCode: `https://nexus.smk.id/verify/${refNo}`,
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
          qrCode: `https://nexus.smk.id/verify/${refNo}`,
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
      // Risk scoring logic: low attendance (< 75%) or missing grades
      const students = await prisma.student.findMany({
        include: {
          user: true,
          class: true,
          attendance: true,
          grades: true
        }
      });

      const riskStudents = students.map(s => {
        const attendanceCount = s.attendance.length;
        const presentCount = s.attendance.filter(a => a.status === 'PRESENT').length;
        const attendanceRate = attendanceCount > 0 ? (presentCount / attendanceCount) * 100 : 100;
        
        const avgGrade = s.grades.length > 0 
          ? s.grades.reduce((acc, curr) => acc + Number(curr.value), 0) / s.grades.length 
          : 0;

        let riskScore = 0;
        if (attendanceRate < 75) riskScore += 40;
        if (attendanceRate < 50) riskScore += 30;
        if (avgGrade < 60) riskScore += 30;

        return {
          id: s.id,
          name: s.user.name,
          class: s.class?.name,
          attendanceRate,
          avgGrade,
          riskScore,
          status: riskScore > 60 ? 'HIGH RISK' : riskScore > 30 ? 'MEDIUM RISK' : 'LOW RISK'
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

      // Daily attendance summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const attendanceSummary = await prisma.attendance.groupBy({
        by: ['status'],
        where: { timestamp: { gte: today } },
        _count: true
      });

      res.json({
        studentCount,
        teacherCount,
        activeClasses,
        revenue: totalRevenue._sum.amount || 0,
        attendance: attendanceSummary
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
      
      const validation = GpsService.validateGeofence(req.body.lat, req.body.lng);
      const log = await GpsService.logLocation(student.id, req.body);
      
      res.json({ log, validation });
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
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } });
      if (!teacher) return res.status(404).json({ error: 'Profil guru tidak ditemukan.' });
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

  // TEACHER validates a PENDING student's attendance (Point 8 — realtime badge update)
  app.post('/api/intelligence/attendance/:id/validate', authenticate, authorize([Role.GURU, Role.SUPER_ADMIN]), async (req: AuthRequest, res) => {
    try {
      const updated = await prisma.studentAttendance.update({
        where: { id: req.params.id },
        data: {
          confirmationStatus: 'CONFIRMED',
          attendanceStatus: 'HADIR',
          integrityScore: 0.7,
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OSDAI Server running at http://localhost:${PORT}`);
  });
}

startServer();
