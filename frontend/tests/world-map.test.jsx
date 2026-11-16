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
