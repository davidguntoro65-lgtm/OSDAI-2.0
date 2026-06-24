import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { logger } from './logger';

const SUPERADMIN_EMAIL = 'admin@jobenapps.cloud';
const SUPERADMIN_DEFAULT_PASSWORD = 'Hubungi0814600081343';
const SUPERADMIN_NAME = 'Super Admin';

/**
 * Ensures the hardcoded superadmin account exists at startup.
 * - Creates the account if it doesn't exist yet.
 * - If it already exists, does NOT overwrite the password
 *   so that changes made via the dashboard are preserved.
 */
export async function ensureSuperAdmin(): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (existing) {
      logger.info('SUPERADMIN', `Superadmin already exists (${SUPERADMIN_EMAIL})`);
      return;
    }

    const hashedPassword = await bcrypt.hash(SUPERADMIN_DEFAULT_PASSWORD, 12);

    await prisma.user.create({
      data: {
        email: SUPERADMIN_EMAIL,
        password: hashedPassword,
        name: SUPERADMIN_NAME,
        role: 'SUPER_ADMIN',
        theme: 'dark',
      },
    });

    logger.info('SUPERADMIN', `Superadmin created: ${SUPERADMIN_EMAIL}`);
  } catch (err) {
    logger.info('SUPERADMIN', `Failed to ensure superadmin: ${err}`);
  }
}
