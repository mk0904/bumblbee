import { SimulatorAdapter } from '../application/ports.js';
import { DomainError } from '../domain/model.js';

/** Network adapter only: an external Webots controller must implement the documented protocol. */
export class WebotsAdapter extends SimulatorAdapter {
  attach(socket, epochId) {
    if (this.socket) this.socket.close(4001, 'Superseded session');
    this.socket = socket;
    this.epochId = epochId;
    this.connected = true;
    this.lastSeen = new Date().toISOString();
  }
  async send(command) {
    if (!this.connected || this.socket?.readyState !== 1)
      throw new DomainError('SIMULATOR_OFFLINE', 'Webots agent is not connected', 503);
    this.dispatched.add(command.id);
    this.socket.send(JSON.stringify({ protocolVersion: 1, type: 'command', payload: command }));
  }
  async close() {
    this.socket?.close();
  }
}
export class SimulatorFactory {
  static async create(mode) {
    if (mode === 'webots') return new WebotsAdapter();
    if (mode === 'demo') {
      const { DemoAdapter } = await import('./demo-adapter.js');
      return new DemoAdapter();
    }
    throw new Error('SIMULATOR_MODE must be demo or webots');
  }
}
