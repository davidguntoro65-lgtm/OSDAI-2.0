#!/usr/bin/env node
/**
 * OSDAI — Production Deploy Script
 * Run: npm run deploy
 *
 * Steps:
 *   1. Validate environment
 *   2. Install dependencies (production only)
 *   3. Generate Prisma client
 *   4. Run migrations
 *   5. Build frontend (Vite)
 *   6. Print launch command
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sep = '═'.repeat(60);

function run(cmd, label) {
  console.log(`\n▶  ${label}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
  console.log(`✓  ${label} — done`);
}

function ensureDir(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
}

console.log(`\n${sep}`);
console.log('  OSDAI v2.0 — Production Deploy');
console.log(sep);

// Check .env
if (!fs.existsSync(path.join(root, '.env'))) {
  console.error('\n✗  .env not found. Cannot deploy without environment configuration.\n');
  process.exit(1);
}

ensureDir('uploads');
ensureDir('logs');
ensureDir('backups');

run('npm ci --omit=dev', 'Install production dependencies');
run('node_modules/.bin/prisma generate', 'Prisma — generate client');
run('node_modules/.bin/prisma migrate deploy', 'Prisma — run migrations');
run('node_modules/.bin/vite build', 'Frontend — build');

console.log(`\n${sep}`);
console.log('  ✓  Deploy build complete!');
console.log('');
console.log('  Start the server:');
console.log('    npm run start:prod');
console.log('');
console.log('  Or with PM2:');
console.log('    pm2 start ecosystem.config.js --env production');
console.log(`${sep}\n`);
