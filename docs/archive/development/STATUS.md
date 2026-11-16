# Current implementation status

## Implemented locally
- React/JavaScript neutral charcoal dashboard with responsive overview, mission editor, saved missions, history, reports, alerts and system view.
- Click/drag local XY mission planning, altitude/order editing, save/revision/archive.
- Node.js/Express domain/services/repository architecture and boundary validation.
- Labelled backend demo adapter: waypoint motion, pause/hover/resume/land, telemetry, synthetic battery.
- Durable local file demo storage and PostgreSQL repository with SQL migration, foreign keys/indexes/constraints/RLS.
- Command idempotency, immutable flight snapshots, lifecycle validation, stale/low-battery incidents and acknowledgement.
- Four-character alphanumeric bridge pairing; no login/signup. Short code exchanges for long session, CSRF/origin checks and rate limits.
- Python standard-library pairing helper; authenticated external-agent socket interface and protocol docs.
- Automated domain/API/storage/demo/protocol/embedded-PostgreSQL checks; CI and Docker configuration.
- As-built diagrams and rubric guide: IMPLEMENTATION.md.

## Pending external integration
- Supabase session-pooler connection verified with provider CA and full TLS validation; schema migrated, RLS checked, write/read/rollback verified, and running dashboard reports postgresql storage. See evidence/supabase-connection.md. Real concurrent-client/load evidence remains pending.
- Webots is not installed/verified; actual flight controller, world/axis matching, watchdog landing and agent restart reconciliation remain pending.
- TLS hosting, real network latency, real PostgreSQL multi-connection/load tests, member assignments and final acceptance evidence.
- Demo disconnect suspends kinematic test execution; it is not a Webots loss-of-link physical failsafe.

## Secrets and publication
User-supplied Supabase details and generated bridge bootstrap credential reside only in ignored backend/.env. Database password is not used by frontend. No GitHub remote or public deployment has been configured.

Verification: 24 backend and 4 frontend tests, lint and production build passed on Node 24.22.3. See evidence/dashboard-build.md for observed browser checks and explicit verification limits.

Console revision: reference-inspired four-panel flight deck, shared charcoal theme across screens, fixed responsive navigation with active states/tooltips, and coalesced demo ticks. Latest checks: 25 backend + 6 frontend tests, lint and production build pass. Browser checks and screenshots: evidence/console-redesign.md.

## 2026-11-16 — actual local Webots integration
Local real-sensor mission execution, normal route completion and authenticated
start/pause/resume/land now have simulator + SQL reports. See
evidence/webots-integration.md for passing flight IDs, retained failed trials,
checks and limitations. Recorded acceptance latency 1.77–2.20 s and telemetry
0.78 Hz do not meet the faster NFR targets. Hosting/restart recovery/repeated
accuracy and intentional network-fault trials remain pending.

## 2026-11-16 — FR-16 onboard camera
640×360 protected JPEG feed implemented and browser decoded; 4.78 FPS measured in
a 45-second local observation with real control workflow passing concurrently.
27 backend + 11 frontend + 6 Python tests pass. See evidence/camera-integration.md.
No camera persistence/recording or hosted-network media performance claim.

## 2026-11-16 — textured yard
Local concrete/asphalt/pad texture added under ADR-009. Actual onboard view now
shows surface markings; full start/pause/resume/land passed again, report
3937f6ea-ce07-45b9-b77b-ea10fe67c0a3. See evidence/textured-yard.md. Physics unchanged.

## 2026-11-16 — canonical scaled planner map
ADR-010: home diameter 1.5 m, target pads 1.2 m; Webots and every planner/preview
use the same shared atlas and extents. Saved P1 mapped route (8,6,3); 28 backend /
13 frontend tests, lint/build pass. See evidence/canonical-map.md.
