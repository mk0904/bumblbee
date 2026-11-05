import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PostgresRepository } from '../../src/infrastructure/repositories.js';
import { MissionService, FlightService } from '../../src/application/services.js';

test('production SQL repository persists domain snapshots and rolls back failed transactions in embedded PostgreSQL', async () => {
  const db = new PGlite();
  await db.exec(
    await readFile(new URL('../../migrations/001_initial.sql', import.meta.url), 'utf8'),
  );
  await db.exec(await readFile(new URL('../../migrations/002_mission_speed.sql', import.meta.url), 'utf8'));
  const client = { query: (sql, values) => db.query(sql, values), release() {} };
  const pool = {
    query: client.query,
    async connect() {
      return client;
    },
    async end() {
      await db.close();
    },
  };
  const repository = new PostgresRepository(pool);
  try {
    await repository.init();
    const missionService = new MissionService(repository, () => {});
    const gateway = {
      connected: true,
      mode: 'test',
      dispatched: new Set(),
      async send(c) {
        this.dispatched.add(c.id);
      },
    };
    const flightService = new FlightService(repository, gateway, () => {});
    const mission = await missionService.save('operator-01', {
      name: 'SQL survey',
      defaultSpeed: 0.7,
      waypoints: [{ x: 5, y: 6, altitude: 7, speed: 0.5 }],
    });
    assert.equal((await db.query('SELECT speed_mps FROM waypoints WHERE mission_id=$1',[mission.id])).rows[0].speed_mps,0.5);
    await assert.rejects(db.query('UPDATE waypoints SET speed_mps=3 WHERE mission_id=$1',[mission.id]));
    const command = await flightService.start(
      'operator-01',
      { missionId: mission.id, revision: 1 },
      'sql-test-key',
    );
    await missionService.save(
      'operator-01',
      { name: 'Changed route', revision: 1, waypoints: [{ x: 20, y: 0, altitude: 8 }] },
      mission.id,
    );
    const state = await repository.read();
    assert.equal(state.flights[0].snapshot.waypoints[0].x, 5);
    assert.equal(state.missions[0].waypoints[0].x, 20);
    assert.equal(
      (await db.query('SELECT x_m FROM waypoints WHERE mission_id=$1', [mission.id])).rows[0].x_m,
      20,
    );
    await assert.rejects(
      repository.transact((s) => {
        s.missions[0].name = 'Not committed';
        throw new Error('Rollback');
      }),
    );
    assert.equal((await repository.read()).missions[0].name, 'Changed route');
    await assert.rejects(
      flightService.start('operator-01', { missionId: mission.id, revision: 2 }, randomUUID()),
      { code: 'DRONE_BUSY' },
    );
    assert.equal(
      (
        await flightService.start(
          'operator-01',
          { missionId: mission.id, revision: 1 },
          'sql-test-key',
        )
      ).id,
      command.id,
    );
  } finally {
    await repository.close();
  }
});
