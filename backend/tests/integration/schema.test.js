import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL schema enforces active-flight, foreign-key and idempotency constraints (embedded PostgreSQL)', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL('../../migrations/001_initial.sql', import.meta.url), 'utf8'),
    );
    const mission = randomUUID(),
      flight = randomUUID();
    await db.query('INSERT INTO missions VALUES($1,$2,1,$3,now())', [mission, 'operator-01', '{}']);
    const insert = 'INSERT INTO flight_sessions VALUES($1,$2,$3,$4,$5,$6,now())';
    await db.query(insert, [flight, 'drone-01', mission, 'operator-01', 'EXECUTING', '{}']);
    await assert.rejects(
      db.query(insert, [randomUUID(), 'drone-01', mission, 'operator-01', 'STARTING', '{}']),
      (error) => error.code === '23505',
    );
    await db.query('UPDATE flight_sessions SET state=$1 WHERE id=$2', ['COMPLETED', flight]);
    await db.query(insert, [randomUUID(), 'drone-01', mission, 'operator-01', 'STARTING', '{}']);
    await assert.rejects(
      db.query(insert, [randomUUID(), 'drone-02', randomUUID(), 'operator-01', 'STARTING', '{}']),
      (error) => error.code === '23503',
    );
    const cmd = 'INSERT INTO commands VALUES($1,$2,$3,$4,$5,now())';
    await db.query(cmd, [randomUUID(), flight, 'operator-01', 'one-key', '{}']);
    await assert.rejects(
      db.query(cmd, [randomUUID(), flight, 'operator-01', 'one-key', '{}']),
      (error) => error.code === '23505',
    );
  } finally {
    await db.close();
  }
});
