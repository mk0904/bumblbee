import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/interfaces/http/create-app.js';

test('health reports process liveness without implying simulator readiness', async () => {
  const response = await request(createApp()).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.phase, 'foundation');
  assert.equal(response.headers['x-powered-by'], undefined);
});

test('malformed JSON returns a stable redacted error', async () => {
  const response = await request(createApp()).post('/api/missions')
    .set('Content-Type', 'application/json').send('{broken').expect(400);
  assert.deepEqual(response.body.error, { code: 'INVALID_JSON', message: 'Request body must be valid JSON' });
});

test('oversized bodies are rejected before any processing', async () => {
  const response = await request(createApp()).post('/api/missions')
    .send({ value: 'x'.repeat(70 * 1024) }).expect(413);
  assert.equal(response.body.error.code, 'PAYLOAD_TOO_LARGE');
});
