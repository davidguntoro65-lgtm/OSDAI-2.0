import { prisma } from '../lib/prisma';
import { buildQrUrl } from '../lib/domain';

export const DocumentService = {
    async getArchive(category?: string) {
        return await prisma.digitalDocument.findMany({
            where: { 
                isArchived: false,
                ...(category && { category })
            },
            include: { uploader: true },
            orderBy: { createdAt: 'desc' }
        });
    },

    async uploadDocument(data: { title: string, category: string, fileUrl: string, uploaderId: string }) {
        // In a real system, we would generate a unique reference and QR
        const refNo = `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        return await prisma.digitalDocument.create({
            data: {
                ...data,
                referenceNo: refNo,
                qrCode: buildQrUrl(refNo)
            }
        });
    },

    async verifyDocument(id: string) {
        return await prisma.digitalDocument.update({
            where: { id },
            data: { 
                isVerified: true,
                verifiedAt: new Date()
            }
        });
    }
};
