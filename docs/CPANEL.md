# OSDAI — cPanel / Node.js Hosting Deployment

## Prerequisites

- cPanel with Node.js Selector (CloudLinux)
- Node.js 18+ application
- PostgreSQL database (via cPanel or external)
- SSH access (recommended)

---

## Step 1 — Create PostgreSQL Database

In cPanel → **PostgreSQL Databases**:
1. Create database: `youraccount_osdai`
2. Create user: `youraccount_osdai_user`
3. Assign user to database (All Privileges)
4. Note the connection details

---

## Step 2 — Upload Files

**Option A — Git (recommended):**
```bash
cd ~/public_html
git clone https://github.com/your-org/osdai.git osdai
```

**Option B — File Manager:**
Upload the project ZIP and extract to `~/osdai/` (outside public_html for security).

---

## Step 3 — Configure Node.js App in cPanel

1. cPanel → **Node.js Selector** → **Create Application**
2. Settings:
   - Node.js version: `18.x` or higher
   - Application mode: `Production`
   - Application root: `/home/youraccount/osdai`
   - Application URL: `yourdomain.com` (or subdomain)
   - Application startup file: `server.ts`
   - Passenger log file: `/home/youraccount/osdai/logs/passenger.log`

---

## Step 4 — Environment Variables

In the Node.js Selector → **Environment Variables** tab, add:

```
APP_NAME=OSDAI
APP_ENV=production
APP_PORT=3000
DATABASE_URL=postgresql://youraccount_osdai_user:password@localhost:5432/youraccount_osdai
JWT_SECRET=your_64_char_random_string
JWT_REFRESH_SECRET=your_other_64_char_random_string
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_password
CORS_ORIGINS=https://yourdomain.com
```

> **Never** put secrets in source code or commit `.env` to Git.

---

## Step 5 — Install & Deploy via SSH

```bash
cd ~/osdai
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
```

---

## Step 6 — Start Application

In cPanel → Node.js Selector → click **Run JS Script**:
```
scripts/deploy.mjs
```

Or via SSH:
```bash
npm run start:prod
```

---

## Step 7 — Reverse Proxy (Apache .htaccess)

Create/edit `public_html/.htaccess`:
```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

Or use cPanel's built-in proxy configuration.

---

## Updating

```bash
cd ~/osdai
git pull origin main
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
# Restart via cPanel Node.js Selector → Restart
```

---

## SSL

Enable via cPanel → **Let's Encrypt SSL** (free, auto-renews).
OSDAI automatically detects HTTPS from `X-Forwarded-Proto` headers.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| 503 Service Unavailable | Check Node.js app is started in Selector |
| Mixed content errors | Ensure `APP_URL` starts with `https://` |
| WebSocket not connecting | Ensure proxy passes WebSocket upgrades |
| Database connection refused | Verify `DATABASE_URL` hostname/port |
