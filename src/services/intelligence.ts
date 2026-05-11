import { prisma } from '../lib/prisma';
import { GpsService } from './gps';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const IntelligenceService = {
  /**
   * Start a new classroom session (Activate Signal)
   */
  async activateSignal(teacherId: string, classId: string, subjectId: string, scheduleId?: string) {
    // 1. Validate timetable if scheduleId provided
    if (scheduleId) {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId }
      });
      if (!schedule || schedule.teacherId !== teacherId || schedule.classId !== classId) {
        throw new Error('Jadwal tidak valid.');
      }
    }

    // 2. Generate secure token
    const sessionToken = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 3. Create session
    return await prisma.classSession.create({
      data: {
        teacherId,
        classId,
        subjectId,
        scheduleId,
        sessionToken,
        signalStatus: 'ACTIVE'
      },
      include: {
        class: true,
        subject: true,
        teacher: { include: { user: true } }
      }
    });
  },

  /**
   * Close attendance signal
   */
  async closeSignal(sessionId: string) {
    return await prisma.classSession.update({
      where: { id: sessionId },
      data: { 
        signalStatus: 'CLOSED',
        endTime: new Date()
      }
    });
  },

  /**
   * Student response to signal
   */
  async respondToSignal(studentId: string, sessionId: string, data: { lat: number, lng: number, deviceId: string }) {
    // 1. Validate session
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId }
    });
    if (!session || session.signalStatus !== 'ACTIVE') {
      throw new Error('Sinyal kelas tidak aktif.');
    }

    // 2. Validate Student (Unique Constraint handles accidental duplicates, but let's be explicit)
    const existing = await prisma.studentAttendance.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } }
    });
    if (existing) {
      return { status: 'ALREADY_CONFIRMED', attendance: existing };
    }

    // 3. GPS Validation
    const geoValidation = GpsService.validateGeofence(data.lat, data.lng);
    
    // 4. Calculate Latency/Punctuality
    const now = new Date();
    const startTime = new Date(session.startTime);
    const latencySeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    // Status Logic
    let status = 'HADIR';
    if (latencySeconds > 600) status = 'TERLAMBAT'; // 10 mins late
    if (!geoValidation.isInside) status = 'INVALID';

    // 5. Create Attendance Record
    const attendance = await prisma.studentAttendance.create({
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

    return { status: 'SUCCESS', attendance };
  },

  /**
   * Get Live Session Metrics
   */
  async getSessionMetrics(sessionId: string) {
    const attendances = await prisma.studentAttendance.findMany({
      where: { sessionId },
      include: { student: { include: { user: true } } }
    });

    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    if (!session) throw new Error('Session not found');

    const totalStudents = await prisma.student.count({ where: { classId: session.classId } });
    const hadir = attendances.filter(a => a.attendanceStatus === 'HADIR').length;
    const terlambat = attendances.filter(a => a.attendanceStatus === 'TERLAMBAT').length;
    const invalid = attendances.filter(a => a.attendanceStatus === 'INVALID').length;

    return {
      totalStudents,
      hadir,
      terlambat,
      invalid,
      attendanceRate: totalStudents > 0 ? ((hadir + terlambat) / totalStudents) * 100 : 0,
      attendances
    };
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
    Metrics: ${JSON.stringify(metrics)}
    
    Task: Provide 3 strategic AI observations about this classroom session. 
    Focus on:
    - Punctuality trends
    - Classroom stability
    - Pssive vs Active engagement detection (simulated)
    - Early warning for students who are often late or absent.
    
    Format: Use Indonesian (Bahasa Indonesia). 2-3 sentences per point.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (err) {
      console.error('AI Error:', err);
      return "Gagal menghasilkan insight AI saat ini.";
    }
  }
};
