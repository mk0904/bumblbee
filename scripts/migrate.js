import { readFile } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL)
  throw new Error(
    'Set DATABASE_URL for migration; use a direct/session connection suitable for DDL',
  );
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const existing = await pool.query(
    "SELECT to_regclass('public.app_schema_version') AS table_name",
  );
  if (existing.rows[0].table_name)
    console.info('Schema already initialized; no pending migrations.');
  else {
    await pool.query(
      await readFile(new URL('../backend/migrations/001_initial.sql', import.meta.url), 'utf8'),
    );
    console.info('Applied migration 001.');
  }
} finally {
  await pool.end();
}
