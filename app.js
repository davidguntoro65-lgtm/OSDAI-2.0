/**
 * OSDAI — LiteSpeed / cPanel Entry Point
 *
 * LiteSpeed calls require() on this file (via lsnode.js).
 *
 * CONSTRAINTS (Node 22 + LiteSpeed lsnode.js):
 *  1. No top-level await  → ERR_REQUIRE_ASYNC_MODULE
 *  2. No module.register('tsx/esm') → tsx uses deprecated --loader hook
 *                                      internally → crash on Node 22
 *
 * SOLUTION: tsx/esm/api tsImport() — programmatic API that transpiles
 *  TypeScript on-the-fly WITHOUT registering any global loader hooks.
 *  Works in Node 22, works when loaded via require().
 *
 * Deploy sequence (run in cPanel terminal, inside public_html/osdai):
 *   git pull && npm run cpanel:install
 *   → then click RESTART in Node.js Selector
 */

import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tsImport } from 'tsx/esm/api';

// Resolve .env relative to this file — not process.cwd() which
// LiteSpeed may change to an unpredictable path.
const __appDir = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__appDir, '.env') });

// LiteSpeed does not inject these — set them here.
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}
if (!process.env.APP_ENV) {
  process.env.APP_ENV = 'production';
}

// tsImport() compiles server.ts at runtime using tsx's internal transform
// engine. It does NOT call module.register() / --loader / --import — all of
// which have compatibility issues with Node 22 + LiteSpeed.
tsImport('./server.ts', import.meta.url).catch(err => {
  console.error('[OSDAI] Fatal startup error:', err);
  process.exit(1);
});
