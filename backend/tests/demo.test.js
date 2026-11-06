import { DemoAdapter } from '../src/infrastructure/demo-adapter.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime } from '../src/infrastructure/runtime.js';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-demo-'));
  const ctx = await createRuntime({ dataPath: join(dir, 'state.json'), production: false });
  clearInterval(ctx.gateway.timer);
  t.after(async () => {
    await ctx.close();
    await rm(dir, { recursive: true, force: true });
  });
  const mission = await ctx.services.mission.save('operator-01', {
    name: 'Demo contract',
    waypoints: [{ x: 2, y: 0, altitude: 2 }],
  });
  const command = await ctx.services.flight.start(
    'operator-01',
    { missionId: mission.id, revision: 1 },
    'demo-start-key',
  );
  await ctx.gateway.queue;
  return { ...ctx, command };
}
test('demo adapter executes start, pause hover, resume and land through application services', async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 4; i++) await f.gateway.tick();
  let state = await f.repository.read();
  assert.equal(state.flights[0].state, 'EXECUTING');
  await f.services.flight.action('operator-01', f.command.flightId, 'PAUSE', 'pause-key-01');
  await f.gateway.queue;
  const before = f.gateway.sample.x;
  await f.gateway.tick();
  assert.equal(f.gateway.sample.x, before);
  assert.equal(f.gateway.sample.state, 'PAUSED');
  await f.services.flight.action('operator-01', f.command.flightId, 'RESUME', 'resume-key-01');
  await f.gateway.queue;
  await f.services.flight.action('operator-01', f.command.flightId, 'LAND', 'land-key-01');
  await f.gateway.queue;
  for (let i = 0; i < 4; i++) await f.gateway.tick();
  state = await f.repository.read();
  assert.equal(state.flights[0].state, 'COMPLETED');
  assert.ok(state.commands.every((c) => c.status === 'COMPLETED'));
});
test('landing during takeoff supersedes start without falsely failing the flight', async (t) => {
  const f = await fixture(t);
  await f.gateway.tick();
  await f.services.flight.action('operator-01', f.command.flightId, 'LAND', 'land-early-01');
  await f.gateway.queue;
  await f.gateway.tick();
  const state = await f.repository.read();
  assert.equal(state.flights[0].state, 'COMPLETED');
  assert.equal(state.commands[0].status, 'CANCELLED');
  assert.equal(state.commands[1].status, 'COMPLETED');
});

test('slow persistence coalesces timer ticks so commands are not buried under a timer backlog', async () => {
  const adapter = new DemoAdapter();
  let release;
  let calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  adapter.tick = async () => {
    calls++;
    await gate;
  };
  adapter.scheduleTick();
  for (let i = 0; i < 100; i++) adapter.scheduleTick();
  await Promise.resolve();
  assert.equal(calls, 1);
  const first = adapter.queue;
  release();
  await first;
  adapter.scheduleTick();
  await adapter.queue;
  assert.equal(calls, 2);
});
