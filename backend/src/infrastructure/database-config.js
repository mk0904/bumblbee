import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Scope the provider CA to this database connection; preserve full TLS/hostname verification. */
export function databaseConfig(databaseUrl, { caPath = process.env.DATABASE_CA_CERT } = {}) {
  const uri = new URL(databaseUrl);
  if (caPath) {
    const backendRoot = fileURLToPath(new URL('../../', import.meta.url));
    uri.searchParams.set('sslmode', 'verify-full');
    uri.searchParams.set('sslrootcert', resolve(backendRoot, caPath));
  }
  return { connectionString: uri.toString(), max: 4, connectionTimeoutMillis: 12000 };
}
