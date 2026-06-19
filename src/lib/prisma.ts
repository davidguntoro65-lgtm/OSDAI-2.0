import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const isProd = (process.env.NODE_ENV || process.env.APP_ENV || '').toLowerCase() === 'production';

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isProd ? [] : ['query'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
