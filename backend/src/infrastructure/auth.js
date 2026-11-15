import { randomBytes, createHash, timingSafeEqual, randomInt } from 'node:crypto';
import { DomainError, invariant } from '../domain/model.js';

const digest = (token) => createHash('sha256').update(token).digest('hex');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Bridge bootstrap credential stays on the simulator host; short codes only establish sessions. */
export class AuthService {
  #sessions = new Map();
  #pairings = new Map();
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
    for (const [key, entry] of this.#pairings)
      if (entry.expires < this.now()) this.#pairings.delete(key);
    // Only the latest bootstrap request remains active for this single-drone installation.
    const previous = new Set(this.#pairings.keys());
    this.#pairings.clear();
    this.#pairingAttempts = 0;
    let code;
    do {
      code = Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
    } while (!/[A-Z]/.test(code) || !/[0-9]/.test(code) || previous.has(digest(code)));
    const expiresAt = new Date(this.now() + 120000).toISOString();
    this.#pairings.set(digest(code), { expires: Date.parse(expiresAt) });
    return { code, expiresAt, droneId: 'drone-01' };
  }
  pair(code) {
    this.#pairingAttempts++;
    if (this.#pairingAttempts > 5) this.#pairings.clear();
    const key = digest(code.toUpperCase()),
      entry = this.#pairings.get(key);
    if (!entry || entry.expires < this.now())
      throw new DomainError(
        'INVALID_PAIRING_CODE',
        'Code is invalid or expired. Request a new code from your bridge.',
        401,
      );
    this.#pairings.delete(key);
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
