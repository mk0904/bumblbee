import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { databaseConfig } from '../backend/src/infrastructure/database-config.js';
if (!process.env.DATABASE_URL)
  throw new Error(
    'Set DATABASE_URL for migration; use a direct/session connection suitable for DDL',
  );
const pool = new pg.Pool(databaseConfig(process.env.DATABASE_URL));
try {
  const existing = await pool.query(
    "SELECT to_regclass('public.app_schema_version') AS table_name",
  );
  if (existing.rows[0].table_name)
    console.info('Base schema initialized.');
  else {
    await pool.query(
      await readFile(new URL('../backend/migrations/001_initial.sql', import.meta.url), 'utf8'),
    );
    console.info('Applied migration 001.');
  }
  const speedVersion = await pool.query('SELECT id FROM app_schema_version WHERE id=2');
  if (!speedVersion.rows.length) {
    await pool.query('BEGIN');
    try {
      await pool.query(await readFile(new URL('../backend/migrations/002_mission_speed.sql', import.meta.url), 'utf8'));
      await pool.query('COMMIT');
      console.info('Applied migration 002.');
    } catch (error) { await pool.query('ROLLBACK'); throw error; }
  }
} finally {
  await pool.end();
}
