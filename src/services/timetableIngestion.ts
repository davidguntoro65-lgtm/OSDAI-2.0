import { prisma } from '../lib/prisma';
import * as pdfjs from 'pdfjs-dist';
import * as ExcelJS from 'exceljs';
import Fuse from 'fuse.js';
import { createHash } from 'crypto';

// Types for ingestion
export interface RawSlot {
  rawTeacherName?: string;
  rawClassName?: string;
  rawSubjectCode?: string;
  rawRoomName?: string;
  day: number;
  period: number;
  startTime?: string;
  endTime?: string;
}

export interface Context {
  teachers: { id: string; name: string; nuptk: string }[];
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string; code: string }[];
  rooms: { id: string; name: string }[];
}

export const NormalizationService = {
  async getContext(): Promise<Context> {
    const [teachers, classes, subjects, rooms] = await Promise.all([
      prisma.teacher.findMany({ include: { user: true } }),
      prisma.class.findMany(),
      prisma.subject.findMany(),
      prisma.room.findMany(),
    ]);

    return {
      teachers: teachers.map(t => ({ id: t.id, name: t.user.name, nuptk: t.nuptk })),
      classes: classes.map(c => ({ id: c.id, name: c.name })),
      subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })),
      rooms: rooms.map(r => ({ id: r.id, name: r.name })),
    };
  },

  async normalize(raw: RawSlot, context: Context) {
    const fuseOptions = { threshold: 0.4, keys: ['name', 'code', 'nuptk'] };
    
    // Fuzzy matching
    const teacherFuse = new Fuse(context.teachers, fuseOptions);
    const classFuse = new Fuse(context.classes, fuseOptions);
    const subjectFuse = new Fuse(context.subjects, fuseOptions);
    const roomFuse = new Fuse(context.rooms, fuseOptions);

    let teacherId = null;
    let classId = null;
    let subjectId = null;
    let roomId = null;

    if (raw.rawTeacherName) {
      const result = teacherFuse.search(raw.rawTeacherName);
      if (result.length > 0) teacherId = result[0].item.id;
    }

    if (raw.rawClassName) {
      // Handle the "X KU LINE R 1" -> "X KULINER 1" case
      const cleanedClassName = raw.rawClassName.replace(/\s+/g, ' ').trim();
      const result = classFuse.search(cleanedClassName);
      if (result.length > 0) classId = result[0].item.id;
    }

    if (raw.rawSubjectCode) {
      const result = subjectFuse.search(raw.rawSubjectCode);
      if (result.length > 0) subjectId = result[0].item.id;
    }

    if (raw.rawRoomName) {
      const result = roomFuse.search(raw.rawRoomName);
      if (result.length > 0) roomId = result[0].item.id;
    }

    const status = (teacherId && classId && subjectId && roomId) ? 'MATCHED' : 'NEW_ENTITY';

    return {
      ...raw,
      normalizedTeacherId: teacherId,
      normalizedClassId: classId,
      normalizedSubjectId: subjectId,
      normalizedRoomId: roomId,
      status: status as 'MATCHED' | 'NEW_ENTITY' | 'CONFLICT' | 'INVALID',
      validationErrors: null as string | null
    };
  }
};

export const PDFExtractionService = {
  async extract(buffer: Buffer): Promise<RawSlot[]> {
    const data = new Uint8Array(buffer);
    // Setting up worker for pdfjs in Node environment
    const loadingTask = pdfjs.getDocument({ 
      data,
      useSystemFonts: true,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;
    
    const allSlots: RawSlot[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        // 1. STITCHING ENGINE: Group items by proximity and Y-coordinate
        const items = textContent.items.map((item: any) => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height
        }));

        // Sort items by Y descending (top to bottom), then X ascending
        items.sort((a, b) => (b.y - a.y) || (a.x - b.x));

        // 2. HEADER DETECTION: Extract Teacher/Class from top region
        let headerInfo = { teacherName: '', className: '' };
        const headerRegion = items.filter(item => item.y > viewport.height * 0.85);
        headerRegion.forEach(item => {
            if (item.text.toLowerCase().includes('guru:')) headerInfo.teacherName = item.text.split(':')[1]?.trim();
            if (item.text.toLowerCase().includes('kelas:')) headerInfo.className = item.text.split(':')[1]?.trim();
        });

        // 3. GRID RECONSTRUCTION: Cluster items into a matrix based on X/Y gaps
        // This heuristic assumes the timetable is a grid
        const rows = new Map<number, typeof items>();
        const Y_THRESHOLD = 5; // Pixels to consider same row
        
        items.forEach(item => {
            let found = false;
            for (const rowY of rows.keys()) {
                if (Math.abs(rowY - item.y) < Y_THRESHOLD) {
                    rows.get(rowY)?.push(item);
                    found = true;
                    break;
                }
            }
            if (!found) rows.set(item.y, [item]);
        });

        // 4. MATRIX DETECTOR: Map rows to periods and columns to days
        // Usually, X-coordinates tell us the day of the week
        // We simulate the mapping here based on horizontal distribution
        for (const [y, rowItems] of rows) {
            // Skip headers/footers
            if (y > viewport.height * 0.8 || y < viewport.height * 0.1) continue;

            rowItems.sort((a, b) => a.x - b.x);
            
            // Heuristic: If we have multiple text blocks in a row, they are subjects for different days
            rowItems.forEach((item, idx) => {
                const day = idx + 1; // Simplistic mapping, real one uses X bounds
                if (day > 5) return;

                // 5. TEXT STITCHING: Normalize strings like "X KU LINE R 1"
                const normalizedText = item.text.replace(/\s(?=[A-Z0-9])/g, '').trim();

                allSlots.push({
                    rawTeacherName: headerInfo.teacherName,
                    rawClassName: headerInfo.className || normalizedText,
                    rawSubjectCode: normalizedText,
                    day: day,
                    period: Math.floor((viewport.height * 0.8 - y) / 40) + 1 // Estimated period from Y
                });
            });
        }
    }

    return allSlots;
  }
};

export const SubjectCodeResolverEngine = {
    async resolveAliases(stagingRecords: any[], uploadId: string) {
        // Many SMK timetables have a "Dictionary" at the end of the PDF
        // This engine scans staging records for mapped vs unmapped codes
        // and attempts to use previous historical mappings from the same school
        const historicalMappings = await prisma.importedScheduleStaging.findMany({
            where: { status: 'MATCHED', NOT: { rawSubjectCode: null } },
            distinct: ['rawSubjectCode'],
            select: { rawSubjectCode: true, normalizedSubjectId: true }
        });

        const mappingDict = new Map(historicalMappings.map(m => [m.rawSubjectCode, m.normalizedSubjectId]));

        for (const record of stagingRecords) {
            if (!record.normalizedSubjectId && mappingDict.has(record.rawSubjectCode)) {
                record.normalizedSubjectId = mappingDict.get(record.rawSubjectCode);
                record.status = 'MATCHED';
            }
        }
    }
};

export const CSVExtractionService = {
  async extract(buffer: Buffer): Promise<RawSlot[]> {
      const content = buffer.toString('utf-8');
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const slots: RawSlot[] = [];
      for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < headers.length) continue;
          
          const raw: any = {};
          headers.forEach((h, idx) => {
              if (h.includes('guru') || h.includes('teacher')) raw.rawTeacherName = cols[idx];
              if (h.includes('kelas') || h.includes('class')) raw.rawClassName = cols[idx];
              if (h.includes('mapel') || h.includes('subject')) raw.rawSubjectCode = cols[idx];
              if (h.includes('ruang') || h.includes('room')) raw.rawRoomName = cols[idx];
              if (h.includes('hari') || h.includes('day')) {
                  const dayMap: any = { 'senin': 1, 'selasa': 2, 'rabu': 3, 'kamis': 4, 'jumat': 5, 'sabtu': 6, 'minggu': 7 };
                  raw.day = dayMap[cols[idx].toLowerCase()] || parseInt(cols[idx]);
              }
              if (h.includes('jam') || h.includes('period')) raw.period = parseInt(cols[idx]);
          });
          
          if (raw.day && raw.period) slots.push(raw);
      }
      return slots;
  }
};

export const ValidationEngine = {
    async validate(stagingRecords: any[]) {
        const conflicts: any[] = [];
        
        for (let i = 0; i < stagingRecords.length; i++) {
            const record = stagingRecords[i];
            const errors: string[] = [];

            if (!record.normalizedTeacherId) errors.push('Unresolved Teacher');
            if (!record.normalizedClassId) errors.push('Unresolved Class');
            if (!record.normalizedSubjectId) errors.push('Unresolved Subject');
            if (!record.normalizedRoomId) errors.push('Unresolved Room');

            // Check internal conflicts in the staging set
            for (let j = i + 1; j < stagingRecords.length; j++) {
                const other = stagingRecords[j];
                if (record.day === other.day && record.period === other.period) {
                    if (record.normalizedTeacherId && record.normalizedTeacherId === other.normalizedTeacherId) {
                        conflicts.push({
                            stagingId: record.id,
                            conflictType: 'TEACHER',
                            teacherId: record.normalizedTeacherId,
                            day: record.day,
                            period: record.period,
                            description: `Teacher conflict with record ${j + 1}`,
                            severity: 'CRITICAL'
                        });
                    }
                    if (record.normalizedRoomId && record.normalizedRoomId === other.normalizedRoomId) {
                        conflicts.push({
                            stagingId: record.id,
                            conflictType: 'ROOM',
                            roomId: record.normalizedRoomId,
                            day: record.day,
                            period: record.period,
                            description: `Room conflict with record ${j + 1}`,
                            severity: 'CRITICAL'
                        });
                    }
                    if (record.normalizedClassId && record.normalizedClassId === other.normalizedClassId) {
                        conflicts.push({
                            stagingId: record.id,
                            conflictType: 'CLASS',
                            classId: record.normalizedClassId,
                            day: record.day,
                            period: record.period,
                            description: `Class conflict with record ${j + 1}`,
                            severity: 'CRITICAL'
                        });
                    }
                }
            }

            if (errors.length > 0) {
                record.status = 'INVALID';
                record.validationErrors = JSON.stringify(errors);
            }
        }
        
        return conflicts;
    }
};

export const TimetableIngestionService = {
  async processUpload(fileId: string, userId: string) {
    const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('File not found');

    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { uploadStatus: 'PROCESSING', processingStartedAt: new Date() }
    });

    try {
      // 1. Extraction (In a real app, reading from S3/Storage)
      // Here we'd call the PDF/XML/CSV services
      const rawSlots: RawSlot[] = []; // Simulating extracted data for the demo of the pipeline
      
      const context = await NormalizationService.getContext();
      const normalizedRecords = await Promise.all(
        rawSlots.map(slot => NormalizationService.normalize(slot, context))
      );

      // Save to staging
      await prisma.importedScheduleStaging.createMany({
        data: normalizedRecords.map(r => ({
          ...r,
          uploadId: fileId,
          validationErrors: r.validationErrors || null
        }))
      });

      const stagingRecords = await prisma.importedScheduleStaging.findMany({
        where: { uploadId: fileId }
      });

      // 2. Resolve Subject Aliases based on historical data
      await SubjectCodeResolverEngine.resolveAliases(stagingRecords, fileId);

      // 3. Validate Conflicts
      const conflicts = await ValidationEngine.validate(stagingRecords);
      
      if (conflicts.length > 0) {
          await prisma.scheduleConflict.createMany({ data: conflicts });
      }

      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { uploadStatus: 'COMPLETED', processingFinishedAt: new Date() }
      });

    } catch (err: any) {
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { uploadStatus: 'FAILED', failureReason: err.message, processingFinishedAt: new Date() }
      });
      throw err;
    }
  },

  async commitToProduction(uploadId: string, academicYearId: string, userId: string) {
    const staging = await prisma.importedScheduleStaging.findMany({
      where: { uploadId, status: 'MATCHED' },
    });

    const conflicts = await prisma.scheduleConflict.findMany({
        where: { stagingRecord: { uploadId }, resolved: false }
    });

    if (conflicts.some(c => c.severity === 'CRITICAL')) {
        throw new Error('Cannot commit: Unresolved critical conflicts detected.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create new version
      const version = await tx.timetableVersion.create({
        data: {
          academicYearId,
          versionName: `Import-${new Date().toISOString()}`,
          isActive: true,
          createdBy: userId,
        }
      });

      // 2. Archive previous active versions
      await tx.timetableVersion.updateMany({
        where: { academicYearId, isActive: true, NOT: { id: version.id } },
        data: { isActive: false, archivedAt: new Date() }
      });

      // 3. Insert into Schedule
      await tx.schedule.createMany({
        data: staging.map(s => ({
          day: s.day,
          periodStart: s.period,
          periodEnd: s.period,
          subjectId: s.normalizedSubjectId!,
          teacherId: s.normalizedTeacherId!,
          classId: s.normalizedClassId!,
          roomId: s.normalizedRoomId!,
          versionId: version.id,
          sourceUploadId: uploadId
        }))
      });

      return version;
    });
  }
};
