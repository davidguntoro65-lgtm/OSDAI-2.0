import { prisma } from '../lib/prisma';

export const GpsService = {
    /**
     * Log a student's location for attendance integrity
     */
    async logLocation(studentId: string, data: { lat: number, lng: number, accuracy: number, isMock: boolean, deviceInfo?: string }) {
        return await prisma.gpsIntegrityLog.create({
            data: {
                studentId,
                ...data
            }
        });
    },

    /**
     * Get integrity logs for a student
     */
    async getIntegrityReport(studentId: string) {
        return await prisma.gpsIntegrityLog.findMany({
            where: { studentId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
    },

    /**
     * Validate student is within school geofence
     * School Coords (Example: Wonogiri SMK)
     */
    validateGeofence(lat: number, lng: number) {
        const schoolLat = -7.8123; // Example Wonogiri lat
        const schoolLng = 110.9234; // Example Wonogiri lng
        const radiusInMeters = 200; // 200m geofence

        const distance = this.calculateDistance(lat, lng, schoolLat, schoolLng);
        return {
            isInside: distance <= radiusInMeters,
            distance: Math.round(distance)
        };
    },

    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371e3; // meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in meters
    }
};
