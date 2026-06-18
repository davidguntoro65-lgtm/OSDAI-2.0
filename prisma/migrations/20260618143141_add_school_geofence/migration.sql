-- CreateTable
CREATE TABLE "SchoolGeofence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'SMKN 1 Wonogiri',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT -7.8123,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 110.9234,
    "radiusMeters" INTEGER NOT NULL DEFAULT 200,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolGeofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceChangeLog" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT,
    "prevLatitude" DOUBLE PRECISION,
    "prevLongitude" DOUBLE PRECISION,
    "prevRadius" INTEGER,
    "newLatitude" DOUBLE PRECISION NOT NULL,
    "newLongitude" DOUBLE PRECISION NOT NULL,
    "newRadius" INTEGER NOT NULL,
    "newName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceChangeLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeofenceChangeLog" ADD CONSTRAINT "GeofenceChangeLog_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "SchoolGeofence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
