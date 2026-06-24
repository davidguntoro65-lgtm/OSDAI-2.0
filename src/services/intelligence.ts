import { prisma } from '../lib/prisma';
import { GpsService } from './gps';
import { GoogleGenAI } from "@google/genai";
import { randomBytes } from 'crypto';
import { sendAlfaNotificationEmail } from './emailService';

// Cache LATE_THRESHOLD so we don't query DB on every attendance response
let _lateThresholdCache: number | null = null;
async function getLateThresholdSeconds(): Promise<number> {
  if (_lateThresholdCache !== null) return _lateThresholdCache;
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { key: 'LATE_THRESHOLD_SECONDS' } });
    _lateThresholdCache = cfg ? parseInt(cfg.value) || 600 : 600;
  } catch { _lateThresholdCache = 600; }
  return _lateThresholdCache;
}

// Mapping StudentAttendance status → legacy Attendance status
const STATUS_MAP: Record<string, string> = {
  HADIR: 'PRESENT',
  TERLAMBAT: 'LATE',
  ALFA: 'ABSENT',
  INVALID: 'ABSENT',
  IZIN: 'PERMISSION',
  SAKIT: 'SICK',
};

// On Replit: AI_INTEGRATIONS_GEMINI_* are auto-provisioned.
// On cPanel: falls back to GEMINI_API_KEY from .env.
// Never pass undefined httpOptions fields — omit them when absent.
const _genAIHttpOptions = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
  ? { apiVersion: '' as const, baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL }
  : undefined;

const genAI = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
  ...((_genAIHttpOptions) ? { httpOptions: _genAIHttpOptions } : {}),
});

export const IntelligenceService = {
  /**
   * Start a new classroom session (Activate Signal)
   * AUDIT FIX: Added duplicate session prevention, cryptographic token, timetable validation
   */
  async activateSignal(teacherId: string, classId: string, subjectId: string, scheduleId?: string) {
    // 1. Validate teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true }
    });
    if (!teacher) throw new Error('Guru tidak ditemukan.');

    // 2. Validate class and subject exist
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new Error('Kelas tidak ditemukan.');
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new Error('Mata pelajaran tidak ditemukan.');

    // 3. CRITICAL: Prevent duplicate active sessions for the SAME CLASS
    const existingActiveSession = await prisma.classSession.findFirst({
      where: { classId, signalStatus: 'ACTIVE' }
    });
    if (existingActiveSession) {
      throw new Error('Kelas ini sudah memiliki sesi aktif. Tutup sesi sebelumnya terlebih dahulu.');
    }

    // 4. Validate timetable if scheduleId provided + compute officialStartTime
    let officialStartTime: Date | null = null;
    if (scheduleId) {
      const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
      if (!schedule || schedule.teacherId !== teacherId || schedule.classId !== classId) {
        throw new Error('Jadwal tidak valid untuk guru dan kelas ini.');
      }
      // Compute officialStartTime from TimetableConfig and schedule.periodStart
      const config = await prisma.timetableConfig.findFirst();
      if (config && schedule.periodStart) {
        const [h, m] = config.startAt.split(':').map(Number);
        const startMinutes = h * 60 + m + (schedule.periodStart - 1) * config.periodDuration;
        const now = new Date();
        officialStartTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
          Math.floor(startMinutes / 60), startMinutes % 60, 0);
      }
    }

    // 5. SECURITY FIX: Cryptographically secure session token
    const sessionToken = randomBytes(4).toString('hex').toUpperCase();

    // 6. Create session in a transaction
    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.classSession.create({
        data: {
          teacherId,
          classId,
          subjectId,
          scheduleId,
          sessionToken,
          signalStatus: 'ACTIVE',
          ...(officialStartTime ? { officialStartTime } : {}),
        },
        include: {
          class: true,
          subject: true,
          teacher: { include: { user: true } }
        }
      });

      // 7. Audit log: signal activation
      await tx.auditLog.create({
        data: {
          userId: teacher.userId,
          action: 'SIGNAL_ACTIVATE',
          entity: 'ClassSession',
          entityId: newSession.id,
          newValue: JSON.stringify({ classId, subjectId, sessionToken }),
        }
      });

      return newSession;
    });

    return session;
  },

  /**
   * Close attendance signal
   * AUDIT FIX: Added ownership validation + ALFA auto-marking + audit log
   */
  async closeSignal(sessionId: string, requestingTeacherId: string) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: true, subject: true, teacher: { include: { user: true } } }
    });
    if (!session) throw new Error('Sesi tidak ditemukan.');

    // SECURITY FIX: Only the owning teacher (or SUPER_ADMIN via bypass) can close
    if (session.teacherId !== requestingTeacherId) {
      throw new Error('Akses ditolak: Anda tidak memiliki izin menutup sesi ini.');
    }
    if (session.signalStatus === 'CLOSED') {
      throw new Error('Sesi sudah ditutup sebelumnya.');
    }

    const closed = await prisma.$transaction(async (tx) => {
      // 1. Close the session
      const updated = await tx.classSession.update({
        where: { id: sessionId },
        data: { signalStatus: 'CLOSED', endTime: new Date() }
      });

      // 2. AUDIT FIX: Auto-mark absent (ALFA) students who didn't respond
      const allStudents = await tx.student.findMany({
        where: { classId: session.classId, status: 'ACTIVE' }
      });
      const respondedStudentIds = new Set(
        (await tx.studentAttendance.findMany({ where: { sessionId }, select: { studentId: true } }))
          .map(a => a.studentId)
      );

      const alfaStudents = allStudents.filter(s => !respondedStudentIds.has(s.id));
      if (alfaStudents.length > 0) {
        await tx.studentAttendance.createMany({
          data: alfaStudents.map(s => ({
            studentId: s.id,
            sessionId,
            attendanceStatus: 'ALFA',
            gpsValidated: false,
            integrityScore: 0.0,
            confirmationStatus: 'UNCONFIRMED'
          })),
          skipDuplicates: true
        });
      }

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          userId: session.teacher.userId,
          action: 'SIGNAL_CLOSE',
          entity: 'ClassSession',
          entityId: sessionId,
          newValue: JSON.stringify({ alfaMarked: alfaStudents.length }),
        }
      });

      // 4. Fetch all StudentAttendances for this session (including newly created ALFA)
      const allAttendances = await tx.studentAttendance.findMany({
        where: { sessionId },
        include: { student: { include: { user: true } } }
      });

      // 5. P1 BRIDGE SYNC: Mirror StudentAttendance → legacy Attendance model
      //    Only possible if session has a scheduleId (links to legacy Schedule)
      if (session.scheduleId) {
        for (const att of allAttendances) {
          const legacyStatus = STATUS_MAP[att.attendanceStatus] ?? 'ABSENT';
          const existing = await tx.attendance.findFirst({
            where: { studentId: att.studentId, scheduleId: session.scheduleId! }
          });
          if (existing) {
            await tx.attendance.update({
              where: { id: existing.id },
              data: { status: legacyStatus as any, note: att.note ?? undefined }
            });
          } else {
            await tx.attendance.create({
              data: { studentId: att.studentId, scheduleId: session.scheduleId!, status: legacyStatus as any, note: att.note ?? undefined }
            });
          }
        }
      }

      // 6. P3 CLASSROOM ENGAGEMENT: calculate and upsert per student from attendance data
      for (const att of allAttendances) {
        const responseActivity = att.attendanceStatus === 'HADIR' ? 1 : att.attendanceStatus === 'TERLAMBAT' ? 0.5 : 0;
        const engagementLevel = parseFloat((responseActivity * 0.4).toFixed(4));
        const existing = await tx.classroomEngagement.findFirst({ where: { sessionId, studentId: att.studentId } });
        if (existing) {
          await tx.classroomEngagement.update({
            where: { id: existing.id },
            data: { responseActivity, engagementLevel }
          });
        } else {
          await tx.classroomEngagement.create({
            data: { sessionId, studentId: att.studentId, responseActivity, engagementLevel }
          });
        }
      }

      // 7. P3 TEACHER CLASS ANALYTICS: auto-generate per session
      const total = allAttendances.length;
      if (total > 0) {
        const hadirCount = allAttendances.filter(a => a.attendanceStatus === 'HADIR').length;
        const terlambatCount = allAttendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
        const alfaCount = allAttendances.filter(a => a.attendanceStatus === 'ALFA').length;
        const attendanceRate = ((hadirCount + terlambatCount) / total) * 100;
        const punctualityRate = (hadirCount + terlambatCount) > 0 ? (hadirCount / (hadirCount + terlambatCount)) * 100 : 0;
        const classStabilityScore = 1 - (alfaCount / total);
        const engagementRate = attendanceRate / 100;
        const aiTeachingScore = (attendanceRate / 100 * 0.4 + punctualityRate / 100 * 0.3 + classStabilityScore * 0.3) * 100;
        await tx.teacherClassAnalytics.create({
          data: {
            teacherId: session.teacherId,
            sessionId,
            attendanceRate,
            engagementRate,
            punctualityRate,
            classStabilityScore,
            aiTeachingScore,
          }
        });
      }

      // 8. P2 PARENT NOTIFICATIONS (in-app): create Notification for each ALFA student's parents
      const alfaStudentData = allAttendances.filter(a => a.attendanceStatus === 'ALFA');
      if (alfaStudentData.length > 0) {
        const alfaIds = alfaStudentData.map(a => a.studentId);
        const studentsWithParent = await tx.student.findMany({
          where: { id: { in: alfaIds } },
          include: { user: true, parent: { include: { user: true } } }
        });
        for (const student of studentsWithParent) {
          if (student.parent) {
            await tx.notification.create({
              data: {
                receiverId: student.parent.userId,
                title: `Ketidakhadiran: ${student.user.name}`,
                message: `${student.user.name} tidak hadir (ALFA) pada ${session.subject.name} — ${session.class.name} hari ini. Hubungi wali kelas untuk keterangan.`,
                type: 'ACADEMIC',
              }
            });
          }
        }
        // Store for fire-and-forget email after transaction
        (updated as any).__alfaEmailQueue = studentsWithParent.map(s => ({
          student: s,
          subject: session.subject.name,
          className: session.class.name,
          teacherName: session.teacher.user.name,
        }));
      }

      return updated;
    });

    // P2: Fire-and-forget emails AFTER transaction completes (never block the response)
    const emailQueue = (closed as any).__alfaEmailQueue as Array<any> | undefined;
    if (emailQueue?.length) {
      setImmediate(async () => {
        for (const item of emailQueue) {
          const parent = item.student.parent;
          if (parent?.user?.email) {
            await sendAlfaNotificationEmail({
              to: parent.user.email,
              parentName: parent.user.name,
              studentName: item.student.user.name,
              subjectName: item.subject,
              className: item.className,
              teacherName: item.teacherName,
            }).catch(() => {});
          }
        }
      });
    }

    return closed;
  },

  /**
   * Student response to signal
   * AUDIT FIX: Added session token validation, GPS logging, audit trail
   */
  async respondToSignal(
    studentId: string,
    studentUserId: string,
    sessionId: string,
    data: { lat: number; lng: number; deviceId: string; sessionToken: string }
  ) {
    // 1. Validate session
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: { include: { students: true } } }
    });
    if (!session || session.signalStatus !== 'ACTIVE') {
      throw new Error('Sinyal kelas tidak aktif atau tidak ditemukan.');
    }

    // 2. SECURITY FIX: Validate session token
    if (session.sessionToken !== data.sessionToken.toUpperCase()) {
      // Log suspicious attempt
      await prisma.auditLog.create({
        data: {
          userId: studentUserId,
          action: 'INVALID_TOKEN_ATTEMPT',
          entity: 'ClassSession',
          entityId: sessionId,
          ipAddress: data.deviceId,
        }
      });
      throw new Error('Token sesi tidak valid.');
    }

    // 3. Validate that student belongs to this class
    const studentInClass = session.class.students.find(s => s.id === studentId);
    if (!studentInClass) {
      throw new Error('Anda bukan bagian dari kelas ini.');
    }

    // 4. DUPLICATE PREVENTION: Check unique constraint explicitly
    const existing = await prisma.studentAttendance.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } }
    });
    if (existing) {
      return { status: 'ALREADY_CONFIRMED', attendance: existing };
    }

    // 5. GPS Validation + log
    const geoValidation = GpsService.validateGeofence(data.lat, data.lng);
    await GpsService.logLocation(studentId, {
      lat: data.lat,
      lng: data.lng,
      accuracy: typeof (data as any).accuracy === 'number' ? (data as any).accuracy : 0,
      isMock: geoValidation.distance === 0 && !geoValidation.isInside ? true : false,
      deviceInfo: data.deviceId
    });

    // 6. P1 FIX: Calculate Latency from officialStartTime (not session.startTime)
    //    → Prevents "guru terlambat buka" menyebabkan semua siswa dihitung TERLAMBAT
    const now = new Date();
    const referenceTime = (session as any).officialStartTime
      ? new Date((session as any).officialStartTime)
      : new Date(session.startTime);
    const latencySeconds = Math.max(0, Math.floor((now.getTime() - referenceTime.getTime()) / 1000));

    // P3: Read LATE_THRESHOLD from SystemConfig (configurable per sekolah)
    const lateThreshold = await getLateThresholdSeconds();

    let status = 'HADIR';
    if (latencySeconds > lateThreshold) status = 'TERLAMBAT';
    if (!geoValidation.isInside) status = 'INVALID';

    // 7. Create attendance in transaction with audit log
    const attendance = await prisma.$transaction(async (tx) => {
      const record = await tx.studentAttendance.create({
        data: {
          studentId,
          sessionId,
          attendanceStatus: status,
          responseLatency: latencySeconds,
          gpsLatitude: data.lat,
          gpsLongitude: data.lng,
          gpsValidated: geoValidation.isInside,
          deviceFingerprint: data.deviceId,
          integrityScore: geoValidation.isInside ? 1.0 : 0.0,
          confirmationStatus: status === 'INVALID' ? 'UNCONFIRMED' : 'CONFIRMED'
        },
        include: {
          student: { include: { user: true } }
        }
      });

      await tx.auditLog.create({
        data: {
          userId: studentUserId,
          action: 'STUDENT_ATTEND',
          entity: 'StudentAttendance',
          entityId: record.id,
          newValue: JSON.stringify({
            sessionId,
            status,
            gpsValidated: geoValidation.isInside,
            latencySeconds,
            distance: geoValidation.distance
          })
        }
      });

      return record;
    });

    return { status: 'SUCCESS', attendance };
  },

  /**
   * Get Live Session Metrics
   */
  async getSessionMetrics(sessionId: string) {
    const [attendances, session] = await Promise.all([
      prisma.studentAttendance.findMany({
        where: { sessionId },
        include: { student: { include: { user: true } } }
      }),
      prisma.classSession.findUnique({
        where: { id: sessionId },
        include: { class: true, subject: true, teacher: { include: { user: true } } }
      })
    ]);

    if (!session) throw new Error('Session not found');

    const totalStudents = await prisma.student.count({
      where: { classId: session.classId, status: 'ACTIVE' }
    });
    const hadir = attendances.filter(a => a.attendanceStatus === 'HADIR').length;
    const terlambat = attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
    const alfa = attendances.filter(a => a.attendanceStatus === 'ALFA').length;
    const invalid = attendances.filter(a => a.attendanceStatus === 'INVALID').length;

    return {
      session: {
        id: session.id,
        token: session.sessionToken,
        status: session.signalStatus,
        subject: session.subject.name,
        class: session.class.name,
        teacher: session.teacher.user.name,
        startTime: session.startTime
      },
      totalStudents,
      hadir,
      terlambat,
      alfa,
      invalid,
      attendanceRate: totalStudents > 0 ? ((hadir + terlambat) / totalStudents) * 100 : 0,
      attendances
    };
  },

  /**
   * Get active session for a student's class
   */
  async getActiveSessionForStudent(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    });
    if (!student?.classId) return null;

    return prisma.classSession.findFirst({
      where: { classId: student.classId, signalStatus: 'ACTIVE' },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        class: true
      }
    });
  },

  /**
   * Get student's attendance history
   */
  async getStudentHistory(studentId: string, limit = 20) {
    return prisma.studentAttendance.findMany({
      where: { studentId },
      include: {
        session: {
          include: {
            subject: true,
            class: true,
            teacher: { include: { user: true } }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  },

  /**
   * Generate AI Insights for the session
   */
  async generateAiInsights(sessionId: string) {
    const metrics = await this.getSessionMetrics(sessionId);
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { subject: true, class: true }
    });

    const prompt = `System: You are an Educational AI Consultant for SMK Negeri 1 Wonogiri.
    Session Context: Subject ${session?.subject.name}, Class ${session?.class.name}.
    Metrics: Total=${metrics.totalStudents}, Hadir=${metrics.hadir}, Terlambat=${metrics.terlambat}, Alfa=${metrics.alfa}, Invalid=${metrics.invalid}, Rate=${metrics.attendanceRate.toFixed(1)}%
    
    Task: Provide 3 strategic AI observations about this classroom session. 
    Focus on:
    - Punctuality trends
    - Classroom stability
    - Passive vs Active engagement detection
    - Early warning for students who are often late or absent.
    
    Format: Use Indonesian (Bahasa Indonesia). 2-3 sentences per point. Use numbered list.`;

    try {
      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return result.text || "Gagal menghasilkan insight AI saat ini.";
    } catch (err) {
      console.error('AI Error:', err);
      return "Gagal menghasilkan insight AI saat ini.";
    }
  }
};
