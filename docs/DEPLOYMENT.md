# OSDAI v2.0 — Deployment Guide

## Quick Reference

| Environment | Command | Port |
|---|---|---|
| Development | `npm run dev` | 5000 |
| Production build | `npm run deploy` | — |
| Production start | `npm run start:prod` | 5000 |
| One-shot setup | `npm run setup` | — |

---

## 1. Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

---

## 2. Initial Setup (Any Environment)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/osdai.git
cd osdai

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Edit .env — fill in DATABASE_URL, JWT_SECRET, etc.
nano .env

# 5. One-shot setup (migrate DB + seed + create dirs)
npm run setup
```

---

## 3. Environment Variables

All configuration lives in `.env`. Never hardcode values in source code.

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | At least 64 random characters |
| `JWT_REFRESH_SECRET` | At least 64 random characters |

### Auto-Detected (Optional)

| Variable | Description |
|---|---|
| `APP_URL` | Base URL. Auto-detected from Replit/host if blank. |
| `APP_PORT` | Server port. Default: `5000` |
| `APP_ENV` | `development` or `production` |

### Features

| Variable | Description |
|---|---|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email/OTP delivery |
| `MIDTRANS_SERVER_KEY` | Payment gateway |
| `GEMINI_API_KEY` | AI features (auto-provided on Replit) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | Requests per window (default: 100) |

---

## 4. Production Build

```bash
# Full production deploy (installs, migrates, builds frontend)
npm run deploy

# Then start the server
npm run start:prod
```

---

## 5. Database Management

```bash
npm run prisma:migrate      # Apply pending migrations (production)
npm run prisma:migrate:dev  # Create + apply a new migration (dev)
npm run prisma:generate     # Regenerate Prisma client
npm run prisma:studio       # Open Prisma Studio UI
npm run seed                # Seed default accounts
```

---

## 6. Backup

```bash
npm run backup
# Creates: backups/YYYY-MM-DD-HH-MM-SS/
#   database.sql
#   uploads/
#   manifest.json
```

---

## 7. PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start ecosystem.config.js --env production

# Save & auto-restart on boot
pm2 save
pm2 startup
```

---

## 8. Updating from GitHub

```bash
git pull origin main
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
pm2 restart osdai
```

No source code changes needed after deploy — all config via `.env`.
