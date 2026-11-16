import { FlightConsole } from '../src/features/FlightConsole.jsx';
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
  await user.type(screen.getByLabelText(/drone code/i), 'a7k2');
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
  expect(saved.waypoints.every((w) => Object.keys(w).sort().join(',') === 'altitude,speed,x,y')).toBe(
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

test('flight deck shows map, camera and chart together without inventing missing telemetry', async () => {
  const data = snapshot();
  render(
    <FlightConsole
      data={data}
      active={null}
      sample={null}
      stale={false}
      busy={false}
      pending={false}
      commands={[]}
      onMissions={() => {}}
      onNewMission={() => {}}
      onHistory={() => {}}
      onCommand={() => {}}
      onReconcile={() => {}}
    />,
  );
  expect(screen.getByLabelText('No heading telemetry')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Hide route overlay' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Mission viewport' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Camera view' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Live altitude trend' })).toBeTruthy();
  expect(screen.getByText('Telemetry chart')).toBeTruthy();
});

test('flight deck permits landing during takeoff while keeping pause disabled', async () => {
  const user = userEvent.setup(),
    onCommand = vi.fn(),
    data = snapshot();
  data.drone.connected = true;
  const active = { ...data.flights[0], state: 'TAKING_OFF' };
  render(
    <FlightConsole
      data={data}
      active={active}
      sample={null}
      stale={false}
      busy={false}
      pending={true}
      commands={[{ action: 'START_MISSION', status: 'ACCEPTED' }]}
      onMissions={() => {}}
      onNewMission={() => {}}
      onHistory={() => {}}
      onCommand={onCommand}
      onReconcile={() => {}}
    />,
  );
  expect(screen.getByRole('button', { name: 'Pause', exact: true }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Land', exact: true }).disabled).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Land', exact: true }));
  expect(onCommand).toHaveBeenCalledWith('LAND');
});

test('compass converts measured ENU yaw to local bearing and identifies stale readings', () => {
  const props = { data: snapshot(), active: null, stale: false, busy: false, pending: false, commands: [] };
  const { rerender } = render(<FlightConsole {...props} sample={{ yaw: 0, x: 2, y: 3 }} />);
  expect(screen.getByLabelText('Local heading 90 degrees clockwise from positive Y')).toBeTruthy();
  rerender(<FlightConsole {...props} stale sample={{ yaw: Math.PI / 2, x: 2, y: 3 }} />);
  expect(screen.getByLabelText('Local heading 0 degrees clockwise from positive Y, stale')).toBeTruthy();
  expect(screen.getByText('Stale reading')).toBeTruthy();
});

test('flight deck leaves saved routes hidden until explicitly selected', () => {
  const data = snapshot();
  data.missions = [{ id: 'route-01', name: 'Selected mission', waypoints: [{x: 8, y: 6, altitude: 3}] }];
  const props = { data, active: null, sample: null, stale: false, busy: false, pending: false, commands: [] };
  const { rerender } = render(<FlightConsole {...props} />);
  expect(screen.queryByLabelText(/Waypoint 1, X/)).toBeNull();
  expect(screen.getByText('No mission selected')).toBeTruthy();
  rerender(<FlightConsole {...props} selectedMission={data.missions[0]} />);
  expect(screen.getByLabelText(/Waypoint 1, X/)).toBeTruthy();
});

test('selected plan exposes waypoint details and starts that exact revision', async () => {
 const user=userEvent.setup(), onStart=vi.fn();
 const data=snapshot(); data.drone.connected=true;
 const mission={id:'selected',revision:4,name:'Inspection route',waypoints:[{x:8,y:6,altitude:3}]};
 render(<FlightConsole data={data} selectedMission={mission} active={null} sample={null} stale={false} busy={false} pending={false} commands={[]} onStart={onStart} />);
 expect(screen.getByRole('table',{name:'Selected mission waypoints'})).toBeTruthy();
 expect(screen.getByText('Selected · 1 waypoints')).toBeTruthy();
 await user.click(screen.getByRole('button',{name:'Start mission'}));
 expect(onStart).toHaveBeenCalledWith(mission);
});

test('connection failures use a dismissible notification without in-flow banners', async () => {
 const user=userEvent.setup();
 useDashboard.mockReturnValue({data:snapshot(),connection:'reconnecting',error:'Failed to fetch',refresh:vi.fn()});
 const {container}=render(<Workspace user={{}} onLogout={()=>{}} />);
 expect(container.querySelector('.content .error-banner,.content .warning-banner')).toBeNull();
 expect(screen.getByRole('alert').textContent).toContain('Retrying automatically');
 await user.click(screen.getByRole('button',{name:'Dismiss connection notification'}));
 expect(screen.queryByRole('alert')).toBeNull();
});

test('sidebar bottom offers theme switching and System retains session disconnect', async () => {
  const user = userEvent.setup();
  useDashboard.mockReturnValue({ data: snapshot(), connection: 'live', error: '', refresh: vi.fn() });
  render(<Workspace user={{}} onLogout={() => {}} />);
  const navigation = screen.getByRole('complementary', { name: 'Primary navigation' });
  expect(navigation.querySelector('.sidebar-bottom .theme-toggle')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Disconnect control session' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'System & alerts', exact: true }));
  expect(screen.getByRole('button', { name: 'Disconnect control session' })).toBeTruthy();
});
