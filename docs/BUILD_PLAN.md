# Current build and release plan

User authorized **dashboard/backend first, Webots last** (ADR-002), and **bridge pairing instead of login/signup** (ADR-003). This replaces the original simulator-first ordering. Exact calendar/team assignment awaits current deadline and team availability.

## Product scope
One drone, one active flight, one local training world, visual local-coordinate mission planning, acknowledged control, live telemetry/alerts and saved flight reports. Demo adapter permits application testing now; actual Webots and hosting have separate acceptance gates. No AI, GPS map, obstacle avoidance, internet joystick control or multi-drone scope.

## Phase 0 — repository foundation (done)
JavaScript workspaces, Express/React, locked dependencies, checks, CI and startup instructions. Initial commit fc254d3.

## Phase 1 — application/domain (implemented)
Mission, Waypoint, FlightSession, FlightCommand, alert strategies, application services and repository contracts. Requirements: drafts/validation, legal states, one active flight, immutable snapshots, idempotency, explicit command outcomes. Tests must include malformed input, revision conflict, early landing, duplicate request and rollback.

## Phase 2 — dashboard and demo adapter (implemented; browser verification tracked separately)
Neutral engineering console, mission planner, click/drag coordinates, waypoint order/altitude, overview/telemetry, controls, history/report/export, alerts/acknowledgement and system fault injection. Backend demo adapter calculates movement; frontend only renders reported values. Empty states never imply live data. Browser desktop/mobile layout and complete mission workflow are acceptance checks.

## Phase 3 — pairing and integration boundary (implemented/test-agent verified)
No login/signup. Bridge bootstrap -> four-character 2-minute code -> protected browser session. Socket handshake, latest-session fencing, command dispatch/result, telemetry validation and heartbeat tested using an external socket test client. Python pairing helper implemented. This is not actual Webots proof.

## Phase 4 — persistence and Supabase (cloud connection/schema verified; load/concurrency pending)
SQL relational tables, JSONB snapshots, indexes, active-flight/command/sample/alert constraints and RLS. Production repository transaction/rollback tested using embedded PostgreSQL. Session-pooler connectivity, verified TLS, migration and write/read/rollback checks now pass. Real multi-connection concurrency tests remain pending. UI System view must report postgresql before claiming hosted persistence. Use local file demo storage only while cloud connection is pending.

## Phase 5 — actual Webots integration (pending)
Install/pin compatible Webots/Python, select and credit drone/controller, prove takeoff/hover/target/land. Match WORLD_LOCAL_V1 axes and environment footprints. Implement local executor with nonblocking bridge queues. Validate pause hover, command expiry/deduplication, telemetry sequence/epoch, heartbeat, local loss-of-contact landing and restart reconciliation. Repeat flights and save actual accuracy evidence.

## Phase 6 — hosted release (pending)
Long-running Node backend, PostgreSQL, static build, configured HTTPS origin and WSS. Disable demo shortcut; use secure bootstrap credential. Migrate before startup; verify real phone-to-laptop mission, browser refresh, socket reconnect, server restart and DB outage behaviour. Record observed command RTT median/p95 and conditions; target 95% acknowledgements within 2 seconds is not a guarantee. Keep one backend worker until shared sessions/socket routing is designed.

## Phase 7 — final evaluation
Use IMPLEMENTATION.md as the as-built rubric walkthrough. Final diagrams must match code. Present planner -> mission -> pause/resume -> low battery -> land -> saved report. Demonstrate one failure and its test. Distinguish demo from actual Webots until Phase 5 passes. Each member owns one feature end-to-end and explains their contribution plus core system invariants.

## Definition of done
Requirement ID, invariant/contract, code, appropriate passing tests, observed acceptance and current documentation. Do not claim a proposed integration or performance target is completed. Important changes need an ADR. Optional 3D browser streaming begins only after required application and controller acceptance.

### Phase 5 setup progress — 2026-11-16
World/model/grounded sensor baseline now loads on Webots R2025b nightly c85603f. This is partial setup evidence only; keep Phase 5 open until original-example flight, navigation, landing, controller/bridge integration and failure/restart checks pass. See ADR-005 and evidence/phase-1.md.

## Desktop layout acceptance (ADR-006)
Check desktop overview, planner, history, alerts, system and report without scrolling;
verify paginated records and waypoint navigation. Check unsupported small-device
notice. Webots world loading remains distinct from mission-command acceptance.

## Phase 5 local execution update (ADR-007)
Controller/bridge implemented and local trials now recorded in
`evidence/webots-integration.md`. Run Python policy tests, backend socket/SQL tests
and the live Webots acceptance driver. A successful control workflow does not close
navigation-accuracy repetition, restart recovery, deliberate contact-loss tests or
hosted WSS/latency gates. Preserve failed development trials in the evidence.

## FR-16 camera exit gate (ADR-008)
Verify actual 640×360 decoded onboard images; measure rather than assume FPS.
Run real start/pause/resume/land with a camera viewer subscribed, preserve report
and stream measurements. Test protected sockets, malformed/duplicate frames,
revocation, bounded latest-only handoff, stale display, demo-unavailable and tab
cleanup. Confirm viewport remains non-scrolling. No camera storage migrations.

## Textured yard acceptance (ADR-009)
Load the world without asset/UV errors, check H and +X/+Y orientation, view actual
onboard texture details during flight and retain screenshot/report evidence.
Existing mission bounds, collider and stabilization must remain unchanged.

## Exact map acceptance (ADR-010)
Verify pad diameters from shared definition, single shared atlas reference, backend
flight-bound consistency, metre/SVG round trips and outside-area click rejection.
Check the same pads/lanes in Webots and planner and preserve browser evidence.
