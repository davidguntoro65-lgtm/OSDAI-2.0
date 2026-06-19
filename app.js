/**
 * OSDAI — LiteSpeed / cPanel Entry Point
 *
 * LiteSpeed (lsnode.js) calls require() on this file.
 *
 * HARD CONSTRAINTS for Node 22 + LiteSpeed:
 *  1. No top-level await  → ERR_REQUIRE_ASYNC_MODULE
 *  2. No module.register('tsx/esm') → tsx uses deprecated --loader internally
 *
 * STARTUP SEQUENCE (fully async, no top-level await):
 *  1. Load .env from this file's directory (not process.cwd())
 *  2. Set NODE_ENV / APP_ENV defaults
 *  3. Run `prisma migrate deploy`  — apply any pending migrations
 *  4. Run patchDatabase()          — IF NOT EXISTS DDL safety net
 *  5. Start server via tsImport()  — tsx programmatic API, no hooks
 *
 * Steps 3 & 4 run on EVERY startup so a `git pull + restart` is all
 * that's needed after a schema change — no manual terminal commands.
 */

import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath }          from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { execFile }               from 'node:child_process';
import { promisify }              from 'node:util';
import { tsImport }               from 'tsx/esm/api';

const execFileAsync = promisify(execFile);

// Resolve paths relative to this file — LiteSpeed changes process.cwd()
const __appDir = dirname(fileURLToPath(import.meta.url));

// Load .env before anything else
dotenvConfig({ path: join(__appDir, '.env') });

// LiteSpeed does not inject these
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
if (!process.env.APP_ENV)  process.env.APP_ENV  = 'production';

/* ─── Step 1: prisma migrate deploy ─────────────────────────────────────── */
async function runMigrations() {
  // Prefer local prisma binary; fall back to global npx
  const prismaBin = resolve(__appDir, 'node_modules', '.bin', 'prisma');
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,                 // current node binary
      [prismaBin, 'migrate', 'deploy'],
      { cwd: __appDir, env: process.env, timeout: 60_000 }
    );
    const out = (stdout + stderr).trim();
    if (out) console.log('[OSDAI] migrate:', out.split('\n').at(-1));
    console.log('[OSDAI] ✓ Migrations deployed');
  } catch (e) {
    // Non-fatal: log and continue — patchDatabase() is the safety net
    const msg = (e.stderr || e.stdout || e.message || '').toString().trim().split('\n').at(-1);
    console.warn('[OSDAI] ○ Migration warning (continuing):', msg);
  }
}

/* ─── Step 2: DB patch — IF NOT EXISTS safety net ───────────────────────── */
async function runDbPatch() {
  try {
    const { patchDatabase }  = await import('./scripts/patchDb.mjs');
    const { PrismaClient }   = await import('@prisma/client');
    const prisma = new PrismaClient({ log: [] });
    const { applied, failed } = await patchDatabase(prisma, false);
    await prisma.$disconnect();
    if (failed > 0) {
      console.warn(`[OSDAI] ○ DB patch: ${applied} applied, ${failed} failed (server starting anyway)`);
    } else {
      console.log(`[OSDAI] ✓ DB patch: ${applied} applied`);
    }
  } catch (e) {
    // Non-fatal: startup continues even if patch fails
    console.warn('[OSDAI] ○ DB patch skipped:', e.message?.slice(0, 120));
  }
}

/* ─── Main startup ───────────────────────────────────────────────────────── */
async function startup() {
  await runMigrations();
  await runDbPatch();
  await tsImport('./server.ts', import.meta.url);
}

startup().catch(err => {
  console.error('[OSDAI] Fatal startup error:', err);
  process.exit(1);
});
