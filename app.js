/**
 * OSDAI — Phusion Passenger / cPanel Entry Point
 *
 * This file is the "key" for cPanel Node.js hosting.
 * Passenger calls: node app.js
 *
 * What it does:
 *  1. Loads .env from disk (for cPanel environments without system-level env vars)
 *  2. Registers the tsx ESM loader so TypeScript files can be imported at runtime
 *  3. Starts the full Express server (server.ts) in production mode
 *
 * Deployment sequence on cPanel:
 *  1. git pull
 *  2. npm install
 *  3. npm run build          → compiles React frontend to /dist
 *  4. npx prisma generate    → generates Prisma client
 *  5. npx prisma db push     → syncs schema to PostgreSQL
 *  6. Passenger restarts app → runs: node app.js
 */

import 'dotenv/config';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register tsx ESM loader — enables runtime TypeScript transpilation.
// tsx is listed in "dependencies" so it is available in production.
register('tsx/esm', pathToFileURL('./'));

// Force production mode so Express serves /dist static files, not Vite dev server.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Boot the server.
// All API routes, Socket.IO, static file serving, and SPA fallback
// are defined inside server.ts — nothing is duplicated here.
await import('./server.ts');
