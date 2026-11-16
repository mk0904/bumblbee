# Local dashboard ↔ Webots verification — 16 November 2026

## Result and environment
Actual local Webots integration now works: paired React dashboard → Express →
authenticated Python socket worker → sensor-driven Mavic motors → GPS/IMU/gyro →
PostgreSQL/Supabase → dashboard/report. No demo fallback or pose teleportation.
World/runtime/Python/dependency details are in simulator/README.md and ADR-005/007.
Webots and servers were left running, drone landed/motors stopped.

## Passing evidence

- Dashboard-created `Webots acceptance` route (4,3,3) produced real takeoff,
  positive-X/Y motion and local touchdown, but its first backend record was
  interrupted because persistence backlog broke transport. Local sensor evidence
  is in webots/first-flight-local.jsonl; it is **not** a passing end-to-end flight.
- Dashboard-started normal route flight `4545ffef-1c29-4f1f-ba31-51b64ae4be0f`:
  START_MISSION completed; EXECUTING → LANDING → COMPLETED without operator Land.
  Landing-entry horizontal error from (8,6) was 0.623 m (the logged next sample
  after the controller's 0.6 m entry check). 91 persisted sensor samples; final
  altitude 0.113 m; max absolute roll 0.011 rad / pitch 0.070 rad. This is one
  route/one altitude, not a full accuracy qualification.
- Final automated supervisory workflow, flight
  `f5716b60-53ed-4d49-93d8-545d1dae7437`: START_MISSION, PAUSE, RESUME, LAND all
  COMPLETED; final flight COMPLETED with sensor-confirmed touchdown. 34 persisted
  samples; pause altitude 3.002–3.011 m and speed 0.016–0.020 m/s. Max absolute
  roll 0.011 rad, pitch 0.070 rad. Final altitude 0.103 m.
  This test intentionally lands before the final waypoint, so it proves command
  control, not mission-route completion.
- Raw persisted reports are webots/<flight UUID>.json. The corrected acceptance
  driver is scripts/test-webots.js and requires a real connected Webots adapter.
- Screenshots: screenshots/webots/live-dashboard.png and live-world.png. The map
  is live local telemetry; there is no browser camera/3D streaming.

## Measured performance and limits
For the final run, created→accepted recorded command times: start 1.89 s, pause
1.77 s, resume 2.10 s, land 2.20 s. These include backend/remote SQL persistence;
not a network-only measurement or a percentile benchmark. Persisted telemetry
averaged 0.78 Hz over this run despite 2 Hz generation. Five-Hz and low-latency
NFR targets are **not achieved**. Local stabilization runs at an 8 ms simulation
step and does not wait for network/SQL. Sim speed may differ from real time.

## Development failures retained
1. Sequential remote table reads allowed telemetry backlog, UI lag and connection
   loss. Grounded Webots touchdown did not reach the backend; its flight remains
   INTERRUPTED, not falsely reconciled as successful.
2. Aggregate read reduced round trips, but heartbeat replies still queued behind
   SQL. Local watchdog landed; backend flight explicitly interrupted. See
   webots/second-flight-local.jsonl. This observed watchdog response does not
   replace a deliberate repeatable network-fault acceptance test.
3. Abrupt horizontal braking caused overturn on pause. The old touchdown check
   falsely labelled that development flight COMPLETED. Report
   `124cadee-b82c-400f-8f76-fbde6c00f7e6` is retained as **invalid/failed physical
   acceptance**, regardless of its legacy status; do not count it as success.
   Conservative slew-limited feedback and an attitude FAILED guard replace that
   controller. The driver now also asserts physical attitude/hover quality.
4. Flight `99e3cf86-04a8-47e0-8633-345350577777` remained upright, hovered and
   landed correctly, but the driver accidentally sent RESUME twice. The agent
   rejected the second illegal request. The driver failed its all-completed check
   and was fixed to issue Resume once; the final run above passed.

## Checks and remaining gates
25 backend tests pass (including real SQL semantics and socket persistence ACK /
heartbeat separation), 9 frontend tests pass, 5 Python boundary/state policy tests
pass. Lint and production build pass. Test doubles do not prove flight physics;
the local reports above are the actual simulator evidence.

Still pending: three controlled accuracy trials over multiple routes/altitudes,
deliberate disconnect/reconnect and crash/restart recovery validation, automatic
reconciliation of an active local flight journal, hosted HTTPS/WSS deployment,
internet latency/load measurements and long-duration persistence scaling. Four
command outcomes do not imply exactly-once execution across restarts. Battery is
synthetic; no obstacle avoidance, real-drone hardware or streaming is claimed.

## Tracking view usability update
User requested easier visual tracking after flight tests. The world now saves a
close Viewpoint at (0,-6,6), following robot name `SDSE Mavic` in `Tracking Shot`
mode with smoothness 0.2. Reload verified the close grounded view; image at
screenshots/webots/follow-view.png. This uses built-in Viewpoint following only,
not a new physics/controller feature. Dashboard image streaming is not implemented.
Official UI reference: https://cyberbotics.com/doc/guide/the-user-interface?version=master .
