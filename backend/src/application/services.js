import droneIdentity from '../../../shared/config/drone.json' with { type: 'json' };
import { randomUUID, createHash } from 'node:crypto';
import {
  Mission,
  FlightSession,
  FlightCommand,
  AlertEngine,
  LowBatteryRule,
  StaleTelemetryRule,
  TERMINAL,
  invariant,
  WORLD,
} from '../domain/model.js';

const nowISO = () => new Date().toISOString();
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function owned(items, id, userId) {
  const item = items.find((entry) => entry.id === id && entry.ownerId === userId);
  invariant(item, 'NOT_FOUND', 'Requested resource was not found', 404);
  return item;
}
function duplicate(state, ownerId, key, requestHash) {
  const command = state.commands.find(
    (entry) => entry.ownerId === ownerId && entry.requestKey === key,
  );
  if (command)
    invariant(
      command.requestHash === requestHash,
      'IDEMPOTENCY_CONFLICT',
      'This request key was already used for different content',
    );
  return command;
}
export class MissionService {
  constructor(repository, publish) {
    this.repository = repository;
    this.publish = publish;
  }
  async save(userId, input, id) {
    const result = await this.repository.transact((state) => {
      const mission = id
        ? new Mission(owned(state.missions, id, userId))
        : Mission.create(input, userId, nowISO());
      if (id) mission.update(input, input.revision, nowISO());
      const data = mission.toJSON();
      const index = state.missions.findIndex((entry) => entry.id === data.id);
      if (index < 0) state.missions.push(data);
      else state.missions[index] = data;
      return data;
    });
    this.publish();
    return result;
  }
  async archive(userId, id) {
    await this.repository.transact((state) => {
      owned(state.missions, id, userId).archived = true;
    });
    this.publish();
  }
}
export class FlightService {
  constructor(repository, gateway, publish) {
    Object.assign(this, { repository, gateway, publish });
  }
  async start(userId, { missionId, revision }, key) {
    const requestHash = hash({ action: 'START_MISSION', missionId, revision });
    const command = await this.repository.transact((state) => {
      const previous = duplicate(state, userId, key, requestHash);
      if (previous) return previous;
      invariant(
        this.gateway.connected,
        'SIMULATOR_OFFLINE',
        'Simulator is offline. Connect an agent before starting.',
        503,
      );
      invariant(
        !state.flights.some((flight) => !TERMINAL.includes(flight.state)),
        'DRONE_BUSY',
        'Drone already has an active flight',
      );
      const data = owned(state.missions, missionId, userId);
      invariant(!data.archived, 'MISSION_ARCHIVED', 'Select an available mission');
      invariant(
        data.revision === revision,
        'REVISION_CONFLICT',
        'Reload the mission before starting',
      );
      const flight = FlightSession.create(new Mission(data).snapshot(), userId, nowISO()).toJSON();
      flight.adapter = this.gateway.mode;
      state.flights.push(flight);
      const cmd = FlightCommand.create(
        flight.id,
        userId,
        'START_MISSION',
        key,
        requestHash,
        nowISO(),
      );
      state.commands.push(cmd);
      return cmd;
    });
    await this.#dispatch(command);
    return command;
  }
  async action(userId, flightId, action, key) {
    const requestHash = hash({ action, flightId });
    const command = await this.repository.transact((state) => {
      const previous = duplicate(state, userId, key, requestHash);
      if (previous) return previous;
      invariant(this.gateway.connected, 'SIMULATOR_OFFLINE', 'Simulator is offline', 503);
      const flight = owned(state.flights, flightId, userId);
      new FlightSession(flight).assertAction(action);
      const waiting = state.commands.filter(
        (c) => c.flightId === flightId && ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status),
      );
      invariant(
        !waiting.length ||
          (action === 'LAND' && waiting.every((c) => c.action === 'START_MISSION')),
        'COMMAND_PENDING',
        'Wait for the previous command outcome',
      );
      if (action === 'LAND')
        for (const previous of waiting) {
          const domain = new FlightCommand(previous);
          domain.cancel(nowISO(), 'Superseded by landing request');
          Object.assign(previous, domain.toJSON());
        }
      const cmd = FlightCommand.create(flightId, userId, action, key, requestHash, nowISO());
      state.commands.push(cmd);
      return cmd;
    });
    await this.#dispatch(command);
    return command;
  }
  async #dispatch(command) {
    // Replayed HTTP request returns existing record without resending an uncertain action.
    if (command.status !== 'PENDING' || this.gateway.dispatched.has(command.id)) return;
    const state = await this.repository.read();
    const flight = state.flights.find((f) => f.id === command.flightId);
    try {
      await this.gateway.send({ ...command, snapshot: flight.snapshot });
    } catch {
      await this.repository.transact((s) => {
        const c = s.commands.find((c) => c.id === command.id);
        if (c?.status === 'PENDING') {
          const domain = new FlightCommand(c);
          domain.markUnknown();
          Object.assign(c, domain.toJSON());
        }
      });
    }
    this.publish();
  }
  async commandResult(event) {
    await this.repository.transact((state) => {
      const cmd = state.commands.find((c) => c.id === event.commandId);
      invariant(cmd, 'UNKNOWN_COMMAND', 'Command is not recognized', 422);
      if (['COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(cmd.status)) return;
      const flight = state.flights.find((f) => f.id === cmd.flightId);
      if (TERMINAL.includes(flight.state) && event.status === 'ACCEPTED') return;
      const domainCommand = new FlightCommand(cmd);
      domainCommand.applyResult(event, nowISO());
      Object.assign(cmd, domainCommand.toJSON());
      if (event.status === 'ACCEPTED') {
        /* acceptance is recorded by the command object */
      } else if (['COMPLETED', 'FAILED', 'REJECTED'].includes(event.status)) {
        if (
          cmd.action === 'START_MISSION' &&
          event.status !== 'COMPLETED' &&
          !TERMINAL.includes(flight.state)
        ) {
          const domain = new FlightSession(flight);
          domain.transition('FAILED', nowISO(), event.error ?? 'Start rejected');
          Object.assign(flight, domain.toJSON());
        }
      }
    });
    this.publish();
  }
  async reconcile(userId, flightId) {
    invariant(
      !this.gateway.connected,
      'AGENT_CONNECTED',
      'Disconnect agent before marking an unrecoverable session interrupted',
    );
    await this.repository.transact((state) => {
      const flight = owned(state.flights, flightId, userId);
      const domain = new FlightSession(flight);
      domain.transition(
        'INTERRUPTED',
        nowISO(),
        'Operator closed unconfirmed session; physical outcome unknown',
      );
      Object.assign(flight, domain.toJSON());
      for (const cmd of state.commands.filter(
        (c) => c.flightId === flightId && ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(c.status),
      )) {
        cmd.status = 'UNKNOWN';
      }
      for (const alert of state.alerts.filter(
        (a) => a.flightId === flightId && a.status !== 'RESOLVED',
      )) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = nowISO();
      }
    });
    if (this.gateway.mode === 'demo') this.gateway.clearFlight?.();
    this.publish();
  }
}
export class TelemetryService {
  constructor(repository, publish, { now = Date.now } = {}) {
    this.repository = repository;
    this.publish = publish;
    this.now = now;
    this.engine = new AlertEngine([new LowBatteryRule(), new StaleTelemetryRule()]);
  }
  #alerts(state, flight, sample) {
    const decisions = this.engine.evaluate(sample, { now: this.now(), flight });
    for (const decision of decisions) {
      const existing = state.alerts.find(
        (a) => a.flightId === flight.id && a.ruleKey === decision.key && a.status !== 'RESOLVED',
      );
      if (!existing)
        state.alerts.push({
          id: randomUUID(),
          flightId: flight.id,
          ruleKey: decision.key,
          ...decision,
          status: 'OPEN',
          createdAt: nowISO(),
          acknowledgedAt: null,
        });
    }
    for (const alert of state.alerts.filter(
      (a) => a.flightId === flight.id && a.status !== 'RESOLVED',
    )) {
      if (!decisions.some((d) => d.key === alert.ruleKey)) {
        alert.status = 'RESOLVED';
        alert.resolvedAt = nowISO();
      }
    }
  }
  async ingest(sample) {
    await this.repository.transact((state) => {
      const flight = state.flights.find((f) => f.id === sample.flightId);
      invariant(flight, 'UNKNOWN_FLIGHT', 'Flight is not recognized', 422);

      if (
        state.telemetry.some(
          (t) =>
            t.flightId === sample.flightId &&
            t.epochId === sample.epochId &&
            t.sequence === sample.sequence,
        )
      )
        return;
      invariant(
        !TERMINAL.includes(flight.state),
        'FLIGHT_ENDED',
        'Cannot ingest telemetry after flight ended',
      );
      if (flight.latest?.epochId === sample.epochId) {
        invariant(
          sample.sequence > flight.latest.sequence
            ? sample.simulationTime >= flight.latest.simulationTime
            : sample.simulationTime <= flight.latest.simulationTime,
          'NON_MONOTONIC_TIME',
          'Simulation time must agree with sample sequence',
          422,
        );
      }
      const data = { ...sample, id: randomUUID(), receivedAt: nowISO() };
      state.telemetry.push(data);
      invariant(
        !flight.latest || flight.latest.epochId === sample.epochId,
        'EPOCH_MISMATCH',
        'New simulator epoch requires reconciliation',
      );
      if (!flight.latest || sample.sequence > flight.latest.sequence) {
        const domain = new FlightSession(flight);
        domain.transition(sample.state, nowISO(), sample.reason);
        Object.assign(flight, domain.toJSON(), { latest: data });
        this.#alerts(state, flight, data);
        if (TERMINAL.includes(sample.state)) {
          for (const alert of state.alerts.filter(
            (a) => a.flightId === flight.id && a.status !== 'RESOLVED',
          )) {
            alert.status = 'RESOLVED';
            alert.resolvedAt = nowISO();
          }
        }
      }
    });
    this.publish();
  }
  async maintain() {
    let changed = false;
    await this.repository.transact((state) => {
      for (const flight of state.flights.filter((f) => !TERMINAL.includes(f.state))) {
        const before = JSON.stringify(state.alerts);
        this.#alerts(state, flight, flight.latest);
        changed ||= before !== JSON.stringify(state.alerts);
      }
      for (const command of state.commands.filter((c) =>
        ['PENDING', 'ACCEPTED'].includes(c.status),
      )) {
        const deadline =
          command.status === 'ACCEPTED'
            ? Date.parse(command.acceptedAt) + 60000
            : Date.parse(command.expiresAt);
        if (deadline < this.now()) {
          const domain = new FlightCommand(command);
          domain.markUnknown();
          Object.assign(command, domain.toJSON());
          changed = true;
        }
      }
    });
    if (changed) this.publish();
  }
  async acknowledge(userId, id) {
    await this.repository.transact((state) => {
      const alert = state.alerts.find((a) => a.id === id);
      invariant(alert, 'NOT_FOUND', 'Alert not found', 404);
      owned(state.flights, alert.flightId, userId);
      if (alert.status === 'OPEN') {
        alert.status = 'ACKNOWLEDGED';
        alert.acknowledgedAt = nowISO();
      }
    });
    this.publish();
  }
}
export class ReportService {
  constructor(repository) {
    this.repository = repository;
  }
  async get(userId, id) {
    const state = await this.repository.read();
    const flight = owned(state.flights, id, userId);
    const samples = state.telemetry
      .filter((t) => t.flightId === id)
      .sort((a, b) => a.simulationTime - b.simulationTime);
    let distance = 0,
      gaps = 0;
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1],
        b = samples[i];
      if (a.epochId !== b.epochId || b.sequence !== a.sequence + 1) {
        gaps++;
        continue;
      }
      distance += Math.hypot(b.x - a.x, b.y - a.y, b.altitude - a.altitude);
    }
    return {
      flight,
      samples,
      commands: state.commands.filter((c) => c.flightId === id),
      alerts: state.alerts.filter((a) => a.flightId === id),
      summary: {
        duration:
          samples.length > 1 ? samples.at(-1).simulationTime - samples[0].simulationTime : 0,
        maxAltitude: samples.reduce((max, s) => Math.max(max, s.altitude), 0),
        distance,
        batteryUsed: samples.length ? samples[0].battery - samples.at(-1).battery : 0,
        sampleCount: samples.length,
        gaps,
        complete: TERMINAL.includes(flight.state) && flight.state === 'COMPLETED' && gaps === 0,
      },
    };
  }
}
export async function dashboardSnapshot(repository, gateway, userId) {
  const state = await repository.read();
  const flights = state.flights.filter((f) => f.ownerId === userId);
  const flightIds = new Set(flights.map((f) => f.id));
  return {
    mode: gateway.mode,
    storage: repository.kind,
    world: WORLD,
    drone: {
      id: droneIdentity.id,
      code: droneIdentity.code,
      name: droneIdentity.code,
      connected: gateway.connected,
      lastSeen: gateway.lastSeen,
      source: gateway.mode,
    },
    missions: state.missions
      .filter((m) => m.ownerId === userId && !m.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    flights: flights.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    commands: state.commands.filter((c) => flightIds.has(c.flightId)).slice(-100),
    alerts: state.alerts.filter((a) => flightIds.has(a.flightId)).slice(-100),
    telemetry: state.telemetry
      .filter((t) => t.flightId === flights.find((f) => !TERMINAL.includes(f.state))?.id)
      .slice(-120),
    serverTime: nowISO(),
  };
}
