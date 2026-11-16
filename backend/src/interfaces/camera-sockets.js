import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { originAllowed } from './origin.js';

export const CAMERA = Object.freeze({ width: 640, height: 360, maxBytes: 150000, staleMs: 3000 });
const frameSchema = z
  .object({
    protocolVersion: z.literal(1),
    type: z.literal('camera_frame'),
    epochId: z.string().uuid(),
    sequence: z.number().int().nonnegative(),
    simulationTime: z.number().finite().nonnegative(),
    width: z.literal(640),
    height: z.literal(360),
    jpeg: z.string().max(200000),
  })
  .strict();

/** Check the encoded image's actual dimensions without decoding untrusted pixel buffers. */
export function validateFrame(message) {
  const frame = frameSchema.parse(message);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(frame.jpeg)) throw new Error('Invalid encoding');
  const bytes = Buffer.from(frame.jpeg, 'base64');
  if (
    bytes.length > CAMERA.maxBytes ||
    bytes.toString('base64') !== frame.jpeg ||
    bytes.readUInt16BE(0) !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  )
    throw new Error('Invalid JPEG');
  let offset = 2,
    dimensions;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('Invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) throw new Error('Invalid JPEG dimensions');
      dimensions = [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      break;
    }
    offset += length;
  }
  if (dimensions?.[0] !== CAMERA.width || dimensions?.[1] !== CAMERA.height)
    throw new Error('Wrong image dimensions');
  return frame;
}

/** Ephemeral media transport: no database writes and no command/telemetry queue dependencies. */
export function createCameraChannel(context) {
  const { auth, gateway, config } = context;
  const producers = new WebSocketServer({ noServer: true, maxPayload: 210000 });
  const viewers = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  let producer,
    latest = null,
    lastFrame = 0,
    sequence = -1;
  const status = () =>
    !gateway.connected || !producer || producer.readyState !== 1
      ? 'disconnected'
      : !latest
        ? 'waiting'
        : Date.now() - lastFrame > CAMERA.staleMs
          ? 'stale'
          : 'live';
  const send = (socket, message) => {
    if (socket.readyState === 1 && socket.bufferedAmount < 300000)
      socket.send(JSON.stringify(message));
  };
  const notify = () => {
    for (const socket of viewers.clients) {
      if (!auth.session(socket.request)) socket.close(4003, 'Session ended');
      else send(socket, { type: 'camera_status', status: status() });
    }
  };
  producers.on('connection', (socket) => {
    let attached = false;
    const timeout = setTimeout(() => socket.close(4000, 'Camera handshake timeout'), 5000);
    socket.on('error', () => {});
    socket.on('message', (raw) => {
      try {
        const message = JSON.parse(raw);
        if (!attached) {
          const hello = z
            .object({
              protocolVersion: z.literal(1),
              type: z.literal('camera_hello'),
              droneId: z.literal('drone-01'),
              epochId: z.string().uuid(),
            })
            .strict()
            .parse(message);
          if (!gateway.connected || hello.epochId !== gateway.epochId)
            throw new Error('Inactive agent');
          producer?.close(4001, 'Superseded camera');
          producer = socket;
          socket.epochId = hello.epochId;
          latest = null;
          lastFrame = 0;
          sequence = -1;
          attached = true;
          clearTimeout(timeout);
          send(socket, { type: 'camera_welcome', epochId: hello.epochId });
          notify();
          return;
        }
        if (producer !== socket || !gateway.connected || gateway.epochId !== socket.epochId)
          throw new Error('Superseded agent');
        const frame = validateFrame(message);
        if (frame.epochId !== socket.epochId || frame.sequence <= sequence)
          throw new Error('Invalid frame ordering');
        sequence = frame.sequence;
        // Drop excess rate; never queue old images or delay the flight-control transport.
        if (Date.now() - lastFrame >= 190) {
          lastFrame = Date.now();
          latest = { ...frame, receivedAt: new Date(lastFrame).toISOString() };
          for (const viewer of viewers.clients) {
            if (!auth.session(viewer.request)) viewer.close(4003, 'Session ended');
            else send(viewer, latest);
          }
        }
        send(socket, { type: 'camera_ack', sequence: frame.sequence });
      } catch {
        socket.close(4002, 'Invalid camera frame or session');
      }
    });
    socket.on('close', () => {
      clearTimeout(timeout);
      if (producer === socket) {
        producer = null;
        latest = null;
        notify();
      }
    });
  });
  viewers.on('connection', (socket, request) => {
    socket.request = request;
    socket.on('error', () => {});
    socket.on('message', () => socket.close(4002, 'Camera viewers are read-only'));
    send(socket, { type: 'camera_status', status: status() });
    if (latest && status() === 'live') send(socket, latest);
  });
  const timer = setInterval(() => {
    if (producer && (!gateway.connected || producer.epochId !== gateway.epochId)) {
      producer.close(4001, 'Agent ended');
      latest = null;
    }
    notify();
  }, 1000);
  timer.unref();
  return {
    upgrade(req, socket, head, path) {
      if (!['/ws/camera/producer', '/ws/camera/viewer'].includes(path)) return false;
      const producerPath = path.endsWith('/producer');
      let allowed = false;
      try {
        allowed = producerPath
          ? config.mode === 'webots' && auth.verifyBridge(req.headers.authorization) !== false
          : originAllowed(config, req.headers.origin) && !!auth.session(req);
      } catch {
        /* unauthorized */
      }
      if (!allowed) {
        socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        return true;
      }
      const server = producerPath ? producers : viewers;
      server.handleUpgrade(req, socket, head, (ws) => server.emit('connection', ws, req));
      return true;
    },
    close() {
      clearInterval(timer);
      for (const socket of [...producers.clients, ...viewers.clients]) socket.terminate();
      producers.close();
      viewers.close();
    },
  };
}
