import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq } from 'drizzle-orm';
import { classMembers, classes, subjects, users } from '../db/schema';
import { generateId, hashPassword } from '../lib/crypto';
import { requireAuth, requireRole } from '../middleware/auth';
import type { Bindings, UserRole, Variables } from '../types';

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRoutes.use('*', requireAuth, requireRole('admin'));

adminRoutes.get('/users', async (c) => {
  const role = c.req.query('role') as UserRole | undefined;
  const db = drizzle(c.env.DB);

  const rows = role
    ? await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          role: users.role,
          identityNumber: users.identityNumber,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.role, role))
        .orderBy(desc(users.createdAt))
    : await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          role: users.role,
          identityNumber: users.identityNumber,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

  return c.json({ users: rows });
});

adminRoutes.post('/users', async (c) => {
  const body = await c.req.json<{
    name: string;
    username: string;
    password: string;
    role: UserRole;
    identityNumber?: string;
  }>();

  if (!body.name || !body.username || !body.password || !body.role) {
    return c.json({ error: 'Nama, username, password, dan role wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, body.username.trim().toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'Username sudah digunakan' }, 409);
  }

  const id = generateId();
  const passwordHash = await hashPassword(body.password);
  const createdAt = new Date().toISOString();

  await db.insert(users).values({
    id,
    name: body.name.trim(),
    username: body.username.trim().toLowerCase(),
    passwordHash,
    role: body.role,
    identityNumber: body.identityNumber?.trim() || null,
    createdAt,
  });

  return c.json(
    {
      user: {
        id,
        name: body.name.trim(),
        username: body.username.trim().toLowerCase(),
        role: body.role,
        identityNumber: body.identityNumber?.trim() || null,
        createdAt,
      },
    },
    201
  );
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

  return c.json({ class: { id, name: body.name.trim(), academicYear: body.academicYear.trim(), createdAt } }, 201);
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
    return c.json({ error: 'studentId wajib diisi' }, 400);
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
