import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';

export const emptyState = () => ({
  missions: [],
  flights: [],
  commands: [],
  telemetry: [],
  alerts: [],
});
const tables = {
  missions: 'missions',
  flights: 'flight_sessions',
  commands: 'commands',
  telemetry: 'telemetry_samples',
  alerts: 'alerts',
};

/** Single-process demo repository. Atomic replacement; no multi-process guarantees. */
export class FileRepository {
  #tail = Promise.resolve();
  constructor(path) {
    this.path = path;
    this.kind = 'local-file-demo';
  }
  async init() {
    await mkdir(dirname(this.path), { recursive: true });
    try {
      this.state = JSON.parse(await readFile(this.path, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      this.state = emptyState();
    }
  }
  async read() {
    await this.#tail;
    return structuredClone(this.state);
  }
  async transact(work) {
    const result = this.#tail.then(async () => {
      const next = structuredClone(this.state);
      const value = await work(next);
      await writeFile(`${this.path}.tmp`, JSON.stringify(next), { mode: 0o600 });
      await rename(`${this.path}.tmp`, this.path);
      this.state = next;
      return structuredClone(value);
    });
    this.#tail = result.catch(() => {});
    return result;
  }
  async close() {
    await this.#tail;
  }
}

/** PostgreSQL unit of work; advisory transaction lock serializes the scoped single-drone workload. */
export class PostgresRepository {
  constructor(pool) {
    this.pool = pool;
    this.kind = 'postgresql';
  }
  async init() {
    const result = await this.pool.query('SELECT id FROM app_schema_version WHERE id = 1');
    if (result.rows.length !== 1)
      throw new Error('Database schema is not initialized; run npm run db:migrate');
  }
  async #load(client) {
    const state = emptyState();
    for (const [key, table] of Object.entries(tables)) {
      const result = await client.query(`SELECT data FROM ${table} ORDER BY created_at, id`);
      state[key] = result.rows.map((row) => row.data);
    }
    return state;
  }
  async read() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const state = await this.#load(client);
      await client.query('COMMIT');
      return state;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async transact(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(731204)');
      const before = await this.#load(client);
      const next = structuredClone(before);
      const value = await work(next);
      for (const [key, table] of Object.entries(tables)) {
        const old = new Map(before[key].map((item) => [item.id, JSON.stringify(item)]));
        for (const item of next[key]) {
          if (old.get(item.id) === JSON.stringify(item)) continue;
          const columns = ['id', 'data', 'created_at'];
          const values = [
            item.id,
            JSON.stringify(item),
            item.createdAt ?? item.startedAt ?? item.receivedAt,
          ];
          const extra =
            key === 'missions'
              ? { owner_id: item.ownerId, revision: item.revision }
              : key === 'flights'
                ? {
                    drone_id: item.droneId,
                    mission_id: item.missionId,
                    owner_id: item.ownerId,
                    state: item.state,
                  }
                : key === 'commands'
                  ? {
                      flight_id: item.flightId,
                      owner_id: item.ownerId,
                      request_key: item.requestKey,
                    }
                  : key === 'telemetry'
                    ? {
                        flight_id: item.flightId,
                        epoch_id: item.epochId,
                        sequence: item.sequence,
                        simulation_time: item.simulationTime,
                      }
                    : { flight_id: item.flightId, rule_key: item.ruleKey, status: item.status };
          for (const [name, entry] of Object.entries(extra)) {
            columns.push(name);
            values.push(entry);
          }
          const updates = columns
            .filter((column) => column !== 'id')
            .map((column) => `${column}=EXCLUDED.${column}`)
            .join(',');
          await client.query(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(',')}) ON CONFLICT (id) DO UPDATE SET ${updates}`,
            values,
          );
          if (key === 'missions') {
            await client.query('DELETE FROM waypoints WHERE mission_id=$1', [item.id]);
            for (const [sequence, target] of item.waypoints.entries()) {
              await client.query(
                'INSERT INTO waypoints(mission_id,sequence,x_m,y_m,altitude_m) VALUES($1,$2,$3,$4,$5)',
                [item.id, sequence, target.x, target.y, target.altitude],
              );
            }
          }
        }
      }
      await client.query('COMMIT');
      return structuredClone(value);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
}
export async function createRepository(config) {
  const repository = config.databaseUrl
    ? new PostgresRepository(new pg.Pool({ connectionString: config.databaseUrl, max: 4 }))
    : new FileRepository(config.dataPath);
  await repository.init();
  return repository;
}
