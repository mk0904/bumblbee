import { randomUUID } from 'node:crypto';

export const WORLD = Object.freeze({
  id: 'training-ground-v1',
  frame: 'WORLD_LOCAL_V1',
  min: -50,
  max: 50,
  minAltitude: 2,
  maxAltitude: 15,
  maxWaypoints: 20,
});
export const TERMINAL = ['COMPLETED', 'FAILED', 'INTERRUPTED'];
export class DomainError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function invariant(condition, code, message, status = 409) {
  if (!condition) throw new DomainError(code, message, status);
}
export class Waypoint {
  constructor({ x, y, altitude = 8 }, sequence) {
    for (const [name, value] of Object.entries({ x, y, altitude })) {
      invariant(Number.isFinite(value), 'INVALID_WAYPOINT', `${name} must be a finite number`, 422);
    }
    invariant(
      Math.abs(x) <= 50 && Math.abs(y) <= 50 && altitude >= 2 && altitude <= 15,
      'OUT_OF_BOUNDS',
      'Waypoints require X/Y within ±50 m and altitude between 2–15 m',
      422,
    );
    Object.assign(this, { x, y, altitude, sequence });
    Object.freeze(this);
  }
}
export class Mission {
  #data;
  constructor(data) {
    this.#data = structuredClone(data);
  }
  static create(input, ownerId, now) {
    const mission = new Mission({
      id: randomUUID(),
      ownerId,
      revision: 0,
      createdAt: now,
      archived: false,
    });
    mission.update(input, 0, now);
    return mission;
  }
  update(input, expectedRevision, now) {
    invariant(
      this.#data.revision === expectedRevision,
      'REVISION_CONFLICT',
      'Mission changed. Reload before saving.',
    );
    invariant(!this.#data.archived, 'MISSION_ARCHIVED', 'Archived missions cannot be edited');
    const name = input.name?.trim();
    invariant(
      name && name.length <= 80,
      'INVALID_NAME',
      'Mission name must contain 1–80 characters',
      422,
    );
    invariant(
      Array.isArray(input.waypoints) && input.waypoints.length <= 20,
      'INVALID_ROUTE',
      'At most 20 waypoints are allowed',
      422,
    );
    const waypoints = input.waypoints.map((w, i) => ({ ...new Waypoint(w, i) }));
    Object.assign(this.#data, {
      name,
      description: (input.description ?? '').trim().slice(0, 500),
      waypoints,
      worldId: WORLD.id,
      frame: WORLD.frame,
      revision: expectedRevision + 1,
      updatedAt: now,
    });
  }
  snapshot() {
    invariant(
      this.#data.waypoints.length > 0,
      'EMPTY_MISSION',
      'Add at least one waypoint before starting',
      422,
    );
    return structuredClone(this.#data);
  }
  toJSON() {
    return structuredClone(this.#data);
  }
}
const transitions = {
  STARTING: ['TAKING_OFF', 'FAILED', 'INTERRUPTED'],
  TAKING_OFF: ['EXECUTING', 'LANDING', 'FAILED', 'INTERRUPTED'],
  EXECUTING: ['PAUSED', 'LANDING', 'FAILED', 'INTERRUPTED'],
  PAUSED: ['EXECUTING', 'LANDING', 'FAILED', 'INTERRUPTED'],
  LANDING: ['COMPLETED', 'FAILED', 'INTERRUPTED'],
};
export class FlightSession {
  #data;
  constructor(data) {
    this.#data = structuredClone(data);
  }
  static create(snapshot, ownerId, now) {
    return new FlightSession({
      id: randomUUID(),
      droneId: 'drone-01',
      ownerId,
      missionId: snapshot.id,
      snapshot,
      state: 'STARTING',
      startedAt: now,
      endedAt: null,
      reason: null,
      latest: null,
    });
  }
  transition(next, now, reason) {
    if (next === this.#data.state) return;
    invariant(
      transitions[this.#data.state]?.includes(next),
      'INVALID_FLIGHT_STATE',
      `Cannot transition from ${this.#data.state} to ${next}`,
    );
    this.#data.state = next;
    if (TERMINAL.includes(next)) {
      this.#data.endedAt = now;
      this.#data.reason = reason ?? next.toLowerCase();
    }
  }
  assertAction(action) {
    const allowed = {
      PAUSE: ['EXECUTING'],
      RESUME: ['PAUSED'],
      LAND: ['TAKING_OFF', 'EXECUTING', 'PAUSED'],
    };
    invariant(
      allowed[action]?.includes(this.#data.state),
      'INVALID_FLIGHT_STATE',
      `${action} is not allowed while ${this.#data.state.toLowerCase()}`,
    );
  }
  toJSON() {
    return structuredClone(this.#data);
  }
}
export class FlightCommand {
  #data;
  constructor(data) {
    this.#data = structuredClone(data);
  }
  static create(flightId, ownerId, action, key, requestHash, now) {
    return new FlightCommand({
      id: randomUUID(),
      flightId,
      ownerId,
      action,
      requestKey: key,
      requestHash,
      status: 'PENDING',
      createdAt: now,
      expiresAt: new Date(Date.parse(now) + 10000).toISOString(),
      acceptedAt: null,
      completedAt: null,
      error: null,
    }).toJSON();
  }
  applyResult(event, now) {
    if (['COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED'].includes(this.#data.status)) return;
    invariant(
      ['ACCEPTED', 'COMPLETED', 'FAILED', 'REJECTED'].includes(event.status),
      'INVALID_COMMAND_STATUS',
      'Unknown command outcome',
      422,
    );
    this.#data.status = event.status;
    if (event.status === 'ACCEPTED') this.#data.acceptedAt = now;
    else {
      this.#data.completedAt = now;
      this.#data.error = event.error ?? null;
    }
  }
  markUnknown() {
    if (['PENDING', 'ACCEPTED'].includes(this.#data.status)) this.#data.status = 'UNKNOWN';
  }
  cancel(now, reason) {
    invariant(
      ['PENDING', 'ACCEPTED', 'UNKNOWN'].includes(this.#data.status),
      'COMMAND_ENDED',
      'Cannot cancel a finished command',
    );
    Object.assign(this.#data, { status: 'CANCELLED', completedAt: now, error: reason });
  }
  toJSON() {
    return structuredClone(this.#data);
  }
}
/** Strategy contract: pure evaluate(sample, context) -> incident decision or null. */
export class AlertRule {
  evaluate() {
    throw new Error('AlertRule.evaluate must be implemented');
  }
}
export class LowBatteryRule extends AlertRule {
  evaluate(sample) {
    return sample && sample.battery <= 20
      ? {
          key: 'LOW_BATTERY',
          severity: 'warning',
          title: 'Low battery',
          message: `Synthetic battery at ${sample.battery.toFixed(0)}%. Consider landing.`,
        }
      : null;
  }
}
export class StaleTelemetryRule extends AlertRule {
  evaluate(sample, { now, flight }) {
    const reference = sample?.receivedAt ?? flight.startedAt;
    return !TERMINAL.includes(flight.state) && now - Date.parse(reference) > 3000
      ? {
          key: 'STALE_TELEMETRY',
          severity: 'critical',
          title: 'Telemetry stale',
          message: 'No recent telemetry. Last reported flight state may be outdated.',
        }
      : null;
  }
}
export class AlertEngine {
  constructor(rules) {
    this.rules = rules;
  }
  evaluate(sample, context) {
    return this.rules.map((rule) => rule.evaluate(sample, context)).filter(Boolean);
  }
}
