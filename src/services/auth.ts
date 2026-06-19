import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_edunexus_alpha';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET || 'super_refresh_edunexus_alpha';

export const AuthService = {
  async hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  },

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },

  generateTokens(userId: string, role: Role) {
    const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  },

  async login(email: string, password: string, deviceInfo: { userAgent?: string; ip?: string }) {
    // Use $queryRaw to fetch only auth-critical columns — immune to schema
    // version differences (e.g. missing `theme` on older cPanel deployments).
    const rows = await prisma.$queryRaw<Array<{
      id: string; email: string; password: string;
      role: string; name: string; avatarUrl: string | null;
    }>>`SELECT id, email, password, role, name, "avatarUrl" FROM "User" WHERE email = ${email} LIMIT 1`;

    const coreUser = rows[0] ?? null;
    if (!coreUser || !(await this.verifyPassword(password, coreUser.password))) {
      throw new Error('Invalid credentials');
    }

    // Fetch theme separately — column may not exist on older DB schema (non-fatal)
    let theme = 'light';
    try {
      const themeRows = await prisma.$queryRaw<Array<{ theme: string }>>`
        SELECT theme FROM "User" WHERE id = ${coreUser.id} LIMIT 1
      `;
      theme = themeRows[0]?.theme ?? 'light';
    } catch { /* theme column missing — use default */ }

    const { password: _pw, ...safeUser } = coreUser;
    const user = { ...safeUser, theme, role: coreUser.role as Role };
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.role);

    // Track Session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ip,
        device: this.parseUserAgent(deviceInfo.userAgent),
      },
    });

    // Store Refresh Token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress: deviceInfo.ip,
      },
    });

    return { user, accessToken, refreshToken };
  },

  async refresh(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Rotate tokens
    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(storedToken.userId, storedToken.user.role);

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(userId: string, token: string) {
    await prisma.session.deleteMany({
      where: { userId, token },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId, token }, // Assuming token provided is refresh token
    });
  },

  parseUserAgent(ua?: string) {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Mobi')) return 'Mobile';
    return 'Desktop';
  },

  verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string; role: Role };
    } catch (e) {
      return null;
    }
  }
};
