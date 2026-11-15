# Project implementation instructions

## Purpose
Build a small, working drone mission-control platform connected to Webots. Demonstrable software and systems engineering is the primary objective. The assessment rubric is mandatory: see docs/ENGINEERING.md.

## Read before implementation
- docs/PRD.md: scope, requirements, acceptance criteria, milestones.
- docs/ENGINEERING.md: architecture, LLD, contracts, database, testing, rubric traceability.
- docs/IMPLEMENTATION.md: actual classes, implemented APIs/schema, rubric mapping and outstanding integration gates.
- docs/BUILD_PLAN.md: implementation order, milestone exit evidence, verification and evaluation checklist.
- Record changes to approved scope or architecture in those documents and a decision record. Initial documents describe proposed design, not implemented capabilities.

## Stack and boundaries
- React + JavaScript frontend; Node.js + Express in plain JavaScript backend; PostgreSQL with pg and versioned SQL migrations; Python Webots controller/bridge.
- Modular monolith backend, initially one process/worker; local Webots runtime. Do not add microservices, a broker, or multiple workers without an explicit design decision.
- Domain objects must not depend on Express, Webots, pg, sockets, or UI libraries. Use JSDoc contracts, injected dependencies, runtime validation and contract tests at external boundaries. No TypeScript in frontend or backend.
- Webots control loop owns motor/sensor access and stabilization. Network I/O must not block it. Pass validated messages through bounded queues.
- Never claim a command executed before simulator evidence. Track timeout as unknown outcome, not automatic rejection.
- Mission execution uses an immutable snapshot and explicit coordinate frame. Keep connection freshness separate from flight state.

## Design and code discipline
- Trace features to requirement IDs and meaningful tests. Maintain diagrams and schema when implementation changes.
- Enforce legal state transitions in domain methods, not route handlers. Use composition by default and inheritance only for genuine substitutability.
- Demonstrate SOLID using actual code; do not create patterns/classes purely to satisfy a count. No business logic in controllers or React components.
- Validate at API and simulator boundaries. Use transactions and database constraints for concurrency; an in-memory lock alone is insufficient.
- Idempotency requires durable identifiers and reconciliation. Do not promise exactly-once execution across restarts.
- No login/signup: short-lived four-character alphanumeric bridge pairing creates a long random protected browser session. Keep bridge bootstrap credentials server/host-side; rate-limit and expire pairing. Authenticate operator session and simulator separately; scope simulator credentials to a drone. Never commit secrets or put simulator credentials in frontend code.
- Use structured logs with flight/command IDs; never log credentials.
- Keep dependencies pinned/locked once compatibility is verified. Match the bridge Python runtime to the selected Webots release.

## Verification and delivery
- User-directed order: complete dashboard/backend first against an explicitly labelled demo adapter, then connect and verify Webots. Demo operation never counts as proof of flight physics or actual Webots integration. See ADR-002.
- Test state transitions, mission validation, command deduplication, concurrent start, reconnect, and telemetry ordering.
- Use PostgreSQL integration tests for actual database constraints. Test doubles verify contracts but do not replace Webots end-to-end evidence.
- Every finished feature must have matching contracts/design, relevant passing checks, and a demonstrable acceptance criterion.
- Do not silently add ML, obstacle avoidance, multi-drone execution, GIS, or 3D streaming to MVP.
