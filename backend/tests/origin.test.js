import test from 'node:test';
import assert from 'node:assert/strict';
import { originAllowed } from '../src/interfaces/origin.js';

test('local aliases work while foreign origins, wrong ports and production aliases are rejected', () => {
  const config = { origin: 'http://127.0.0.1:5174', production: false };
  assert.equal(originAllowed(config, 'http://localhost:5174'), true);
  for (const origin of ['https://evil.example', 'http://localhost:9999', 'null', undefined]) assert.equal(originAllowed(config, origin), false);
  assert.equal(originAllowed({ ...config, production: true }, 'http://localhost:5174'), false);
  assert.equal(originAllowed({ origin: 'https://ground.example', production: true }, 'https://ground.example'), true);
});
