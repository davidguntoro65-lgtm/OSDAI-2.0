import { prisma } from '../lib/prisma';

export const InventoryService = {
    async getAllItems() {
        return await prisma.inventoryItem.findMany({
            where: { isArchived: false },
            orderBy: { createdAt: 'desc' }
        });
    },

    async createItem(data: any) {
        return await prisma.inventoryItem.create({
            data: {
                ...data,
                quantity: parseInt(data.quantity) || 0
            }
        });
    },

    async updateItem(id: string, data: any) {
        return await prisma.inventoryItem.update({
            where: { id },
            data
        });
    },

    async archiveItem(id: string) {
        return await prisma.inventoryItem.update({
            where: { id },
            data: { isArchived: true }
        });
    }
};
