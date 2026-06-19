#!/usr/bin/env node
/**
 * OSDAI — cPanel Rollback Script
 * Run: npm run cpanel:rollback
 *
 * Rolls back to the last known-good commit when a deploy breaks production.
 * Rollback target priority:
 *   1. git ORIG_HEAD  — set automatically by `git pull` (most recent pull target)
 *   2. .deploy-last-good  — written by cpanel:install after a successful verify
 *   3. HEAD~1  — one commit before current (last resort)
 *
 * Steps performed:
 *   1. Find rollback target commit
 *   2. git reset --hard <commit>
 *   3. npm install  (restore deps for that commit)
 *   4. npx prisma generate  (regenerate client for that schema)
 *   5. npm run build  (rebuild frontend)
 *   6. npx prisma migrate deploy  (idempotent — does nothing if already applied)
 *   7. mkdir -p uploads logs
 *   8. npm run cpanel:verify
 *
 * DATABASE IS NOT MODIFIED — prisma migrate deploy is idempotent.
 * If the rollback commit has fewer migrations than what's deployed,
 * those extra migrations stay in the DB but the older code ignores them.
 */

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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
const SEP  = C.dim + '─'.repeat(62) + C.reset;
const SEPE = C.red + '═'.repeat(62) + C.reset;
const SEPG = C.green + '═'.repeat(62) + C.reset;

function row(icon, label, detail = '') {
  const d = detail ? `  ${C.dim}${detail}${C.reset}` : '';
  console.log(`  ${icon}  ${label}${d}`);
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

function run(cmd, label) {
  console.log(`\n  ${C.cyan}▶${C.reset}  ${label}`);
  console.log(`  ${C.dim}$ ${cmd}${C.reset}`);
  const result = spawnSync(cmd, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  if (result.status !== 0) {
    console.log(`\n${SEPE}`);
    console.log(`  ${fail}  ${C.bold}Command failed: ${cmd}${C.reset}`);
    console.log(`${SEPE}\n`);
    process.exit(result.status ?? 1);
  }
}

/* ─── Find rollback target ───────────────────────────────────────────────── */
function findRollbackTarget() {
  // 1. git ORIG_HEAD — set by `git pull` or `git merge` automatically
  const origHead = git('rev-parse ORIG_HEAD');
  if (origHead && /^[0-9a-f]{40}$/.test(origHead)) {
    const msg = git(`log -1 --pretty=format:"%s" ${origHead}`);
    return { hash: origHead, source: 'git ORIG_HEAD (last pull)', message: msg };
  }

  // 2. .deploy-last-good — written by successful cpanel:install
  const goodFile = path.join(ROOT, '.deploy-last-good');
  if (fs.existsSync(goodFile)) {
    const stored = fs.readFileSync(goodFile, 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(stored)) {
      const msg = git(`log -1 --pretty=format:"%s" ${stored}`);
      if (msg !== null) {
        return { hash: stored, source: '.deploy-last-good file', message: msg };
      }
    }
  }

  // 3. HEAD~1 — one commit before current
  const prev = git('rev-parse HEAD~1');
  if (prev && /^[0-9a-f]{40}$/.test(prev)) {
    const msg = git(`log -1 --pretty=format:"%s" ${prev}`);
    return { hash: prev, source: 'HEAD~1 (previous commit)', message: msg };
  }

  return null;
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
async function main() {
  console.log(`\n${C.bold}${C.yellow}  OSDAI v2.0 — cPanel Rollback${C.reset}`);
  console.log(`  ${C.dim}${new Date().toISOString()}${C.reset}`);
  console.log(SEP);

  /* Current state */
  const currentHash  = git('rev-parse HEAD');
  const currentShort = git('rev-parse --short HEAD');
  const currentMsg   = git('log -1 --pretty=format:"%s"');
  console.log(`\n${C.bold}  Current commit${C.reset}`);
  row(warn, `${currentShort}  ${currentMsg}`, currentHash ?? '');

  /* Find rollback target */
  console.log(`\n${C.bold}  Finding rollback target…${C.reset}`);
  const target = findRollbackTarget();
  if (!target) {
    console.log(`\n${SEPE}`);
    console.log(`  ${fail}  ${C.bold}No rollback target found.${C.reset}`);
    console.log(`  ${C.dim}There must be at least 2 commits in the repository.${C.reset}`);
    console.log(`${SEPE}\n`);
    process.exit(1);
  }

  const targetShort = target.hash.slice(0, 7);
  row(ok,   `Rolling back to: ${targetShort}  ${target.message}`, `source: ${target.source}`);

  if (currentHash === target.hash) {
    console.log(`\n${SEPE}`);
    console.log(`  ${warn}  ${C.bold}Already at the rollback target — nothing to do.${C.reset}`);
    console.log(`${SEPE}\n`);
    process.exit(0);
  }

  console.log(SEP);
  console.log(`  ${C.yellow}${C.bold}WARNING: git reset --hard will discard all uncommitted changes.${C.reset}`);
  console.log(`  ${C.yellow}Database is NOT modified — only code and node_modules will change.${C.reset}`);
  console.log(SEP);

  /* ─── Step 1: git reset ──────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [1/7] Git reset to ${targetShort}${C.reset}`);
  run(`git reset --hard ${target.hash}`, `git reset --hard ${targetShort}`);
  const newShort = git('rev-parse --short HEAD');
  row(ok, `Now at: ${newShort}  ${git('log -1 --pretty=format:"%s"')}`);

  /* ─── Step 2-6: Rebuild ──────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [2/7] Install dependencies${C.reset}`);
  run('npm install', 'npm install');

  console.log(`\n${C.bold}  [3/7] Generate Prisma client${C.reset}`);
  run('npx prisma generate', 'npx prisma generate');

  console.log(`\n${C.bold}  [4/7] Build frontend${C.reset}`);
  run('npm run build', 'npm run build');

  console.log(`\n${C.bold}  [5/7] Apply DB migrations (idempotent — no data changes)${C.reset}`);
  run('npx prisma migrate deploy', 'npx prisma migrate deploy');

  console.log(`\n${C.bold}  [6/7] Ensure writable directories${C.reset}`);
  run('mkdir -p uploads logs', 'mkdir -p uploads logs');

  /* ─── Step 7: Verify ────────────────────────────────────────────────── */
  console.log(`\n${C.bold}  [7/7] Verify rollback${C.reset}`);
  run('npm run cpanel:verify', 'npm run cpanel:verify');

  /* ─── Save new last-good ref ─────────────────────────────────────────── */
  const finalHash = git('rev-parse HEAD');
  if (finalHash) {
    fs.writeFileSync(path.join(ROOT, '.deploy-last-good'), finalHash, 'utf8');
  }

  console.log(`\n${SEPG}`);
  console.log(`  ${ok}  ${C.bold}${C.green}ROLLBACK COMPLETE — restart the app in Node.js Selector.${C.reset}`);
  console.log(`${SEPG}\n`);
}

main().catch(err => {
  console.error(`\n${SEPE}`);
  console.error(`  ${fail}  Unexpected error: ${err.message}`);
  console.error(`${SEPE}\n`);
  process.exit(1);
});
