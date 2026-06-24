# Laporan Detail: Model Absensi Kelas OSDAI v2.0

**Tanggal Analisis:** 24 Juni 2026  
**Sistem:** OSDAI — Otomatisasi Sekolah Digital Berbasis AI  
**Versi:** 2.0.0  

---

## 1. Ringkasan Eksekutif

Sistem absensi kelas OSDAI menggunakan **dua lapisan model** yang saling melengkapi:

| Lapisan | Model | Mekanisme | Status |
|---|---|---|---|
| **Legacy / Jadwal** | `Attendance` | Berbasis jadwal (timetable) | Pasif — dicatat manual/rekap |
| **Real-time / Sesi** | `StudentAttendance` + `ClassSession` | Berbasis sinyal token kriptografi | Aktif — real-time via Socket.IO |

Selain itu terdapat 5 model pendukung: `ClassroomEngagement`, `GpsIntegrityLog`, `SchoolGeofence`, `GeofenceChangeLog`, dan `TeacherClassAnalytics`.

---

## 2. Model Database — Detail Lengkap

### 2.1 `Attendance` (Model Legacy)

Model absensi klasik yang terikat langsung ke jadwal pelajaran.

```prisma
model Attendance {
  id         String           @id @default(uuid())
  studentId  String
  scheduleId String
  status     AttendanceStatus @default(PRESENT)
  note       String?
  timestamp  DateTime         @default(now())

  student    Student          @relation(...)
  schedule   Schedule         @relation(...)
}
```

**Enum `AttendanceStatus`:**

| Nilai | Makna |
|---|---|
| `PRESENT` | Hadir |
| `ABSENT` | Tidak hadir tanpa keterangan |
| `LATE` | Terlambat |
| `SICK` | Sakit |
| `PERMISSION` | Izin |

**Relasi:**
- `Student` → melalui `studentId`
- `Schedule` → terikat ke slot jadwal spesifik (hari, jam, kelas, guru, ruangan)

**Digunakan untuk:** Rekap absensi historis, laporan harian, perhitungan risiko siswa (threshold < 75%).

---

### 2.2 `ClassSession` (Sesi Kelas Real-Time)

Model yang merepresentasikan satu sesi kelas aktif yang dibuka oleh guru.

```prisma
model ClassSession {
  id             String   @id @default(uuid())
  teacherId      String
  classId        String
  subjectId      String
  scheduleId     String?
  startTime      DateTime @default(now())
  endTime        DateTime?
  signalStatus   String   @default("ACTIVE")   -- ACTIVE | CLOSED
  sessionToken   String   @unique               -- Token kriptografi 4 byte (hex)
  integrityScore Float    @default(1.0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  teacher        Teacher
  class          Class
  subject        Subject
  attendances    StudentAttendance[]
  engagements    ClassroomEngagement[]
}
```

**Status Sesi (`signalStatus`):**

| Nilai | Kondisi |
|---|---|
| `ACTIVE` | Sesi sedang berlangsung, siswa dapat merespons |
| `CLOSED` | Sesi ditutup guru, siswa yang belum merespons otomatis di-ALFA |

**Keamanan:**
- Token dihasilkan secara kriptografis: `randomBytes(4).toString('hex').toUpperCase()` → 8 karakter hex unik
- Pencegahan sesi duplikat: satu kelas hanya boleh punya 1 sesi `ACTIVE` sekaligus
- Validasi kepemilikan: hanya guru pemilik sesi yang dapat menutupnya
- Audit log otomatis pada `SIGNAL_ACTIVATE` dan `SIGNAL_CLOSE`

---

### 2.3 `StudentAttendance` (Absensi Siswa Real-Time)

Model inti absensi berbasis sinyal. Setiap siswa tercatat satu record per sesi.

```prisma
model StudentAttendance {
  id                String   @id @default(uuid())
  studentId         String
  sessionId         String
  timestamp         DateTime @default(now())
  attendanceStatus  String                       -- HADIR | TERLAMBAT | ALFA | INVALID
  responseLatency   Int?                         -- Detik sejak sesi dibuka
  gpsLatitude       Float?
  gpsLongitude      Float?
  gpsValidated      Boolean  @default(false)
  deviceFingerprint String?
  integrityScore    Float    @default(1.0)        -- 0.0 = tidak valid, 1.0 = valid
  confirmationStatus String  @default("UNCONFIRMED") -- UNCONFIRMED | CONFIRMED

  student           Student
  session           ClassSession

  @@unique([studentId, sessionId])               -- Satu siswa = satu record per sesi
}
```

**Status Absensi (`attendanceStatus`):**

| Nilai | Kondisi Penetapan | `integrityScore` |
|---|---|---|
| `HADIR` | Merespons dalam 600 detik + GPS valid | `1.0` |
| `TERLAMBAT` | Merespons setelah > 600 detik (10 menit) | `1.0` |
| `INVALID` | GPS di luar geofence sekolah | `0.0` |
| `ALFA` | Tidak merespons saat sesi ditutup (auto-assign) | `0.0` |

**Status Konfirmasi (`confirmationStatus`):**

| Nilai | Kondisi |
|---|---|
| `CONFIRMED` | Status valid (HADIR/TERLAMBAT) atau divalidasi guru |
| `UNCONFIRMED` | Status `INVALID` menunggu validasi guru |

**Constraint Unik:** `@@unique([studentId, sessionId])` — mencegah absensi ganda per sesi.

---

### 2.4 `ClassroomEngagement` (Keterlibatan Kelas)

Model untuk mengukur partisipasi siswa selama sesi berlangsung.

```prisma
model ClassroomEngagement {
  id                  String   @id @default(uuid())
  sessionId           String
  studentId           String
  responseActivity    Int      @default(0)   -- Jumlah respons sinyal
  taskParticipation   Int      @default(0)   -- Tugas yang dikerjakan
  quizParticipation   Int      @default(0)   -- Kuis yang diikuti
  lmsInteractionScore Int      @default(0)   -- Interaksi LMS (bahan ajar, diskusi)
  engagementLevel     Float    @default(0.0) -- Skor gabungan (0.0 - 1.0)
  aiBehaviorScore     Float    @default(0.0) -- Skor AI prediksi perilaku
  createdAt           DateTime @default(now())

  session             ClassSession
  student             Student
}
```

---

### 2.5 `GpsIntegrityLog` (Log Integritas GPS)

Setiap kali siswa mengirim koordinat GPS, dicatat ke model ini untuk audit forensik.

```prisma
model GpsIntegrityLog {
  id         String   @id @default(uuid())
  studentId  String
  lat        Float
  lng        Float
  accuracy   Float
  isMock     Boolean  @default(false)   -- Deteksi GPS palsu/emulator
  deviceInfo String?
  timestamp  DateTime @default(now())

  student    Student
}
```

**Deteksi Kecurangan:**
- Field `isMock` menandai GPS yang berasal dari emulator/mock location
- Laporan integritas dihitung: `integrityRate = (total - mockCount) / total × 100`
- Laporan kepatuhan geofence: `geofenceComplianceRate = insideCount / total × 100`

---

### 2.6 `SchoolGeofence` (Konfigurasi Geofence Sekolah)

Satu konfigurasi aktif mendefinisikan batas fisik sekolah untuk validasi GPS.

```prisma
model SchoolGeofence {
  id           String   @id @default(uuid())
  name         String   @default("SMKN 1 Wonogiri")
  latitude     Float    @default(-7.8123)
  longitude    Float    @default(110.9234)
  radiusMeters Int      @default(200)   -- Radius dalam meter
  isActive     Boolean  @default(true)
  description  String?
  createdBy    String?
  updatedBy    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  changeLogs   GeofenceChangeLog[]
}
```

**Default:** SMKN 1 Wonogiri, koordinat `-7.8123, 110.9234`, radius 200 meter.  
**Auto-seed:** Jika tidak ada konfigurasi, sistem otomatis membuat konfigurasi default.  
**Cache:** Konfigurasi di-cache in-memory selama 60 detik untuk performa.

---

### 2.7 `GeofenceChangeLog` (Audit Trail Geofence)

Setiap perubahan geofence dicatat lengkap dengan before/after.

```prisma
model GeofenceChangeLog {
  id            String         @id @default(uuid())
  geofenceId    String
  changedBy     String
  changedByName String?
  prevLatitude  Float?
  prevLongitude Float?
  prevRadius    Int?
  newLatitude   Float
  newLongitude  Float
  newRadius     Int
  newName       String?
  reason        String?        -- Alasan perubahan
  createdAt     DateTime       @default(now())

  geofence      SchoolGeofence
}
```

---

### 2.8 `TeacherClassAnalytics` (Analitik Guru per Sesi)

Ringkasan analitik per sesi untuk laporan kinerja guru.

```prisma
model TeacherClassAnalytics {
  id                  String   @id @default(uuid())
  teacherId           String
  sessionId           String
  attendanceRate      Float    -- % hadir
  engagementRate      Float    -- % keterlibatan
  punctualityRate     Float    -- % tepat waktu
  classStabilityScore Float    -- Stabilitas kelas
  aiTeachingScore     Float    -- Skor pengajaran AI
  generatedAt         DateTime @default(now())

  teacher             Teacher
}
```

---

## 3. Alur Proses Absensi (Business Flow)

```
[GURU membuka sesi]
        │
        ▼
 IntelligenceService.activateSignal()
  ├── Validasi: guru ada? kelas ada? mata pelajaran ada?
  ├── Cek: tidak boleh ada sesi ACTIVE untuk kelas ini
  ├── Buat sessionToken (8 karakter hex kriptografis)
  ├── INSERT ClassSession {signalStatus: ACTIVE}
  ├── INSERT AuditLog {action: SIGNAL_ACTIVATE}
  └── Socket.IO emit: 'session-opened' → semua client

        │
        ▼ (siswa melihat sesi aktif via polling/socket)

[SISWA merespons sinyal]
        │
        ▼
 IntelligenceService.respondToSignal()
  ├── Validasi: sesi masih ACTIVE?
  ├── Validasi: sessionToken cocok? (jika tidak → log INVALID_TOKEN_ATTEMPT)
  ├── Validasi: siswa bagian dari kelas ini?
  ├── Cek duplikat: @@unique([studentId, sessionId])
  ├── Ambil koordinat GPS siswa
  ├── Validasi geofence: jarak ke pusat sekolah ≤ radiusMeters?
  ├── INSERT GpsIntegrityLog
  ├── Hitung responseLatency (detik sejak sesi dibuka)
  ├── Tetapkan status:
  │     responseLatency > 600s → TERLAMBAT
  │     GPS di luar geofence  → INVALID
  │     selainnya             → HADIR
  ├── INSERT StudentAttendance
  ├── INSERT AuditLog {action: STUDENT_ATTEND}
  └── Socket.IO emit: 'attendance-update' → teacher dashboard

        │
        ▼

[GURU menutup sesi]
        │
        ▼
 IntelligenceService.closeSignal()
  ├── Validasi: guru adalah pemilik sesi
  ├── UPDATE ClassSession {signalStatus: CLOSED, endTime: now()}
  ├── Kumpulkan siswa yang TIDAK merespons (aktif di kelas)
  ├── INSERT StudentAttendance {status: ALFA} untuk setiap siswa alfa
  ├── INSERT AuditLog {action: SIGNAL_CLOSE, alfaMarked: N}
  └── Socket.IO emit: 'session-closed' → semua client di room

        │
        ▼

[GURU memvalidasi INVALID]
        │
        ▼
 PATCH /api/intelligence/attendance/:id/validate
  ├── UPDATE StudentAttendance {status: HADIR, confirmationStatus: CONFIRMED}
  └── Socket.IO emit: 'attendance-update' → teacher dashboard (badge real-time)
```

---

## 4. API Endpoints Absensi

### Endpoint Sesi (Guru)

| Method | Path | Peran | Fungsi |
|---|---|---|---|
| `POST` | `/api/intelligence/activate` | GURU, SUPER_ADMIN | Buka sesi kelas baru |
| `POST` | `/api/intelligence/close` | GURU, SUPER_ADMIN | Tutup sesi kelas |
| `GET` | `/api/intelligence/my-sessions` | GURU, SUPER_ADMIN | Daftar sesi guru ini |
| `GET` | `/api/intelligence/sessions` | GURU, SUPER_ADMIN | Riwayat sesi (rekap) |
| `GET` | `/api/intelligence/session/:id/metrics` | Semua | Metrik per sesi |
| `POST` | `/api/intelligence/session/:id/ai-insights` | Semua | Insight AI per sesi |
| `POST` | `/api/intelligence/attendance/:id/validate` | GURU, SUPER_ADMIN | Validasi absensi INVALID |

### Endpoint Siswa

| Method | Path | Peran | Fungsi |
|---|---|---|---|
| `POST` | `/api/intelligence/respond` | SISWA | Kirim respons sinyal absensi |
| `GET` | `/api/intelligence/active-session` | SISWA | Cek sesi aktif kelas ini |
| `GET` | `/api/intelligence/attendance/history` | SISWA | Riwayat absensi siswa |

### Endpoint GPS & Geofence

| Method | Path | Peran | Fungsi |
|---|---|---|---|
| `POST` | `/api/gps/log` | SISWA | Catat log lokasi GPS |
| `GET` | `/api/gps/geofence` | Semua | Ambil konfigurasi geofence aktif |
| `POST` | `/api/gps/geofence` | SUPER_ADMIN, TU | Update konfigurasi geofence |
| `GET` | `/api/gps/geofence/history` | SUPER_ADMIN, TU, KEPALA_SEKOLAH | Riwayat perubahan geofence |
| `GET` | `/api/gps/reports` | SUPER_ADMIN, TU, KEPALA_SEKOLAH, BK, SATPAM | Laporan log GPS |
| `GET` | `/api/gps/reports/summary` | SUPER_ADMIN, TU, KEPALA_SEKOLAH, BK | Ringkasan integritas GPS |
| `GET` | `/api/gps/reports/export` | SUPER_ADMIN, TU, KEPALA_SEKOLAH | Export CSV laporan GPS |

### Endpoint Orang Tua

| Method | Path | Peran | Fungsi |
|---|---|---|---|
| `GET` | `/api/parent/child/:studentId/attendance` | ORANG_TUA | Pantau absensi anak |

### Endpoint Dashboard

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/intelligence/dashboard` | Data dashboard: rekap absensi hari ini (HADIR, TERLAMBAT, ALFA) |
| `GET` | `/api/intelligence/sessions/list` | Daftar sesi dengan jumlah hadir/terlambat/alfa per sesi |

---

## 5. Algoritma Geofence (Haversine Formula)

Validasi lokasi menggunakan formula Haversine untuk jarak geodetik:

```
R = 6,371,000 meter (jari-jari bumi)

φ₁ = lat siswa (radian)
φ₂ = lat sekolah (radian)
Δφ = φ₂ - φ₁
Δλ = lng₂ - lng₁

a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
jarak = R × 2 × atan2(√a, √(1-a))

isInside = jarak ≤ radiusMeters
```

**Default Sekolah:** `-7.8123, 110.9234` | **Radius:** 200 meter

---

## 6. Mekanisme Keamanan & Anti-Kecurangan

| Mekanisme | Implementasi |
|---|---|
| **Token Kriptografis** | `randomBytes(4).hex()` — 4 byte = 2³² kombinasi unik |
| **Pencegahan Duplikat** | `@@unique([studentId, sessionId])` di database level |
| **Satu Sesi per Kelas** | Query cek `findFirst({classId, signalStatus: 'ACTIVE'})` sebelum create |
| **Validasi Kepemilikan** | Guru hanya bisa tutup sesi milik sendiri (`session.teacherId !== requestingTeacherId`) |
| **Deteksi GPS Mock** | Field `isMock` di `GpsIntegrityLog`, `isMock: true` → flagged |
| **Validasi Geofence** | GPS di luar radius → status `INVALID`, `integrityScore = 0.0` |
| **Token Attempt Log** | Token salah → `AuditLog {action: INVALID_TOKEN_ATTEMPT}` |
| **Device Fingerprint** | `deviceFingerprint` disimpan per record absensi |
| **Latency Tracking** | `responseLatency` (detik) dicatat untuk analisis ketepatan waktu |
| **Auto-ALFA** | Saat sesi ditutup, siswa tidak hadir otomatis di-marking ALFA |
| **Audit Trail Lengkap** | Setiap aksi kritis masuk `AuditLog` dan `SecurityAuditLog` |

---

## 7. Real-Time Events (Socket.IO)

| Event | Dipicu Saat | Diterima Oleh |
|---|---|---|
| `session-opened` | Guru membuka sesi | Semua client (broadcast) |
| `session-closed` | Guru menutup sesi | Client di room `session-{id}` |
| `attendance-update` | Siswa merespons / guru memvalidasi | Client di room `session-{id}` |
| `join-session` | Client bergabung ke room sesi | - |

---

## 8. Kalkulasi Risiko Siswa (AI Intelligence)

Absensi digunakan untuk menghitung skor risiko siswa:

```
riskScore = 0

IF attendanceRate < 75%  → riskScore += 40
IF attendanceRate < 50%  → riskScore += 30 (tambahan)
IF nilai tidak lengkap   → riskScore += (nilai)
```

**Threshold:** `attendanceRate < 75%` → siswa masuk kategori berisiko tinggi (dikomunikasikan ke BK/Wali Kelas/Orang Tua).

---

## 9. Diagram Relasi Antar Model

```
User ──────────────────────────────────────────────────────┐
  │                                                         │
  ├── Student ──────────────────────────────────────┐       │
  │     ├── Attendance → Schedule                   │       │
  │     ├── StudentAttendance → ClassSession         │       │
  │     ├── ClassroomEngagement → ClassSession       │       │
  │     └── GpsIntegrityLog                         │       │
  │                                                  │       │
  └── Teacher ──────────────────────────────────┐   │       │
        ├── ClassSession ──────────────────────-┤   │       │
        │     ├── StudentAttendance[]            │   │       │
        │     └── ClassroomEngagement[]          │   │       │
        └── TeacherClassAnalytics                │   │       │
                                                 │   │       │
Class ───────────────────────────────────────────┘   │       │
  ├── Schedule ── Attendance                          │       │
  └── Student[] ──────────────────────────────────────       │
                                                             │
SchoolGeofence ── GeofenceChangeLog ─────────────────────────┘
```

---

## 10. Ringkasan Field Kritis

| Model | Field Kritis | Tipe | Keterangan |
|---|---|---|---|
| `ClassSession` | `sessionToken` | String UNIQUE | Token 8 hex kriptografis |
| `ClassSession` | `signalStatus` | ACTIVE/CLOSED | Status sesi |
| `ClassSession` | `integrityScore` | Float 0.0-1.0 | Skor integritas sesi |
| `StudentAttendance` | `attendanceStatus` | HADIR/TERLAMBAT/ALFA/INVALID | Status akhir absensi |
| `StudentAttendance` | `responseLatency` | Int (detik) | Ketepatan waktu respons |
| `StudentAttendance` | `gpsValidated` | Boolean | Apakah GPS dalam geofence |
| `StudentAttendance` | `integrityScore` | Float 0.0-1.0 | 1.0=valid, 0.0=tidak valid |
| `StudentAttendance` | `confirmationStatus` | UNCONFIRMED/CONFIRMED | Perlu validasi guru atau tidak |
| `StudentAttendance` | `deviceFingerprint` | String | ID unik perangkat siswa |
| `GpsIntegrityLog` | `isMock` | Boolean | Deteksi GPS palsu |
| `SchoolGeofence` | `radiusMeters` | Int | Radius geofence sekolah |
| `Attendance` | `status` | Enum 5 nilai | Status absensi berbasis jadwal |

---

*Laporan ini dihasilkan dari analisis lengkap source code OSDAI v2.0 — prisma/schema.prisma, src/services/intelligence.ts, src/services/gps.ts, server.ts, dan src/components/StudentAttendancePanel.tsx*
