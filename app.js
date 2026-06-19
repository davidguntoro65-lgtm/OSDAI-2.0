/**
 * OSDAI — Phusion Passenger / cPanel Entry Point
 *
 * Passenger calls: node app.js
 *
 * What it does:
 *  1. Loads .env from disk (cPanel has no system-level env injection)
 *  2. Forces NODE_ENV=production so Express serves /dist, not Vite
 *  3. Registers the tsx ESM loader for runtime TypeScript transpilation
 *  4. Boots the full Express + Socket.IO server (server.ts)
 *
 * Deployment sequence on cPanel terminal:
 *  1. git pull
 *  2. npm install
 *  3. npx prisma generate
 *  4. npm run build          → compiles React to /dist
 *  5. npx prisma migrate deploy → applies DB migrations
 *  6. mkdir -p uploads logs  → ensure writable dirs exist
 *  7. Restart app in cPanel Node.js Selector
 */

import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Load .env from the directory containing app.js — not process.cwd(),
// which Phusion Passenger can change unpredictably.
const __appDir = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__appDir, '.env') });

// Always production on cPanel — Passenger doesn't set NODE_ENV.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
// Also honour APP_ENV for our own env validator.
if (!process.env.APP_ENV) {
  process.env.APP_ENV = 'production';
}

// Register tsx ESM loader so TypeScript files can be imported at runtime.
// tsx is in "dependencies" (not devDependencies) so it is always present.
register('tsx/esm', pathToFileURL('./'));

// Boot the server. All API routes, Socket.IO, static serving, and SPA
// fallback are defined inside server.ts — nothing is duplicated here.
try {
  await import('./server.ts');
} catch (err) {
  console.error('[OSDAI] Fatal startup error:', err);
  process.exit(1);
}
