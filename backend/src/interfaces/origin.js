/** Exact configured origin in production; equivalent loopback names allowed for local development. */
export function originAllowed(config, origin) {
  if (origin === config.origin) return true;
  if (config.production || typeof origin !== 'string') return false;
  try {
    const expected = new URL(config.origin),
      actual = new URL(origin);
    return (
      ['localhost', '127.0.0.1'].includes(expected.hostname) &&
      ['localhost', '127.0.0.1'].includes(actual.hostname) &&
      expected.protocol === actual.protocol &&
      expected.port === actual.port
    );
  } catch {
    return false;
  }
}
