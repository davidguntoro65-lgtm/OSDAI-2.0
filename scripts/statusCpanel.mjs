#!/usr/bin/env node
/**
 * OSDAI — cPanel Status Dashboard
 * Run: npm run cpanel:status
 *
 * Shows at a glance:
 *  • Current deploy (git commit, timestamp)
 *  • Last known-good deploy ref
 *  • System memory & disk usage
 *  • DB connection + active connections count
 *  • uploads/ and logs/ file counts
 *  • Health endpoint response (if APP_URL set)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* ─── ANSI ───────────────────────────────────────────────────────────────── */
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  dim:    '\x1b[2m',
  magenta:'\x1b[35m',
};
const ok   = `${C.green}✓${C.reset}`;
const warn = `${C.yellow}○${C.reset}`;
const fail = `${C.red}✗${C.reset}`;
const SEP  = C.dim + '─'.repeat(62) + C.reset;

function row(icon, label, value = '') {
  const pad = 28;
  const l = label.padEnd(pad);
  const v = value ? `${C.cyan}${value}${C.reset}` : '';
  console.log(`  ${icon}  ${l}${v}`);
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}

function git(args) {
  try { return execSync(`git ${args}`, { cwd: ROOT, stdio: 'pipe' }).toString().trim(); }
  catch { return null; }
}

function fmtBytes(b) {
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
  if (b >= 1048576)    return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1024).toFixed(0) + ' KB';
}

function fmtDate(d) {
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function countFiles(dir) {
  try {
    const entries = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
    return entries.length;
  } catch { return 0; }
}

function dirSize(dir) {
  try {
    const out = execSync(`du -sh "${dir}" 2>/dev/null`, { cwd: ROOT, stdio: 'pipe' }).toString();
    return out.split('\t')[0]?.trim() ?? '?';
  } catch { return '?'; }
}

async function dbStats() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({ log: [] });
    const [activeResult, dbNameResult] = await Promise.all([
      prisma.$queryRaw`SELECT count(*)::int AS cnt FROM pg_stat_activity WHERE state = 'active'`,
      prisma.$queryRaw`SELECT current_database() AS name`,
    ]);
    const [userCount, tableCount] = await Promise.all([
      prisma.user.count(),
      prisma.$queryRaw`SELECT count(*)::int AS cnt FROM information_schema.tables WHERE table_schema = 'public'`,
    ]);
    await prisma.$disconnect();
    return {
      ok: true,
      dbName:      dbNameResult[0]?.name ?? '?',
      activeConns: activeResult[0]?.cnt ?? 0,
      userCount,
      tableCount:  tableCount[0]?.cnt ?? 0,
    };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 100) };
  }
}

async function healthCheck(baseUrl) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const start = Date.now();
    const res = await fetch(baseUrl.replace(/\/$/, '') + '/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    const ms = Date.now() - start;
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.status === 'ok', ms, env: body.env, version: body.version, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message?.slice(0, 80) };
  }
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
async function main() {
  loadEnv();

  const now = new Date();
  console.log(`\n${C.bold}${C.blue}  OSDAI v2.0 — Deployment Status${C.reset}`);
  console.log(`  ${C.dim}${fmtDate(now)}${C.reset}`);
  console.log(SEP);

  /* ── Git / Deploy ──────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  Deploy${C.reset}`);

  const commitHash  = git('rev-parse HEAD') ?? '?';
  const commitShort = commitHash.slice(0, 7);
  const commitMsg   = git('log -1 --pretty=format:"%s"') ?? '?';
  const commitAuthor= git('log -1 --pretty=format:"%an"') ?? '?';
  const commitDate  = git('log -1 --pretty=format:"%ci"') ?? '?';
  row(ok,  'Commit',           `${commitShort}  ${commitMsg}`);
  row(C.dim + 'ℹ' + C.reset, 'Author / date', `${commitAuthor}  ${commitDate}`);

  const goodFile = path.join(ROOT, '.deploy-last-good');
  if (fs.existsSync(goodFile)) {
    const goodHash  = fs.readFileSync(goodFile, 'utf8').trim();
    const goodShort = goodHash.slice(0, 7);
    const goodMsg   = git(`log -1 --pretty=format:"%s" ${goodHash}`) ?? '(unknown)';
    const goodMtime = fmtDate(fs.statSync(goodFile).mtime);
    const isSame    = goodHash === commitHash;
    row(isSame ? ok : warn, 'Last known-good', `${goodShort}  ${goodMsg}`);
    row(C.dim + 'ℹ' + C.reset, 'Saved at',       goodMtime);
    if (!isSame) {
      row(warn, 'Drift detected', 'current ≠ last-good — run cpanel:rollback if unstable');
    }
  } else {
    row(warn, 'Last known-good',  'not saved yet — run cpanel:install first');
  }

  const distFile = path.join(ROOT, 'dist', 'index.html');
  if (fs.existsSync(distFile)) {
    const buildAge = Math.round((Date.now() - fs.statSync(distFile).mtimeMs) / 60000);
    const ageLabel = buildAge < 60
      ? `${buildAge} min ago`
      : buildAge < 1440
        ? `${Math.round(buildAge / 60)} hr ago`
        : `${Math.round(buildAge / 1440)} day(s) ago`;
    row(ok, 'Frontend build',    `dist/index.html  (${ageLabel})`);
  } else {
    row(fail, 'Frontend build',  'dist/index.html missing — run npm run build');
  }

  /* ── System ─────────────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  System${C.reset}`);
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const memPct   = ((usedMem / totalMem) * 100).toFixed(1);
  const memIcon  = parseFloat(memPct) > 85 ? fail : parseFloat(memPct) > 65 ? warn : ok;
  row(memIcon, 'Memory',         `${fmtBytes(usedMem)} / ${fmtBytes(totalMem)}  (${memPct}% used)`);

  const nodeVer  = process.version;
  const platform = `${os.type()} ${os.arch()}`;
  row(ok, 'Node.js',            `${nodeVer}  (${platform})`);
  row(ok, 'Environment',        `${process.env.APP_ENV || process.env.NODE_ENV || 'unknown'}`);

  /* ── Storage ─────────────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  Storage${C.reset}`);
  const uploadsDir = path.join(ROOT, 'uploads');
  const logsDir    = path.join(ROOT, 'logs');

  if (fs.existsSync(uploadsDir)) {
    const n = countFiles(uploadsDir);
    const s = dirSize(uploadsDir);
    row(ok, 'uploads/',          `${n} file(s)  (${s})`);
  } else {
    row(fail, 'uploads/',        'directory missing');
  }

  if (fs.existsSync(logsDir)) {
    const n = countFiles(logsDir);
    const s = dirSize(logsDir);
    const logIcon = n > 100 ? warn : ok;
    row(logIcon, 'logs/',        `${n} file(s)  (${s})${n > 100 ? '  ← consider cleaning' : ''}`);
  } else {
    row(fail, 'logs/',           'directory missing');
  }

  /* ── Database ────────────────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  Database${C.reset}`);
  const db = await dbStats();
  if (db.ok) {
    row(ok,  'Connection',       `connected  (${db.dbName})`);
    row(ok,  'Active queries',   `${db.activeConns} connection(s) active`);
    row(ok,  'Tables (public)',  `${db.tableCount}`);
    row(ok,  'Users (total)',    `${db.userCount}`);
  } else {
    row(fail, 'Connection',      `FAILED — ${db.error}`);
  }

  /* ── Health endpoint ─────────────────────────────────────────────────────── */
  const appUrl = process.env.APP_URL;
  console.log(`\n${C.bold}  HTTP Health${C.reset}`);
  if (!appUrl) {
    row(warn, 'Health check',    'skipped — APP_URL not set');
  } else {
    row(C.dim + 'ℹ' + C.reset, 'Checking', `${appUrl}/api/health …`);
    const h = await healthCheck(appUrl);
    if (h.ok) {
      const speed = h.ms < 300 ? C.green : h.ms < 1000 ? C.yellow : C.red;
      row(ok, 'Health endpoint',  `HTTP 200  env=${h.env}  v=${h.version}  ${speed}${h.ms}ms${C.reset}`);
    } else if (h.status) {
      row(fail, 'Health endpoint', `HTTP ${h.status}`);
    } else {
      row(fail, 'Health endpoint', h.error ?? 'unreachable');
    }
  }

  /* ── Summary ─────────────────────────────────────────────────────────────── */
  console.log(`\n${SEP}`);
  console.log(`  ${C.dim}Run ${C.reset}${C.cyan}npm run cpanel:verify${C.reset}${C.dim} for a full health check.${C.reset}`);
  console.log(`  ${C.dim}Run ${C.reset}${C.cyan}npm run cpanel:rollback${C.reset}${C.dim} to revert to last known-good.${C.reset}`);
  console.log(`${SEP}\n`);
}

main().catch(err => {
  console.error(`\n  ✗  Unexpected error: ${err.message}\n`);
  process.exit(1);
});
