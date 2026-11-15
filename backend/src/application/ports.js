/**
 * Repository port: read(): Promise<State>, transact(work): Promise<result>, close(): Promise<void>.
 * The transaction supplies an isolated mutable unit of work and commits atomically or rolls back.
 * Implementations: FileRepository (single-process demo), PostgresRepository (SQL transaction).
 * JavaScript contracts are documented here and exercised by tests, not TypeScript interfaces.
 */
export class SimulatorAdapter {
  mode = 'webots';
  connected = false;
  lastSeen = null;
  dispatched = new Set();
  async send() {
    throw new Error('SimulatorAdapter.send must be implemented');
  }
  async close() {}
}
