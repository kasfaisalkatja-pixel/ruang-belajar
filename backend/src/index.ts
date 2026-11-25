import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { learningRoutes } from './routes/learning';
import type { Bindings, Variables } from './types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      if (!origin) return c.env.CORS_ORIGIN || '*';
      const configured = (c.env.CORS_ORIGIN || '').replace(/\/$/, '');
      if (
        configured === '*' ||
        origin === configured ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('.pages.dev')
      ) {
        return origin;
      }
      return configured || origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'ruang-belajar-api' });
});

app.route('/api/auth', authRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/learning', learningRoutes);

export default app;
