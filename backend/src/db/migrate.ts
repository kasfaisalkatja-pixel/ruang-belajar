/**
 * Ensures new columns (`gender`, `must_change_password`) exist on `users`
 * for existing Cloudflare D1 deployments without requiring manual SQL in Console.
 */
export async function ensureUserSchema(rawDb: D1Database) {
  const info = await rawDb.prepare('PRAGMA table_info(users)').all<{ name: string }>();
  const cols = new Set((info.results || []).map((r) => r.name));

  if (!cols.has('gender')) {
    await rawDb.prepare('ALTER TABLE users ADD COLUMN gender text').run();
  }
  if (!cols.has('must_change_password')) {
    await rawDb
      .prepare('ALTER TABLE users ADD COLUMN must_change_password integer NOT NULL DEFAULT 0')
      .run();
  }
}
