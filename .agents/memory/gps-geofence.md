---
name: GPS Geofence system
description: How the DB-driven geofence config works, gotchas, and integration points
---

# GPS Geofence System

## Architecture

- **DB models**: `SchoolGeofence` (active config) + `GeofenceChangeLog` (audit trail)
- **Service**: `src/services/gps.ts` — `loadActiveGeofence()` caches config in memory (1-min TTL), auto-seeds default on first call
- **Validation**: `validateGeofence()` (sync, uses cache) + `validateGeofenceAsync()` (async, reads DB)
- **Frontend**: `src/components/GeofenceModule.tsx` — 4 tabs: Konfigurasi, Laporan, Riwayat, Arsip
- **Navigation**: `EnterpriseLayout.tsx` sidebar group "Presensi & GPS" → `geofence-gps` module

## Key gotchas

1. **Auto-seed**: `loadActiveGeofence()` auto-creates default record (`-7.8123, 110.9234, 200m`) if no config exists. Both `getGeofenceDetail()` and `validateGeofenceAsync()` call this, so the DB is always initialized on first API call.

2. **Cache invalidation**: `invalidateGeofenceCache()` is called after every `saveGeofence()`. Must be called whenever geofence config changes.

3. **`getGeofenceDetail` must call `loadActiveGeofence` first** — bare `findFirst()` returns null on empty table. Learned after first test failure.

4. **Role access**:
   - Config edit (POST): SUPER_ADMIN, TU only
   - View config + reports: all admin roles + SATPAM
   - Frontend tab "Konfigurasi" hidden if not SUPER_ADMIN or TU

## API Routes
- `GET /api/gps/geofence` — authenticated, any role
- `POST /api/gps/geofence` — SUPER_ADMIN, TU only; validates lat/lng/radius ranges
- `GET /api/gps/geofence/history` — SUPER_ADMIN, TU, KEPALA_SEKOLAH
- `GET /api/gps/reports` — paginated log table with filters
- `GET /api/gps/reports/summary` — stats card data
- `GET /api/gps/reports/export` — CSV download with BOM for Excel

## Map preview
Uses OpenStreetMap iframe embed (no API key needed). URL format: `https://www.openstreetmap.org/export/embed.html?bbox=...&marker=lat,lng`
