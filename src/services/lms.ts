import { prisma } from '../lib/prisma';
import { Material, Assignment, Quiz, Submission, QuizAttempt, Role } from '@prisma/client';

export const LMSService = {
    // --- Course Management ---
    async getCourseContent(courseId: string) {
        return await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                materials: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } },
                assignments: { where: { isArchived: false }, orderBy: { dueDate: 'asc' } },
                quizzes: { where: { isArchived: false }, orderBy: { createdAt: 'desc' } },
                discussions: {
                    where: { parentId: null },
                    include: { user: true, replies: { include: { user: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
    },

    // --- Materials ---
    async createMaterial(data: Partial<Material>) {
        return await prisma.material.create({
            data: data as any
        });
    },

    async updateMaterial(id: string, data: Partial<Material>) {
        return await prisma.material.update({
            where: { id },
            data
        });
    },

    // --- Assignments ---
    async createAssignment(data: any) {
        return await prisma.$transaction(async (tx) => {
            const assignment = await tx.assignment.create({
                data: data
            });

            // Get all students in the class linked to the course
            const course = await tx.course.findUnique({
                where: { id: data.courseId },
                include: { class: { include: { students: true } } }
            });

            if (course?.class?.students) {
                for (const student of course.class.students) {
                    await tx.notification.create({
                        data: {
                            receiverId: student.userId,
                            title: 'Tugas Baru Tersedia',
                            message: `Tugas baru "${assignment.title}" telah ditambahkan di mata pelajaran ${course.subjectId}`,
                            type: 'ACADEMIC'
                        }
                    });
                }
            }

            return assignment;
        });
    },

    async submitAssignment(data: { assignmentId: string, studentId: string, content?: string, fileUrl?: string, fileName?: string }) {
        return await prisma.submission.create({
            data: {
                ...data,
                status: 'SUBMITTED'
            }
        });
    },

    async gradeSubmission(submissionId: string, gradeValue: number, feedback?: string) {
        return await prisma.$transaction(async (tx) => {
            const submission = await tx.submission.update({
                where: { id: submissionId },
                data: { 
                    status: 'GRADED',
                    feedback 
                },
                include: { student: true, assignment: true }
            });

            await tx.grade.upsert({
                where: { submissionId },
                update: { value: gradeValue },
                create: {
                    studentId: submission.studentId,
                    submissionId: submissionId,
                    value: gradeValue,
                    category: 'TASK',
                    weight: 10
                }
            });

            // Send Notification
            await tx.notification.create({
                data: {
                    receiverId: submission.student.userId,
                    title: 'Tugas Dinilai',
                    message: `Tugas "${submission.assignment.title}" telah dinilai: ${gradeValue}`,
                    type: 'ACADEMIC'
                }
            });

            return submission;
        });
    },

    // --- Quizzes ---
    async createQuiz(data: any) {
        const { questions, ...quizData } = data;
        return await prisma.quiz.create({
            data: {
                ...quizData,
                questions: {
                    create: questions.map((q: any) => ({
                        text: q.text,
                        type: q.type,
                        points: q.points,
                        options: {
                            create: q.options.map((o: any) => ({
                                text: o.text,
                                isCorrect: o.isCorrect
                            }))
                        }
                    }))
                }
            }
        });
    },

    async startQuizAttempt(quizId: string, studentId: string) {
        const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) throw new Error('Quiz not found');

        const pastAttempts = await prisma.quizAttempt.count({
            where: { quizId, studentId }
        });

        if (pastAttempts >= quiz.maxAttempts) {
            throw new Error('Maximum attempts reached');
        }

        return await prisma.quizAttempt.create({
            data: {
                quizId,
                studentId,
                status: 'IN_PROGRESS'
            }
        });
    },

    async submitQuizAttempt(attemptId: string, answers: any[]) {
        // Simple automated grading logic for MCQs
        const attempt = await prisma.quizAttempt.findUnique({
            where: { id: attemptId },
            include: { quiz: { include: { questions: { include: { options: true } } } } }
        });

        if (!attempt) throw new Error('Attempt not found');

        let totalScore = 0;
        let earnedScore = 0;

        attempt.quiz.questions.forEach(q => {
            totalScore += q.points;
            const answer = answers.find(a => a.questionId === q.id);
            if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
                const correctOption = q.options.find(o => o.isCorrect);
                if (answer && answer.optionId === correctOption?.id) {
                    earnedScore += q.points;
                }
            }
        });

        const finalScore = (earnedScore / totalScore) * 100;

        return await prisma.quizAttempt.update({
            where: { id: attemptId },
            data: {
                score: finalScore,
                status: 'COMPLETED',
                finishedAt: new Date()
            }
        });
    },

    // --- Discussions ---
    async postDiscussion(courseId: string, userId: string, content: string, parentId?: string) {
        return await prisma.courseDiscussion.create({
            data: {
                courseId,
                userId,
                content,
                parentId
            }
        });
    }
};
