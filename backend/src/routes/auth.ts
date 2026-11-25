import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import { users } from '../db/schema';
import { generateId, hashPassword, verifyPassword } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

authRoutes.get('/status', async (c) => {
  const db = drizzle(c.env.DB);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
  return c.json({ initialized: count > 0 });
});

authRoutes.post('/setup', async (c) => {
  const db = drizzle(c.env.DB);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  if (count > 0) {
    return c.json({ error: 'Setup awal sudah pernah dilakukan. Silakan masuk menggunakan akun Admin Anda.' }, 400);
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
    createdAt,
  });

  return c.json({ message: 'Akun admin awal berhasil dibuat', username: normalizedUsername }, 201);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();
  if (!body.username || !body.password) {
    return c.json({ error: 'Username dan password wajib diisi' }, 400);
  }

  const db = drizzle(c.env.DB);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, body.username.trim().toLowerCase()))
    .limit(1);

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return c.json({ error: 'Username atau password salah' }, 401);
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const token = await sign(
    {
      sub: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      identityNumber: user.identityNumber,
      exp,
    },
    c.env.JWT_SECRET,
    'HS256'
  );

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      identityNumber: user.identityNumber,
    },
  });
});

authRoutes.get('/me', requireAuth, (c) => {
  return c.json({ user: c.get('user') });
});
