import { prisma } from '../lib/prisma';

// In-memory cache for active geofence config
let geofenceCache: { lat: number; lng: number; radius: number; name: string; id: string } | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

async function loadActiveGeofence() {
  const now = Date.now();
  if (geofenceCache && now < cacheExpiry) return geofenceCache;

  const config = await prisma.schoolGeofence.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } });
  if (config) {
    geofenceCache = { lat: config.latitude, lng: config.longitude, radius: config.radiusMeters, name: config.name, id: config.id };
  } else {
    // Seed default config if none exists
    const created = await prisma.schoolGeofence.create({
      data: {
        name: 'SMKN 1 Wonogiri',
        latitude: -7.8123,
        longitude: 110.9234,
        radiusMeters: 200,
        isActive: true,
        description: 'Titik pusat sekolah — konfigurasi default',
      }
    });
    geofenceCache = { lat: created.latitude, lng: created.longitude, radius: created.radiusMeters, name: created.name, id: created.id };
  }
  cacheExpiry = now + CACHE_TTL_MS;
  return geofenceCache;
}

export function invalidateGeofenceCache() {
  geofenceCache = null;
  cacheExpiry = 0;
}

export const GpsService = {
  async logLocation(studentId: string, data: { lat: number; lng: number; accuracy: number; isMock: boolean; deviceInfo?: string }) {
    return await prisma.gpsIntegrityLog.create({ data: { studentId, ...data } });
  },

  async getIntegrityReport(studentId: string) {
    return await prisma.gpsIntegrityLog.findMany({
      where: { studentId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  },

  // Synchronous fallback (uses cached values, defaults if cache not loaded)
  validateGeofence(lat: number, lng: number) {
    const cfg = geofenceCache ?? { lat: -7.8123, lng: 110.9234, radius: 200 };
    const distance = this.calculateDistance(lat, lng, cfg.lat, cfg.lng);
    return { isInside: distance <= cfg.radius, distance: Math.round(distance) };
  },

  // Async version — always uses live DB config
  async validateGeofenceAsync(lat: number, lng: number) {
    const cfg = await loadActiveGeofence();
    const distance = this.calculateDistance(lat, lng, cfg.lat, cfg.lng);
    return {
      isInside: distance <= cfg.radius,
      distance: Math.round(distance),
      geofence: { name: cfg.name, lat: cfg.lat, lng: cfg.lng, radius: cfg.radius },
    };
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  // ── Admin Geofence Config ─────────────────────────────────────────────────

  async getActiveGeofence() {
    return await loadActiveGeofence();
  },

  async getGeofenceDetail() {
    // Use loadActiveGeofence to guarantee auto-seed on first call
    await loadActiveGeofence();
    return await prisma.schoolGeofence.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } });
  },

  async saveGeofence(data: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    description?: string;
    reason?: string;
    changedBy: string;
    changedByName?: string;
  }) {
    const existing = await prisma.schoolGeofence.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } });

    let geofence;
    if (existing) {
      // Log the change
      await prisma.geofenceChangeLog.create({
        data: {
          geofenceId: existing.id,
          changedBy: data.changedBy,
          changedByName: data.changedByName,
          prevLatitude: existing.latitude,
          prevLongitude: existing.longitude,
          prevRadius: existing.radiusMeters,
          newLatitude: data.latitude,
          newLongitude: data.longitude,
          newRadius: data.radiusMeters,
          newName: data.name,
          reason: data.reason,
        },
      });
      geofence = await prisma.schoolGeofence.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMeters: data.radiusMeters,
          description: data.description,
          updatedBy: data.changedBy,
        },
      });
    } else {
      geofence = await prisma.schoolGeofence.create({
        data: {
          name: data.name,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMeters: data.radiusMeters,
          description: data.description,
          isActive: true,
          createdBy: data.changedBy,
        },
      });
    }
    invalidateGeofenceCache();
    return geofence;
  },

  async getChangeHistory(limit = 50) {
    return await prisma.geofenceChangeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  // ── Integrity Reports ─────────────────────────────────────────────────────

  async getIntegrityLogs(filters: {
    dateFrom?: string;
    dateTo?: string;
    studentId?: string;
    classId?: string;
    isMock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { dateFrom, dateTo, studentId, classId, isMock, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }
    if (studentId) where.studentId = studentId;
    if (isMock !== undefined) where.isMock = isMock;
    if (classId) where.student = { classId };

    const [logs, total] = await Promise.all([
      prisma.gpsIntegrityLog.findMany({
        where,
        include: {
          student: {
            include: { user: { select: { name: true } }, class: { select: { name: true } } },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gpsIntegrityLog.count({ where }),
    ]);

    // Enrich with geofence validation
    const cfg = geofenceCache ?? { lat: -7.8123, lng: 110.9234, radius: 200 };
    const enriched = logs.map(log => {
      const distance = GpsService.calculateDistance(log.lat, log.lng, cfg.lat, cfg.lng);
      return { ...log, distance: Math.round(distance), isInside: distance <= cfg.radius };
    });

    return { logs: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getIntegritySummary(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }
    const [total, mockCount, logs] = await Promise.all([
      prisma.gpsIntegrityLog.count({ where }),
      prisma.gpsIntegrityLog.count({ where: { ...where, isMock: true } }),
      prisma.gpsIntegrityLog.findMany({ where, select: { lat: true, lng: true } }),
    ]);
    const cfg = geofenceCache ?? { lat: -7.8123, lng: 110.9234, radius: 200 };
    let insideCount = 0;
    for (const l of logs) {
      const d = GpsService.calculateDistance(l.lat, l.lng, cfg.lat, cfg.lng);
      if (d <= cfg.radius) insideCount++;
    }
    return {
      total,
      mockCount,
      validCount: total - mockCount,
      insideGeofenceCount: insideCount,
      outsideGeofenceCount: total - insideCount,
      integrityRate: total > 0 ? Math.round(((total - mockCount) / total) * 100) : 100,
      geofenceComplianceRate: total > 0 ? Math.round((insideCount / total) * 100) : 100,
    };
  },
};
