import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { prisma } from '../lib/prisma';

export const TimetableExportService = {
  async exportToExcel(classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: { academicYear: true }
    });
    if (!cls) throw new Error('Class not found');

    const schedule = await prisma.schedule.findMany({
      where: { classId, deletedAt: null },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        room: true
      },
      orderBy: [{ day: 'asc' }, { periodStart: 'asc' }]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Timetable ${cls.name}`);

    // Stylings
    worksheet.columns = [
      { header: 'Period', key: 'period', width: 10 },
      { header: 'Monday', key: '1', width: 25 },
      { header: 'Tuesday', key: '2', width: 25 },
      { header: 'Wednesday', key: '3', width: 25 },
      { header: 'Thursday', key: '4', width: 25 },
      { header: 'Friday', key: '5', width: 25 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const periods = Array.from({ length: 12 }, (_, i) => i + 1);
    
    periods.forEach(p => {
        const rowData: any = { period: `P${p}` };
        [1, 2, 3, 4, 5].forEach(d => {
            const lesson = schedule.find(s => s.day === d && s.periodStart === p);
            if (lesson) {
                rowData[d.toString()] = `${lesson.subject.name}\n${lesson.teacher.user.name}\n${lesson.room.name}`;
            }
        });
        const row = worksheet.addRow(rowData);
        row.height = 40;
        row.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    });

    return workbook.xlsx.writeBuffer();
  },

  async exportToPdf(classId: string) {
      const cls = await prisma.class.findUnique({
          where: { id: classId },
          include: { academicYear: true }
      });
      if (!cls) throw new Error('Class not found');

      const schedule = await prisma.schedule.findMany({
          where: { classId, deletedAt: null },
          include: {
              subject: true,
              teacher: { include: { user: true } },
              room: true
          },
          orderBy: [{ day: 'asc' }, { periodStart: 'asc' }]
      });

      const doc = new jsPDF({ orientation: 'landscape' });
      
      doc.setFontSize(18);
      doc.text(`JADWAL PELAJARAN - ${cls.name}`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Tahun Akademik: ${cls.academicYear.name}`, 14, 28);

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const body = Array.from({ length: 12 }, (_, i) => {
          const p = i + 1;
          const row = [`P${p}`];
          [1, 2, 3, 4, 5].forEach(d => {
              const lesson = schedule.find(s => s.day === d && s.periodStart === p);
              if (lesson) {
                  row.push(`${lesson.subject.code}\n${lesson.teacher.user.name}\n${lesson.room.name}`);
              } else {
                  row.push('');
              }
          });
          return row;
      });

      autoTable(doc, {
          startY: 35,
          head: [['Period', ...days]],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [243, 156, 18], textColor: 255 }, // Orange theme
          styles: { minCellHeight: 15, fontSize: 8, halign: 'center', valign: 'middle' },
      });

      return Buffer.from(doc.output('arraybuffer'));
  }
};
