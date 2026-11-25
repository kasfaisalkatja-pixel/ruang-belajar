import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import { users } from '../db/schema';
import { ensureUserSchema } from '../db/migrate';
import { generateId, hashPassword, verifyPassword } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

authRoutes.get('/status', async (c) => {
  await ensureUserSchema(c.env.DB);
  const db = drizzle(c.env.DB);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return c.json({ initialized: count > 0 });
});

authRoutes.post('/setup', async (c) => {
  await ensureUserSchema(c.env.DB);
  const db = drizzle(c.env.DB);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);

  if (count > 0) {
    return c.json(
      { error: 'Setup awal sudah pernah dilakukan. Silakan masuk menggunakan akun Admin Anda.' },
      400
    );
  }

  const body = await c.req.json<{ name: string; username: string; password: string }>();
  if (!body.name || !body.username || !body.password) {
    return c.json({ error: 'Nama, username, dan password wajib diisi' }, 400);
  }

  const id = generateId();
  const passwordHash = await hashPassword(body.password);
  const createdAt = new Date().toISOString();
  const normalizedUsername = body.username.trim().toLowerCase();

  await db.insert(users).values({
    id,
    name: body.name.trim(),
    username: normalizedUsername,
    passwordHash,
    role: 'admin',
    identityNumber: 'ADMIN-01',
    gender: null,
    mustChangePassword: 0,
    createdAt,
  });

  return c.json({ message: 'Akun admin awal berhasil dibuat', username: normalizedUsername }, 201);
});

/**
 * Supports:
 * 1) Student Login: `identifier` = Nama Lengkap Siswa (case-insensitive) OR NISN, `password` = NISN (first login / after reset) or custom password.
 * 2) Teacher / Admin Login: `username` (or `identifier`) + `password`.
 */
authRoutes.post('/login', async (c) => {
  await ensureUserSchema(c.env.DB);
  const body = await c.req.json<{
    username?: string;
    identifier?: string;
    password: string;
    loginType?: 'student' | 'staff';
  }>();

  const rawIdentifier = (body.identifier ?? body.username ?? '').trim();
  const password = body.password ?? '';

  if (!rawIdentifier || !password) {
    return c.json({ error: 'Nama/Username dan Password/NISN wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const lowered = rawIdentifier.toLowerCase();

  let candidates: (typeof users.$inferSelect)[] = [];

  if (body.loginType === 'student') {
    // Match student by exact Name (case-insensitive), NISN, or username
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));
    candidates = allStudents.filter(
      (u) =>
        u.name.trim().toLowerCase() === lowered ||
        (u.identityNumber && u.identityNumber.trim().toLowerCase() === lowered) ||
        u.username.trim().toLowerCase() === lowered
    );
  } else {
    // Staff login or universal fallback
    const allUsers = await db.select().from(users);
    candidates = allUsers.filter(
      (u) =>
        u.username.trim().toLowerCase() === lowered ||
        u.name.trim().toLowerCase() === lowered ||
        (u.identityNumber && u.identityNumber.trim().toLowerCase() === lowered)
    );
  }

  let matchedUser: (typeof users.$inferSelect) | null = null;
  for (const candidate of candidates) {
    if (await verifyPassword(password, candidate.passwordHash)) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    return c.json(
      {
        error:
          body.loginType === 'student'
            ? 'Nama Siswa atau NISN/Password tidak sesuai. Jika lupa password, minta Admin untuk Reset ke NISN.'
            : 'Username atau password salah',
      },
      401
    );
  }

  const mustChangePassword = matchedUser.mustChangePassword === 1;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const token = await sign(
    {
      sub: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      role: matchedUser.role,
      identityNumber: matchedUser.identityNumber,
      gender: matchedUser.gender,
      mustChangePassword,
      exp,
    },
    c.env.JWT_SECRET,
    'HS256'
  );

  return c.json({
    token,
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      username: matchedUser.username,
      role: matchedUser.role,
      identityNumber: matchedUser.identityNumber,
      gender: matchedUser.gender,
      mustChangePassword,
    },
  });
});

authRoutes.get('/me', requireAuth, async (c) => {
  await ensureUserSchema(c.env.DB);
  const authUser = c.get('user');
  const db = drizzle(c.env.DB);
  const [fresh] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

  if (!fresh) {
    return c.json({ error: 'Akun tidak ditemukan' }, 401);
  }

  return c.json({
    user: {
      id: fresh.id,
      name: fresh.name,
      username: fresh.username,
      role: fresh.role,
      identityNumber: fresh.identityNumber,
      gender: fresh.gender,
      mustChangePassword: fresh.mustChangePassword === 1,
    },
  });
});

authRoutes.post('/change-password', requireAuth, async (c) => {
  await ensureUserSchema(c.env.DB);
  const authUser = c.get('user');
  const body = await c.req.json<{ newPassword: string }>();

  const newPwd = (body.newPassword ?? '').trim();
  if (newPwd.length < 4) {
    return c.json({ error: 'Password baru minimal 4 karakter' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [current] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!current) {
    return c.json({ error: 'Pengguna tidak ditemukan' }, 404);
  }

  if (current.identityNumber && newPwd === current.identityNumber.trim()) {
    return c.json(
      { error: 'Password baru tidak boleh sama dengan NISN awal Anda. Buat password unik yang mudah diingat.' },
      400
    );
  }

  const passwordHash = await hashPassword(newPwd);
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: 0,
    })
    .where(eq(users.id, authUser.id));

  return c.json({
    message: 'Password berhasil diperbarui! Selamat belajar!',
    user: {
      id: current.id,
      name: current.name,
      username: current.username,
      role: current.role,
      identityNumber: current.identityNumber,
      gender: current.gender,
      mustChangePassword: false,
    },
  });
});
