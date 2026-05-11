/**
 * OSDAI Demo Mode — Full Production Seeder
 * Idempotent: safe to re-run. Uses upsert everywhere.
 * Creates: majors, subjects, academic year, rooms, classes,
 *          teachers (10), students (45), timetable (DEMO version),
 *          attendance history (10 school days), demo accounts, announcements.
 */

import { PrismaClient, Role, MajorCode, SubjectType, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hash(pw, 10);

/** Returns the last N school days (Mon–Fri) before today */
function schoolDays(n: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  while (days.length < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days.reverse();
}

/** Weighted random attendance status (realistic distribution) */
function randomStatus(): AttendanceStatus {
  const r = Math.random();
  if (r < 0.70) return AttendanceStatus.PRESENT;
  if (r < 0.85) return AttendanceStatus.LATE;
  if (r < 0.93) return AttendanceStatus.SICK;
  if (r < 0.97) return AttendanceStatus.PERMISSION;
  return AttendanceStatus.ABSENT;
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════');
  console.log('  OSDAI DEMO SEEDER — Starting...');
  console.log('════════════════════════════════════════\n');

  // ── 1. System config: mark demo mode active ──────────────────────────────
  await prisma.systemConfig.upsert({
    where: { key: 'DEMO_MODE' },
    update: { value: 'true' },
    create: { key: 'DEMO_MODE', value: 'true' },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'SCHOOL_NAME' },
    update: { value: 'SMKN 1 Wonogiri' },
    create: { key: 'SCHOOL_NAME', value: 'SMKN 1 Wonogiri' },
  });

  // ── 2. Majors ─────────────────────────────────────────────────────────────
  console.log('→ Seeding majors...');
  const majorDefs = [
    { code: MajorCode.AKL,  name: 'Akuntansi dan Keuangan Lembaga',          description: 'Kompetensi keahlian akuntansi keuangan lembaga' },
    { code: MajorCode.MPLB, name: 'Manajemen Perkantoran dan Layanan Bisnis', description: 'Kompetensi keahlian manajemen perkantoran' },
    { code: MajorCode.PM,   name: 'Pemasaran',                                description: 'Kompetensi keahlian pemasaran dan bisnis' },
    { code: MajorCode.TB,   name: 'Tata Boga',                                description: 'Kompetensi keahlian kuliner dan tata boga' },
    { code: MajorCode.TBS,  name: 'Tata Busana',                              description: 'Kompetensi keahlian tata busana dan fashion' },
  ];
  for (const m of majorDefs) {
    await prisma.major.upsert({ where: { code: m.code }, update: {}, create: m });
  }
  const majors = await prisma.major.findMany();
  const mAKL  = majors.find(m => m.code === 'AKL')!;
  const mMPLB = majors.find(m => m.code === 'MPLB')!;
  const mPM   = majors.find(m => m.code === 'PM')!;
  const mTB   = majors.find(m => m.code === 'TB')!;
  const mTBS  = majors.find(m => m.code === 'TBS')!;

  // ── 3. Subjects ───────────────────────────────────────────────────────────
  console.log('→ Seeding subjects...');
  const subjectDefs = [
    // Normatif (shared)
    { code: 'AGAMA',   name: 'Pendidikan Agama dan Budi Pekerti', type: SubjectType.NORMATIF, credits: 3, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'PPKN',    name: 'Pendidikan Pancasila dan Kewarganegaraan', type: SubjectType.NORMATIF, credits: 2, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'BIN',     name: 'Bahasa Indonesia',                  type: SubjectType.NORMATIF, credits: 4, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'MTK',     name: 'Matematika',                        type: SubjectType.ADAPTIF,  credits: 4, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'BING',    name: 'Bahasa Inggris',                    type: SubjectType.NORMATIF, credits: 3, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'PJOK',    name: 'Pendidikan Jasmani, Olahraga dan Kesehatan', type: SubjectType.NORMATIF, credits: 2, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'SENBUD',  name: 'Seni Budaya',                       type: SubjectType.NORMATIF, credits: 2, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'INFO',    name: 'Informatika',                        type: SubjectType.ADAPTIF,  credits: 3, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'SEJ',     name: 'Sejarah Indonesia',                  type: SubjectType.NORMATIF, credits: 2, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    // Adaptif (shared)
    { code: 'DKEJ',    name: 'Dasar-Dasar Kejuruan',               type: SubjectType.ADAPTIF,  credits: 2, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'PKK',     name: 'Projek Kreatif dan Kewirausahaan',   type: SubjectType.ADAPTIF,  credits: 5, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    { code: 'SIMDIG',  name: 'Simulasi Digital',                   type: SubjectType.ADAPTIF,  credits: 3, majors: [mAKL, mMPLB, mPM, mTB, mTBS] },
    // Produktif AKL
    { code: 'AKDAR',   name: 'Akuntansi Dasar',                    type: SubjectType.PRODUKTIF, credits: 4, majors: [mAKL] },
    { code: 'SPRAK',   name: 'Spreadsheet Akuntansi',              type: SubjectType.PRODUKTIF, credits: 3, majors: [mAKL] },
    { code: 'PERBAN',  name: 'Perbankan Dasar',                    type: SubjectType.PRODUKTIF, credits: 3, majors: [mAKL] },
    { code: 'AKEU',    name: 'Akuntansi Keuangan',                 type: SubjectType.PRODUKTIF, credits: 4, majors: [mAKL] },
    { code: 'KOMPAK',  name: 'Komputer Akuntansi',                 type: SubjectType.PRODUKTIF, credits: 3, majors: [mAKL] },
    { code: 'ADPAJ',   name: 'Administrasi Pajak',                 type: SubjectType.PRODUKTIF, credits: 3, majors: [mAKL] },
    { code: 'PRAKT',   name: 'Praktikum Akuntansi Perusahaan',     type: SubjectType.PRODUKTIF, credits: 4, majors: [mAKL] },
    // Produktif MPLB
    { code: 'ADUM',    name: 'Administrasi Umum',                  type: SubjectType.PRODUKTIF, credits: 4, majors: [mMPLB] },
    { code: 'KORNIS',  name: 'Korespondensi Bisnis',               type: SubjectType.PRODUKTIF, credits: 3, majors: [mMPLB] },
    { code: 'OTKP',    name: 'Otomatisasi Tata Kelola Perkantoran',type: SubjectType.PRODUKTIF, credits: 4, majors: [mMPLB] },
    { code: 'KEARSIP', name: 'Kearsipan Digital',                  type: SubjectType.PRODUKTIF, credits: 3, majors: [mMPLB] },
    { code: 'HUMAS',   name: 'Public Relation Dasar',              type: SubjectType.PRODUKTIF, credits: 3, majors: [mMPLB] },
    { code: 'KOMKAN',  name: 'Komunikasi Kantor',                  type: SubjectType.PRODUKTIF, credits: 3, majors: [mMPLB] },
    { code: 'TEKKAN',  name: 'Teknologi Perkantoran',              type: SubjectType.PRODUKTIF, credits: 4, majors: [mMPLB] },
    // Produktif PM
    { code: 'DPEM',    name: 'Dasar Pemasaran',                    type: SubjectType.PRODUKTIF, credits: 4, majors: [mPM] },
    { code: 'DIGMKT',  name: 'Digital Marketing',                  type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    { code: 'RETAIL',  name: 'Penjualan Retail',                   type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    { code: 'KOMBIS',  name: 'Komunikasi Bisnis',                  type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    { code: 'MANPROD', name: 'Manajemen Produk',                   type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    { code: 'ADTRANS', name: 'Administrasi Transaksi',             type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    { code: 'BRAND',   name: 'Branding dan Promosi',               type: SubjectType.PRODUKTIF, credits: 3, majors: [mPM] },
    // Produktif TB
    { code: 'KULINER', name: 'Dasar Kuliner',                      type: SubjectType.PRODUKTIF, credits: 6, majors: [mTB] },
    { code: 'MAKIND',  name: 'Pengolahan Makanan Indonesia',       type: SubjectType.PRODUKTIF, credits: 5, majors: [mTB] },
    { code: 'BAKERY',  name: 'Bakery dan Pastry',                  type: SubjectType.PRODUKTIF, credits: 4, majors: [mTB] },
    { code: 'HYSAN',   name: 'Hygiene dan Sanitasi',               type: SubjectType.PRODUKTIF, credits: 2, majors: [mTB] },
    { code: 'TATAHID', name: 'Tata Hidang',                        type: SubjectType.PRODUKTIF, credits: 4, majors: [mTB] },
    { code: 'MINUMAN', name: 'Pengolahan Minuman',                 type: SubjectType.PRODUKTIF, credits: 3, majors: [mTB] },
    { code: 'GIZI',    name: 'Gizi Kuliner',                       type: SubjectType.PRODUKTIF, credits: 2, majors: [mTB] },
    // Produktif TBS
    { code: 'DTBS',    name: 'Dasar Tata Busana',                  type: SubjectType.PRODUKTIF, credits: 6, majors: [mTBS] },
    { code: 'DESBUS',  name: 'Desain Busana',                      type: SubjectType.PRODUKTIF, credits: 4, majors: [mTBS] },
    { code: 'POLBAS',  name: 'Pola Dasar',                         type: SubjectType.PRODUKTIF, credits: 4, majors: [mTBS] },
    { code: 'TEKJAHIT',name: 'Teknik Menjahit',                    type: SubjectType.PRODUKTIF, credits: 5, majors: [mTBS] },
    { code: 'TEKSTIL', name: 'Tekstil dan Bahan',                  type: SubjectType.PRODUKTIF, credits: 3, majors: [mTBS] },
    { code: 'FASHDIG', name: 'Fashion Digital',                    type: SubjectType.PRODUKTIF, credits: 3, majors: [mTBS] },
    { code: 'PRODBUS', name: 'Produksi Busana',                    type: SubjectType.PRODUKTIF, credits: 4, majors: [mTBS] },
  ];

  for (const s of subjectDefs) {
    const subj = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, type: s.type, credits: s.credits },
      create: { code: s.code, name: s.name, type: s.type, credits: s.credits },
    });
    for (const maj of s.majors) {
      await prisma.subjectMajor.upsert({
        where: { subjectId_majorId: { subjectId: subj.id, majorId: maj.id } },
        update: {},
        create: { subjectId: subj.id, majorId: maj.id },
      });
    }
  }
  const allSubjects = await prisma.subject.findMany();
  const S = (code: string) => allSubjects.find(s => s.code === code)!;

  // ── 4. Academic Year ──────────────────────────────────────────────────────
  console.log('→ Seeding academic year...');
  const ay = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: { isActive: true },
    create: {
      name: '2025/2026',
      term: 1,
      isActive: true,
      startDate: new Date('2025-07-14'),
      endDate: new Date('2026-06-30'),
    },
  });
  // Deactivate all other years
  await prisma.academicYear.updateMany({
    where: { name: { not: '2025/2026' } },
    data: { isActive: false },
  });

  // Timetable config for this year
  await prisma.timetableConfig.upsert({
    where: { academicYearId: ay.id },
    update: {},
    create: {
      academicYearId: ay.id,
      periodDuration: 45,
      startAt: '07:00',
      periodsPerDay: 10,
      breakSlots: JSON.stringify([{ period: 4, duration: 15 }, { period: 7, duration: 30 }]),
    },
  });

  // ── 5. Rooms ──────────────────────────────────────────────────────────────
  console.log('→ Seeding rooms...');
  const roomDefs = [
    { name: 'Ruang Kelas AKL 1',  capacity: 36, building: 'A', type: 'CLASSROOM' },
    { name: 'Ruang Kelas MPLB 1', capacity: 36, building: 'A', type: 'CLASSROOM' },
    { name: 'Ruang Kelas TB 1',   capacity: 36, building: 'B', type: 'CLASSROOM' },
    { name: 'Lab Komputer 1',     capacity: 36, building: 'A', type: 'LAB' },
    { name: 'Lab Komputer 2',     capacity: 36, building: 'A', type: 'LAB' },
    { name: 'Aula SMKN 1',        capacity: 200, building: 'C', type: 'GYM' },
    { name: 'Dapur Praktik TB',   capacity: 30, building: 'B', type: 'WORKSHOP' },
    { name: 'Studio Busana',      capacity: 30, building: 'B', type: 'STUDIO' },
  ];
  for (const r of roomDefs) {
    await prisma.room.upsert({ where: { name: r.name }, update: {}, create: r });
  }
  const rooms = await prisma.room.findMany();
  const R = (name: string) => rooms.find(r => r.name === name)!;

  // ── 6. Classes ────────────────────────────────────────────────────────────
  console.log('→ Seeding classes...');
  const classDefs = [
    { name: 'X AKL 1',  grade: 10, majorId: mAKL.id,  academicYearId: ay.id },
    { name: 'X MPLB 1', grade: 10, majorId: mMPLB.id, academicYearId: ay.id },
    { name: 'X TB 1',   grade: 10, majorId: mTB.id,   academicYearId: ay.id },
  ];
  for (const c of classDefs) {
    await prisma.class.upsert({
      where: { name_academicYearId: { name: c.name, academicYearId: c.academicYearId } },
      update: {},
      create: c,
    });
  }
  const classes = await prisma.class.findMany({ where: { academicYearId: ay.id } });
  const CL = (name: string) => classes.find(c => c.name === name)!;

  // ── 7. Demo Login Accounts ────────────────────────────────────────────────
  console.log('→ Seeding demo accounts...');
  const demoAccounts = [
    { email: 'superadmin@osdai.id',      password: 'osdai123',    role: Role.SUPER_ADMIN,    name: 'Super Admin OSDAI',              username: 'superadmin_osdai' },
    { email: 'kepsek@smkn1wonogiri.id',  password: 'wonogiri123', role: Role.KEPALA_SEKOLAH, name: 'Drs. H. Sugiyono, M.Pd',         username: 'kepsek_osdai' },
    { email: 'admin@smkn1wonogiri.id',   password: 'admin123',    role: Role.TU,             name: 'Hj. Siti Aisyah, S.E.',          username: 'admin_osdai' },
    { email: 'bendahara@smkn1wonogiri.id', password: 'osdai123',  role: Role.BENDAHARA,      name: 'Dra. Endang Wulandari',          username: 'bendahara_osdai' },
    { email: 'bk@smkn1wonogiri.id',      password: 'osdai123',    role: Role.BK,             name: 'Drs. Bambang Triyanto, M.Pd',    username: 'bk_osdai' },
  ];
  for (const acc of demoAccounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!existing) {
      await prisma.user.create({
        data: { email: acc.email, password: await hash(acc.password), role: acc.role, name: acc.name },
      });
    }
  }

  // ── 8. Teachers (10) ──────────────────────────────────────────────────────
  console.log('→ Seeding teachers...');
  const teacherDefs = [
    { email: 'guru.budi@smkn1wonogiri.id',   password: 'guru123',  name: 'Budi Santoso, S.Pd',           nuptk: '1234567890123401', dept: 'Bahasa Indonesia',   spec: 'Bahasa Indonesia' },
    { email: 'guru.siti@smkn1wonogiri.id',   password: 'guru123',  name: 'Siti Rahayu, S.Pd',            nuptk: '1234567890123402', dept: 'Matematika',          spec: 'Matematika' },
    { email: 'guru.ahmad@smkn1wonogiri.id',  password: 'guru123',  name: 'Ahmad Fauzi, S.Pd',            nuptk: '1234567890123403', dept: 'Bahasa Inggris',      spec: 'Bahasa Inggris' },
    { email: 'guru.dewi@smkn1wonogiri.id',   password: 'guru123',  name: 'Dewi Kusumaningrum, S.Pd, Ak', nuptk: '1234567890123404', dept: 'Akuntansi',           spec: 'Akuntansi Keuangan' },
    { email: 'guru.eko@smkn1wonogiri.id',    password: 'guru123',  name: 'Eko Prasetyo, S.Pd',           nuptk: '1234567890123405', dept: 'Administrasi',        spec: 'Manajemen Perkantoran' },
    { email: 'guru.wahyu@smkn1wonogiri.id',  password: 'guru123',  name: 'Wahyu Widodo, S.Pd',           nuptk: '1234567890123406', dept: 'IPS',                 spec: 'PPKN dan Sejarah' },
    { email: 'guru.nining@smkn1wonogiri.id', password: 'guru123',  name: 'Nining Kusuma, S.Pd',          nuptk: '1234567890123407', dept: 'Tata Boga',           spec: 'Kuliner dan Pastry' },
    { email: 'guru.hendra@smkn1wonogiri.id', password: 'guru123',  name: 'Hendra Gunawan, S.Kom',        nuptk: '1234567890123408', dept: 'Teknik Informatika',  spec: 'Informatika dan TIK' },
    { email: 'guru.ratna@smkn1wonogiri.id',  password: 'guru123',  name: 'Ratna Sari, S.Pd',             nuptk: '1234567890123409', dept: 'Olahraga',            spec: 'PJOK dan Seni Budaya' },
    { email: 'guru.sri@smkn1wonogiri.id',    password: 'guru123',  name: 'Sri Lestari, S.Pd, Ak',        nuptk: '1234567890123410', dept: 'Akuntansi',           spec: 'Komputer Akuntansi' },
    { email: 'guru.akl@smkn1wonogiri.id',    password: 'guru123',  name: 'Agus Wibowo, S.Pd, Ak',        nuptk: '1234567890123411', dept: 'Akuntansi',           spec: 'Akuntansi Dasar', isDemo: true },
  ];

  const teacherMap: Record<string, { userId: string; teacherId: string }> = {};
  for (const t of teacherDefs) {
    let user = await prisma.user.findUnique({ where: { email: t.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: t.email, password: await hash(t.password), role: Role.GURU, name: t.name },
      });
    }
    let teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: { userId: user.id, nuptk: t.nuptk, department: t.dept, specialization: t.spec, status: 'ACTIVE' },
      });
    }
    teacherMap[t.email] = { userId: user.id, teacherId: teacher.id };
  }

  // Named teacher shortcuts
  const T = (email: string) => teacherMap[email].teacherId;
  const T1  = T('guru.budi@smkn1wonogiri.id');    // BIN
  const T2  = T('guru.siti@smkn1wonogiri.id');    // MTK
  const T3  = T('guru.ahmad@smkn1wonogiri.id');   // BING
  const T4  = T('guru.dewi@smkn1wonogiri.id');    // AKDAR/AKEU
  const T5  = T('guru.eko@smkn1wonogiri.id');     // ADUM/KORNIS/OTKP
  const T6  = T('guru.wahyu@smkn1wonogiri.id');   // PPKN/SEJ
  const T7  = T('guru.nining@smkn1wonogiri.id');  // KULINER/MAKIND/BAKERY
  const T8  = T('guru.hendra@smkn1wonogiri.id');  // INFO/SIMDIG
  const T9  = T('guru.ratna@smkn1wonogiri.id');   // PJOK/SENBUD
  const T10 = T('guru.sri@smkn1wonogiri.id');     // SPRAK/KOMPAK
  // demo login guru
  const T_DEMO = T('guru.akl@smkn1wonogiri.id');

  // ── 9. Students (45 — 15 per class) ──────────────────────────────────────
  console.log('→ Seeding students...');

  type StudentDef = { name: string; nis: string; nisn: string; email: string; gender: string; birthDate: string };
  const studentGroups: Array<{ classId: string; prefix: string; demoEmail?: string; demoPass?: string; students: StudentDef[] }> = [
    {
      classId: CL('X AKL 1').id,
      prefix: '2501',
      demoEmail: 'siswa.akl01@smkn1wonogiri.id',
      demoPass: 'siswa123',
      students: [
        { name: 'Aditya Nugroho Saputra',    nis: '25010001', nisn: '0115000001', email: 'aditya.nugroho@siswa.smkn1wng.id',  gender: 'MALE',   birthDate: '2009-03-15' },
        { name: 'Bella Kusuma Dewi',          nis: '25010002', nisn: '0115000002', email: 'bella.kusuma@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-06-22' },
        { name: 'Candra Wibowo Prakoso',      nis: '25010003', nisn: '0115000003', email: 'candra.wibowo@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-01-10' },
        { name: 'Dewi Pratiwi Rahayu',        nis: '25010004', nisn: '0115000004', email: 'dewi.pratiwi@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-09-05' },
        { name: 'Eko Santoso Nugroho',        nis: '25010005', nisn: '0115000005', email: 'eko.santoso@siswa.smkn1wng.id',     gender: 'MALE',   birthDate: '2009-04-18' },
        { name: 'Fitria Rahayu Lestari',      nis: '25010006', nisn: '0115000006', email: 'fitria.rahayu@siswa.smkn1wng.id',   gender: 'FEMALE', birthDate: '2009-07-30' },
        { name: 'Galih Permana Putra',        nis: '25010007', nisn: '0115000007', email: 'galih.permana@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-02-14' },
        { name: 'Hana Lestari Putri',         nis: '25010008', nisn: '0115000008', email: 'hana.lestari@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-11-28' },
        { name: 'Irvan Kurniawan Hidayat',    nis: '25010009', nisn: '0115000009', email: 'irvan.kurniawan@siswa.smkn1wng.id', gender: 'MALE',   birthDate: '2009-08-09' },
        { name: 'Juwita Sari Wulandari',      nis: '25010010', nisn: '0115000010', email: 'juwita.sari@siswa.smkn1wng.id',     gender: 'FEMALE', birthDate: '2009-05-03' },
        { name: 'Kevin Adi Pratama',          nis: '25010011', nisn: '0115000011', email: 'kevin.adi@siswa.smkn1wng.id',       gender: 'MALE',   birthDate: '2009-12-20' },
        { name: 'Lina Handayani Putri',       nis: '25010012', nisn: '0115000012', email: 'lina.handayani@siswa.smkn1wng.id',  gender: 'FEMALE', birthDate: '2009-10-11' },
        { name: 'Muhammad Rizki Fadillah',    nis: '25010013', nisn: '0115000013', email: 'rizki.fadillah@siswa.smkn1wng.id',  gender: 'MALE',   birthDate: '2009-03-27' },
        { name: 'Nita Wijaya Kusuma',         nis: '25010014', nisn: '0115000014', email: 'nita.wijaya@siswa.smkn1wng.id',     gender: 'FEMALE', birthDate: '2009-06-15' },
        { name: 'Omar Faisal Al-Ghifari',     nis: '25010015', nisn: '0115000015', email: 'omar.faisal@siswa.smkn1wng.id',     gender: 'MALE',   birthDate: '2009-09-19' },
      ],
    },
    {
      classId: CL('X MPLB 1').id,
      prefix: '2502',
      students: [
        { name: 'Agus Setiawan Budiman',      nis: '25020001', nisn: '0115000016', email: 'agus.setiawan@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-02-08' },
        { name: 'Bunga Citra Maharani',        nis: '25020002', nisn: '0115000017', email: 'bunga.citra@siswa.smkn1wng.id',     gender: 'FEMALE', birthDate: '2009-05-17' },
        { name: 'Cintya Dewi Anggraini',       nis: '25020003', nisn: '0115000018', email: 'cintya.dewi@siswa.smkn1wng.id',     gender: 'FEMALE', birthDate: '2009-08-24' },
        { name: 'Deni Ramadhan Saputra',       nis: '25020004', nisn: '0115000019', email: 'deni.ramadhan@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-11-01' },
        { name: 'Evi Susilowati Pratiwi',      nis: '25020005', nisn: '0115000020', email: 'evi.susilowati@siswa.smkn1wng.id',  gender: 'FEMALE', birthDate: '2009-03-12' },
        { name: 'Fajar Pratama Nugroho',       nis: '25020006', nisn: '0115000021', email: 'fajar.pratama@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-07-06' },
        { name: 'Gilang Saputra Wicaksono',    nis: '25020007', nisn: '0115000022', email: 'gilang.saputra@siswa.smkn1wng.id',  gender: 'MALE',   birthDate: '2009-01-29' },
        { name: 'Hesti Ramadhani Putri',       nis: '25020008', nisn: '0115000023', email: 'hesti.ramadhani@siswa.smkn1wng.id', gender: 'FEMALE', birthDate: '2009-04-14' },
        { name: 'Ilham Wijaya Kusuma',         nis: '25020009', nisn: '0115000024', email: 'ilham.wijaya@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-10-22' },
        { name: 'Jihan Pratiwi Sari',          nis: '25020010', nisn: '0115000025', email: 'jihan.pratiwi@siswa.smkn1wng.id',   gender: 'FEMALE', birthDate: '2009-06-30' },
        { name: 'Kukuh Wibowo Santoso',        nis: '25020011', nisn: '0115000026', email: 'kukuh.wibowo@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-09-07' },
        { name: 'Laila Putri Rahayu',          nis: '25020012', nisn: '0115000027', email: 'laila.putri@siswa.smkn1wng.id',     gender: 'FEMALE', birthDate: '2009-12-16' },
        { name: 'Malik Firdaus Hakim',         nis: '25020013', nisn: '0115000028', email: 'malik.firdaus@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-02-25' },
        { name: 'Nadia Rahayu Puspita',        nis: '25020014', nisn: '0115000029', email: 'nadia.rahayu@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-05-09' },
        { name: 'Opik Santoso Haryono',        nis: '25020015', nisn: '0115000030', email: 'opik.santoso@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-08-18' },
      ],
    },
    {
      classId: CL('X TB 1').id,
      prefix: '2503',
      students: [
        { name: 'Adi Putranto Wahyudi',       nis: '25030001', nisn: '0115000031', email: 'adi.putranto@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-01-05' },
        { name: 'Bagas Saputro Nugroho',       nis: '25030002', nisn: '0115000032', email: 'bagas.saputro@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-04-23' },
        { name: 'Cahya Ningrum Rahayu',        nis: '25030003', nisn: '0115000033', email: 'cahya.ningrum@siswa.smkn1wng.id',   gender: 'FEMALE', birthDate: '2009-07-14' },
        { name: 'Desi Ariyanti Kusuma',        nis: '25030004', nisn: '0115000034', email: 'desi.ariyanti@siswa.smkn1wng.id',   gender: 'FEMALE', birthDate: '2009-10-30' },
        { name: 'Farel Kurniawan Putra',       nis: '25030005', nisn: '0115000035', email: 'farel.kurniawan@siswa.smkn1wng.id', gender: 'MALE',   birthDate: '2009-03-08' },
        { name: 'Gita Permata Sari',           nis: '25030006', nisn: '0115000036', email: 'gita.permata@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-06-26' },
        { name: 'Hafiz Rahman Al-Farisi',      nis: '25030007', nisn: '0115000037', email: 'hafiz.rahman@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-11-19' },
        { name: 'Indah Sari Wulandari',        nis: '25030008', nisn: '0115000038', email: 'indah.sari@siswa.smkn1wng.id',      gender: 'FEMALE', birthDate: '2009-02-07' },
        { name: 'Joko Susilo Widodo',          nis: '25030009', nisn: '0115000039', email: 'joko.susilo@siswa.smkn1wng.id',     gender: 'MALE',   birthDate: '2009-05-31' },
        { name: 'Karina Putri Andini',         nis: '25030010', nisn: '0115000040', email: 'karina.putri@siswa.smkn1wng.id',    gender: 'FEMALE', birthDate: '2009-09-12' },
        { name: 'Luthfi Hakim Santoso',        nis: '25030011', nisn: '0115000041', email: 'luthfi.hakim@siswa.smkn1wng.id',    gender: 'MALE',   birthDate: '2009-12-04' },
        { name: 'Maya Dewi Lestari',           nis: '25030012', nisn: '0115000042', email: 'maya.dewi@siswa.smkn1wng.id',       gender: 'FEMALE', birthDate: '2009-01-21' },
        { name: 'Nanda Prasetya Adi',          nis: '25030013', nisn: '0115000043', email: 'nanda.prasetya@siswa.smkn1wng.id',  gender: 'MALE',   birthDate: '2009-04-09' },
        { name: 'Ocha Wulandari Sari',         nis: '25030014', nisn: '0115000044', email: 'ocha.wulandari@siswa.smkn1wng.id',  gender: 'FEMALE', birthDate: '2009-07-28' },
        { name: 'Putra Anggara Wijaya',        nis: '25030015', nisn: '0115000045', email: 'putra.anggara@siswa.smkn1wng.id',   gender: 'MALE',   birthDate: '2009-10-16' },
      ],
    },
  ];

  const studentIds: Record<string, string[]> = {}; // classId → [studentId]
  let demoStudentEmail = '';

  for (const group of studentGroups) {
    studentIds[group.classId] = [];
    for (let i = 0; i < group.students.length; i++) {
      const sd = group.students[i];
      // Use demo password for first student of AKL class
      const isDemo = group.demoEmail && i === 0;
      const emailToUse = isDemo ? group.demoEmail! : sd.email;
      const passToUse  = isDemo ? group.demoPass!  : 'siswa123';
      if (isDemo) demoStudentEmail = emailToUse;

      let user = await prisma.user.findUnique({ where: { email: emailToUse } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: emailToUse, password: await hash(passToUse), role: Role.SISWA, name: sd.name },
        });
      } else {
        // ensure name is updated
        await prisma.user.update({ where: { id: user.id }, data: { name: sd.name } });
      }
      let student = await prisma.student.findUnique({ where: { userId: user.id } });
      if (!student) {
        try {
          student = await prisma.student.create({
            data: {
              userId: user.id,
              nis: sd.nis,
              nisn: sd.nisn,
              classId: group.classId,
              gender: sd.gender,
              birthDate: new Date(sd.birthDate),
              status: 'ACTIVE',
              religion: 'Islam',
              address: 'Wonogiri, Jawa Tengah',
            },
          });
        } catch {
          student = await prisma.student.findUnique({ where: { userId: user.id } });
          if (student) {
            await prisma.student.update({ where: { id: student.id }, data: { classId: group.classId } });
          }
        }
      } else {
        await prisma.student.update({ where: { id: student.id }, data: { classId: group.classId } });
      }
      if (student) studentIds[group.classId].push(student.id);
    }
  }

  // ── 10. Timetable Version (DEMO) ──────────────────────────────────────────
  console.log('→ Seeding timetable version...');
  let demoVersion = await prisma.timetableVersion.findFirst({
    where: { source: 'DEMO', academicYearId: ay.id },
  });
  if (!demoVersion) {
    const adminUser = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
    demoVersion = await prisma.timetableVersion.create({
      data: {
        academicYearId: ay.id,
        versionName: 'Demo Jadwal 2025/2026',
        isActive: true,
        source: 'DEMO',
        changelog: 'Jadwal demo otomatis untuk presentasi dan pengujian sistem OSDAI',
        createdBy: adminUser?.id || 'system',
      },
    });
  }
  const VID = demoVersion.id;

  // ── 11. Schedules (conflict-free timetable) ───────────────────────────────
  console.log('→ Seeding schedules...');
  const AKL_ID  = CL('X AKL 1').id;
  const MPLB_ID = CL('X MPLB 1').id;
  const TB_ID   = CL('X TB 1').id;

  // Delete existing demo schedules for this version to avoid conflicts
  await prisma.schedule.deleteMany({ where: { versionId: VID } });

  /**
   * Schedule grid (day 1-5, periodStart 1/3/5/7/9, periodEnd = start+1):
   * Designed to be collision-free across teacher, room, and class dimensions.
   *
   * day | period | AKL               | MPLB              | TB
   * 1   | 1-2    | BIN/T1/R_AKL      | ADUM/T5/R_MPLB    | KULINER/T7/R_DAP
   * 1   | 3-4    | AKDAR/T4/R_AKL    | MTK/T2/R_MPLB     | INFO/T8/R_LAB2
   * 1   | 5-6    | SPRAK/T10/R_LAB1  | PJOK/T9/R_AULA    | PPKN/T6/R_TB
   * 1   | 7-8    | PPKN/T6/R_AKL     ← conflict T6!  OK because p5-6 for TB and p7-8 different
   * ...
   */
  type ScheduleEntry = {
    day: number; ps: number; pe: number;
    subCode: string; teacherId: string; roomName: string; classId: string;
  };

  const scheduleGrid: ScheduleEntry[] = [
    // ═══ MONDAY (day=1) ═══
    { day:1, ps:1, pe:2, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:1, ps:3, pe:4, subCode:'AKDAR',  teacherId:T4,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:1, ps:5, pe:6, subCode:'SPRAK',  teacherId:T10, roomName:'Lab Komputer 1',      classId:AKL_ID  },
    { day:1, ps:7, pe:8, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:1, ps:1, pe:2, subCode:'ADUM',   teacherId:T5,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:1, ps:3, pe:4, subCode:'BING',   teacherId:T3,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:1, ps:5, pe:6, subCode:'PPKN',   teacherId:T6,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:1, ps:7, pe:8, subCode:'PJOK',   teacherId:T9,  roomName:'Aula SMKN 1',        classId:MPLB_ID },
    { day:1, ps:1, pe:2, subCode:'KULINER',teacherId:T7,  roomName:'Dapur Praktik TB',    classId:TB_ID   },
    { day:1, ps:3, pe:4, subCode:'INFO',   teacherId:T8,  roomName:'Lab Komputer 2',      classId:TB_ID   },
    { day:1, ps:5, pe:6, subCode:'SEJ',    teacherId:T6,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T6 at p5(TB) after p5 not used by MPLB for T6
    { day:1, ps:7, pe:8, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T2 at p7-8 for TB, p3-4 for AKL already done

    // ═══ TUESDAY (day=2) ═══
    { day:2, ps:1, pe:2, subCode:'BING',   teacherId:T3,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:2, ps:3, pe:4, subCode:'AKEU',   teacherId:T4,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:2, ps:5, pe:6, subCode:'KOMPAK', teacherId:T10, roomName:'Lab Komputer 1',      classId:AKL_ID  },
    { day:2, ps:7, pe:8, subCode:'SEJ',    teacherId:T6,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:2, ps:1, pe:2, subCode:'KORNIS', teacherId:T5,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:2, ps:3, pe:4, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:2, ps:5, pe:6, subCode:'INFO',   teacherId:T8,  roomName:'Lab Komputer 2',      classId:MPLB_ID },
    { day:2, ps:7, pe:8, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:2, ps:1, pe:2, subCode:'MAKIND', teacherId:T7,  roomName:'Dapur Praktik TB',    classId:TB_ID   },
    { day:2, ps:3, pe:4, subCode:'PPKN',   teacherId:T6,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T6 at p3(TB) after p7 for AKL — different periods ✓
    { day:2, ps:5, pe:6, subCode:'SENBUD', teacherId:T9,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   },
    { day:2, ps:7, pe:8, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T1: p3 MPLB, p7 TB — different periods ✓

    // ═══ WEDNESDAY (day=3) ═══
    { day:3, ps:1, pe:2, subCode:'PPKN',   teacherId:T6,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:3, ps:3, pe:4, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:3, ps:5, pe:6, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:3, ps:7, pe:8, subCode:'AKDAR',  teacherId:T4,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:3, ps:1, pe:2, subCode:'OTKP',   teacherId:T5,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:3, ps:3, pe:4, subCode:'SEJ',    teacherId:T6,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID }, // T6: p1 AKL, p3 MPLB ✓
    { day:3, ps:5, pe:6, subCode:'BING',   teacherId:T3,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:3, ps:7, pe:8, subCode:'PJOK',   teacherId:T9,  roomName:'Aula SMKN 1',        classId:MPLB_ID },
    { day:3, ps:1, pe:2, subCode:'BAKERY', teacherId:T7,  roomName:'Dapur Praktik TB',    classId:TB_ID   },
    { day:3, ps:3, pe:4, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T2: p5 AKL, p3 TB ✓
    { day:3, ps:5, pe:6, subCode:'INFO',   teacherId:T8,  roomName:'Lab Komputer 2',      classId:TB_ID   },
    { day:3, ps:7, pe:8, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T1: p3 AKL, p7 TB ✓

    // ═══ THURSDAY (day=4) ═══
    { day:4, ps:1, pe:2, subCode:'BING',   teacherId:T3,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:4, ps:3, pe:4, subCode:'AKEU',   teacherId:T4,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:4, ps:5, pe:6, subCode:'PJOK',   teacherId:T9,  roomName:'Aula SMKN 1',        classId:AKL_ID  },
    { day:4, ps:7, pe:8, subCode:'INFO',   teacherId:T8,  roomName:'Lab Komputer 1',      classId:AKL_ID  },
    { day:4, ps:1, pe:2, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID }, // T1: p1 MPLB, p0 nothing for AKL ✓
    { day:4, ps:3, pe:4, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:4, ps:5, pe:6, subCode:'ADUM',   teacherId:T5,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:4, ps:7, pe:8, subCode:'SEJ',    teacherId:T6,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:4, ps:1, pe:2, subCode:'KULINER',teacherId:T7,  roomName:'Dapur Praktik TB',    classId:TB_ID   },
    { day:4, ps:3, pe:4, subCode:'PPKN',   teacherId:T6,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T6: p7 MPLB, p3 TB ✓
    { day:4, ps:5, pe:6, subCode:'SENBUD', teacherId:T9,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T9: p5 AKL, p5 TB — CONFLICT!
    // Fix: T9 can't be at p5 for both AKL and TB. Use different teacher for TB SENBUD
    // Actually T9 teaches PJOK to AKL at p5-6 on Thu. Let's move TB SENBUD to p7 for Thu... but p7 is T6 SEJ for MPLB. For TB we can use p7.
    // Wait, checking conflict: TB p5-6 SENBUD with T9 AND AKL p5-6 PJOK with T9 — same day, same period, same teacher = CONFLICT
    // Will fix by using T9 for TB SENBUD at a different period
  ];

  // Fix conflicts: remove conflicting entries and add corrected ones
  // Thu TB p5-6 SENBUD T9 conflicts with AKL p5-6 PJOK T9
  // Remove the last entry and replace:
  scheduleGrid.pop(); // remove Thu TB p5-6 SENBUD T9
  // Replace with: Thu TB p7-8 SENBUD T9 (different period)
  scheduleGrid.push({ day:4, ps:7, pe:8, subCode:'SENBUD', teacherId:T9, roomName:'Ruang Kelas TB 1', classId:TB_ID });
  // But we need to remove the conflicting Thu MPLB p7-8 SEJ T6 from TB? No — MPLB p7-8 is MPLB class, TB p7-8 is TB class, different classId. The room is also different. Only teacher matters: T6 at Thu p7 for MPLB and T9 at Thu p7 for TB — no conflict ✓

  // Now also fix Mon TB p5-6 SEJ T6 which has T6 at p5 for MPLB PPKN too
  // Mon MPLB p5-6 PPKN T6 AND Mon TB p5-6 SEJ T6 — same period same teacher CONFLICT
  // Fix: move Mon TB SEJ to p9-10
  const monTBSEJIdx = scheduleGrid.findIndex(s => s.day===1 && s.ps===5 && s.classId===TB_ID && s.subCode==='SEJ');
  if (monTBSEJIdx !== -1) {
    scheduleGrid[monTBSEJIdx] = { day:1, ps:9, pe:10, subCode:'SEJ', teacherId:T6, roomName:'Ruang Kelas TB 1', classId:TB_ID };
  }
  // Also fix Mon TB p7-8 MTK T2 with Mon AKL p7-8 MTK T2 — same period same teacher CONFLICT
  const monTBMTKIdx = scheduleGrid.findIndex(s => s.day===1 && s.ps===7 && s.classId===TB_ID && s.subCode==='MTK');
  if (monTBMTKIdx !== -1) {
    // AKL uses T2 at p7-8. So TB needs different period for MTK or different teacher. Use a spare period p9 with T2... but T6 is at p9 for TB SEJ now. Use T2 at p7 for TB — but AKL also uses T2 at p7.
    // Move AKL MTK to p7 and TB MTK to a different teacher or period. Let's just remove TB MTK from Monday and it already has it on other days.
    scheduleGrid.splice(monTBMTKIdx, 1);
  }

  // ═══ FRIDAY (day=5) ═══
  scheduleGrid.push(
    { day:5, ps:1, pe:2, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:5, ps:3, pe:4, subCode:'INFO',   teacherId:T8,  roomName:'Lab Komputer 2',      classId:AKL_ID  },
    { day:5, ps:5, pe:6, subCode:'SENBUD', teacherId:T9,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:5, ps:7, pe:8, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas AKL 1',  classId:AKL_ID  },
    { day:5, ps:1, pe:2, subCode:'SEJ',    teacherId:T6,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:5, ps:3, pe:4, subCode:'KORNIS', teacherId:T5,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:5, ps:5, pe:6, subCode:'BING',   teacherId:T3,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID },
    { day:5, ps:7, pe:8, subCode:'PPKN',   teacherId:T6,  roomName:'Ruang Kelas MPLB 1', classId:MPLB_ID }, // T6: p1 MPLB SEJ, p7 MPLB PPKN ✓
    { day:5, ps:1, pe:2, subCode:'MAKIND', teacherId:T7,  roomName:'Dapur Praktik TB',    classId:TB_ID   },
    { day:5, ps:3, pe:4, subCode:'BIN',    teacherId:T1,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T1: p7 AKL, p3 TB ✓
    { day:5, ps:5, pe:6, subCode:'HYSAN',  teacherId:T8,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T8: p3 AKL(INFO), p5 TB(HYSAN) ✓
    { day:5, ps:7, pe:8, subCode:'MTK',    teacherId:T2,  roomName:'Ruang Kelas TB 1',    classId:TB_ID   }, // T2: p1 AKL, p7 TB ✓
  );

  // Validate and insert schedules
  let schedInserted = 0;
  const seen = new Set<string>();
  for (const entry of scheduleGrid) {
    const subj = S(entry.subCode);
    if (!subj) { console.warn(`  ⚠ Subject not found: ${entry.subCode}`); continue; }
    const room = R(entry.roomName);
    if (!room) { console.warn(`  ⚠ Room not found: ${entry.roomName}`); continue; }

    // Dedup check (teacher+day+period)
    const teacherKey = `t${entry.teacherId}-d${entry.day}-p${entry.ps}`;
    const roomKey    = `r${room.id}-d${entry.day}-p${entry.ps}`;
    const classKey   = `c${entry.classId}-d${entry.day}-p${entry.ps}`;
    if (seen.has(teacherKey)) { console.warn(`  ⚠ Teacher conflict skip: ${entry.subCode} day${entry.day} p${entry.ps}`); continue; }
    if (seen.has(roomKey))    { console.warn(`  ⚠ Room conflict skip: ${entry.subCode} day${entry.day} p${entry.ps}`);    continue; }
    if (seen.has(classKey))   { console.warn(`  ⚠ Class conflict skip: ${entry.subCode} day${entry.day} p${entry.ps}`);   continue; }
    seen.add(teacherKey); seen.add(roomKey); seen.add(classKey);

    await prisma.schedule.create({
      data: {
        day: entry.day,
        periodStart: entry.ps,
        periodEnd: entry.pe,
        subjectId: subj.id,
        teacherId: entry.teacherId,
        roomId: room.id,
        classId: entry.classId,
        versionId: VID,
      },
    });
    schedInserted++;
  }
  console.log(`  → ${schedInserted} schedules created`);

  // ── 12. Attendance History (last 10 school days) ──────────────────────────
  console.log('→ Seeding attendance history...');
  const recentSchedules = await prisma.schedule.findMany({ where: { versionId: VID } });
  const days = schoolDays(10);
  let attCount = 0;

  // day-of-week → schedule day number (JS: 1=Mon…5=Fri same as our day field)
  const attendanceRecords: Array<{ studentId: string; scheduleId: string; status: AttendanceStatus; timestamp: Date }> = [];

  for (const date of days) {
    const dow = date.getDay(); // 0=Sun,1=Mon,…5=Fri
    const dayNum = dow; // our schema: 1=Mon…5=Fri
    const daySchedules = recentSchedules.filter(s => s.day === dayNum);

    for (const sched of daySchedules) {
      const classStudents = studentIds[sched.classId] || [];
      for (const studentId of classStudents) {
        const ts = new Date(date);
        ts.setHours(7 + sched.periodStart, 0, 0, 0);
        attendanceRecords.push({ studentId, scheduleId: sched.id, status: randomStatus(), timestamp: ts });
        attCount++;
      }
    }
  }

  // Bulk insert in batches of 100
  for (let i = 0; i < attendanceRecords.length; i += 100) {
    await prisma.attendance.createMany({
      data: attendanceRecords.slice(i, i + 100),
      skipDuplicates: true,
    });
  }
  console.log(`  → ${attCount} attendance records created`);

  // ── 13. Courses (LMS) for each class+subject combo ───────────────────────
  console.log('→ Seeding courses...');
  const courseSchedules = await prisma.schedule.findMany({
    where: { versionId: VID },
    distinct: ['subjectId', 'classId', 'teacherId'],
  });
  let courseCount = 0;
  for (const cs of courseSchedules) {
    const existing = await prisma.course.findFirst({
      where: { subjectId: cs.subjectId, classId: cs.classId, teacherId: cs.teacherId },
    });
    if (!existing) {
      await prisma.course.create({
        data: { subjectId: cs.subjectId, classId: cs.classId, teacherId: cs.teacherId },
      });
      courseCount++;
    }
  }
  console.log(`  → ${courseCount} courses created`);

  // ── 14. Teacher Availability ──────────────────────────────────────────────
  console.log('→ Seeding teacher availability...');
  for (const { teacherId } of Object.values(teacherMap)) {
    for (let day = 1; day <= 5; day++) {
      const existing = await prisma.teacherAvailability.findFirst({ where: { teacherId, day } });
      if (!existing) {
        await prisma.teacherAvailability.create({
          data: { teacherId, day, startTime: '07:00', endTime: '15:00', isAvailable: true },
        });
      }
    }
  }

  // ── 15. Announcements / Notifications ────────────────────────────────────
  console.log('→ Seeding announcements...');
  const adminUser = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
  if (adminUser) {
    const announcements = [
      { title: 'Selamat Datang di OSDAI v2.0', body: 'Sistem manajemen sekolah digital berbasis AI telah resmi diaktifkan untuk SMKN 1 Wonogiri. Semua modul siap digunakan.' },
      { title: 'Jadwal Pelajaran Semester Ganjil 2025/2026', body: 'Jadwal pelajaran semester ganjil telah tersedia. Guru dan siswa dapat melihat jadwal masing-masing di dashboard.' },
      { title: 'Presensi Digital Aktif', body: 'Sistem presensi digital Neural Pulse telah aktif. Siswa wajib melakukan presensi melalui aplikasi setiap sesi pelajaran dimulai.' },
      { title: 'Pengumpulan Tugas via LMS', body: 'Mulai semester ini, seluruh tugas dan materi pelajaran dikelola melalui modul LMS OSDAI. Harap segera mendaftar ke kelas masing-masing.' },
      { title: 'Data Siswa Baru Telah Diinput', body: 'Data siswa kelas X AKL 1, X MPLB 1, dan X TB 1 telah berhasil diinput ke sistem. Total 45 siswa aktif terdaftar.' },
    ];
    // Send announcements to all users
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    for (const ann of announcements) {
      for (const u of allUsers) {
        const existing = await prisma.notification.findFirst({
          where: { title: ann.title, receiverId: u.id },
        });
        if (!existing) {
          await prisma.notification.create({
            data: {
              title: ann.title,
              message: ann.body,
              senderId: adminUser.id,
              receiverId: u.id,
              type: 'SYSTEM',
              isRead: false,
            },
          });
        }
      }
    }
  }

  // ── 16. Financial Accounts (Chart of Accounts) ───────────────────────────
  console.log('→ Seeding financial accounts...');
  const accounts = [
    { code: '101.01', name: 'Kas Sekolah',     type: 'ASSET',   balance: 50000000 },
    { code: '101.02', name: 'Bank BRI',         type: 'ASSET',   balance: 125000000 },
    { code: '401.01', name: 'Pendapatan SPP',   type: 'INCOME',  balance: 0 },
    { code: '401.02', name: 'Dana BOS',         type: 'INCOME',  balance: 0 },
    { code: '501.01', name: 'Belanja Pegawai',  type: 'EXPENSE', balance: 0 },
    { code: '501.02', name: 'Belanja Operasional', type: 'EXPENSE', balance: 0 },
  ];
  for (const acc of accounts) {
    await prisma.financialAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: { code: acc.code, name: acc.name, type: acc.type, balance: acc.balance },
    });
  }

  // ── 17. SPP Config ────────────────────────────────────────────────────────
  const sppConfigs = [
    { grade: 10, majorId: mAKL.id,  amount: 150000 },
    { grade: 10, majorId: mMPLB.id, amount: 150000 },
    { grade: 10, majorId: mTB.id,   amount: 175000 },
    { grade: 11, majorId: mAKL.id,  amount: 150000 },
    { grade: 12, majorId: mAKL.id,  amount: 150000 },
  ];
  for (const cfg of sppConfigs) {
    const existing = await prisma.sPPConfig.findFirst({
      where: { academicYearId: ay.id, grade: cfg.grade, majorId: cfg.majorId },
    });
    if (!existing) {
      await prisma.sPPConfig.create({
        data: { academicYearId: ay.id, grade: cfg.grade, majorId: cfg.majorId, amount: cfg.amount },
      });
    }
  }

  // ── 18. Inventory items ───────────────────────────────────────────────────
  console.log('→ Seeding inventory...');
  const inventory = [
    { code: 'INV-001', name: 'Komputer Desktop',      category: 'Elektronik', quantity: 72, unit: 'UNIT', condition: 'GOOD', location: 'Lab Komputer 1 & 2' },
    { code: 'INV-002', name: 'Proyektor LCD',          category: 'Elektronik', quantity: 15, unit: 'UNIT', condition: 'GOOD', location: 'Ruang Kelas' },
    { code: 'INV-003', name: 'Meja Belajar',           category: 'Furnitur',   quantity: 200, unit: 'UNIT', condition: 'GOOD', location: 'Ruang Kelas' },
    { code: 'INV-004', name: 'Kursi Siswa',            category: 'Furnitur',   quantity: 200, unit: 'UNIT', condition: 'GOOD', location: 'Ruang Kelas' },
    { code: 'INV-005', name: 'Mesin Jahit Industri',   category: 'Mesin',      quantity: 30,  unit: 'UNIT', condition: 'GOOD', location: 'Studio Busana' },
    { code: 'INV-006', name: 'Peralatan Dapur Masak',  category: 'Peralatan',  quantity: 15,  unit: 'SET',  condition: 'GOOD', location: 'Dapur Praktik TB' },
    { code: 'INV-007', name: 'Router WiFi',            category: 'Jaringan',   quantity: 8,   unit: 'UNIT', condition: 'GOOD', location: 'Seluruh Gedung' },
    { code: 'INV-008', name: 'Printer Laser',          category: 'Elektronik', quantity: 5,   unit: 'UNIT', condition: 'GOOD', location: 'TU dan Lab' },
  ];
  for (const item of inventory) {
    await prisma.inventoryItem.upsert({
      where: { code: item.code },
      update: {},
      create: { ...item, price: 0 },
    });
  }

  // ── 19. Update system config with demo summary ────────────────────────────
  await prisma.systemConfig.upsert({
    where: { key: 'DEMO_SEEDED_AT' },
    update: { value: new Date().toISOString() },
    create: { key: 'DEMO_SEEDED_AT', value: new Date().toISOString() },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'DEMO_VERSION_ID' },
    update: { value: VID },
    create: { key: 'DEMO_VERSION_ID', value: VID },
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalStudents = await prisma.student.count();
  const totalTeachers = await prisma.teacher.count();
  const totalSchedules = await prisma.schedule.count({ where: { versionId: VID } });
  const totalAttendance = await prisma.attendance.count();
  const totalSubjects = await prisma.subject.count();

  console.log('\n════════════════════════════════════════');
  console.log('  OSDAI DEMO SEEDER — Complete!');
  console.log('════════════════════════════════════════');
  console.log(`  ✓ Majors     : 5`);
  console.log(`  ✓ Subjects   : ${totalSubjects}`);
  console.log(`  ✓ Classes    : 3 (X AKL 1, X MPLB 1, X TB 1)`);
  console.log(`  ✓ Teachers   : ${totalTeachers}`);
  console.log(`  ✓ Students   : ${totalStudents}`);
  console.log(`  ✓ Schedules  : ${totalSchedules}`);
  console.log(`  ✓ Attendance : ${totalAttendance} records`);
  console.log('');
  console.log('  Demo Login Accounts:');
  console.log('  ─────────────────────────────────────');
  console.log('  superadmin@osdai.id       / osdai123');
  console.log('  kepsek@smkn1wonogiri.id   / wonogiri123');
  console.log('  admin@smkn1wonogiri.id    / admin123');
  console.log('  guru.akl@smkn1wonogiri.id / guru123');
  console.log('  siswa.akl01@smkn1wonogiri.id / siswa123');
  console.log('════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('❌ Demo seeder failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
