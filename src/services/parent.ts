import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const ParentService = {
    /**
     * Get all children linked to a parent
     */
    async getChildren(parentUserId: string) {
        const parent = await prisma.parent.findUnique({
            where: { userId: parentUserId },
            include: {
                students: {
                    include: {
                        user: true,
                        class: {
                            include: {
                                academicYear: true,
                                major: true
                            }
                        }
                    }
                }
            }
        });

        if (!parent) throw new Error('Parent profile not found');
        return parent.students;
    },

    /**
     * Get detailed attendance for a specific child — returns BOTH
     * real-time StudentAttendance (session-based) and legacy Attendance (schedule-based)
     * so parents see a complete picture regardless of which system the school uses.
     */
    async getChildAttendance(studentId: string) {
        const [realtime, legacy] = await Promise.all([
            prisma.studentAttendance.findMany({
                where: { studentId },
                include: {
                    session: {
                        include: {
                            subject: true,
                            class: true,
                            teacher: { include: { user: { select: { name: true } } } }
                        }
                    }
                },
                orderBy: { timestamp: 'desc' },
                take: 100
            }),
            prisma.attendance.findMany({
                where: { studentId },
                include: {
                    schedule: {
                        include: {
                            subject: true,
                            teacher: { include: { user: true } }
                        }
                    }
                },
                orderBy: { timestamp: 'desc' },
                take: 100
            })
        ]);

        // Normalise both datasets into a unified shape for the frontend
        const realtimeNorm = realtime.map(r => ({
            id: r.id,
            source: 'REALTIME' as const,
            timestamp: r.timestamp,
            status: r.attendanceStatus,
            subjectName: r.session.subject.name,
            className: r.session.class.name,
            teacherName: r.session.teacher.user.name,
            gpsValidated: r.gpsValidated,
            integrityScore: r.integrityScore
        }));

        const legacyNorm = legacy.map(l => ({
            id: l.id,
            source: 'LEGACY' as const,
            timestamp: l.timestamp,
            status: l.status,
            subjectName: l.schedule?.subject?.name ?? '-',
            className: '-',
            teacherName: l.schedule?.teacher?.user?.name ?? '-',
            gpsValidated: null,
            integrityScore: null
        }));

        return {
            realtime: realtimeNorm,
            legacy: legacyNorm,
            combined: [...realtimeNorm, ...legacyNorm].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
        };
    },

    /**
     * Get grades for a specific child
     */
    async getChildGrades(studentId: string) {
        return await prisma.grade.findMany({
            where: { studentId },
            include: {
                submission: {
                    include: {
                        assignment: {
                            include: {
                                course: { include: { subject: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { studentId: 'asc' }
        });
    },

    /**
     * Get invoices and billing for a specific child
     */
    async getChildFinance(studentId: string) {
        return await prisma.invoice.findMany({
            where: { studentId },
            include: {
                transactions: true
            },
            orderBy: { dueDate: 'desc' }
        });
    },

    /**
     * Get notifications for the parent
     */
    async getNotifications(userId: string) {
        return await prisma.notification.findMany({
            where: { receiverId: userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    }
};
