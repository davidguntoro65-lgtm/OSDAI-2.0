# OSDAI — Panduan Deployment cPanel (Phusion Passenger)

## Prasyarat
- cPanel dengan **Node.js Selector** (CloudLinux + Phusion Passenger)
- Node.js versi **22.x** tersedia di cPanel Node.js Selector
- Database PostgreSQL sudah dibuat di cPanel
- Domain/subdomain `osdai.smkn1wonogiri.sch.id` sudah diarahkan ke folder yang benar

---

## Langkah 1 — Upload / Clone Proyek

Via SSH atau cPanel Terminal:

```bash
cd ~/public_html
git clone <repo-url> osdai
# atau jika sudah ada: cd osdai && git pull
```

---

## Langkah 2 — Konfigurasi Node.js Selector di cPanel

1. Login cPanel → **Setup Node.js App** (atau "Node.js Selector")
2. Klik **Create Application**
3. Isi pengaturan berikut **dengan tepat**:

   | Setting             | Nilai                                              |
   |---------------------|----------------------------------------------------|
   | Node.js version     | **22.x** (minimal 22.13 — wajib untuk pdfjs-dist) |
   | Application mode    | **Production**                                     |
   | Application root    | `/home/smknwon2/public_html/osdai`                 |
   | Application URL     | `osdai.smkn1wonogiri.sch.id`                       |
   | Application startup file | `app.js`                                      |

4. Klik **Create**

> ⚠️ cPanel akan menulis baris `PassengerNodejs` ke `.htaccess` secara otomatis.
> Jangan mengedit bagian tersebut secara manual.

---

## Langkah 3 — Buat File `.env`

Via cPanel File Manager atau terminal:

```bash
cd ~/public_html/osdai
cp .env.example .env
nano .env   # atau edit via File Manager
```

Isi nilai berikut (wajib):

```env
APP_NAME=OSDAI
APP_ENV=production
APP_URL=https://osdai.smkn1wonogiri.sch.id

# Jangan set APP_PORT — Passenger mengatur PORT otomatis

DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DBNAME?sslmode=disable

JWT_SECRET=<minimal 64 karakter acak>
JWT_REFRESH_SECRET=<minimal 64 karakter acak, berbeda dari JWT_SECRET>
QR_SECRET=<string acak 32 karakter>

GEMINI_API_KEY=<API key dari https://aistudio.google.com/apikey>

EMAIL_PROVIDER=smtp
SMTP_HOST=mail.smkn1wonogiri.sch.id
SMTP_PORT=587
SMTP_USER=noreply@smkn1wonogiri.sch.id
SMTP_PASS=<password email>

CORS_ORIGINS=https://osdai.smkn1wonogiri.sch.id
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
LOG_LEVEL=info
LOG_DIR=logs
```

Generate secret aman via terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Langkah 4 — Install & Build (via cPanel Terminal atau SSH)

```bash
cd ~/public_html/osdai

# Satu perintah: install deps, generate Prisma, build frontend, migrate DB
npm run cpanel:install
```

Perintah ini menjalankan secara berurutan:
1. `npm install` — install semua dependensi
2. `npx prisma generate` — generate Prisma client
3. `npm run build` — compile React ke `/dist`
4. `npx prisma migrate deploy` — terapkan migrasi database
5. `mkdir -p uploads logs` — buat folder yang dibutuhkan server

Jika **first install** dan perlu data awal (opsional):
```bash
npm run cpanel:setup
# sama seperti cpanel:install + seed data demo
```

---

## Langkah 5 — Restart Aplikasi

Di cPanel → **Setup Node.js App** → klik **Restart** di sebelah aplikasi OSDAI.

Passenger akan menjalankan `node app.js` yang:
- Memuat `.env` dari disk
- Menset `NODE_ENV=production`
- Menjalankan Express server
- Melayani API di `/api/*`
- Melayani frontend React dari `/dist`
- Fallback ke `/dist/index.html` untuk SPA routing

---

## Setelah Update Kode (`git pull`)

```bash
cd ~/public_html/osdai
git pull
npm install                    # hanya jika package.json berubah
npm run build                  # rebuild frontend jika ada perubahan src/
npx prisma migrate deploy      # hanya jika ada migrasi baru
```

Kemudian di cPanel: klik **Restart** aplikasi Node.js.

---

## Struktur File Penting

```
public_html/osdai/
├── app.js              ← Passenger entry point (jangan diedit)
├── server.ts           ← Express API server (dimuat oleh app.js)
├── dist/               ← Frontend React hasil build (dibuat oleh npm run build)
├── prisma/             ← Schema & migrasi database
├── src/                ← Source React frontend
├── uploads/            ← File upload siswa/guru (dibuat otomatis)
├── logs/               ← Log server (dibuat otomatis)
├── .env                ← Konfigurasi lingkungan (TIDAK di-commit ke git)
├── .htaccess           ← Konfigurasi Passenger (cPanel menambah baris otomatis)
└── package.json        ← main: "app.js"
```

---

## Troubleshooting

| Problem | Penyebab | Solusi |
|---------|----------|--------|
| Situs menampilkan source code `app.js` | Node.js Selector belum dikonfigurasi | Lakukan Langkah 2 |
| `tsx: not found` | `npm install` belum dijalankan | Jalankan `npm install` |
| `STARTUP FAILED: Missing env vars` | File `.env` belum ada/belum diisi | Cek Langkah 3 |
| `dist/index.html not found` | `npm run build` belum dijalankan | Jalankan `npm run build` |
| `502 Bad Gateway` | App crash saat start | Cek error log di cPanel, pastikan `.env` lengkap |
| Prisma engine error | Binary platform tidak cocok | Jalankan `npx prisma generate` ulang |
| Upload file gagal | Folder `uploads/` belum ada | Jalankan `mkdir -p uploads logs` |
| Database connection refused | `DATABASE_URL` salah | Cek host: gunakan `127.0.0.1`, bukan `localhost` |

### Melihat Error Log

Di cPanel → **Errors** (di bagian Logs), atau via terminal:
```bash
tail -f ~/logs/smknwon2.smkn1wonogiri.sch.id.error.log
```

---

## Verifikasi Instalasi

Setelah restart, kunjungi:
- `https://osdai.smkn1wonogiri.sch.id` → harus tampil halaman login OSDAI
- `https://osdai.smkn1wonogiri.sch.id/api/health` → harus return `{"status":"ok"}`

Akun login default (setelah seed):
- Admin: `admin@smk.id` / `password123`
- Guru: `guru@smk.id` / `password123`
- Siswa: `siswa@smk.id` / `password123`

> ⚠️ **Ganti semua password default** segera setelah login pertama!
