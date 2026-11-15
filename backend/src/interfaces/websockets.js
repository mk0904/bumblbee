import { WebSocketServer } from 'ws';
import { originAllowed } from './origin.js';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { dashboardSnapshot } from '../application/services.js';

const sampleSchema = z
  .object({
    flightId: z.string().uuid(),
    epochId: z.string().uuid(),
    sequence: z.number().int().nonnegative(),
    simulationTime: z.number().finite().nonnegative(),
    x: z.number().finite(),
    y: z.number().finite(),
    altitude: z.number().finite().nonnegative(),
    speed: z.number().finite().nonnegative(),
    battery: z.number().min(0).max(100),
    roll: z.number().finite(),
    pitch: z.number().finite(),
    yaw: z.number().finite(),
    waypoint: z.number().int().nonnegative(),
    state: z.enum(['TAKING_OFF', 'EXECUTING', 'PAUSED', 'LANDING', 'COMPLETED', 'FAILED']),
    batterySource: z.enum(['synthetic', 'sensor']),
    reason: z.string().max(200).optional(),
  })
  .strict();
const equal = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function attachWebSockets(server, context) {
  const dashboards = new WebSocketServer({ noServer: true, maxPayload: 65536 });
  const simulators = new WebSocketServer({ noServer: true, maxPayload: 65536 });
  const { auth, gateway, config, services, repository } = context;
  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, 'http://local').pathname;
    if (
      path === '/ws/dashboard' &&
      originAllowed(config, req.headers.origin) &&
      auth.session(req)
    ) {
      return dashboards.handleUpgrade(req, socket, head, (ws) =>
        dashboards.emit('connection', ws, req),
      );
    }
    if (
      path === '/ws/simulator' &&
      config.mode === 'webots' &&
      equal(req.headers.authorization, `Bearer ${config.simulatorToken}`) &&
      config.simulatorToken
    ) {
      return simulators.handleUpgrade(req, socket, head, (ws) =>
        simulators.emit('connection', ws, req),
      );
    }
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
  });
  dashboards.on('connection', (socket, req) => {
    let sending = false;
    const update = async () => {
      if (sending || socket.readyState !== 1) return;
      const session = auth.session(req);
      if (!session) {
        socket.close(4003, 'Session ended');
        return;
      }
      if (socket.bufferedAmount > 1_000_000) {
        socket.close(4008, 'Slow consumer');
        return;
      }
      sending = true;
      try {
        socket.send(
          JSON.stringify({
            type: 'snapshot',
            payload: await dashboardSnapshot(repository, gateway, session.user.id),
          }),
        );
      } catch {
        socket.close(1011, 'Snapshot unavailable');
      } finally {
        sending = false;
      }
    };
    context.events.on('changed', update);
    update();
    socket.on('close', () => context.events.off('changed', update));
    socket.on('error', () => {});
  });
  simulators.on('connection', (socket) => {
    let attached = false,
      queue = Promise.resolve(),
      queued = 0;
    const timeout = setTimeout(() => {
      if (!attached) socket.close(4000, 'Handshake timeout');
    }, 5000);
    socket.on('error', () => {});
    socket.on('message', (raw) => {
      if (++queued > 64 || socket.bufferedAmount > 1_000_000)
        return socket.close(4008, 'Backpressure');
      queue = queue
        .then(async () => {
          const message = JSON.parse(raw);
          if (message.protocolVersion !== 1) throw new Error('Unsupported protocol version');
          if (!attached) {
            const hello = z
              .object({
                protocolVersion: z.literal(1),
                type: z.literal('hello'),
                droneId: z.literal('drone-01'),
                epochId: z.string().uuid(),
              })
              .strict()
              .parse(message);
            gateway.attach(socket, hello.epochId);
            attached = true;
            clearTimeout(timeout);
            socket.send(
              JSON.stringify({ protocolVersion: 1, type: 'welcome', epochId: hello.epochId }),
            );
            context.publish();
            return;
          }
          if (gateway.socket !== socket) throw new Error('Superseded connection');
          gateway.lastSeen = new Date().toISOString();
          gateway.connected = socket.readyState === 1;
          if (message.type === 'heartbeat') {
            socket.send(JSON.stringify({ protocolVersion: 1, type: 'heartbeat_ack' }));
            return;
          }
          if (message.type === 'telemetry') {
            const sample = sampleSchema.parse(message.payload);
            if (sample.epochId !== gateway.epochId) throw new Error('Wrong epoch');
            await services.telemetry.ingest(sample);
          } else if (message.type === 'command_result') {
            const result = z
              .object({
                commandId: z.string().uuid(),
                status: z.enum(['ACCEPTED', 'COMPLETED', 'REJECTED', 'FAILED']),
                error: z.string().max(200).optional(),
              })
              .strict()
              .parse(message.payload);
            if (!gateway.dispatched.has(result.commandId))
              throw new Error('Command not dispatched in this session');
            await services.flight.commandResult(result);
          } else throw new Error('Unknown message type');
        })
        .catch(() => socket.close(4002, 'Invalid or out-of-sequence message'))
        .finally(() => {
          queued--;
        });
    });
    socket.on('close', () => {
      clearTimeout(timeout);
      if (gateway.socket === socket) {
        gateway.connected = false;
        context.publish();
      }
    });
  });
  const freshness = setInterval(() => {
    if (dashboards.clients.size) context.publish();
    if (
      config.mode === 'webots' &&
      gateway.connected &&
      Date.now() - Date.parse(gateway.lastSeen) > 5000
    ) {
      gateway.connected = false;
      gateway.socket?.close(4000, 'Heartbeat timeout');
      context.publish();
    }
  }, 2000);
  freshness.unref();
  return async () => {
    clearInterval(freshness);
    for (const ws of [...dashboards.clients, ...simulators.clients]) ws.terminate();
    dashboards.close();
    simulators.close();
  };
}
