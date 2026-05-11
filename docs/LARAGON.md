# OSDAI — Laragon (Windows Local Development)

## Prerequisites

- [Laragon Full](https://laragon.org/download/) — includes PostgreSQL, Node.js
- Node.js 18+ (add via Laragon → Tools → Quick add → Node.js)
- Git for Windows

---

## Setup

### 1. Enable PostgreSQL in Laragon

1. Open Laragon
2. Menu → Services → PostgreSQL → Start
3. Default credentials: `postgres` / `laragon` (or blank)

### 2. Create Database

Open HeidiSQL or Laragon terminal:
```sql
CREATE DATABASE osdai_dev;
```

### 3. Clone & Configure

```cmd
cd C:\laragon\www
git clone https://github.com/your-org/osdai.git
cd osdai
copy .env.example .env
```

Edit `.env`:
```
APP_ENV=development
APP_PORT=5000
DATABASE_URL=postgresql://postgres:laragon@localhost:5432/osdai_dev
JWT_SECRET=your_64_char_secret_here
JWT_REFRESH_SECRET=your_other_64_char_secret_here
```

### 4. Run Setup

Open Laragon terminal (right-click → Terminal):
```cmd
npm install
npm run setup
```

### 5. Start Development

```cmd
npm run dev
```

Open: `http://localhost:5000`

---

## Hot Reload

Hot Module Replacement (HMR) is enabled by default.
If Vite's HMR port conflicts, set in `.env`:
```
DISABLE_HMR=false
```

---

## Local WebSocket

Socket.IO connects automatically to the same host/port.
No external config needed for local development.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ECONNREFUSED 5432` | Start PostgreSQL in Laragon |
| `permission denied` | Run terminal as Administrator |
| Port 5000 in use | Set `APP_PORT=5001` in `.env` |
| `prisma not found` | Run `npm install` first |
