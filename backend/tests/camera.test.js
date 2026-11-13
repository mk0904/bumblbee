import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { AuthService } from '../src/infrastructure/auth.js';
import { createCameraChannel, validateFrame } from '../src/interfaces/camera-sockets.js';
const jpeg = (await readFile(new URL('./fixtures/camera.jpg', import.meta.url))).toString('base64');
const frame = (epochId) => ({
  protocolVersion: 1,
  type: 'camera_frame',
  epochId,
  sequence: 1,
  simulationTime: 1,
  width: 640,
  height: 360,
  jpeg,
});
const message = (socket) => once(socket, 'message').then(([raw]) => JSON.parse(raw));

test('camera validates actual JPEG dimensions, bounds, encoding and metadata', () => {
  const input = frame(randomUUID());
  assert.equal(validateFrame(input).jpeg, jpeg);
  for (const value of [
    { ...input, sequence: -1 },
    { ...input, width: 100 },
    { ...input, jpeg: 'AAAA' },
    { ...input, jpeg: 'A'.repeat(200004) },
  ])
    assert.throws(() => validateFrame(value));
  const bytes = Buffer.from(jpeg, 'base64');
  // SOF dimension metadata must agree with declared dimensions.
  const at = bytes.indexOf(Buffer.from([0xff, 0xc0]));
  bytes.writeUInt16BE(100, at + 7);
  assert.throws(() => validateFrame({ ...input, jpeg: bytes.toString('base64') }));
});

test('camera sockets authenticate, fence agent epoch, relay frames and revoke viewers', async (t) => {
  const auth = new AuthService({ secure: false, simulatorToken: 'camera-test-credential' });
  const gateway = { connected: true, epochId: randomUUID() };
  const config = { mode: 'webots', origin: 'http://localhost:5174' };
  const channel = createCameraChannel({ auth, gateway, config });
  const server = createServer();
  server.on('upgrade', (req, socket, head) =>
    channel.upgrade(req, socket, head, new URL(req.url, 'http://local').pathname),
  );
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `ws://127.0.0.1:${server.address().port}/ws/camera`;
  const sockets = [];
  t.after(async () => {
    for (const socket of sockets) socket.terminate();
    channel.close();
    await new Promise((resolve) => server.close(resolve));
  });
  const denied = new WebSocket(`${base}/viewer`, { headers: { Origin: config.origin } });
  sockets.push(denied);
  const [error] = await once(denied, 'error');
  assert.match(error.message, /401/);
  const wrong = new WebSocket(`${base}/producer`, { headers: { Authorization: 'Bearer wrong' } });
  sockets.push(wrong);
  assert.match((await once(wrong, 'error'))[0].message, /401/);
  const badEpoch = new WebSocket(`${base}/producer`, {
    headers: { Authorization: 'Bearer camera-test-credential' },
  });
  sockets.push(badEpoch);
  await once(badEpoch, 'open');
  const fenced = once(badEpoch, 'close');
  badEpoch.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'camera_hello',
      droneId: 'drone-01',
      epochId: randomUUID(),
    }),
  );
  assert.equal((await fenced)[0], 4002);
  const producer = new WebSocket(`${base}/producer`, {
    headers: { Authorization: 'Bearer camera-test-credential' },
  });
  sockets.push(producer);
  await once(producer, 'open');
  const welcome = message(producer);
  producer.send(
    JSON.stringify({
      protocolVersion: 1,
      type: 'camera_hello',
      droneId: 'drone-01',
      epochId: gateway.epochId,
    }),
  );
  assert.equal((await welcome).type, 'camera_welcome');
  const session = auth.issueSession();
  const headers = { Origin: config.origin, Cookie: `drone_session=${session.token}` };
  const viewer = new WebSocket(`${base}/viewer`, { headers });
  sockets.push(viewer);
  const waiting = message(viewer);
  await once(viewer, 'open');
  assert.equal((await waiting).status, 'waiting');
  const image = message(viewer),
    ack = message(producer);
  producer.send(JSON.stringify(frame(gateway.epochId)));
  assert.equal((await ack).type, 'camera_ack');
  const received = await image;
  assert.equal(received.jpeg, jpeg);
  assert.ok(received.receivedAt);
  const revoked = once(viewer, 'close');
  auth.logout({ headers: { cookie: headers.Cookie } });
  assert.equal((await revoked)[0], 4003);
  const closed = once(producer, 'close');
  producer.send(JSON.stringify(frame(gateway.epochId)));
  assert.equal((await closed)[0], 4002, 'duplicate frame sequence closes media only');
  assert.equal(gateway.connected, true, 'media failure never disconnects command agent');
});
