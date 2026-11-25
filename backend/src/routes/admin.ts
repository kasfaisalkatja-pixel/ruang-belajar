import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  assignments,
  classMembers,
  classes,
  materials,
  subjects,
  users,
} from '../db/schema';
import { ensureUserSchema } from '../db/migrate';
import { generateId, hashPassword } from '../lib/crypto';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Bindings, UserRole, Variables } from '../types';

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.use('*', requireAuth, requireRole('admin'), async (c, next) => {
  await ensureUserSchema(c.env.DB);
  await next();
});

adminRoutes.get('/stats', async (c) => {
  const db = drizzle(c.env.DB);
  const allUsers = await db.select({ role: users.role }).from(users);
  const [{ classCount }] = await db.select({ classCount: sql<number>`count(*)` }).from(classes);
  const [{ subjectCount }] = await db.select({ subjectCount: sql<number>`count(*)` }).from(subjects);
  const [{ materialCount }] = await db.select({ materialCount: sql<number>`count(*)` }).from(materials);
  const [{ assignmentCount }] = await db
    .select({ assignmentCount: sql<number>`count(*)` })
    .from(assignments);

  return c.json({
    teachers: allUsers.filter((u) => u.role === 'teacher').length,
    students: allUsers.filter((u) => u.role === 'student').length,
    admins: allUsers.filter((u) => u.role === 'admin').length,
    classes: classCount,
    subjects: subjectCount,
    materials: materialCount,
    assignments: assignmentCount,
  });
});

adminRoutes.get('/users', async (c) => {
  const role = c.req.query('role') as UserRole | undefined;
  const db = drizzle(c.env.DB);

  const allClasses = await db.select().from(classes);
  const allMembers = await db.select().from(classMembers);
  const classNameMap = new Map(allClasses.map((cl) => [cl.id, cl.name]));
  const studentClassMap = new Map<string, string>();
  for (const m of allMembers) {
    const cName = classNameMap.get(m.classId);
    if (cName) studentClassMap.set(m.studentId, cName);
  }

  const baseSelect = {
    id: users.id,
    name: users.name,
    username: users.username,
    role: users.role,
    identityNumber: users.identityNumber,
    gender: users.gender,
    mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt,
  };

  const rows = role
    ? await db.select(baseSelect).from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt))
    : await db.select(baseSelect).from(users).orderBy(desc(users.createdAt));

  return c.json({
    users: rows.map((u) => ({
      ...u,
      className: studentClassMap.get(u.id) || null,
    })),
  });
});

adminRoutes.post('/users', async (c) => {
  const body = await c.req.json<{
    name: string;
    username?: string;
    password?: string;
    role: UserRole;
    identityNumber?: string;
    gender?: string;
    classId?: string;
  }>();

  if (!body.name || !body.role) {
    return c.json({ error: 'Nama dan peran wajib diisi' }, 400);
  }

  const nisn = body.identityNumber?.trim() || '';
  if (body.role === 'student' && !nisn) {
    return c.json({ error: 'NISN wajib diisi untuk akun Siswa' }, 400);
  }

  const normalizedUsername = (body.username?.trim() || nisn).toLowerCase();
  const initialPassword = body.role === 'student' ? body.password?.trim() || nisn : body.password?.trim() || '';

  if (!normalizedUsername || !initialPassword) {
    return c.json({ error: 'Username dan password wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, normalizedUsername))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Username / NISN sudah terdaftar' }, 409);
  }

  const id = generateId();
  const passwordHash = await hashPassword(initialPassword);
  const createdAt = new Date().toISOString();
  const mustChangePassword = body.role === 'student' ? 1 : 0;

  await db.insert(users).values({
    id,
    name: body.name.trim(),
    username: normalizedUsername,
    passwordHash,
    role: body.role,
    identityNumber: nisn || null,
    gender: body.gender?.trim() || null,
    mustChangePassword,
    createdAt,
  });

  if (body.role === 'student' && body.classId) {
    await db.insert(classMembers).values({
      id: generateId(),
      classId: body.classId,
      studentId: id,
      joinedAt: createdAt,
    });
  }

  return c.json({ message: 'Akun berhasil dibuat', id }, 201);
});

/**
 * Batch Import Students from Excel (Nomor, Nama, Jenis Kelamin, NISN, Kelas).
 * Sent in small batches from frontend (e.g. 5 rows per request) so PBKDF2 hashing stays well inside Workers CPU limits.
 */
adminRoutes.post('/students/import', async (c) => {
  const body = await c.req.json<{
    academicYear?: string;
    students: Array<{
      name: string;
      gender?: string;
      nisn: string;
      className: string;
    }>;
  }>();

  if (!Array.isArray(body.students) || body.students.length === 0) {
    return c.json({ error: 'Data siswa kosong' }, 400);
  }

  const academicYear = body.academicYear?.trim() || '2026/2027';
  const db = drizzle(c.env.DB);

  const existingClasses = await db.select().from(classes);
  const classMap = new Map(existingClasses.map((cl) => [cl.name.trim().toLowerCase(), cl.id]));

  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of body.students) {
    const name = String(row.name ?? '').trim();
    const nisn = String(row.nisn ?? '').trim();
    const gender = String(row.gender ?? '').trim() || null;
    const classNameRaw = String(row.className ?? '').trim();

    if (!name || !nisn) continue;

    // Auto-create class if it doesn't exist yet
    let classId: string | null = null;
    if (classNameRaw) {
      const classKey = classNameRaw.toLowerCase();
      if (classMap.has(classKey)) {
        classId = classMap.get(classKey)!;
      } else {
        classId = generateId();
        await db.insert(classes).values({
          id: classId,
          name: classNameRaw,
          academicYear,
          createdAt: now,
        });
        classMap.set(classKey, classId);
      }
    }

    // Check if student with this NISN/username already exists
    const username = nisn.toLowerCase();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    let studentId: string;
    if (existingUser) {
      studentId = existingUser.id;
      await db
        .update(users)
        .set({
          name,
          identityNumber: nisn,
          gender: gender ?? existingUser.gender,
        })
        .where(eq(users.id, studentId));
      updated++;
    } else {
      studentId = generateId();
      const passwordHash = await hashPassword(nisn);
      await db.insert(users).values({
        id: studentId,
        name,
        username,
        passwordHash,
        role: 'student',
        identityNumber: nisn,
        gender,
        mustChangePassword: 1,
        createdAt: now,
      });
      created++;
    }

    if (classId) {
      // Remove previous class memberships and assign the imported class
      await db.delete(classMembers).where(eq(classMembers.studentId, studentId));
      await db.insert(classMembers).values({
        id: generateId(),
        classId,
        studentId,
        joinedAt: now,
      });
    }
  }

  return c.json({ created, updated });
});

/**
 * 1-Click Reset Student Password back to initial password = NISN (and require password change on next login)
 */
adminRoutes.post('/users/:id/reset-nisn', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) {
    return c.json({ error: 'Pengguna tidak ditemukan' }, 404);
  }

  const nisn = (target.identityNumber || target.username || '').trim();
  if (!nisn) {
    return c.json({ error: 'Siswa ini belum memiliki NISN' }, 400);
  }

  const passwordHash = await hashPassword(nisn);
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: 1,
    })
    .where(eq(users.id, id));

  return c.json({
    message: `Password ${target.name} berhasil direset kembali ke NISN (${nisn})! Siswa akan diminta membuat password baru saat login berikutnya.`,
  });
});

adminRoutes.patch('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    password?: string;
    identityNumber?: string;
    gender?: string;
  }>();

  const db = drizzle(c.env.DB);
  const updates: Record<string, unknown> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.identityNumber !== undefined) updates.identityNumber = body.identityNumber.trim() || null;
  if (body.gender !== undefined) updates.gender = body.gender.trim() || null;
  if (body.password?.trim()) {
    updates.passwordHash = await hashPassword(body.password.trim());
    updates.mustChangePassword = 0;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }
  return c.json({ message: 'Data pengguna berhasil diperbarui' });
});

adminRoutes.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user');
  if (id === currentUser.id) {
    return c.json({ error: 'Tidak dapat menghapus akun sendiri' }, 400);
  }
  const db = drizzle(c.env.DB);
  await db.delete(users).where(eq(users.id, id));
  return c.json({ message: 'Pengguna dihapus' });
});

adminRoutes.get('/classes', async (c) => {
  const db = drizzle(c.env.DB);
  const allClasses = await db.select().from(classes).orderBy(desc(classes.createdAt));
  const members = await db.select().from(classMembers);

  const result = allClasses.map((cls) => ({
    ...cls,
    studentCount: members.filter((m) => m.classId === cls.id).length,
  }));

  return c.json({ classes: result });
});

adminRoutes.post('/classes', async (c) => {
  const body = await c.req.json<{ name: string; academicYear: string }>();
  if (!body.name || !body.academicYear) {
    return c.json({ error: 'Nama kelas dan tahun ajaran wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const id = generateId();
  const createdAt = new Date().toISOString();

  await db.insert(classes).values({
    id,
    name: body.name.trim(),
    academicYear: body.academicYear.trim(),
    createdAt,
  });

  return c.json(
    { class: { id, name: body.name.trim(), academicYear: body.academicYear.trim(), createdAt } },
    201
  );
});

adminRoutes.delete('/classes/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(classes).where(eq(classes.id, id));
  return c.json({ message: 'Kelas berhasil dihapus' });
});

adminRoutes.get('/classes/:id/members', async (c) => {
  const classId = c.req.param('id');
  const db = drizzle(c.env.DB);

  const rows = await db
    .select({
      memberId: classMembers.id,
      studentId: users.id,
      name: users.name,
      username: users.username,
      identityNumber: users.identityNumber,
      gender: users.gender,
      joinedAt: classMembers.joinedAt,
    })
    .from(classMembers)
    .innerJoin(users, eq(classMembers.studentId, users.id))
    .where(eq(classMembers.classId, classId));

  return c.json({ members: rows });
});

adminRoutes.post('/classes/:id/members', async (c) => {
  const classId = c.req.param('id');
  const body = await c.req.json<{ studentId: string }>();
  if (!body.studentId) {
    return c.json({ error: 'Siswa wajib dipilih' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existing = await db
    .select({ id: classMembers.id })
    .from(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, body.studentId)))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Siswa sudah terdaftar di kelas ini' }, 409);
  }

  const id = generateId();
  await db.insert(classMembers).values({
    id,
    classId,
    studentId: body.studentId,
    joinedAt: new Date().toISOString(),
  });

  return c.json({ message: 'Siswa ditambahkan ke kelas' }, 201);
});

adminRoutes.delete('/classes/:id/members/:studentId', async (c) => {
  const classId = c.req.param('id');
  const studentId = c.req.param('studentId');
  const db = drizzle(c.env.DB);

  await db
    .delete(classMembers)
    .where(and(eq(classMembers.classId, classId), eq(classMembers.studentId, studentId)));

  return c.json({ message: 'Siswa dikeluarkan dari kelas' });
});

adminRoutes.get('/subjects', async (c) => {
  const db = drizzle(c.env.DB);
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      description: subjects.description,
      classId: subjects.classId,
      className: classes.name,
      academicYear: classes.academicYear,
      teacherId: subjects.teacherId,
      teacherName: users.name,
      createdAt: subjects.createdAt,
    })
    .from(subjects)
    .innerJoin(classes, eq(subjects.classId, classes.id))
    .innerJoin(users, eq(subjects.teacherId, users.id))
    .orderBy(desc(subjects.createdAt));

  return c.json({ subjects: rows });
});

adminRoutes.post('/subjects', async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    classId: string;
    teacherId: string;
  }>();

  if (!body.name || !body.classId || !body.teacherId) {
    return c.json({ error: 'Nama mapel, kelas, dan guru pengampu wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const id = generateId();
  const createdAt = new Date().toISOString();

  await db.insert(subjects).values({
    id,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    classId: body.classId,
    teacherId: body.teacherId,
    createdAt,
  });

  return c.json({ id, message: 'Mata pelajaran berhasil dibuat' }, 201);
});

adminRoutes.delete('/subjects/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(subjects).where(eq(subjects.id, id));
  return c.json({ message: 'Mata pelajaran berhasil dihapus' });
});
