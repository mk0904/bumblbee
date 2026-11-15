# Drone Mission Control & Simulation Platform

Version: 0.2 — proposed implementation baseline, not a statement of completed work.

## 1. Objective
Build a hosted mission-control dashboard connected to a drone simulated in Webots on a separate computer. Demonstrate requirements engineering, object-oriented low-level design, distributed communication, database integrity, failure handling, and a tested end-to-end implementation.

Success means an evaluator can plan a mission, execute it in a visible 3D world, pause/resume, observe alerts, land, and inspect persisted flight results. A small, correct workflow takes priority over feature count.

The supplied assessment notice mentions the first week of November but does not establish a usable future deadline. Plan by milestone until the team confirms its current schedule. Team size and member allocation are also pending.

## 2. Product behaviour and limitations
- Dashboard can be opened from any authenticated browser with connectivity to the hosted backend.
- Webots and its bridge must be running on the simulator computer. Closing that computer stops simulation availability.
- Bridge initiates an outbound authenticated secure WebSocket connection. No public inbound port on the simulator computer is required for this proposed command path.
- Telemetry consists of simulated sensor readings and explicitly labelled derived/synthetic measurements.
- Mission commands are near-real-time supervisory requests. Motor stabilization runs locally, independent of internet latency.
- 3D viewing is initially the local Webots window. A second hosted 3D viewer is optional and requires separate streaming/deployment work; command/telemetry transport does not transmit the 3D scene.
- Webots supplies simulation infrastructure, not automatic execution of our mission format. A compatible waypoint-capable controller must be adapted or implemented and verified first.

## 3. Actors and use cases
| Actor | Use cases |
|---|---|
| Operator | Sign in, create/edit mission, start flight, pause/resume, land, monitor, acknowledge alert, inspect history |
| Simulator agent | Authenticate, register session, accept/reject commands, execute mission, report telemetry/events, reconcile after reconnect |

MVP has one operator role, one configured drone, one active flight, and multiple read-only browser views of that flight. Any authenticated authorized operator can issue commands; conflicting requests are serialized/rejected by server-side rules. No administrator UI or approval workflow.

## 4. Scope
### Required
1. Simple 3D world, one simulated drone, one landing area, configured flight bounds.
2. Local-coordinate mission editor, ordered waypoints, altitude targets, validation, saved drafts.
3. Start, pause, resume, land and command-status display.
4. Position, altitude, speed, attitude, battery estimate, current waypoint, reported state, freshness.
5. Low-battery and stale-telemetry alerts.
6. Flight recording, history, route/chart view, basic report.
7. Authentication, explicit errors, reconnect handling, repeatable demo.

### Deferred
Physical drones, MAVLink/PX4 integration, AI/ML, collision avoidance, swarms, schedules, camera feeds, realistic battery chemistry, public registration, geographical mission maps, hosted Webots infrastructure, required browser 3D streaming.

## 5. Functional requirements and acceptance
| ID | Requirement | Observable acceptance criterion |
|---|---|---|
| FR-01 | Authenticate operator | Protected REST/WS access fails without valid credentials; logout ends browser access |
| FR-02 | Create and edit missions | Name and ordered waypoints persist and reload; revision changes on edit |
| FR-03 | Validate mission | Reject empty route, non-finite values, duplicate sequence, and targets outside configured bounds; return field-specific reasons |
| FR-04 | Register simulator | Valid scoped credential establishes one active session for configured drone; stale sessions cannot send accepted events |
| FR-05 | Start flight | Connected grounded drone and valid mission produce immutable snapshot, flight record, identified command; offline/conflicting requests fail clearly |
| FR-06 | Execute mission | Controller takes off, reaches each target within configured horizontal/vertical tolerance and dwell period, then lands |
| FR-07 | Pause/resume | Pause hovers locally while simulation time and battery model continue; resume continues remaining route |
| FR-08 | Land | Valid airborne states allow landing, cancel remaining route, and report completion only after controller confirms touchdown |
| FR-09 | Track commands | UI distinguishes pending, accepted, completed, rejected, failed, unknown outcome; timeout alone does not mean action failed |
| FR-10 | Live telemetry | Updated values include source simulation time, backend receipt time, sequence, flight and simulator-session IDs |
| FR-11 | Show freshness | After configured silence display stale readings and connection warning rather than current values |
| FR-12 | Alert | Threshold breach opens low-battery alert once per active incident; repeated readings update incident rather than flooding UI |
| FR-13 | Persist history | Refresh/reconnect restores current flight; finished/interrupted flights remain queryable |
| FR-14 | Report | Show duration, route, maximum relative altitude, battery change, alert list and completion reason; flag missing telemetry |
| FR-15 | Reconnect | Agent reports session/active-flight/last-command state; backend reconciles instead of starting a new mission automatically |
| FR-16 | Simulator test controls | Explicitly labelled demo controls lower synthetic battery or interrupt network publishing; never masquerade as normal sensors |

Proposed environment defaults: local horizontal square +/-50 metres, altitude 2–15 metres, 1–20 waypoints, horizontal tolerance 1 metre, vertical tolerance 0.5 metre, dwell 1 simulation second. These are configurable experimental starting values, not proven controller capability; feasibility tests must confirm or revise them.

## 6. Mission and flight semantics
- Draft may have zero waypoints; executable mission must satisfy configured limits.
- Execution uses a saved immutable snapshot including coordinate-frame/world ID and limits, not the mutable mission.
- Normal flight: STARTING -> TAKING_OFF -> EXECUTING -> LANDING -> COMPLETED.
- EXECUTING <-> PAUSED. LANDING may be requested from TAKING_OFF, EXECUTING or PAUSED.
- FAILED means positively reported execution failure. INTERRUPTED means execution cannot be confirmed/recovered, with an explicit reason. Do not infer a physical outcome solely from disconnection.
- Connection status is orthogonal: CONNECTED, STALE, DISCONNECTED. Last reported flight state remains labelled stale during loss of contact.
- Start command completes when mission execution begins; mission completion is a separate flight event. Pause/resume/land complete when their requested effect is confirmed.
- Demo TAKEOFF command belongs to the integration spike; full MVP start performs takeoff as part of mission execution.

## 7. Failure policy
- Missing telemetry for 3 wall-clock seconds marks it stale; 5 seconds without heartbeat marks session disconnected.
- Locally, loss of backend contact for 10 wall-clock seconds requests controlled landing. Network thread measures the watchdog; Webots control loop performs the action.
- A paused Webots engine cannot physically execute landing until simulation resumes; show this limitation in the demo and documentation.
- On unknown command outcome, reconcile before retrying a non-idempotent action. Never automatically replay expired movement commands after reconnect.
- Simulator process restart creates a new epoch/session. Previous active flight becomes reconciliation-required; no automatic continuation.
- Backend restart may lose in-memory connections; persisted flight/commands remain and reconnect reconstructs transport state.
- Store transient telemetry gaps explicitly; bounded buffering cannot guarantee loss-free capture during long outages.

## 8. Measurable quality targets
These are acceptance targets to measure, not claimed performance. Normal demo load: one simulated drone, 5 telemetry updates/second, up to 3 browser viewers, real-time Webots mode.

| ID | Quality | Target / measurement |
|---|---|---|
| NFR-01 | Freshness | 95% of dashboard updates rendered within 1 second of backend receipt; instrument receipt and render events |
| NFR-02 | Responsiveness | 95% of connected-state commands acknowledged within 2 seconds of dispatch under demo network conditions |
| NFR-03 | Timing | Telemetry about 5 Hz in real-time mode; stabilization follows controller timestep, never network frequency |
| NFR-04 | Integrity | Concurrent starts produce at most one active flight per drone; prove with DB integration test |
| NFR-05 | Recoverability | Browser reload restores active flight; bridge reconnect requires reconciliation |
| NFR-06 | Security | TLS in hosted setup, scoped simulator credentials, authenticated/authorized commands, no committed secrets |
| NFR-07 | Maintainability | Domain tests run without browser, database, internet or Webots |
| NFR-08 | Reproducibility | Clean setup instructions, locked dependencies, recorded Webots/world/controller version |
| NFR-09 | Observability | Correlated command/flight/session IDs and structured failure reasons; credentials redacted |

Do not subtract unsynchronized laptop/browser clocks to claim end-to-end latency. Use backend-observable round-trip measurements and instrumentation, and distinguish simulation time from wall time.

## 9. UX requirements
Screens: sign-in; mission list/editor; live mission dashboard; flight list/report. Use a clickable top-down local XY environment map matching Webots origin, scale, orientation and footprint metadata. Place/move/reorder waypoints visually and edit altitude; coordinates are stored underneath. This is not a geographic/GPS map. Show pending commands, disabled illegal controls, explicit error reasons, telemetry age, synthetic battery label, and simulator availability. On narrow screens preserve basic flight status and landing action.

## 10. Stack baseline
| Layer | Choice | Purpose |
|---|---|---|
| Dashboard | React + JavaScript + Vite | Web UI with JSDoc contracts, runtime boundary validation and static build |
| UI/plots | Plain CSS or CSS modules; Recharts | Small styling surface and telemetry charts; SVG local XY route editor |
| Backend | Node.js + Express + ws + Zod | Validated REST/WS boundaries and application orchestration |
| Persistence | PostgreSQL + pg + node-pg-migrate | Constraints, transactions, repository implementations and migrations |
| Simulator | Webots + Python controller | Local 3D simulation, sensors and flight-control loop |
| Bridge | Python WebSocket client + bounded queues | Outbound command/event transport without blocking control |
| Tests | Node.js test runner, Supertest, pytest (simulator), Vitest, React Testing Library, Playwright | Domain, integration, UI behaviour and workflow checks |
| Quality | ESLint, Ruff and mypy (simulator) | Formatting/linting and Python type checks |
| Development | Git, Docker Compose for database/backend | Repeatable application environment; Webots stays native initially |
| Hosting | Static frontend + long-running TLS backend + PostgreSQL | Provider selected after WebSocket/restart feasibility check |

Start with a supported Python 3 runtime compatible with the selected Webots release; Python 3.11 is a candidate, not an unverified pin. Pin exact versions after the first compatibility spike. Use one backend worker initially. In-memory WebSocket ownership will not transparently work across multiple workers.

Why JavaScript: frontend and backend use the team’s preferred language, with Express for HTTP, ws for WebSockets, and Zod for runtime validation. Demonstrate OOP with classes, private fields, composition, injected dependencies and JSDoc contracts verified by tests. Python remains only in the Webots controller/bridge. Shared JSON contracts cross the language boundary. Use a supported Node.js LTS release, pinned during setup; no TypeScript.

## 11. Delivery milestones and gates
| Gate | Deliverable | Exit evidence |
|---|---|---|
| M0 | Requirements and feasibility assumptions | Team understands scope, coordinate frame and controller risk |
| M1 | Local flight | Repeatable takeoff, hover, target movement and land; record controller/model versions |
| M2 | Local vertical slice | Browser command -> backend -> bridge -> Webots -> acknowledged state and altitude in browser |
| M3 | Hosted round trip | Phone browser controls laptop simulation via hosted backend; credentials/TLS verified |
| M4 | Mission product | Mission CRUD, snapshots, waypoint execution, flight lifecycle and persistence |
| M5 | Reliability | Duplicate command, stale telemetry, reconnect, browser reload and concurrent-start evidence |
| M6 | Evaluation | Flight report, tests, diagrams, traceability and per-member walkthrough |

M1 is a feasibility gate. Do not build a polished dashboard before the selected Webots controller can reliably navigate targets. If it cannot, revise scope or evaluate a flight-stack-backed simulator through a recorded design decision.

## 12. Demonstration and definition of done
Demo: create three-waypoint route -> start -> watch 3D motion and telemetry -> pause/resume -> inject low battery -> land -> open report. Then show one failure scenario and its corresponding test/design.

A feature is done when its requirement acceptance passes, relevant tests pass, actual implementation matches the class/API/schema diagrams, errors are observable, and evidence is saved. No undocumented manual database repair should be needed for the demo.

## 13. Open decisions
- Team size, assignments, actual evaluation date and available development time.
- Simulator machine OS/GPU and Webots release/model/controller compatibility.
- Confirm navigation accuracy and local safety policy in M1.
- Hosting provider and persistent WebSocket support in M3.
- Optional browser 3D streaming only after all required gates.

## Sources informing stack/integration
- Webots controller programming: https://github.com/cyberbotics/webots/blob/master/docs/guide/controller-programming.md
- Webots installation: https://github.com/cyberbotics/webots/blob/master/docs/guide/installation-procedure.md
- Webots streaming (optional): https://github.com/cyberbotics/webots/blob/master/docs/guide/web-streaming.md
- Express: https://expressjs.com/
- WebSocket library: https://github.com/websockets/ws
- React documentation: https://react.dev/learn
- PostgreSQL client: https://node-postgres.com/
- Migrations: https://salsita.github.io/node-pg-migrate/
