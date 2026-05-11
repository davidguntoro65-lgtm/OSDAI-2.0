#!/usr/bin/env node
/**
 * OSDAI — Backup Script
 * Run: npm run backup
 *
 * Creates a timestamped backup of:
 *   - PostgreSQL database (pg_dump)
 *   - uploads/ directory
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load .env manually (no ESM dotenv needed)
function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

loadEnv();

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = path.join(root, 'backups', ts);
fs.mkdirSync(backupDir, { recursive: true });

const sep = '═'.repeat(60);
console.log(`\n${sep}`);
console.log(`  OSDAI — Backup  [${ts}]`);
console.log(sep);

// 1. Database backup
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const dbFile = path.join(backupDir, 'database.sql');
  console.log('\n▶  Database backup...');
  try {
    const result = spawnSync('pg_dump', [dbUrl, '-f', dbFile], { stdio: 'inherit' });
    if (result.status === 0) {
      console.log(`✓  Database → backups/${ts}/database.sql`);
    } else {
      console.warn('⚠  pg_dump not available or failed — skipping database backup.');
    }
  } catch {
    console.warn('⚠  pg_dump not found — skipping database backup.');
  }
} else {
  console.warn('⚠  DATABASE_URL not set — skipping database backup.');
}

// 2. Uploads backup
const uploadsDir = path.join(root, 'uploads');
if (fs.existsSync(uploadsDir)) {
  const uploadsBackup = path.join(backupDir, 'uploads');
  console.log('\n▶  Uploads backup...');
  try {
    execSync(`cp -r "${uploadsDir}" "${uploadsBackup}"`, { stdio: 'inherit' });
    console.log(`✓  Uploads → backups/${ts}/uploads/`);
  } catch {
    console.warn('⚠  Failed to backup uploads directory.');
  }
} else {
  console.log('ℹ  No uploads directory found — skipping.');
}

// 3. Write manifest
const manifest = {
  timestamp: ts,
  appVersion: '2.0.0',
  node: process.version,
  platform: process.platform,
};
fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n${sep}`);
console.log(`  ✓  Backup saved to: backups/${ts}/`);
console.log(`${sep}\n`);
