---
name: Absensi Audit P1-P3 Fixes
description: External audit 11-item implementation for attendance (absensi) system — key decisions and gotchas
---

## Student model: single parent, not array
`Student` has `parent Parent?` (singular) and `parentId String`. Use `include: { parent: { include: { user: true } } }` and `if (student.parent)` — never `parents`.

## LATE_THRESHOLD_SECONDS from SystemConfig
Configurable threshold via `prisma.systemConfig.findUnique({ where: { key: 'LATE_THRESHOLD_SECONDS' } })`. Default: 600. Cached in-process with `_lateThresholdCache`. To change per sekolah, insert row via SystemConfig admin.

## officialStartTime computation
In `activateSignal()`: reads `TimetableConfig.startAt` (HH:MM) + `Schedule.periodStart`, computes today's official start. `referenceTime = session.officialStartTime ?? session.startTime` — prevents guru late-open causing all students TERLAMBAT.

## Bridge sync pattern (StudentAttendance → Attendance)
No unique constraint on Attendance(studentId, scheduleId). Must use `findFirst` + conditional `update`/`create`, NOT `upsert`.  
STATUS_MAP: `HADIR→PRESENT, TERLAMBAT→LATE, ALFA→ABSENT, IZIN→PERMISSION, SAKIT→SICK, INVALID→ABSENT`.

## ClassroomEngagement: no unique constraint
Same pattern as Attendance — `findFirst` then conditional update/create on (sessionId, studentId).

## Fire-and-forget email after transaction
Store queue on `(updated as any).__alfaEmailQueue`, read after `$transaction` completes, then `setImmediate(async () => { ... })`. Never await emails inside transactions.

## TeacherClassAnalytics
Schema: `teacherId, sessionId (String, no FK), attendanceRate, engagementRate, punctualityRate, classStabilityScore, aiTeachingScore`. Created once per session in `closeSignal()`. No unique constraint — just `create`.

## New endpoints (server.ts)
- `PATCH /api/intelligence/attendance/:id/status` — status override with ownership check (GURU own sessions only)
- `POST /api/intelligence/attendance/manual` — creates CLOSED session + attendances + bridge sync
- `GET /api/intelligence/rekap/kelas/:classId` — per-siswa rekap with IZIN/SAKIT/ALFA/TERLAMBAT breakdown

## GuruRekap.tsx filter fix
Old code used `/api/lms/courses?courseId=` (dead filter). New code uses `/api/classes` + `/api/subjects` separately, then passes `classId` + `subjectId` to `/api/intelligence/sessions`. Added tab "Per Siswa" with date range filter calling `GET /api/intelligence/rekap/kelas/:classId`.

## Pre-existing TS errors
`server.ts` has pre-existing errors (studentAttendances, TeacherClassAnalytics upsert shape, App.tsx motion Variants). Do NOT attempt to fix these without reading the full context — they involve separate features (parent dashboard, teacher analytics admin page) that may use different patterns.
