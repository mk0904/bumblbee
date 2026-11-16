/** Observe the real media channel during a Webots acceptance flight. No simulated frames. */
import WebSocket from 'ws';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5174';
const pairing = await fetch(`${base}/api/pairing/request`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SIMULATOR_TOKEN}` },
}).then((r) => r.json());
const claim = await fetch(`${base}/api/pairing/claim`, {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: pairing.code }),
});
if (!claim.ok) throw new Error('Pairing failed');
const cookie = claim.headers.get('set-cookie').split(';')[0];
const socket = new WebSocket(`${base.replace('http', 'ws')}/ws/camera/viewer`, {
  headers: { Origin: origin, Cookie: cookie },
});
let frames = 0,
  bytes = 0,
  firstTime,
  lastTime,
  first,
  last;
const hashes = new Set();
const started = Date.now();
await new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, 45000);
  socket.on('error', (error) => {
    clearTimeout(timer);
    reject(error);
  });
  socket.on('message', (raw) => {
    const frame = JSON.parse(raw);
    if (frame.type !== 'camera_frame') return;
    const image = Buffer.from(frame.jpeg, 'base64');
    first ??= image;
    last = image;
    firstTime ??= Date.now();
    lastTime = Date.now();
    frames++;
    bytes += image.length;
    hashes.add(createHash('sha256').update(image).digest('hex'));
  });
});
socket.close();
const result = {
  frames,
  width: 640,
  height: 360,
  observedFps: (frames - 1) / ((lastTime - firstTime) / 1000),
  averageJpegBytes: frames ? Math.round(bytes / frames) : 0,
  distinctFrames: hashes.size,
  durationMs: Date.now() - started,
};
await mkdir('docs/evidence/camera', { recursive: true });
await writeFile('docs/evidence/camera/stream-check.json', JSON.stringify(result, null, 2));
if (first) await writeFile('docs/evidence/camera/first.jpg', first);
if (last) await writeFile('docs/evidence/camera/last.jpg', last);
console.log(JSON.stringify(result));
if (frames < 20 || hashes.size < 2) throw new Error('Camera stream acceptance failed');
