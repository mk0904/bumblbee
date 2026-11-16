import droneIdentity from '../../../shared/config/drone.json' with { type: 'json' };
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { DomainError, invariant } from '../domain/model.js';

const digest = (token) => createHash('sha256').update(token).digest('hex');
/** Bridge bootstrap credential stays on the simulator host; short codes only establish sessions. */
export class AuthService {
  #sessions = new Map();
  #attemptWindow = 0;
  #pairingAttempts = 0;
  constructor({ secure = false, simulatorToken, now = Date.now }) {
    this.secure = secure;
    this.now = now;
    this.simulatorToken = simulatorToken;
  }
  verifyBridge(header) {
    const expected = `Bearer ${this.simulatorToken}`;
    invariant(
      this.simulatorToken &&
        typeof header === 'string' &&
        Buffer.byteLength(header) === Buffer.byteLength(expected) &&
        timingSafeEqual(Buffer.from(header), Buffer.from(expected)),
      'INVALID_BRIDGE_CREDENTIAL',
      'Bridge credential is invalid',
      401,
    );
  }
  requestPairing() {
    return { code: droneIdentity.code, expiresAt: null, droneId: droneIdentity.id };
  }
  pair(code) {
    if (this.now() - this.#attemptWindow >= 60000) {
      this.#attemptWindow = this.now();
      this.#pairingAttempts = 0;
    }
    invariant(this.#pairingAttempts < 5, 'PAIRING_RATE_LIMIT', 'Too many attempts. Try again in one minute.', 429);
    if (digest(code.toUpperCase()) !== digest(droneIdentity.code)) {
      this.#pairingAttempts++;
      throw new DomainError('INVALID_PAIRING_CODE', 'Drone code is incorrect. Check the code configured on your Webots setup.', 401);
    }
    return this.issueSession();
  }
  issueSession() {
    const token = randomBytes(32).toString('hex'),
      csrf = randomBytes(24).toString('hex');
    const session = {
      user: { id: 'operator-01', email: 'Paired control session', name: 'Ground Station' },
      csrf,
      expires: this.now() + 8 * 60 * 60 * 1000,
    };
    if (this.#sessions.size > 1000) this.#sessions.clear();
    this.#sessions.set(digest(token), session);
    return { token, session };
  }
  token(request) {
    return (request.headers.cookie ?? '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('drone_session='))
      ?.slice('drone_session='.length);
  }
  session(request) {
    const token = this.token(request),
      session = token ? this.#sessions.get(digest(token)) : null;
    if (!session || session.expires < this.now()) {
      if (token) this.#sessions.delete(digest(token));
      return null;
    }
    return session;
  }
  logout(request) {
    const token = this.token(request);
    if (token) this.#sessions.delete(digest(token));
  }
  cookie(token, clear = false) {
    return `drone_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${this.secure ? '; Secure' : ''}`;
  }
}
