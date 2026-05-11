#!/usr/bin/env node
/**
 * OSDAI — Environment Validator
 * Run: npm run validate:env
 *
 * Checks all required env vars and prints a health report.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return false;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
  return true;
}

const sep = '═'.repeat(60);

if (!loadEnv()) {
  console.error(`\n${sep}`);
  console.error('  ✗  .env file not found!');
  console.error(`  Copy .env.example to .env and fill in the values.`);
  console.error(`${sep}\n`);
  process.exit(1);
}

const checks = [
  { key: 'DATABASE_URL',       label: 'Database URL',        required: true  },
  { key: 'JWT_SECRET',         label: 'JWT Secret',          required: true  },
  { key: 'JWT_REFRESH_SECRET', label: 'JWT Refresh Secret',  required: true  },
  { key: 'APP_URL',            label: 'App URL',             required: false },
  { key: 'SMTP_HOST',          label: 'SMTP Host',           required: false },
  { key: 'SMTP_USER',          label: 'SMTP User',           required: false },
  { key: 'MIDTRANS_SERVER_KEY',label: 'Midtrans Server Key', required: false },
  { key: 'GEMINI_API_KEY',     label: 'Gemini API Key',      required: false },
  { key: 'QR_SECRET',          label: 'QR Secret',           required: false },
];

console.log(`\n${sep}`);
console.log('  OSDAI — Environment Health Check');
console.log(sep);

let failed = false;
for (const check of checks) {
  const val = process.env[check.key];
  const status = val ? '✓' : (check.required ? '✗' : '○');
  const label = check.required ? check.label : `${check.label} (optional)`;
  if (!val && check.required) failed = true;
  console.log(`  ${status}  ${label}`);
}

console.log(sep);
if (failed) {
  console.log('  Status: FAIL — fix required variables before starting.\n');
  process.exit(1);
} else {
  console.log('  Status: OK — environment is ready.\n');
}
