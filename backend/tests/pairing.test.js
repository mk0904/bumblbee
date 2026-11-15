import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/infrastructure/auth.js';

test('pairing codes contain letters/digits, are single-use, and newer codes supersede old ones', () => {
  const auth = new AuthService({ simulatorToken: 'test-secret' });
  assert.throws(() => auth.verifyBridge('Bearer wrong'), { code: 'INVALID_BRIDGE_CREDENTIAL' });
  auth.verifyBridge('Bearer test-secret');
  const first = auth.requestPairing();
  const second = auth.requestPairing();
  assert.throws(() => auth.pair(first.code), { code: 'INVALID_PAIRING_CODE' });
  assert.match(second.code, /^[A-Z0-9]{4}$/);
  assert.match(second.code, /[A-Z]/);
  assert.match(second.code, /[0-9]/);
  const issued = auth.pair(second.code);
  assert.equal(issued.token.length, 64);
  assert.throws(() => auth.pair(second.code), { code: 'INVALID_PAIRING_CODE' });
  assert.equal(
    auth.session({ headers: { cookie: `drone_session=${issued.token}` } }).user.id,
    'operator-01',
  );
  auth.logout({ headers: { cookie: `drone_session=${issued.token}` } });
  assert.equal(auth.session({ headers: { cookie: `drone_session=${issued.token}` } }), null);
});

test('expired codes, exhausted guess budget and expired sessions cannot authorize control', () => {
  let now = 1_000_000;
  const auth = new AuthService({ simulatorToken: 'test-secret', now: () => now });
  const expired = auth.requestPairing();
  now += 120001;
  assert.throws(() => auth.pair(expired.code), { code: 'INVALID_PAIRING_CODE' });
  const exhausted = auth.requestPairing();
  for (let i = 0; i < 5; i++)
    assert.throws(() => auth.pair('ZZZZ'), { code: 'INVALID_PAIRING_CODE' });
  assert.throws(() => auth.pair(exhausted.code), { code: 'INVALID_PAIRING_CODE' });
  const valid = auth.requestPairing();
  const { token } = auth.pair(valid.code);
  now += 8 * 60 * 60 * 1000 + 1;
  assert.equal(auth.session({ headers: { cookie: `drone_session=${token}` } }), null);
});
