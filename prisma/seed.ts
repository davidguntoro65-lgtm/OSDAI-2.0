import { PrismaClient, Role, MajorCode, SubjectType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding Production-Grade SMK Data...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // 1. Super Admin
  await prisma.user.upsert({
    where: { email: 'admin@smk.id' },
    update: {},
    create: {
      email: 'admin@smk.id',
      password: hashedPassword,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  // 2. Initial Majors
  const majors = [
    { code: MajorCode.AKL, name: 'Akuntansi dan Keuangan Lembaga' },
    { code: MajorCode.MPLB, name: 'Manajemen Perkantoran dan Layanan Bisnis' },
    { code: MajorCode.PM, name: 'Pemasaran' },
    { code: MajorCode.TB, name: 'Tata Boga' },
    { code: MajorCode.TBS, name: 'Tata Busana' },
  ];

  for (const m of majors) {
    await prisma.major.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
  }
  const majorRecords = await prisma.major.findMany();

  // 3. Academic Year
  const ay = await prisma.academicYear.upsert({
    where: { name: '2023/2024' },
    update: {},
    create: {
      name: '2023/2024',
      term: 1,
      isActive: true,
      startDate: new Date('2023-07-10'),
      endDate: new Date('2024-06-30'),
    },
  });

  // 4. Rooms
  const rooms = [
    { name: 'Lab Komputer 1', capacity: 36, building: 'A' },
  ];

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }
  const roomRecords = await prisma.room.findMany();

  // 5. Classes
  const cls = await prisma.class.upsert({
    where: { name_academicYearId: { name: 'XII RPL 1', academicYearId: ay.id } },
    update: {},
    create: { name: 'XII RPL 1', grade: 12, majorId: majorRecords[0].id, academicYearId: ay.id },
  });

  // 6. Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: 'guru@smk.id' },
    update: { password: hashedPassword },
    create: {
      email: 'guru@smk.id',
      password: hashedPassword,
      name: 'Dr. John Doe',
      role: Role.GURU,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      nuptk: '1234567890',
      department: 'Software Engineering',
    },
  });

  // 7. Student
  const studentUser = await prisma.user.upsert({
    where: { email: 'siswa@smk.id' },
    update: { password: hashedPassword },
    create: {
      name: 'Alice Alpha',
      email: 'siswa@smk.id',
      password: hashedPassword,
      role: Role.SISWA,
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { classId: cls.id },
    create: {
      userId: studentUser.id,
      nis: '2023001',
      nisn: '001001001',
      classId: cls.id,
    },
  });

  console.log('✅ Seed completed successfully. Logins: admin@smk.id / guru@smk.id / siswa@smk.id (pwd: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
