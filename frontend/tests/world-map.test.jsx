import { expect, test } from 'vitest';
import { world, worldToMap, mapToWorld } from '../src/lib/world-map.js';
test('canonical yard and planner have the same metre coordinates, origin and north orientation', () => {
  expect(worldToMap(-60, 60)).toEqual({ x: 0, y: 0 });
  expect(worldToMap(60, -60)).toEqual({ x: 600, y: 600 });
  expect(worldToMap(0, 0)).toEqual({ x: 300, y: 300 });
  for (const pad of world.pads) {
    const point = worldToMap(pad.x, pad.y);
    expect(mapToWorld(point.x, point.y)).toEqual({ x: pad.x, y: pad.y });
    expect(pad.diameter).toBeLessThanOrEqual(1.5);
  }
});
test('outside-flight clicks are rejected instead of silently moved to an edge', () => {
  expect(mapToWorld(0, 0)).toBeNull();
  expect(mapToWorld(600, 600)).toBeNull();
  expect(mapToWorld(50, 50)).toEqual({ x: -50, y: 50 });
  expect(mapToWorld(550, 550)).toEqual({ x: 50, y: -50 });
});

test('flight map retains zoom across unmount and resets explicitly', async () => {
  const { render, screen, cleanup } = await import('@testing-library/react');
  const { default: userEvent } = await import('@testing-library/user-event');
  const { WorldMap } = await import('../src/components/WorldMap.jsx');
  sessionStorage.clear();
  const user = userEvent.setup();
  const first = render(<WorldMap zoomKey="flight-deck" />);
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  const view = first.container.querySelector('svg[viewBox]').getAttribute('viewBox');
  first.unmount();
  const second = render(<WorldMap zoomKey="flight-deck" />);
  expect(second.container.querySelector('svg[viewBox]').getAttribute('viewBox')).toBe(view);
  await user.click(screen.getByRole('button', { name: 'Reset map view' }));
  expect(second.container.querySelector('svg[viewBox]').getAttribute('viewBox')).toBe('0 0 600 600');
  cleanup();
  sessionStorage.clear();
});

test('map consumes wheel and trackpad pinch for bounded zoom', async () => {
  const { render, fireEvent, cleanup } = await import('@testing-library/react');
  const { WorldMap } = await import('../src/components/WorldMap.jsx');
  const { container } = render(<WorldMap />);
  const map = container.querySelector('.world-map');
  const svg = container.querySelector('svg[viewBox]');
  expect(fireEvent.wheel(map, { deltaY: -200, cancelable: true })).toBe(false);
  expect(Number(svg.getAttribute('viewBox').split(' ')[2])).toBeLessThan(600);
  fireEvent.wheel(map, { deltaY: -1000, ctrlKey: true, cancelable: true });
  expect(Number(svg.getAttribute('viewBox').split(' ')[2])).toBe(150);
  fireEvent.wheel(map, { deltaY: 10000, cancelable: true });
  expect(svg.getAttribute('viewBox')).toBe('0 0 600 600');
  cleanup();
});
