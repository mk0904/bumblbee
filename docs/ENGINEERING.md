# Engineering reference

The root README contains architecture, object, sequence, state and database diagrams, technology choices and contracts. This document maps the implementation to the SDSE assessment requirements.

## Layering and contracts

| Layer | Source | Responsibility |
|---|---|---|
| Domain | backend/src/domain/model.js | Mission/Waypoint validity, FlightSession transitions, FlightCommand outcomes, alert strategies |
| Application | backend/src/application/services.js | Mission save/archive, start/action/reconcile, telemetry/incident handling and reports |
| Infrastructure | backend/src/infrastructure | File/Postgres repositories, auth, adapter selection and runtime composition |
| Interfaces | backend/src/interfaces | Runtime HTTP validation, session/CSRF/Origin, simulator/dashboard/camera WebSockets |
| Presentation | frontend/src/features and components | Forms, selection and rendering; no stabilization or authoritative motion |
| Simulator | simulator/controllers/mission_control | Physics loop, incoming commands, sensor evidence and independent network/image queues |

Repository dependencies expose init/read/transact/close; adapter dependencies expose send/close plus connection/mode state. Services receive these dependencies. JSDoc, runtime checks and boundary tests replace TypeScript contracts.

## Rubric traceability

| Assessment item | Concrete evidence |
|---|---|
| Requirements, actors and use cases | PRD.md; README operator workflow and envelope |
| Class design and multiplicities | README class diagram; Mission owns0–20 immutable Waypoint values; mission-to-flight snapshots1:N |
| Abstraction and encapsulation | Private aggregate data; domain methods; SimulatorAdapter/AlertRule abstractions |
| SOLID | Separate domain/services/IO; independently extensible alert rules/adapters; injected repository/gateway; narrow use-case methods; contract tests for substitutions |
| Patterns | Factory for adapters, Strategy for incidents, Adapter for simulator boundary, Observer for committed-change notifications |
| Sequence/activity/state | README start sequence and flight state graph |
| API/interface design | contracts/protocol.md, OpenAPI reference, executable Zod schemas and service signatures |
| Database design | migrations001/002; README ER diagram; keys, indexes, checks and partial uniqueness |
| Validation/errors/concurrency | Revision conflict, active-flight unique index, idempotency hash conflict, ordered telemetry, unknown timeout, SQL rollback tests |
| Working implementation | npm run check, Python unittest, retained actual Webots flight/camera evidence |

## Important invariants

- A flight starts from a copied mission revision and retains its values.
- Command accepted/completed status follows simulator events, never a successful HTTP response alone.
- One nonterminal flight per drone is enforced by PostgreSQL, not an in-memory lock alone.
- Duplicate request key with changed payload is a conflict. Duplicate telemetry is fenced by flight/epoch/sequence.
- Live channel connectivity does not establish fresh sensor data or a landed drone.
- Webots sensor/motor calls remain on the control-loop thread; queues are bounded.
- Camera frames are transient and isolated from durable telemetry/command traffic.
- Normal route completion requires sensor-confirmed landing; interrupted/failed records are not relabelled success.

## Design decisions

Read accepted ADRs in decisions/. Later decisions override earlier proposals. In particular permanent pairing is ADR-014, leg speed is ADR-015-mission-leg-speed, canonical map is ADR-010, actual execution is ADR-007 and camera is ADR-008. ADR-002 records development order, not a runtime dependency. Public deployment, multiworker sessions and uncertain-flight recovery remain outside verified local operation.
