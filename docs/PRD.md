# Product requirements

This is the current product scope. Setup, architecture and interfaces are documented in the root README. Historical proposals and delivery chronology are archived under archive/development.

## Purpose and actors

bumbl.bee provides a desktop mission-control workspace for one Webots drone. The operator plans and supervises flights; the simulator agent executes validated requests and reports sensor evidence. The backend owns durable records and supervisory state. The browser never owns stabilization or simulated position.

## Functional requirements

| ID | Requirement | Acceptance |
|---|---|---|
| FR-01 | Installation-code entry | Permanent configured four-character code establishes a random protected browser session; invalid attempts are limited |
| FR-02 | Mission library | Saved plan map/title tiles, selection, edit and archive; selection returns to console without starting flight |
| FR-03 | Mission editor | Click/drag and numeric X/Y/altitude/speed editing, ordered list, defaults and revision-checked saving |
| FR-04 | Simulator connection | Separate credential and drone/epoch handshake; offline is explicit and never silently becomes demo |
| FR-05 | Start mission | Immutable mission revision snapshot; one active flight per drone; duplicate requests reconcile |
| FR-06 | Local execution | Webots sensors and motor control execute waypoints without UI-generated motion |
| FR-07 | Pause | Current-position hold, acknowledged result, measured flight state |
| FR-08 | Resume | Continue remaining mission from paused state |
| FR-09 | Land | Current-position descent; completion requires touchdown evidence |
| FR-10 | Telemetry | Position, altitude, ground speed, attitude, battery estimate, waypoint and simulation time |
| FR-11 | Freshness | Connection and stale telemetry remain distinct from flight state; unavailable readings do not imply successful execution |
| FR-12 | Incidents | Low battery and stale telemetry rules, acknowledgement and history |
| FR-13 | History/report | Durable flight overview, charts, route, commands and incidents |
| FR-14 | Export | JSON download of recorded report |
| FR-15 | Failure/recovery | Durable command IDs, expiry, unknown outcomes, epoch/ordering fences and explicit recovery limitations |
| FR-16 | Camera | Separate authenticated latest-frame JPEG transport with waiting/live/stale/disconnected states |
| FR-17 | Speed | Default and incoming-leg speed0.2–2m/s stored in snapshot and validated through controller boundary |
| FR-18 | Templates | Six bounded editable predefined routes; no automatic launch |

## Supported operating envelope

One configured drone; one backend process; local120m square world, flight X/Y±50m, altitude2–15m, up to20 waypoints. Desktop viewport≥1100×650 CSS pixels. Fixed page with internal scrolling in mission library, waypoint list, history/incidents/report records; scrollbars hidden. Light and dark presentation use a shared8px corner token.

## Quality attributes

- Domain invariants and transaction/constraint-backed concurrency take priority over UI assumptions.
- Network and camera work cannot block the Webots motor/sensor loop.
- Authentication, Origin/CSRF, validated external contracts and bounded queues apply at their boundaries.
- No exactly-once claim across crashes; unconfirmed movement remains unknown.
- Generated telemetry target2Hz and camera target5FPS are capacities, not observed delivery guarantees. Measured latency and qualification limits are documented in README/evidence.
- Code and diagrams must describe implemented behavior; regression checks accompany meaningful contract changes.

## Exclusions

Physical drones, MAVLink/PX4, GIS, multi-drone execution, obstacle avoidance, ML, video persistence, hosted simulator/3D streaming and public registration are outside this product scope. Public multi-user security and automatic restart recovery require additional design.
