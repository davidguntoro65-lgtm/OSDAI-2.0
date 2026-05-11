# OSDAI — VPS / Cloud Deployment Guide

## Recommended Stack

- Ubuntu 22.04 LTS
- Nginx (reverse proxy)
- PM2 (process manager)
- PostgreSQL 15
- Let's Encrypt SSL (Certbot)

---

## Step 1 — Server Preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install PM2
npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

---

## Step 2 — Database Setup

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE osdai;
CREATE USER osdai_user WITH ENCRYPTED PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE osdai TO osdai_user;
\q
```

---

## Step 3 — Deploy Application

```bash
# Clone
cd /var/www
sudo git clone https://github.com/your-org/osdai.git
sudo chown -R $USER:$USER osdai
cd osdai

# Configure environment
cp .env.example .env
nano .env
# Set: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, APP_URL, etc.

# Setup
npm install
npm run setup
```

---

## Step 4 — Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/osdai
```

```nginx
server {
    listen 80;
    server_name absen.smkn1wonogiri.sch.id;

    # Increase body size for file uploads
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/osdai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 5 — SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d absen.smkn1wonogiri.sch.id
sudo systemctl enable certbot.timer
```

After this, Nginx will serve HTTPS automatically.
OSDAI detects `X-Forwarded-Proto: https` and generates correct URLs.

---

## Step 6 — PM2 Process Manager

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow printed instructions
```

---

## Step 7 — Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Updating from GitHub

```bash
cd /var/www/osdai
git pull origin main
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
pm2 restart osdai
```

---

## Monitoring

```bash
pm2 status          # Process status
pm2 logs osdai      # Live logs
pm2 monit           # CPU/RAM monitor
```

---

## Backup (Cron)

```bash
crontab -e
# Run backup every day at 2 AM
0 2 * * * cd /var/www/osdai && npm run backup >> logs/backup.log 2>&1
```
