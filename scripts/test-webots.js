/** Local hardware-in-loop acceptance driver. Talks to real backend/agent, never fakes telemetry. */
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const base = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';
const origin = process.env.APP_ORIGIN ?? 'http://127.0.0.1:5174';
let cookie = '',
  csrf = '';
async function request(path, body, extra = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      Cookie: cookie,
      'X-CSRF-Token': csrf,
      'Idempotency-Key': randomUUID(),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(value)}`);
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  if (value?.csrf) csrf = value.csrf;
  return value;
}
const pairing = await request(
  '/pairing/request',
  {},
  { Authorization: `Bearer ${process.env.SIMULATOR_TOKEN}` },
);
await request('/pairing/claim', { code: pairing.code });
let dashboard = await request('/dashboard');
if (process.argv.includes('--inspect')) {
  console.log(
    JSON.stringify({
      mode: dashboard.mode,
      connected: dashboard.drone.connected,
      flights: dashboard.flights.map((f) => ({
        id: f.id,
        state: f.state,
        latest: f.latest?.state,
      })),
    }),
  );
} else if (process.argv.includes('--reports')) {
  await mkdir('docs/evidence/webots', { recursive: true });
  for (const flight of dashboard.flights.filter(
    (f) => f.adapter === 'webots' && ['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(f.state),
  )) {
    const report = await request(`/flights/${flight.id}/report`);
    await writeFile(`docs/evidence/webots/${flight.id}.json`, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ flightId: flight.id, state: flight.state, samples: report.samples.length }),
    );
  }
} else if (process.argv.includes('--reconcile')) {
  if (dashboard.drone.connected) throw new Error('Disconnect agent before explicit reconciliation');
  for (const flight of dashboard.flights.filter(
    (f) => !['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(f.state),
  )) {
    await request(`/flights/${flight.id}/reconcile`, {});
    console.log(JSON.stringify({ event: 'interrupted_unknown_flight', flightId: flight.id }));
  }
} else {
  if (dashboard.mode !== 'webots' || !dashboard.drone.connected)
    throw new Error('Real Webots agent required');
  const launch = dashboard.flights[0]?.latest ?? { x: 0, y: 0 };
  const target = {
    x: launch.x > 30 ? launch.x - 8 : launch.x + 8,
    y: launch.y > 30 ? launch.y - 6 : launch.y + 6,
    altitude: 3,
  };
  const mission = await request('/missions', {
    name: 'Webots automated acceptance',
    description: 'Local real-sensor acceptance; positive X/Y at 3 m.',
    waypoints: [target],
  });
  const start = await request('/flights', { missionId: mission.id, revision: mission.revision });
  const flightId = start.flightId;
  let paused = false,
    resumed = false,
    landed = false;
  let pauseTime = 0;
  const begin = Date.now();
  let lastState = '';
  while (Date.now() - begin < 150000) {
    dashboard = await request('/dashboard');
    const flight = dashboard.flights.find((f) => f.id === flightId);
    if (flight.state !== lastState) {
      console.log(
        JSON.stringify({
          event: 'flight_state',
          flightId,
          state: flight.state,
          position: flight.latest && [flight.latest.x, flight.latest.y, flight.latest.altitude],
        }),
      );
      lastState = flight.state;
    }
    const waiting = dashboard.commands.some(
      (c) => c.flightId === flightId && ['PENDING', 'ACCEPTED'].includes(c.status),
    );
    if (flight.state === 'EXECUTING' && !paused && !waiting) {
      await request(`/flights/${flightId}/commands`, { action: 'PAUSE' });
      paused = true;
    } else if (flight.state === 'PAUSED' && !resumed && !waiting) {
      pauseTime ||= Date.now();
      if (Date.now() - pauseTime > 2500) {
        await request(`/flights/${flightId}/commands`, { action: 'RESUME' });
        resumed = true;
      }
    } else if (
      resumed &&
      !landed &&
      flight.state === 'EXECUTING' &&
      !waiting &&
      flight.latest.x > 3
    ) {
      await request(`/flights/${flightId}/commands`, { action: 'LAND' });
      landed = true;
    }
    if (['COMPLETED', 'FAILED', 'INTERRUPTED'].includes(flight.state)) {
      const report = await request(`/flights/${flightId}/report`);
      await mkdir('docs/evidence/webots', { recursive: true });
      await writeFile(`docs/evidence/webots/${flightId}.json`, JSON.stringify(report, null, 2));
      const attitudeOK = report.samples.every(
        (s) => Math.abs(s.roll) < 0.5 && Math.abs(s.pitch) < 0.5,
      );
      const pauseSamples = report.samples.filter((s) => s.state === 'PAUSED');
      const hoverOK =
        pauseSamples.length > 0 && pauseSamples.every((s) => Math.abs(s.altitude - 3) < 0.6);
      const statuses = report.commands.map((c) => ({ action: c.action, status: c.status }));
      console.log(
        JSON.stringify({
          event: 'acceptance_result',
          flightId,
          adapter: flight.adapter,
          state: flight.state,
          paused,
          resumed,
          landed,
          samples: report.samples.length,
          attitudeOK,
          hoverOK,
          commands: statuses,
        }),
      );
      if (
        !attitudeOK ||
        !hoverOK ||
        flight.state !== 'COMPLETED' ||
        !resumed ||
        !landed ||
        statuses.some((c) => c.status !== 'COMPLETED')
      )
        throw new Error('Acceptance failed');
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  if (lastState !== 'COMPLETED') throw new Error('Acceptance timed out; do not infer landing');
}
