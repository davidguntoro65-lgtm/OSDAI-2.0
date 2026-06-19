#!/usr/bin/env node
/**
 * OSDAI — Post-Deploy Verification Script
 * Run: npm run cpanel:verify
 *
 * Checks performed (in order):
 *  1. .env file exists and loads correctly
 *  2. All required environment variables are present
 *  3. Prisma DB connection (live SELECT 1)
 *  4. Database has been seeded (at least 1 user row)
 *  5. JWT secrets can sign + verify a test token
 *  6. Frontend build exists (dist/index.html)
 *  7. Required writable directories exist (uploads/, logs/)
 *  8. Health endpoint responds (GET APP_URL/api/health)
 *
 * Exit code 0 = all required checks passed
 * Exit code 1 = one or more required checks failed
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ─── ANSI colours ──────────────────────────────────────────────────────── */
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
};
const ok   = `${C.green}✓${C.reset}`;
const warn = `${C.yellow}○${C.reset}`;
const fail = `${C.red}✗${C.reset}`;
const info = `${C.cyan}ℹ${C.reset}`;

const SEP  = C.dim + '─'.repeat(62) + C.reset;
const SEPE = C.red  + '═'.repeat(62) + C.reset;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function row(icon, label, detail = '') {
  const d = detail ? `  ${C.dim}${detail}${C.reset}` : '';
  console.log(`  ${icon}  ${label}${d}`);
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return false;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
  return true;
}

async function dbCheck() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ log: [] });
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    await prisma.$disconnect();
    return { ok: true, userCount };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 120) };
  }
}

function jwtCheck() {
  try {
    const secret = process.env.JWT_SECRET;
    const refresh = process.env.JWT_REFRESH_SECRET;
    if (!secret || !refresh) return { ok: false, error: 'missing JWT_SECRET or JWT_REFRESH_SECRET' };

    // Manual HMAC-SHA256 JWT — no external dependency
    function makeJwt(payload, key) {
      const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const sig     = crypto.createHmac('sha256', key).update(`${header}.${body}`).digest('base64url');
      return `${header}.${body}.${sig}`;
    }
    function verifyJwt(token, key) {
      const [h, b, s] = token.split('.');
      const expected = crypto.createHmac('sha256', key).update(`${h}.${b}`).digest('base64url');
      if (s !== expected) throw new Error('signature mismatch');
      return JSON.parse(Buffer.from(b, 'base64url').toString());
    }

    const payload = { sub: 'verify-test', iat: Math.floor(Date.now() / 1000) };
    const t1 = makeJwt(payload, secret);
    const t2 = makeJwt(payload, refresh);
    verifyJwt(t1, secret);
    verifyJwt(t2, refresh);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function healthCheck(baseUrl) {
  try {
    const url = baseUrl.replace(/\/$/, '') + '/api/health';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === 'ok') return { ok: true, env: body.env, version: body.version };
    return { ok: false, status: res.status, body: JSON.stringify(body).slice(0, 80) };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 100) };
  }
}

/* ─── Required env vars ──────────────────────────────────────────────────── */
const REQUIRED_VARS = [
  { key: 'DATABASE_URL',        label: 'Database URL'       },
  { key: 'JWT_SECRET',          label: 'JWT Secret'         },
  { key: 'JWT_REFRESH_SECRET',  label: 'JWT Refresh Secret' },
  { key: 'APP_ENV',             label: 'APP_ENV'            },
];
const OPTIONAL_VARS = [
  { key: 'APP_URL',             label: 'App URL'            },
  { key: 'GEMINI_API_KEY',      label: 'Gemini API Key'     },
  { key: 'SMTP_HOST',           label: 'SMTP Host'          },
  { key: 'MIDTRANS_SERVER_KEY', label: 'Midtrans Key'       },
  { key: 'QR_SECRET',           label: 'QR Secret'          },
];

/* ─── Main ───────────────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n${C.bold}${C.cyan}  OSDAI v2.0 — Post-Deploy Verification${C.reset}`);
  console.log(`  ${C.dim}${new Date().toISOString()}${C.reset}`);
  console.log(SEP);

  let totalFail = 0;

  /* 1. .env ──────────────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [1/8] Environment file${C.reset}`);
  const envFileExists = loadEnv();
  if (envFileExists) {
    row(ok, '.env loaded', path.join(ROOT, '.env'));
  } else {
    // On Replit / CI, env vars may be injected directly — not fatal.
    if (process.env.DATABASE_URL) {
      row(warn, '.env file not found — using injected environment variables (Replit/CI mode)');
    } else {
      row(fail, '.env file NOT found and no DATABASE_URL in environment', `expected at ${path.join(ROOT, '.env')}`);
      console.log(`\n${SEPE}`);
      console.log(`  ${C.red}${C.bold}BLOCKED — no .env and no injected vars found${C.reset}`);
      console.log(`${SEPE}\n`);
      process.exit(1);
    }
  }

  /* 2. Required vars ─────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [2/8] Required environment variables${C.reset}`);
  let envFail = 0;
  for (const { key, label } of REQUIRED_VARS) {
    const val = process.env[key];
    if (val) {
      const preview = key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')
        ? '(set, hidden)'
        : val.length > 60 ? val.slice(0, 57) + '…' : val;
      row(ok, label, preview);
    } else {
      row(fail, label, `${key} is not set`);
      envFail++;
    }
  }
  if (envFail) totalFail += envFail;

  console.log(`\n${C.bold}  Optional variables${C.reset}`);
  for (const { key, label } of OPTIONAL_VARS) {
    const val = process.env[key];
    row(val ? ok : warn, `${label}${val ? '' : ' (not set)'}`, '');
  }

  /* 3. DB connection ─────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [3/8] Database connection${C.reset}`);
  const db = await dbCheck();
  if (db.ok) {
    row(ok, 'PostgreSQL connected');
    /* 4. Seeded ──────────────────────────────────────────────────────────── */
    console.log(`\n${C.bold}  [4/8] Database seeded${C.reset}`);
    if (db.userCount > 0) {
      row(ok, `Users table has ${db.userCount} row(s)`);
    } else {
      row(warn, 'No users found — run: npm run seed');
    }
  } else {
    row(fail, 'Database connection FAILED', db.error);
    totalFail++;
    console.log(`\n${C.bold}  [4/8] Database seeded${C.reset}`);
    row(warn, 'Skipped (DB not reachable)');
  }

  /* 5. JWT ────────────────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [5/8] JWT sign/verify test${C.reset}`);
  const jwt = jwtCheck();
  if (jwt.ok) {
    row(ok, 'JWT_SECRET and JWT_REFRESH_SECRET sign & verify correctly');
  } else {
    row(fail, 'JWT check failed', jwt.error);
    totalFail++;
  }

  /* 6. Frontend build ──────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [6/8] Frontend build (dist/)${C.reset}`);
  const indexHtml = path.join(ROOT, 'dist', 'index.html');
  const distExists = fs.existsSync(indexHtml);
  if (distExists) {
    const stat = fs.statSync(indexHtml);
    const age = Math.round((Date.now() - stat.mtimeMs) / 60000);
    row(ok, 'dist/index.html exists', `last modified ${age} min ago`);
  } else {
    row(fail, 'dist/index.html NOT found — run: npm run build');
    totalFail++;
  }

  /* 7. Writable dirs ──────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [7/8] Writable directories${C.reset}`);
  for (const dir of ['uploads', 'logs']) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
      try {
        const testFile = path.join(full, '.write-test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        row(ok, `${dir}/  (exists, writable)`);
      } catch {
        row(fail, `${dir}/  exists but NOT writable`);
        totalFail++;
      }
    } else {
      row(fail, `${dir}/  does NOT exist — run: mkdir -p ${dir}`);
      totalFail++;
    }
  }

  /* 8. Health endpoint ────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [8/8] HTTP health endpoint${C.reset}`);
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    row(warn, 'Skipped — APP_URL not set in .env');
  } else {
    row(info, `Hitting ${appUrl}/api/health …`);
    const h = await healthCheck(appUrl);
    if (h.ok) {
      row(ok, `Health endpoint OK`, `env=${h.env}, version=${h.version}`);
    } else if (h.status) {
      row(fail, `Health endpoint returned HTTP ${h.status}`, h.body);
      totalFail++;
    } else {
      row(fail, `Health endpoint unreachable`, h.error);
      totalFail++;
    }
  }

  /* ─── Summary ─────────────────────────────────────────────────────────── */
  console.log(`\n${SEP}`);
  if (totalFail === 0) {
    console.log(`  ${ok}  ${C.bold}${C.green}ALL CHECKS PASSED — application is ready.${C.reset}`);
  } else {
    console.log(`  ${fail}  ${C.bold}${C.red}${totalFail} check(s) FAILED — fix the issues above.${C.reset}`);
  }
  console.log(`${SEP}\n`);

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(`\n${SEPE}`);
  console.error(`  ${fail}  Unexpected error in verify script:`);
  console.error(`  ${C.dim}${err.message}${C.reset}`);
  console.error(`${SEPE}\n`);
  process.exit(1);
});
