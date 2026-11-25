import { createMiddleware } from 'hono/factory';
import { verify } from 'hono/jwt';
import type { AuthUser, Bindings, UserRole, Variables } from '../types';

export const requireAuth = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const queryToken = c.req.query('token');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken || null;

  if (!token) {
    return c.json({ error: 'Token autentikasi tidak ditemukan' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    const user: AuthUser = {
      id: String(payload.sub),
      name: String(payload.name),
      username: String(payload.username),
      role: payload.role as UserRole,
      identityNumber: payload.identityNumber ? String(payload.identityNumber) : null,
    };
    c.set('user', user);
    await next();
  } catch {
    return c.json({ error: 'Sesi tidak valid atau telah berakhir. Silakan keluar lalu masuk kembali.' }, 401);
  }
});

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<{
    Bindings: Bindings;
    Variables: Variables;
  }>(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Anda tidak memiliki akses untuk fitur ini' }, 403);
    }
    await next();
  });
}
