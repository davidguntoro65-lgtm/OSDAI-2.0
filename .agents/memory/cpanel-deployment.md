---
name: OSDAI cPanel deployment
description: Key fixes and decisions for deploying OSDAI on cPanel/Passenger at osdai.smkn1wonogiri.sch.id
---

# OSDAI cPanel Deployment — Key Decisions

**Why:** cPanel/Passenger shared hosting has specific constraints that differ from VPS/Docker.

## Critical fixes applied

1. **Prisma binaryTargets** — Added `linux-musl-openssl-3.0.x`, `debian-openssl-3.0.x`, `rhel-openssl-3.0.x` in `prisma/schema.prisma`. Without this Prisma client won't run on cPanel Linux.

2. **isProduction() case-insensitive** — `domain.ts` and `server.ts` both now use `.toLowerCase() === 'production'`. cPanel Passenger may set `NODE_ENV=Production` (capital P) in user `.env`.

3. **Socket.IO transports** — Server set to `['polling', 'websocket']` + `allowEIO3: true`. All 5 client `io()` calls use same order. Shared hosting proxies often can't upgrade WebSocket, so polling must be the fallback.

4. **Midtrans isProduction** — Was hardcoded `false`. Now reads `MIDTRANS_IS_PRODUCTION === 'true'`.

5. **APP_PORT on cPanel** — Must NOT be set in `.env` on cPanel. Passenger sets `PORT` env var automatically; our code reads `APP_PORT || PORT || 5000`.

6. **Static file serving** — `server.ts` checks `(NODE_ENV || APP_ENV).toLowerCase() === 'production'`. Added `maxAge: '1d'` cache for assets.

7. **deploy.mjs** — Changed `npm ci --omit=dev` to `npm install`. `tsx` is a runtime dependency (not devDependency), so omitting dev deps would still include it, but `npm install` is safer.

## cPanel .env required keys
- `DATABASE_URL` — PostgreSQL at `127.0.0.1:5432` with `?sslmode=disable`
- `APP_ENV=production` (or `NODE_ENV=production` set by Passenger)
- `APP_URL=https://osdai.smkn1wonogiri.sch.id`
- `CORS_ORIGINS=https://osdai.smkn1wonogiri.sch.id`
- `JWT_SECRET` + `JWT_REFRESH_SECRET`
- `GEMINI_API_KEY`
- Do NOT set `APP_PORT` — let Passenger set `PORT`

## Deploy sequence on cPanel
1. `git pull` in `public_html/osdai`
2. `npm run cpanel:install` (install → prisma generate → migrate → vite build)
3. Restart app in cPanel Node.js Selector

## Node.js version
cPanel server: 22.22.3 — compatible with all dependencies including `pdfjs-dist` (requires >=22.13).
