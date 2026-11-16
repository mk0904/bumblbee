import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseConfig } from '../src/infrastructure/database-config.js';

test('database CA config preserves host and enforces verified TLS for runtime and migrations', () => {
  const config = databaseConfig(
    'postgresql://user:test@database.example:5432/postgres?sslmode=require',
    { caPath: 'certs/supabase-root-2021.crt' },
  );
  const uri = new URL(config.connectionString);
  assert.equal(uri.hostname, 'database.example');
  assert.equal(uri.searchParams.get('sslmode'), 'verify-full');
  assert.ok(uri.searchParams.get('sslrootcert').endsWith('/backend/certs/supabase-root-2021.crt'));
  assert.equal(config.connectionTimeoutMillis, 12000);
});
