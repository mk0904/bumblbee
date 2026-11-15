import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileRepository } from '../src/infrastructure/repositories.js';
import {
  MissionService,
  FlightService,
  TelemetryService,
  ReportService,
} from '../src/application/services.js';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-test-'));
  const repository = new FileRepository(join(dir, 'state.json'));
  await repository.init();
  const gateway = {
    connected: true,
    mode: 'test',
    dispatched: new Set(),
    async send(command) {
      this.dispatched.add(command.id);
    },
  };
  const mission = new MissionService(repository, () => {}),
    flight = new FlightService(repository, gateway, () => {}),
    telemetry = new TelemetryService(repository, () => {});
  t.after(async () => {
    await repository.close();
    await rm(dir, { recursive: true, force: true });
  });
  const route = await mission.save('operator-01', {
    name: 'Survey',
    waypoints: [{ x: 10, y: 0, altitude: 8 }],
  });
  return { repository, gateway, mission, flight, telemetry, route };
}
test('concurrent starts serialize in demo repository; replay is idempotent and conflicting key is rejected', async (t) => {
  const f = await fixture(t),
    input = { missionId: f.route.id, revision: 1 };
  const results = await Promise.allSettled([
    f.flight.start('operator-01', input, 'key-00001'),
    f.flight.start('operator-01', input, 'key-00002'),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  const command = results.find((r) => r.status === 'fulfilled').value;
  assert.equal((await f.flight.start('operator-01', input, command.requestKey)).id, command.id);
  await assert.rejects(
    f.flight.start('operator-01', { ...input, revision: 2 }, command.requestKey),
    { code: 'IDEMPOTENCY_CONFLICT' },
  );
  assert.equal((await f.repository.read()).flights.length, 1);
});
test('telemetry deduplicates, preserves latest, alerts once and report flags sequence gaps', async (t) => {
  const f = await fixture(t);
  const cmd = await f.flight.start(
    'operator-01',
    { missionId: f.route.id, revision: 1 },
    'key-00001',
  );
  const base = {
    flightId: cmd.flightId,
    epochId: randomUUID(),
    sequence: 1,
    simulationTime: 0,
    x: 0,
    y: 0,
    altitude: 1,
    battery: 18,
    state: 'TAKING_OFF',
    speed: 0,
  };
  await f.telemetry.ingest(base);
  await f.telemetry.ingest(base);
  await f.telemetry.ingest({ ...base, sequence: 3, simulationTime: 1, x: 5 });
  await f.telemetry.ingest({ ...base, sequence: 2, simulationTime: 0.5, x: 2 });
  let state = await f.repository.read();
  assert.equal(state.telemetry.length, 3);
  assert.equal(state.flights[0].latest.sequence, 3);
  assert.equal(state.alerts.length, 1);
  await f.telemetry.acknowledge('operator-01', state.alerts[0].id);
  await f.telemetry.ingest({ ...base, sequence: 5, simulationTime: 2, state: 'EXECUTING' });
  state = await f.repository.read();
  assert.equal(state.alerts.length, 1);
  assert.equal(state.alerts[0].status, 'ACKNOWLEDGED');
  const report = await new ReportService(f.repository).get('operator-01', cmd.flightId);
  assert.equal(report.summary.gaps, 1);
  assert.equal(report.summary.complete, false);
  await assert.rejects(new ReportService(f.repository).get('other-user', cmd.flightId), {
    code: 'NOT_FOUND',
  });
});
test('file repository rolls back failed work and survives reopen', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    f.repository.transact((s) => {
      s.missions.length = 0;
      throw new Error('fail');
    }),
  );
  const reopened = new FileRepository(f.repository.path);
  await reopened.init();
  assert.equal((await reopened.read()).missions.length, 1);
});
test('offline start fails without creating a flight', async (t) => {
  const f = await fixture(t);
  f.gateway.connected = false;
  await assert.rejects(
    f.flight.start('operator-01', { missionId: f.route.id, revision: 1 }, 'key-00001'),
    { code: 'SIMULATOR_OFFLINE' },
  );
  assert.equal((await f.repository.read()).flights.length, 0);
});

test('scheduled silence detection and command timeout work without another telemetry event', async (t) => {
  const f = await fixture(t);
  const command = await f.flight.start(
    'operator-01',
    { missionId: f.route.id, revision: 1 },
    'silent-start-key',
  );
  const timed = new TelemetryService(f.repository, () => {}, { now: () => Date.now() + 15000 });
  await timed.maintain();
  const state = await f.repository.read();
  assert.equal(state.commands.find((c) => c.id === command.id).status, 'UNKNOWN');
  assert.equal(state.flights[0].state, 'STARTING');
  assert.equal(state.alerts[0].ruleKey, 'STALE_TELEMETRY');
  f.gateway.connected = false;
  await f.flight.reconcile('operator-01', command.flightId);
  const final = await f.repository.read();
  assert.equal(final.flights[0].state, 'INTERRUPTED');
  assert.equal(final.alerts[0].status, 'RESOLVED');
});

test('duplicate final telemetry and late command completion do not revive or corrupt an ended flight', async (t) => {
  const f = await fixture(t);
  const command = await f.flight.start(
    'operator-01',
    { missionId: f.route.id, revision: 1 },
    'late-start-key',
  );
  const base = {
    flightId: command.flightId,
    epochId: randomUUID(),
    x: 0,
    y: 0,
    altitude: 0,
    battery: 90,
    speed: 0,
  };
  for (const [i, state] of ['TAKING_OFF', 'EXECUTING', 'LANDING', 'COMPLETED'].entries()) {
    await f.telemetry.ingest({ ...base, state, sequence: i, simulationTime: i });
  }
  await f.telemetry.ingest({ ...base, state: 'COMPLETED', sequence: 3, simulationTime: 3 });
  await f.flight.commandResult({ commandId: command.id, status: 'COMPLETED' });
  const state = await f.repository.read();
  assert.equal(state.telemetry.length, 4);
  assert.equal(state.commands[0].status, 'COMPLETED');
  assert.equal(state.flights[0].state, 'COMPLETED');
});
