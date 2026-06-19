#!/usr/bin/env node
/**
 * OSDAI — Database Patch Script
 * Run standalone: npm run cpanel:patch-db
 * Imported by:   app.js (auto-runs on every startup)
 *
 * Directly applies missing DDL using IF NOT EXISTS / DO $$ guards.
 * Safe to run multiple times — fully idempotent.
 * Does NOT touch prisma migration history.
 * Does NOT modify or delete any existing data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ─── ANSI ───────────────────────────────────────────────────────────────── */
const C = { reset:'\x1b[0m', bold:'\x1b[1m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', dim:'\x1b[2m' };
const ok   = `${C.green}✓${C.reset}`;
const warn = `${C.yellow}○${C.reset}`;
const fail = `${C.red}✗${C.reset}`;
const SEP  = C.dim + '─'.repeat(62) + C.reset;
const SEPG = C.green + '═'.repeat(62) + C.reset;
const SEPE = C.red   + '═'.repeat(62) + C.reset;

function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Helper: check whether a column exists using information_schema.
 * More reliable than ADD COLUMN IF NOT EXISTS on restricted shared hosts.
 * ───────────────────────────────────────────────────────────────────────── */
async function columnExists(prisma, table, column) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column} LIMIT 1
    `;
    return rows.length > 0;
  } catch { return false; }
}

async function tableExists(prisma, table) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = ${table} AND table_type = 'BASE TABLE' LIMIT 1
    `;
    return rows.length > 0;
  } catch { return false; }
}

/* ─── All patches — each is idempotent ──────────────────────────────────── */
const PATCHES = [
  /* ── Migration 2: add_user_theme ─────────────────────────────────────── */
  {
    id: 'user.theme',
    desc: 'User.theme column',
    check: (p) => columnExists(p, 'User', 'theme'),
    sql: `ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light'`,
  },
  {
    id: 'timetable.source',
    desc: 'TimetableVersion.source column',
    check: (p) => columnExists(p, 'TimetableVersion', 'source'),
    sql: `ALTER TABLE "TimetableVersion" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'REAL'`,
  },
  {
    id: 'PasswordResetOTP',
    desc: 'PasswordResetOTP table',
    sql: `
CREATE TABLE IF NOT EXISTS "PasswordResetOTP" (
  "id"           TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "otpHash"      TEXT         NOT NULL,
  "expiredAt"    TIMESTAMP(3) NOT NULL,
  "attemptCount" INTEGER      NOT NULL DEFAULT 0,
  "resendCount"  INTEGER      NOT NULL DEFAULT 0,
  "isUsed"       BOOLEAN      NOT NULL DEFAULT false,
  "ipAddress"    TEXT,
  "deviceInfo"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetOTP_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    id: 'PasswordResetOTP.fk',
    desc: 'PasswordResetOTP → User foreign key',
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PasswordResetOTP_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetOTP"
      ADD CONSTRAINT "PasswordResetOTP_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$`,
  },
  {
    id: 'SecurityAuditLog',
    desc: 'SecurityAuditLog table',
    sql: `
CREATE TABLE IF NOT EXISTS "SecurityAuditLog" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT,
  "action"     TEXT         NOT NULL,
  "ipAddress"  TEXT,
  "deviceInfo" TEXT,
  "status"     TEXT         NOT NULL,
  "metadata"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    id: 'SecurityAuditLog.fk',
    desc: 'SecurityAuditLog → User foreign key',
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'SecurityAuditLog_userId_fkey'
  ) THEN
    ALTER TABLE "SecurityAuditLog"
      ADD CONSTRAINT "SecurityAuditLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$`,
  },
  {
    id: 'SystemConfig',
    desc: 'SystemConfig table',
    sql: `
CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "id"        TEXT         NOT NULL,
  "key"       TEXT         NOT NULL,
  "value"     TEXT         NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    id: 'SystemConfig.key_idx',
    desc: 'SystemConfig unique key index',
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key")`,
  },

  /* ── Migration 3: add_school_geofence ────────────────────────────────── */
  {
    id: 'SchoolGeofence',
    desc: 'SchoolGeofence table',
    sql: `
CREATE TABLE IF NOT EXISTS "SchoolGeofence" (
  "id"           TEXT             NOT NULL,
  "name"         TEXT             NOT NULL DEFAULT 'SMKN 1 Wonogiri',
  "latitude"     DOUBLE PRECISION NOT NULL DEFAULT -7.8123,
  "longitude"    DOUBLE PRECISION NOT NULL DEFAULT 110.9234,
  "radiusMeters" INTEGER          NOT NULL DEFAULT 200,
  "isActive"     BOOLEAN          NOT NULL DEFAULT true,
  "description"  TEXT,
  "createdBy"    TEXT,
  "updatedBy"    TEXT,
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolGeofence_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    id: 'GeofenceChangeLog',
    desc: 'GeofenceChangeLog table',
    sql: `
CREATE TABLE IF NOT EXISTS "GeofenceChangeLog" (
  "id"            TEXT             NOT NULL,
  "geofenceId"    TEXT             NOT NULL,
  "changedBy"     TEXT             NOT NULL,
  "changedByName" TEXT,
  "prevLatitude"  DOUBLE PRECISION,
  "prevLongitude" DOUBLE PRECISION,
  "prevRadius"    INTEGER,
  "newLatitude"   DOUBLE PRECISION NOT NULL,
  "newLongitude"  DOUBLE PRECISION NOT NULL,
  "newRadius"     INTEGER          NOT NULL,
  "newName"       TEXT,
  "reason"        TEXT,
  "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeofenceChangeLog_pkey" PRIMARY KEY ("id")
)`,
  },
  {
    id: 'GeofenceChangeLog.fk',
    desc: 'GeofenceChangeLog → SchoolGeofence foreign key',
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'GeofenceChangeLog_geofenceId_fkey'
  ) THEN
    ALTER TABLE "GeofenceChangeLog"
      ADD CONSTRAINT "GeofenceChangeLog_geofenceId_fkey"
      FOREIGN KEY ("geofenceId") REFERENCES "SchoolGeofence"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$`,
  },
];

/* ─────────────────────────────────────────────────────────────────────────
 * EXPORTED FUNCTION — called by app.js on every startup
 *
 * @param  prisma  an already-connected PrismaClient instance
 * @param  verbose print per-patch lines (default false for startup use)
 * @returns { applied, skipped, failed }
 * ───────────────────────────────────────────────────────────────────────── */
export async function patchDatabase(prisma, verbose = false) {
  let applied = 0;
  let skipped = 0;
  let failed  = 0;

  for (const patch of PATCHES) {
    try {
      // If patch has a pre-flight check, skip if already applied
      if (patch.check) {
        const exists = await patch.check(prisma);
        if (exists) {
          if (verbose) console.log(`  ${warn}  ${patch.desc}  ${C.dim}(already exists)${C.reset}`);
          skipped++;
          continue;
        }
      }

      await prisma.$executeRawUnsafe(patch.sql.trim());
      if (verbose) console.log(`  ${ok}  ${patch.desc}`);
      applied++;
    } catch (e) {
      const msg = e.message ?? '';
      const alreadyExists =
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('duplicate key') ||
        msg.includes('42701') ||
        msg.includes('42P07') ||
        msg.includes('42710');

      if (alreadyExists) {
        if (verbose) console.log(`  ${warn}  ${patch.desc}  ${C.dim}(already exists)${C.reset}`);
        skipped++;
      } else {
        if (verbose) console.log(`  ${fail}  ${patch.desc}\n       ${C.red}${msg.slice(0, 240)}${C.reset}`);
        failed++;
      }
    }
  }

  return { applied, skipped, failed };
}

/* ─────────────────────────────────────────────────────────────────────────
 * CLI ENTRYPOINT — only runs when this file is executed directly
 * ───────────────────────────────────────────────────────────────────────── */
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  (async () => {
    loadEnv();

    console.log(`\n${C.bold}${C.cyan}  OSDAI — Database Patch${C.reset}`);
    console.log(`  ${C.dim}${new Date().toISOString()}${C.reset}`);
    console.log(SEP);

    if (!process.env.DATABASE_URL) {
      console.error(`\n  ${fail}  DATABASE_URL is not set — cannot connect.\n`);
      process.exit(1);
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ log: [] });

    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`\n  ${ok}  Connected to database.`);
    } catch (e) {
      console.error(`\n  ${fail}  DB connection failed: ${e.message}\n`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`\n${C.bold}  Applying ${PATCHES.length} patch(es)…${C.reset}\n`);

    const { applied, skipped, failed } = await patchDatabase(prisma, true);
    await prisma.$disconnect();

    console.log(`\n${SEP}`);
    console.log(`  Applied : ${C.green}${applied}${C.reset}`);
    console.log(`  Skipped : ${C.yellow}${skipped}${C.reset}  (already existed)`);
    console.log(`  Failed  : ${failed > 0 ? C.red : C.dim}${failed}${C.reset}`);
    console.log(SEP);

    if (failed > 0) {
      console.log(`\n${SEPE}`);
      console.log(`  ${fail}  ${C.bold}${failed} patch(es) failed — check errors above.${C.reset}`);
      console.log(`${SEPE}\n`);
      process.exit(1);
    }

    console.log(`\n${SEPG}`);
    console.log(`  ${ok}  ${C.bold}${C.green}All patches applied. Restart the app in Node.js Selector.${C.reset}`);
    console.log(`${SEPG}\n`);
  })().catch(err => {
    console.error(`\n  ${fail}  Unexpected error: ${err.message}\n`);
    process.exit(1);
  });
}
