import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import world from '../../shared/worlds/training-ground-v1.json' with { type: 'json' };
import { WORLD } from '../src/domain/model.js';
test('Webots mesh, API flight bounds and canonical planner atlas agree', async () => {
  const source = await readFile(
    new URL('../../simulator/worlds/training-ground-v1.wbt', import.meta.url),
    'utf8',
  );
  assert.equal(WORLD.id, world.id);
  assert.equal(WORLD.frame, world.frame);
  assert.equal(WORLD.min, world.flightBounds.min);
  assert.equal(WORLD.max, world.flightBounds.max);
  assert.ok(source.includes('../../shared/worlds/' + world.texture));
  const { minX, maxX, minY, maxY } = world.surface;
  for (const [x, y] of [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
  ])
    assert.ok(
      source.includes(`${x} ${y} 0.001`),
      'UV corner must match the shared physical map extent',
    );
  assert.ok(source.includes('boundingObject Box { size 120 120 0.2 }'));
});
