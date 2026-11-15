import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Mission,
  FlightSession,
  AlertEngine,
  LowBatteryRule,
  StaleTelemetryRule,
  Waypoint,
} from '../src/domain/model.js';
const input = { name: 'Survey', waypoints: [{ x: 10, y: 5, altitude: 8 }] };

test('mission validates coordinates and snapshots isolate historical route', () => {
  assert.throws(() => new Waypoint({ x: NaN, y: 1, altitude: 8 }, 0), { code: 'INVALID_WAYPOINT' });
  assert.throws(() => new Waypoint({ x: 51, y: 1, altitude: 8 }, 0), { code: 'OUT_OF_BOUNDS' });
  const mission = Mission.create(input, 'operator-01', new Date().toISOString());
  const snapshot = mission.snapshot();
  mission.update(
    { ...input, waypoints: [{ x: 20, y: 0, altitude: 6 }] },
    1,
    new Date().toISOString(),
  );
  assert.equal(snapshot.waypoints[0].x, 10);
  assert.equal(mission.toJSON().waypoints[0].x, 20);
  assert.throws(() => mission.update(input, 1, ''), { code: 'REVISION_CONFLICT' });
});
test('empty drafts can be saved but not executed', () => {
  const mission = Mission.create(
    { name: 'Draft', waypoints: [] },
    'operator-01',
    new Date().toISOString(),
  );
  assert.throws(() => mission.snapshot(), { code: 'EMPTY_MISSION' });
});
test('flight transition table rejects illegal commands and terminal transitions', () => {
  const flight = FlightSession.create(
    Mission.create(input, 'operator-01', '').snapshot(),
    'operator-01',
    '',
  );
  assert.throws(() => flight.assertAction('PAUSE'), { code: 'INVALID_FLIGHT_STATE' });
  flight.transition('TAKING_OFF', '');
  flight.transition('EXECUTING', '');
  flight.assertAction('PAUSE');
  flight.transition('PAUSED', '');
  flight.assertAction('RESUME');
  flight.transition('LANDING', '');
  assert.throws(() => flight.assertAction('RESUME'), { code: 'INVALID_FLIGHT_STATE' });
  flight.transition('COMPLETED', '');
  assert.throws(() => flight.transition('EXECUTING', ''), { code: 'INVALID_FLIGHT_STATE' });
});
for (const Rule of [LowBatteryRule, StaleTelemetryRule]) {
  test(`${Rule.name} satisfies pure alert strategy contract`, () => {
    const sample = Object.freeze({ battery: 18, receivedAt: '2026-01-01T00:00:00Z' });
    const context = Object.freeze({
      now: Date.parse('2026-01-01T00:00:10Z'),
      flight: Object.freeze({ state: 'EXECUTING', startedAt: sample.receivedAt }),
    });
    const result = new Rule().evaluate(sample, context);
    assert.equal(typeof result.key, 'string');
    assert.equal(typeof result.message, 'string');
    assert.deepEqual(new AlertEngine([new Rule()]).evaluate(sample, context), [result]);
  });
}
