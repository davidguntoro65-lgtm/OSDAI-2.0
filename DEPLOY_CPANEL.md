# OSDAI — cPanel Deployment Guide (Phusion Passenger)

## Prerequisites
- cPanel with Node.js Selector (CloudLinux + Phusion Passenger)
- PostgreSQL database created in cPanel
- Node.js 18.19+ selected in cPanel Node.js Selector

---

## Step 1 — Upload / Clone the Project

```bash
cd /home/<username>/
git clone <your-repo-url> osdai
```

Or upload via File Manager and extract to `/home/<username>/osdai/`.

---

## Step 2 — Create the `.env` File

Copy the example and fill in your cPanel PostgreSQL credentials:

```bash
cp .env.example .env
nano .env
```

Minimum required values:

```env
APP_ENV=production
APP_URL=https://yourdomain.com
APP_PORT=3000

DATABASE_URL=postgresql://cpanel_db_user:password@localhost:5432/cpanel_db_name

JWT_SECRET=<generate: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 64>
QR_SECRET=<generate: openssl rand -hex 32>

EMAIL_PROVIDER=smtp
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_password
```

> **Note:** `GEMINI_API_KEY` is only needed if running outside Replit.
> On Replit, the `AI_INTEGRATIONS_GEMINI_*` variables are auto-provisioned.

---

## Step 3 — Set Up the App in cPanel Node.js Selector

1. Log into cPanel → **Setup Node.js App**
2. Click **Create Application**
3. Set:
   - **Node.js version**: 20.x (or latest LTS ≥ 18.19)
   - **Application mode**: Production
   - **Application root**: `/home/<username>/osdai`
   - **Application URL**: `yourdomain.com` (or subdomain)
   - **Application startup file**: `app.js`
4. Click **Create**

---

## Step 4 — Install Dependencies & Build

Open the **cPanel Terminal** or SSH:

```bash
cd /home/<username>/osdai

# One-command setup
npm run cpanel:install
```

This runs in order:
1. `npm install` — installs all dependencies
2. `npm run build` — compiles React frontend to `/dist`
3. `npx prisma generate` — generates Prisma client
4. `npx prisma migrate deploy` — applies migrations to PostgreSQL

---

## Step 5 — Restart the Application

In cPanel → **Setup Node.js App** → click **Restart** next to your app.

Passenger will now run `node app.js` which:
- Loads `.env` automatically
- Starts the Express server in production mode
- Serves API routes under `/api/*`
- Serves the compiled React app from `/dist`
- Falls back all unmatched routes to `/dist/index.html` (SPA routing)

---

## After Code Updates (git pull)

```bash
cd /home/<username>/osdai
git pull
npm install          # only if package.json changed
npm run build        # rebuild frontend
npx prisma migrate deploy   # only if schema changed
```

Then in cPanel: **Restart** the Node.js application.

---

## File Structure Reference

```
/ (application root)
├── app.js              ← Passenger entry point (this is the "key")
├── server.ts           ← Full Express API server (loaded by app.js)
├── dist/               ← Compiled React frontend (created by npm run build)
├── prisma/             ← PostgreSQL schema & migrations
├── src/                ← React frontend source
├── package.json        ← main: "app.js", all deps in "dependencies"
└── .env                ← Environment variables (copy from .env.example)
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `tsx: not found` | Run `npm install` — tsx is in dependencies |
| `STARTUP FAILED: Missing env vars` | Check `.env` file is present and filled |
| `dist/index.html not found` | Run `npm run build` |
| 502 Bad Gateway | Check cPanel error logs; restart the Node.js app |
| Prisma engine error | Run `npx prisma generate` again |
| Port conflict | Set `APP_PORT` in `.env` to match cPanel's assigned port |
