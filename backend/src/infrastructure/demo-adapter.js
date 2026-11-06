import { randomUUID } from 'node:crypto';

import { SimulatorAdapter } from '../application/ports.js';

/** Deterministic kinematic TEST adapter. Not Webots and not a physics simulator. */
export class DemoAdapter extends SimulatorAdapter {
  mode = 'demo';
  connected = true;
  constructor() {
    super();
    this.epochId = randomUUID();
    this.queue = Promise.resolve();
    this.tickScheduled = false;
  }
  bind(services) {
    this.services = services;
    this.timer = setInterval(() => this.scheduleTick(), 200);
    this.timer.unref();
  }
  // Coalesce timer ticks: slow persistence must never build an unbounded queue ahead of commands.
  scheduleTick() {
    if (this.tickScheduled) return;
    this.tickScheduled = true;
    this.queue = this.queue
      .then(() => this.tick())
      .catch((error) => {
        console.error(
          JSON.stringify({ event: 'demo_tick_error', code: error.code ?? 'INTERNAL_ERROR' }),
        );
      })
      .finally(() => {
        this.tickScheduled = false;
      });
  }
  async send(command) {
    if (this.dispatched.has(command.id)) return;
    if (!this.connected) throw new Error('Demo adapter disconnected');
    this.dispatched.add(command.id);
    this.queue = this.queue.then(async () => {
      if (Date.parse(command.expiresAt) < Date.now())
        return this.services.flight.commandResult({
          commandId: command.id,
          status: 'REJECTED',
          error: 'Command expired',
        });
      await this.services.flight.commandResult({ commandId: command.id, status: 'ACCEPTED' });
      if (command.action === 'START_MISSION') {
        this.flight = {
          id: command.flightId,
          snapshot: command.snapshot,
          startCommand: command.id,
        };
        this.sample = {
          flightId: command.flightId,
          epochId: this.epochId,
          sequence: 0,
          simulationTime: 0,
          x: 0,
          y: 0,
          altitude: 0,
          speed: 0,
          battery: 100,
          roll: 0,
          pitch: 0,
          yaw: 0,
          waypoint: 0,
          state: 'TAKING_OFF',
          batterySource: 'synthetic',
        };
        await this.emit();
      } else if (this.sample && this.flight?.id === command.flightId) {
        this.sample.state = { PAUSE: 'PAUSED', RESUME: 'EXECUTING', LAND: 'LANDING' }[
          command.action
        ];
        if (command.action === 'PAUSE') this.sample.speed = 0;
        this.pendingCommand = command.id;
        await this.emit();
        if (command.action !== 'LAND') {
          await this.services.flight.commandResult({ commandId: command.id, status: 'COMPLETED' });
          this.pendingCommand = null;
        }
      }
    });
    // Dispatch is queued, not synchronous completion.
    this.queue.catch(() => {});
  }
  async emit() {
    if (!this.connected || !this.sample) return;
    this.sample.sequence++;
    this.lastSeen = new Date().toISOString();
    await this.services.telemetry.ingest({ ...this.sample });
  }
  async tick() {
    if (!this.connected || !this.sample || !this.flight) return;
    const s = this.sample;
    s.simulationTime = +(s.simulationTime + 0.2).toFixed(2);
    s.battery = Math.max(0, s.battery - 0.025);
    s.speed = 0;
    if (s.state === 'TAKING_OFF') {
      const target = this.flight.snapshot.waypoints[0].altitude;
      s.altitude = Math.min(target, s.altitude + 0.5);
      if (s.altitude >= target) {
        s.state = 'EXECUTING';
        await this.emit();
        await this.services.flight.commandResult({
          commandId: this.flight.startCommand,
          status: 'COMPLETED',
        });
        return;
      }
    } else if (s.state === 'EXECUTING') {
      const target = this.flight.snapshot.waypoints[s.waypoint];
      if (!target) s.state = 'LANDING';
      else {
        const dx = target.x - s.x,
          dy = target.y - s.y,
          dz = target.altitude - s.altitude;
        const distance = Math.hypot(dx, dy, dz),
          step = Math.min(0.8, distance);
        if (distance < 0.15) s.waypoint++;
        else {
          s.x += (dx / distance) * step;
          s.y += (dy / distance) * step;
          s.altitude += (dz / distance) * step;
          s.speed = step / 0.2;
          s.yaw = Math.atan2(dy, dx);
        }
      }
    } else if (s.state === 'LANDING') {
      s.altitude = Math.max(0, s.altitude - 0.5);
      if (s.altitude <= 0) {
        if (this.pendingCommand) {
          await this.services.flight.commandResult({
            commandId: this.pendingCommand,
            status: 'COMPLETED',
          });
          this.pendingCommand = null;
        }
        s.state = 'COMPLETED';
        s.reason = 'Landed in demo adapter';
        await this.emit();
        this.flight = null;
        return;
      }
    }
    await this.emit();
  }
  async inject(kind) {
    if (kind === 'disconnect') {
      this.connected = false;
      return;
    }
    if (kind === 'reconnect') {
      this.connected = true;
      this.lastSeen = new Date().toISOString();
      return;
    }
    if (kind === 'battery' && this.sample && this.flight) {
      this.sample.battery = 18;
      await this.emit();
    }
  }
  clearFlight() {
    this.flight = null;
    this.sample = null;
    this.pendingCommand = null;
  }
  async close() {
    clearInterval(this.timer);
    await this.queue;
  }
}
