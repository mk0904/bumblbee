import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { createRuntime } from '../src/infrastructure/runtime.js';
import { createApp } from '../src/interfaces/http/create-app.js';
import { attachWebSockets } from '../src/interfaces/websockets.js';

test('external-agent protocol authenticates, dispatches a real socket command and records returned telemetry', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-ws-'));
  const ctx = await createRuntime({
    dataPath: join(dir, 'state.json'),
    production: false,
    mode: 'webots',
    simulatorToken: 'test-agent-token',
  });
  const server = createServer(createApp(ctx));
  const closeSockets = attachWebSockets(server, ctx);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let ws;
  t.after(async () => {
    ws?.terminate();
    await closeSockets();
    await new Promise((resolve) => server.close(resolve));
    await ctx.close();
    await rm(dir, { recursive: true, force: true });
  });
  ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/ws/simulator`, {
    headers: { Authorization: 'Bearer test-agent-token' },
  });
  await once(ws, 'open');
  const epochId = randomUUID();
  const welcome = once(ws, 'message');
  ws.send(JSON.stringify({ protocolVersion: 1, type: 'hello', droneId: 'drone-01', epochId }));
  assert.equal(JSON.parse((await welcome)[0]).type, 'welcome');
  const mission = await ctx.services.mission.save('operator-01', {
    name: 'Agent test',
    waypoints: [{ x: 1, y: 1, altitude: 8 }],
  });
  const commandMessage = once(ws, 'message');
  const cmd = await ctx.services.flight.start(
    'operator-01',
    { missionId: mission.id, revision: 1 },
    'ws-start-key-01',
  );
  assert.equal(JSON.parse((await commandMessage)[0]).payload.id, cmd.id);
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'command_result',
      payload: { commandId: cmd.id, status: 'ACCEPTED' },
    }),
  );
  const changed = once(ctx.events, 'changed');
  const persisted = once(ws, 'message');
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'telemetry',
      payload: {
        flightId: cmd.flightId,
        epochId,
        sequence: 1,
        simulationTime: 0,
        x: 0,
        y: 0,
        altitude: 0.5,
        speed: 0,
        battery: 100,
        roll: 0,
        pitch: 0,
        yaw: 0,
        waypoint: 0,
        state: 'TAKING_OFF',
        batterySource: 'synthetic',
      },
    }),
  );
  await changed;
  const acknowledgement = JSON.parse((await persisted)[0]);
  assert.equal(acknowledgement.type, 'telemetry_ack');
  assert.equal(acknowledgement.sequence, 1);
  assert.equal(acknowledgement.epochId, epochId);
  // Heartbeats are liveness evidence, independent of persistence acknowledgements.
  const heartbeat = once(ws, 'message');
  ws.send(JSON.stringify({ protocolVersion: 1, type: 'heartbeat' }));
  await heartbeat;
  let releaseIngest;
  const originalIngest = ctx.services.telemetry.ingest;
  ctx.services.telemetry.ingest = () =>
    new Promise((resolve) => {
      releaseIngest = resolve;
    });
  ws.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'telemetry',
      payload: {
        flightId: cmd.flightId,
        epochId,
        sequence: 2,
        simulationTime: 1,
        x: 0,
        y: 0,
        altitude: 1,
        speed: 0,
        battery: 100,
        roll: 0,
        pitch: 0,
        yaw: 0,
        waypoint: 0,
        state: 'TAKING_OFF',
        batterySource: 'synthetic',
      },
    }),
  );
  const fastHeartbeat = once(ws, 'message');
  ws.send(JSON.stringify({ protocolVersion: 1, type: 'heartbeat' }));
  assert.equal(JSON.parse((await fastHeartbeat)[0]).type, 'heartbeat_ack');
  const secondAck = once(ws, 'message');
  releaseIngest();
  assert.equal(JSON.parse((await secondAck)[0]).sequence, 2);
  ctx.services.telemetry.ingest = originalIngest;
  const state = await ctx.repository.read();
  assert.equal(state.flights[0].state, 'TAKING_OFF');
  assert.equal(state.telemetry.length, 1);
});
