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
     * Get detailed attendance for a specific child
     */
    async getChildAttendance(studentId: string) {
        return await prisma.attendance.findMany({
            where: { studentId },
            include: {
                schedule: {
                    include: {
                        subject: true,
                        teacher: { include: { user: true } }
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });
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
            orderBy: { studentId: 'asc' } // Placeholder for better grouping
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
