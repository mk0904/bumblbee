# ADR-007 — Local sensor-driven Webots executor

Date: 2026-11-16. Status: accepted implementation; acceptance evidence tracked separately.

## Context
ADR-002 dashboard-first delivery now reaches actual simulator integration. The world
already loads a Mavic in ENU. The grounded diagnostic cannot execute missions.
Initial live trials exposed database-induced telemetry backlog and unstable braking.

## Decision
Use the bundled Apache-2.0 Cyberbotics stabilization/motor mixer with project-owned
mission lifecycle and conservative smoothed position/velocity feedback. The Webots
main thread alone accesses sensors/motors. A separate Python socket thread uses
bounded inbound/outbound queues; no network waits occur in the control loop.
Pin local Python 3.11 and websocket-client 1.8.0 in a virtual environment.

Bridge validates the immutable route/frame/bounds and command expiry/state. SQLite
journals accepted command IDs before movement and active flights before motors run.
Duplicate IDs return recorded outcomes. Restart does not resume or blindly replay;
an unfinished local flight blocks new starts pending explicit recovery.

Telemetry uses one outstanding persisted sample and an ordered bounded queue of
state changes. Intermediate same-state readings are coalesced before dispatch;
wire sequence numbers count dispatched samples. Server sends telemetry_ack after
commit. Heartbeats bypass persistence work and prove connectivity only. PostgreSQL
aggregate state is read in one statement instead of sequential table round trips.

Local contact loss requests descent/landing using sensor feedback. Excessive
attitude stops motors and reports FAILED; ground contact alone is not success.
Battery remains explicitly synthetic. No pose writes, supervisor teleportation,
obstacle avoidance, broker, second backend worker or 3D browser streaming.

## Consequences
5 Hz remains an unachieved target on remote SQL; generated samples target 2 Hz and
actual persistence rate depends on storage latency. State transitions are retained.
This small repository still loads aggregate history; long-duration/load scaling
requires a separate persistence design. Automatic reconnect/restart reconciliation,
repeated navigation-accuracy trials and hosted WSS remain release gates.
