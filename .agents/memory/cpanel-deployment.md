---
name: OSDAI cPanel deployment
description: Key fixes and decisions for deploying OSDAI on cPanel/Passenger at osdai.smkn1wonogiri.sch.id
---

# OSDAI cPanel Deployment — Key Decisions

**Why:** cPanel/Passenger shared hosting has specific constraints that differ from VPS/Docker.

## Critical fixes applied (in order of discovery)

1. **Prisma binaryTargets** — Added `linux-musl-openssl-3.0.x`, `debian-openssl-3.0.x`, `rhel-openssl-3.0.x` in `prisma/schema.prisma`.

2. **isProduction() case-insensitive** — Uses `.toLowerCase() === 'production'`. Passenger may set `NODE_ENV=Production`.

3. **Socket.IO transports** — `['polling', 'websocket']` + `allowEIO3: true`. Polling must be first.

4. **APP_PORT on cPanel** — Must NOT be set in `.env`. Passenger sets `PORT`; code reads `APP_PORT || PORT || 5000`.

5. **dist path uses `__dirname`** — Changed from `process.cwd()` which is unreliable under Passenger.

6. **`.htaccess`** — `PassengerEnabled on`, `PassengerStartupFile app.js`, `PassengerAppType node`. Rules block server files, pass `/api/` to Passenger, fall back to `dist/` when Passenger not running.

7. **AI services conditional httpOptions** — Only pass `httpOptions` when `AI_INTEGRATIONS_GEMINI_BASE_URL` is defined.

8. **`app.js` sets `APP_ENV=production`** — Required by our `initEnv()` validator alongside `NODE_ENV`.

9. **`/api/health` endpoint** — Added for post-deploy verification.

10. **`auth.ts` REFRESH_SECRET key name** — Changed `process.env.REFRESH_SECRET` → `process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET`.

11. **`app.js` dotenv explicit path** — Changed from `import 'dotenv/config'` to `dotenvConfig({ path: join(__appDir, '.env') })` using `dirname(fileURLToPath(import.meta.url))`. Passenger changes `process.cwd()` so dotenv/config fails to find `.env`.

12. **`app.js` tsx register base URL (CRITICAL — root 503 cause)** — Changed `register('tsx/esm', pathToFileURL('./'))` → `register('tsx/esm', new URL('./', import.meta.url))`. `pathToFileURL('./')` uses `process.cwd()` which Passenger changes. The tsx ESM loader couldn't be found → `server.ts` import threw "Unknown file extension '.ts'" → app crashed → Passenger retried ~5x → 503 after 20s.

13. **`emailService.ts` top-level transporter** — Changed from module-level `const transporter = nodemailer.createTransport(...)` to a lazy `getTransporter()` function. Top-level call with undefined SMTP vars caused module import issues on cPanel.

14. **`src/lib/prisma.ts` query logging** — Disabled `log: ['query']` in production. Stdout flood under Passenger's pipe buffer.

## cPanel Node.js Selector settings (exact)
- Node.js version: **22.x** (≥22.13 required for pdfjs-dist)
- Application mode: **Production**
- Application root: `/home/smknwon2/public_html/osdai`
- Application URL: `osdai.smkn1wonogiri.sch.id`
- Startup file: `app.js`

## cPanel .env required keys
```
DATABASE_URL=postgresql://smknwon2_absen_user:PASSWORD@127.0.0.1:5432/smknwon2_absen_db?sslmode=disable
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<different long random string>
GEMINI_API_KEY=<key>
APP_ENV=production
APP_URL=https://osdai.smkn1wonogiri.sch.id
CORS_ORIGINS=https://osdai.smkn1wonogiri.sch.id
MIDTRANS_IS_PRODUCTION=false
EMAIL_PROVIDER=smtp
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
QR_SECRET=<random string>
LOG_LEVEL=info
LOG_DIR=logs
```
- Do NOT set `APP_PORT` — Passenger sets `PORT`

## Deploy sequence on cPanel (terminal, inside public_html/osdai)
```bash
git pull
npm run cpanel:install
```
Then click **RESTART** in cPanel Node.js Selector.

## Verification after deploy
- `https://osdai.smkn1wonogiri.sch.id/api/health` → `{"status":"ok","env":"production","version":"2.0.0"}`

## How to read Passenger crash logs
```bash
tail -100 ~/logs/osdai.smkn1wonogiri.sch.id.error.log
```
