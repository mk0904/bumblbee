import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';
import { createRepository } from './repositories.js';
import { SimulatorFactory } from './webots-adapter.js';
import { AuthService } from './auth.js';
import {
  MissionService,
  FlightService,
  TelemetryService,
  ReportService,
} from '../application/services.js';

export async function createRuntime(overrides = {}) {
  const config = {
    production: process.env.NODE_ENV === 'production',
    mode: process.env.SIMULATOR_MODE ?? 'demo',
    databaseUrl: process.env.DATABASE_URL,
    dataPath: resolve(process.env.DATA_PATH ?? '.data/store.json'),
    origin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:5174',
    simulatorToken: process.env.SIMULATOR_TOKEN,
    ...overrides,
  };
  if (
    config.production &&
    (!config.databaseUrl ||
      !config.origin.startsWith('https://') ||
      (!config.simulatorToken || config.simulatorToken.length < 32) ||
      config.mode !== 'webots')
  ) {
    throw new Error(
      'Production requires DATABASE_URL, HTTPS APP_ORIGIN, SIMULATOR_TOKEN and SIMULATOR_MODE=webots',
    );
  }
  const repository = overrides.repository ?? (await createRepository(config));
  const gateway = overrides.gateway ?? (await SimulatorFactory.create(config.mode));
  const events = new EventEmitter();
  const publish = () => events.emit('changed');
  const auth = new AuthService({
    secure: config.production,
    simulatorToken: config.simulatorToken,
  });
  const services = {
    mission: new MissionService(repository, publish),
    flight: new FlightService(repository, gateway, publish),
    telemetry: new TelemetryService(repository, publish),
    report: new ReportService(repository),
  };
  const context = { config, repository, gateway, services, auth, events, publish };
  if (config.mode === 'demo') gateway.bind(services);
  // Persisted flight without surviving controller is unknown, not silently resumed.
  await repository.transact((state) => {
    for (const command of state.commands.filter((c) => ['PENDING', 'ACCEPTED'].includes(c.status)))
      command.status = 'UNKNOWN';
    if (
      config.mode === 'demo' &&
      state.flights.some((f) => !['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(f.state))
    )
      gateway.connected = false;
  });
  let maintaining = false;
  const timer = setInterval(async () => {
    if (maintaining) return;
    maintaining = true;
    try {
      await services.telemetry.maintain();
    } catch (error) {
      console.error(
        JSON.stringify({ event: 'maintenance_error', code: error.code ?? 'INTERNAL_ERROR' }),
      );
    } finally {
      maintaining = false;
    }
  }, 1000);
  timer.unref();
  context.close = async () => {
    clearInterval(timer);
    await gateway.close();
    await repository.close();
  };
  return context;
}
