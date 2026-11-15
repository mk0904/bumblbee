import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pairing } from '../src/features/Pairing.jsx';
import { Planner } from '../src/features/Planner.jsx';
import { Workspace } from '../src/features/Workspace.jsx';
import { api, setCsrf } from '../src/lib/api.js';
import { useDashboard } from '../src/lib/use-dashboard.js';

vi.mock('../src/lib/api.js', () => ({
  api: vi.fn(),
  setCsrf: vi.fn(),
  requestKey: () => ({ 'Idempotency-Key': 'ui-test-key' }),
}));
vi.mock('../src/lib/use-dashboard.js', () => ({ useDashboard: vi.fn() }));
vi.mock('../src/components/TelemetryChart.jsx', () => ({
  TelemetryChart: () => <div>Telemetry chart</div>,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

test('demo pairing exchanges entry action for protected session without login/signup', async () => {
  const user = userEvent.setup(),
    onLogin = vi.fn();
  api
    .mockResolvedValueOnce({ demo: true })
    .mockResolvedValueOnce({ user: { id: 'operator-01' }, csrf: 'csrf-token' });
  render(<Pairing onLogin={onLogin} />);
  await user.click(await screen.findByRole('button', { name: /Open demo workspace/ }));
  await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ id: 'operator-01' }));
  expect(api).toHaveBeenCalledWith('/pairing/demo', { method: 'POST', body: {} });
  expect(setCsrf).toHaveBeenCalledWith('csrf-token');
  expect(screen.queryByLabelText(/password/i)).toBeNull();
});
test('four-character bridge entry is normalized and sent to claim endpoint', async () => {
  const user = userEvent.setup(),
    onLogin = vi.fn();
  api
    .mockResolvedValueOnce({ demo: false })
    .mockResolvedValueOnce({ user: { id: 'operator-01' }, csrf: 'code-csrf' });
  render(<Pairing onLogin={onLogin} />);
  await user.type(screen.getByLabelText('BRIDGE CODE'), 'a7k2');
  await user.click(screen.getByRole('button', { name: /Connect to drone/ }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('/pairing/claim', { method: 'POST', body: { code: 'A7K2' } }),
  );
});
test('planner adds/reorders coordinate values and saves clean route payload', async () => {
  const user = userEvent.setup(),
    onSave = vi.fn();
  render(<Planner onClose={() => {}} onSave={onSave} busy={false} />);
  const name = screen.getByLabelText('Mission name');
  await user.clear(name);
  await user.type(name, 'Inspection');
  await user.click(screen.getByRole('button', { name: 'Add waypoint at origin' }));
  const x = screen.getByLabelText('Waypoint 1 x');
  await user.clear(x);
  await user.type(x, '12');
  await user.click(screen.getByRole('button', { name: 'Add waypoint at origin' }));
  await user.click(screen.getByRole('button', { name: 'Move waypoint 2 earlier' }));
  await user.click(screen.getByRole('button', { name: /Save mission/ }));
  const saved = onSave.mock.calls[0][0];
  expect(saved.name).toBe('Inspection');
  expect(saved.waypoints[0].x).toBe(0);
  expect(saved.waypoints[1].x).toBe(12);
  expect(saved.waypoints.every((w) => Object.keys(w).sort().join(',') === 'altitude,x,y')).toBe(
    true,
  );
});
function snapshot() {
  return {
    mode: 'demo',
    storage: 'local-file-demo',
    world: { id: 'training-ground-v1', frame: 'WORLD_LOCAL_V1' },
    drone: { connected: false },
    missions: [],
    flights: [
      {
        id: 'flight-01',
        state: 'PAUSED',
        startedAt: new Date().toISOString(),
        adapter: 'demo',
        snapshot: { name: 'Interrupted route', waypoints: [{ x: 1, y: 2, altitude: 8 }] },
        latest: null,
      },
    ],
    commands: [],
    alerts: [],
    telemetry: [],
  };
}
test('offline flight recovery uses an in-page dialog and clearly records unknown outcome', async () => {
  const user = userEvent.setup(),
    refresh = vi.fn();
  useDashboard.mockReturnValue({ data: snapshot(), connection: 'live', error: '', refresh });
  api.mockResolvedValue(null);
  render(<Workspace user={{ email: 'Paired session' }} onLogout={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Close unconfirmed session' }));
  expect(screen.getByRole('dialog', { name: 'Close unconfirmed session?' })).toBeTruthy();
  expect(screen.getByText(/does not command or confirm landing/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Confirm', exact: true }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith('/flights/flight-01/reconcile', { method: 'POST' }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
});
