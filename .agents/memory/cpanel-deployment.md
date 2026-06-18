---
name: OSDAI cPanel deployment
description: Key fixes and decisions for deploying OSDAI on cPanel/Passenger at osdai.smkn1wonogiri.sch.id
---

# OSDAI cPanel Deployment — Key Decisions

**Why:** cPanel/Passenger shared hosting has specific constraints that differ from VPS/Docker.

## Critical fixes applied

1. **Prisma binaryTargets** — Added `linux-musl-openssl-3.0.x`, `debian-openssl-3.0.x`, `rhel-openssl-3.0.x` in `prisma/schema.prisma`. Without this Prisma client won't run on cPanel Linux.

2. **isProduction() case-insensitive** — `domain.ts` and `server.ts` both now use `.toLowerCase() === 'production'`. cPanel Passenger may set `NODE_ENV=Production` (capital P).

3. **Socket.IO transports** — Server set to `['polling', 'websocket']` + `allowEIO3: true`. Shared hosting proxies often can't upgrade WebSocket, so polling must be first.

4. **Midtrans isProduction** — Reads `MIDTRANS_IS_PRODUCTION === 'true'`, not hardcoded.

5. **APP_PORT on cPanel** — Must NOT be set in `.env`. Passenger sets `PORT` env var; our code reads `APP_PORT || PORT || 5000`.

6. **dist path uses `__dirname`** — `server.ts` production static file path changed from `process.cwd()` to `__dirname`. `process.cwd()` is unreliable under Passenger on cPanel.

7. **`.htaccess` RewriteRule removed** — The `RewriteRule ^(.*)$ app.js [QSA,L]` was causing Apache to serve `app.js` as plain text when Passenger wasn't active. Removed entirely. Added `PassengerStartupFile app.js`, `PassengerAppType node`, `PassengerMaxPoolSize 1`. Removed hardcoded `PassengerNodejs` path — cPanel Node.js Selector writes this line automatically.

8. **AI services conditional httpOptions** — `enterprise.ts` and `intelligence.ts` only pass `httpOptions` to GoogleGenAI when `AI_INTEGRATIONS_GEMINI_BASE_URL` is defined (Replit). On cPanel it's undefined and was causing startup warnings. Fixed with conditional spread.

9. **`uploads/` and `logs/` in git** — Added `.gitkeep` files so these directories exist on fresh clone. `.gitignore` updated to `uploads/*` / `!uploads/.gitkeep` pattern.

10. **`app.js` sets `APP_ENV=production`** — Added alongside `NODE_ENV=production` since our validator checks `APP_ENV`. Also added `try/catch` around `await import('./server.ts')`.

11. **`/api/health` endpoint** — Added to `server.ts` for post-deploy verification at `https://osdai.smkn1wonogiri.sch.id/api/health`.

12. **`cpanel:install` script order fixed** — Now: `npm install → prisma generate → npm run build → prisma migrate deploy → mkdir -p uploads logs`. Build before migrate ensures Vite works; mkdir ensures writable dirs exist.

## cPanel Node.js Selector settings (exact)
- Node.js version: **22.x** (≥22.13 required for pdfjs-dist)
- Application mode: **Production**
- Application root: `/home/smknwon2/public_html/osdai`
- Application URL: `osdai.smkn1wonogiri.sch.id`
- Startup file: `app.js`

## cPanel .env required keys
- `DATABASE_URL` — PostgreSQL at `127.0.0.1:5432` with `?sslmode=disable`
- `APP_ENV=production`
- `APP_URL=https://osdai.smkn1wonogiri.sch.id`
- `CORS_ORIGINS=https://osdai.smkn1wonogiri.sch.id`
- `JWT_SECRET` + `JWT_REFRESH_SECRET`
- `GEMINI_API_KEY`
- Do NOT set `APP_PORT` — let Passenger set `PORT`

## Deploy sequence on cPanel
1. `git pull` in `public_html/osdai`
2. `npm run cpanel:install` (install → prisma generate → build → migrate → mkdir)
3. Restart app in cPanel Node.js Selector

## Verification after deploy
- `https://osdai.smkn1wonogiri.sch.id` → login page
- `https://osdai.smkn1wonogiri.sch.id/api/health` → `{"status":"ok"}`
