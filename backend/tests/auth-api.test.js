import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRuntime } from '../src/infrastructure/runtime.js';
import { createApp } from '../src/interfaces/http/create-app.js';

test('API authenticates and enforces CSRF, validation and persistent mission editing', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'atlas-api-'));
  const context = await createRuntime({
    dataPath: join(dir, 'state.json'),
    production: false,
    simulatorToken: 'test-bootstrap-token',
  });
  t.after(async () => {
    await context.close();
    await rm(dir, { recursive: true, force: true });
  });
  const app = createApp(context),
    agent = request.agent(app);
  await agent.get('/api/dashboard').expect(401);
  await agent
    .post('/api/pairing/claim')
    .set('Origin', context.config.origin)
    .send({ code: 'XX22' })
    .expect(401);
  await agent.post('/api/pairing/request').expect(401);
  const pairing = await agent
    .post('/api/pairing/request')
    .set('Authorization', 'Bearer test-bootstrap-token')
    .expect(200);
  assert.match(pairing.body.code, /^[A-Z0-9]{4}$/);
  assert.match(pairing.body.code, /[A-Z]/);
  assert.equal(pairing.body.code, 'BMBL');
  const login = await agent
    .post('/api/pairing/claim')
    .set('Origin', context.config.origin)
    .send({ code: pairing.body.code })
    .expect(200);
  await request(app)
    .post('/api/pairing/claim')
    .set('Origin', context.config.origin)
    .send({ code: pairing.body.code })
    .expect(200);
  const token = login.body.csrf;
  const body = { name: 'API mission', waypoints: [{ x: 1, y: 2, altitude: 8 }] };
  await agent.post('/api/missions').send(body).expect(403);
  const saved = await agent.post('/api/missions').set('X-CSRF-Token', token).send(body).expect(201);
  await agent
    .patch(`/api/missions/${saved.body.id}`)
    .set('X-CSRF-Token', token)
    .send({ ...body, revision: 1, name: 'Changed' })
    .expect(200);
  await agent
    .patch(`/api/missions/${saved.body.id}`)
    .set('X-CSRF-Token', token)
    .send({ ...body, revision: 1 })
    .expect(409);
  await agent
    .post('/api/missions')
    .set('X-CSRF-Token', token)
    .send({ ...body, waypoints: [{ x: 999, y: 0, altitude: 8 }] })
    .expect(422);
  const snapshot = await agent.get('/api/dashboard').expect(200);
  assert.equal(snapshot.body.missions[0].name, 'Changed');
  await agent.post('/api/auth/logout').set('X-CSRF-Token', token).expect(204);
  await agent.get('/api/dashboard').expect(401);
});
