import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  assignments,
  classMembers,
  classes,
  files,
  materialReads,
  materials,
  subjects,
  submissions,
  users,
} from '../db/schema';
import { generateId } from '../lib/crypto';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

export const learningRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

learningRoutes.use('*', requireAuth);

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB (batas aman untuk Cloudflare D1)

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Upload helper storing small files directly in Cloudflare D1 (no R2 needed) */
async function saveFileToD1(db: ReturnType<typeof drizzle>, file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Ukuran file maksimal 1 MB. Untuk file besar, gunakan tautan Google Drive/YouTube.');
  }
  const id = generateId();
  const dataBase64 = arrayBufferToBase64(await file.arrayBuffer());
  await db.insert(files).values({
    id,
    name: file.name,
    contentType: file.type || 'application/octet-stream',
    dataBase64,
    createdAt: new Date().toISOString(),
  });
  return { fileKey: id, fileName: file.name };
}

learningRoutes.get('/dashboard', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  if (user.role === 'student') {
    const memberships = await db
      .select({ classId: classMembers.classId, className: classes.name, academicYear: classes.academicYear })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.studentId, user.id));

    const classIds = memberships.map((m) => m.classId);
    if (classIds.length === 0) {
      return c.json({ classes: [], subjects: [], recentMaterials: [], activeAssignments: [] });
    }

    const mySubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        description: subjects.description,
        classId: subjects.classId,
        className: classes.name,
        teacherName: users.name,
      })
      .from(subjects)
      .innerJoin(classes, eq(subjects.classId, classes.id))
      .innerJoin(users, eq(subjects.teacherId, users.id))
      .where(inArray(subjects.classId, classIds));

    const subjectIds = mySubjects.map((s) => s.id);
    if (subjectIds.length === 0) {
      return c.json({ classes: memberships, subjects: [], recentMaterials: [], activeAssignments: [] });
    }

    const myMaterials = await db
      .select()
      .from(materials)
      .where(inArray(materials.subjectId, subjectIds))
      .orderBy(desc(materials.createdAt))
      .limit(10);

    const myReads = await db
      .select()
      .from(materialReads)
      .where(eq(materialReads.studentId, user.id));
    const readSet = new Set(myReads.map((r) => r.materialId));

    const myAssignments = await db
      .select()
      .from(assignments)
      .where(inArray(assignments.subjectId, subjectIds))
      .orderBy(desc(assignments.createdAt));

    const mySubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, user.id));
    const subMap = new Map(mySubmissions.map((s) => [s.assignmentId, s]));

    const subjectMap = new Map(mySubjects.map((s) => [s.id, s]));

    return c.json({
      classes: memberships,
      subjects: mySubjects,
      recentMaterials: myMaterials.map((m) => ({
        ...m,
        subjectName: subjectMap.get(m.subjectId)?.name ?? '',
        isRead: readSet.has(m.id),
      })),
      activeAssignments: myAssignments.map((a) => ({
        ...a,
        subjectName: subjectMap.get(a.subjectId)?.name ?? '',
        submission: subMap.get(a.id) ?? null,
      })),
    });
  }

  if (user.role === 'teacher') {
    const mySubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        description: subjects.description,
        classId: subjects.classId,
        className: classes.name,
        academicYear: classes.academicYear,
      })
      .from(subjects)
      .innerJoin(classes, eq(subjects.classId, classes.id))
      .where(eq(subjects.teacherId, user.id));

    return c.json({ subjects: mySubjects });
  }

  return c.json({ message: 'Gunakan menu Admin untuk mengelola sistem' });
});

learningRoutes.get('/subjects/:subjectId', async (c) => {
  const subjectId = c.req.param('subjectId');
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const [subject] = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      description: subjects.description,
      classId: subjects.classId,
      className: classes.name,
      teacherId: subjects.teacherId,
      teacherName: users.name,
    })
    .from(subjects)
    .innerJoin(classes, eq(subjects.classId, classes.id))
    .innerJoin(users, eq(subjects.teacherId, users.id))
    .where(eq(subjects.id, subjectId))
    .limit(1);

  if (!subject) {
    return c.json({ error: 'Mata pelajaran tidak ditemukan' }, 404);
  }

  const subjectMaterials = await db
    .select()
    .from(materials)
    .where(eq(materials.subjectId, subjectId))
    .orderBy(desc(materials.createdAt));

  const subjectAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.subjectId, subjectId))
    .orderBy(desc(assignments.createdAt));

  if (user.role === 'student') {
    const reads = await db
      .select()
      .from(materialReads)
      .where(eq(materialReads.studentId, user.id));
    const readSet = new Set(reads.map((r) => r.materialId));

    const subs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, user.id));
    const subMap = new Map(subs.map((s) => [s.assignmentId, s]));

    return c.json({
      subject,
      materials: subjectMaterials.map((m) => ({ ...m, isRead: readSet.has(m.id) })),
      assignments: subjectAssignments.map((a) => ({ ...a, submission: subMap.get(a.id) ?? null })),
    });
  }

  // Teacher / Admin view includes counts
  const classStudents = await db
    .select({ studentId: classMembers.studentId })
    .from(classMembers)
    .where(eq(classMembers.classId, subject.classId));

  const allReads = await db.select().from(materialReads);
  const allSubs = await db.select().from(submissions);

  return c.json({
    subject,
    totalStudents: classStudents.length,
    materials: subjectMaterials.map((m) => ({
      ...m,
      readCount: allReads.filter((r) => r.materialId === m.id).length,
    })),
    assignments: subjectAssignments.map((a) => ({
      ...a,
      submissionCount: allSubs.filter((s) => s.assignmentId === a.id).length,
    })),
  });
});

learningRoutes.post('/subjects/:subjectId/materials', requireRole('teacher'), async (c) => {
  const subjectId = c.req.param('subjectId');
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.teacherId, user.id)))
    .limit(1);

  if (!subject) {
    return c.json({ error: 'Anda tidak mengampu mata pelajaran ini' }, 403);
  }

  const formData = await c.req.formData();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const videoUrl = String(formData.get('videoUrl') ?? '').trim() || null;
  const file = formData.get('file');

  if (!title || !content) {
    return c.json({ error: 'Judul dan isi materi wajib diisi' }, 400);
  }

  let fileKey: string | null = null;
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await saveFileToD1(db, file);
      fileKey = uploaded.fileKey;
      fileName = uploaded.fileName;
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Gagal menyimpan file' }, 400);
    }
  }

  const id = generateId();
  const createdAt = new Date().toISOString();

  await db.insert(materials).values({
    id,
    subjectId,
    title,
    content,
    fileKey,
    fileName,
    videoUrl,
    createdAt,
  });

  return c.json({ id, message: 'Materi berhasil dikirim ke siswa' }, 201);
});

learningRoutes.post('/materials/:materialId/read', requireRole('student'), async (c) => {
  const materialId = c.req.param('materialId');
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const existing = await db
    .select({ id: materialReads.id })
    .from(materialReads)
    .where(and(eq(materialReads.materialId, materialId), eq(materialReads.studentId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(materialReads).values({
      id: generateId(),
      materialId,
      studentId: user.id,
      readAt: new Date().toISOString(),
    });
  }

  return c.json({ ok: true });
});

learningRoutes.get('/materials/:materialId/reads', requireRole('teacher', 'admin'), async (c) => {
  const materialId = c.req.param('materialId');
  const db = drizzle(c.env.DB);

  const [mat] = await db.select().from(materials).where(eq(materials.id, materialId)).limit(1);
  if (!mat) return c.json({ error: 'Materi tidak ditemukan' }, 404);

  const [subj] = await db.select().from(subjects).where(eq(subjects.id, mat.subjectId)).limit(1);
  if (!subj) return c.json({ error: 'Mapel tidak ditemukan' }, 404);

  const members = await db
    .select({ studentId: users.id, name: users.name, identityNumber: users.identityNumber })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.studentId, users.id))
    .where(eq(classMembers.classId, subj.classId));

  const reads = await db
    .select()
    .from(materialReads)
    .where(eq(materialReads.materialId, materialId));
  const readMap = new Map(reads.map((r) => [r.studentId, r.readAt]));

  return c.json({
    students: members.map((m) => ({
      ...m,
      readAt: readMap.get(m.studentId) ?? null,
    })),
  });
});

learningRoutes.post('/subjects/:subjectId/assignments', requireRole('teacher'), async (c) => {
  const subjectId = c.req.param('subjectId');
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.teacherId, user.id)))
    .limit(1);

  if (!subject) {
    return c.json({ error: 'Anda tidak mengampu mata pelajaran ini' }, 403);
  }

  const formData = await c.req.formData();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const dueDate = String(formData.get('dueDate') ?? '').trim();
  const maxScore = Number(formData.get('maxScore') ?? 100) || 100;
  const file = formData.get('file');

  if (!title || !description || !dueDate) {
    return c.json({ error: 'Judul, instruksi, dan tenggat waktu wajib diisi' }, 400);
  }

  let fileKey: string | null = null;
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await saveFileToD1(db, file);
      fileKey = uploaded.fileKey;
      fileName = uploaded.fileName;
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Gagal menyimpan file' }, 400);
    }
  }

  const id = generateId();
  await db.insert(assignments).values({
    id,
    subjectId,
    title,
    description,
    fileKey,
    fileName,
    dueDate,
    maxScore,
    createdAt: new Date().toISOString(),
  });

  return c.json({ id, message: 'Tugas berhasil dikirim ke siswa' }, 201);
});

learningRoutes.post('/assignments/:assignmentId/submit', requireRole('student'), async (c) => {
  const assignmentId = c.req.param('assignmentId');
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const formData = await c.req.formData();
  const content = String(formData.get('content') ?? '').trim() || null;
  const file = formData.get('file');

  if (!content && !(file instanceof File && file.size > 0)) {
    return c.json({ error: 'Isi jawaban teks atau unggah file tugas' }, 400);
  }

  let fileKey: string | null = null;
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await saveFileToD1(db, file);
      fileKey = uploaded.fileKey;
      fileName = uploaded.fileName;
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Gagal menyimpan file' }, 400);
    }
  }

  const [existing] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, user.id)))
    .limit(1);

  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(submissions)
      .set({
        content: content ?? existing.content,
        fileKey: fileKey ?? existing.fileKey,
        fileName: fileName ?? existing.fileName,
        submittedAt: now,
      })
      .where(eq(submissions.id, existing.id));

    return c.json({ message: 'Jawaban tugas berhasil diperbarui' });
  }

  await db.insert(submissions).values({
    id: generateId(),
    assignmentId,
    studentId: user.id,
    content,
    fileKey,
    fileName,
    submittedAt: now,
  });

  return c.json({ message: 'Tugas berhasil dikumpulkan' }, 201);
});

learningRoutes.get('/assignments/:assignmentId/submissions', requireRole('teacher', 'admin'), async (c) => {
  const assignmentId = c.req.param('assignmentId');
  const db = drizzle(c.env.DB);

  const [assignment] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);
  if (!assignment) return c.json({ error: 'Tugas tidak ditemukan' }, 404);

  const [subj] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, assignment.subjectId))
    .limit(1);
  if (!subj) return c.json({ error: 'Mapel tidak ditemukan' }, 404);

  const members = await db
    .select({ studentId: users.id, name: users.name, identityNumber: users.identityNumber })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.studentId, users.id))
    .where(eq(classMembers.classId, subj.classId));

  const subs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.assignmentId, assignmentId));
  const subMap = new Map(subs.map((s) => [s.studentId, s]));

  return c.json({
    assignment,
    submissions: members.map((m) => ({
      studentId: m.studentId,
      studentName: m.name,
      identityNumber: m.identityNumber,
      submission: subMap.get(m.studentId) ?? null,
    })),
  });
});

learningRoutes.patch('/submissions/:submissionId/grade', requireRole('teacher'), async (c) => {
  const submissionId = c.req.param('submissionId');
  const body = await c.req.json<{ score: number; feedback?: string }>();

  if (typeof body.score !== 'number' || body.score < 0) {
    return c.json({ error: 'Nilai tidak valid' }, 400);
  }

  const db = drizzle(c.env.DB);
  await db
    .update(submissions)
    .set({
      score: body.score,
      feedback: body.feedback?.trim() || null,
      gradedAt: new Date().toISOString(),
    })
    .where(eq(submissions.id, submissionId));

  return c.json({ message: 'Nilai berhasil disimpan' });
});

learningRoutes.get('/files/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const db = drizzle(c.env.DB);
  const [fileRow] = await db.select().from(files).where(eq(files.id, key)).limit(1);
  if (!fileRow) {
    return c.json({ error: 'File tidak ditemukan' }, 404);
  }

  const bytes = base64ToUint8Array(fileRow.dataBase64);
  return new Response(bytes, {
    headers: {
      'Content-Type': fileRow.contentType,
      'Content-Disposition': `attachment; filename="${fileRow.name.replace(/"/g, '_')}"`,
    },
  });
});
