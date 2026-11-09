import world from '../../../shared/worlds/training-ground-v1.json';
export { world };
export const MAP_SIZE = 600;
const { minX, maxX, minY, maxY } = world.surface;
export const worldToMap = (x, y) => ({
  x: ((x - minX) * MAP_SIZE) / (maxX - minX),
  y: ((maxY - y) * MAP_SIZE) / (maxY - minY),
});
/** No snapping/clamping at the boundary: an outside click must not create an edge waypoint. */
export function mapToWorld(x, y) {
  const position = {
    x: (x * (maxX - minX)) / MAP_SIZE + minX,
    y: maxY - (y * (maxY - minY)) / MAP_SIZE,
  };
  const { min, max } = world.flightBounds;
  if (position.x < min || position.x > max || position.y < min || position.y > max) return null;
  return { x: Math.round(position.x * 10) / 10, y: Math.round(position.y * 10) / 10 };
}
