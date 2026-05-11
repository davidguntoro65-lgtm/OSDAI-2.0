#!/usr/bin/env node
/**
 * OSDAI — One-Shot Setup Script
 * Run: npm run setup
 *
 * Steps:
 *   1. Check .env exists
 *   2. Run prisma generate
 *   3. Run prisma migrate
 *   4. Seed default accounts
 *   5. Create required directories
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
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit' });
    console.log(`✓  ${label} — done`);
  } catch (e) {
    console.error(`✗  ${label} — FAILED`);
    process.exit(1);
  }
}

function ensureDir(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`✓  Created directory: ${dir}`);
  }
}

console.log(`\n${sep}`);
console.log('  OSDAI v2.0 — Setup');
console.log(sep);

// 1. Check .env
const envFile = path.join(root, '.env');
if (!fs.existsSync(envFile)) {
  const example = path.join(root, '.env.example');
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, envFile);
    console.log('\n⚠  .env was missing — copied from .env.example.');
    console.log('   Please edit .env and fill in real values, then run npm run setup again.\n');
    process.exit(0);
  } else {
    console.error('\n✗  .env not found and .env.example is missing.');
    console.error('   Create .env manually from the documentation.\n');
    process.exit(1);
  }
}

// 2. Required directories
console.log('\n▶  Creating required directories...');
['uploads', 'logs', 'backups'].forEach(ensureDir);

// 3. Prisma
run('node_modules/.bin/prisma generate', 'Prisma — generate client');
run('node_modules/.bin/prisma migrate deploy', 'Prisma — run migrations');

// 4. Seed
run('node --import tsx/esm prisma/seed.ts', 'Database — seed default accounts');

console.log(`\n${sep}`);
console.log('  ✓  Setup complete!');
console.log('  Run: npm run dev    (development)');
console.log('  Run: npm run start:prod  (production)');
console.log(`${sep}\n`);
