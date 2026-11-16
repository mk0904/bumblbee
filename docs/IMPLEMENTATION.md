# Implementation reference

This document describes the current code. The root README is the full system guide; PRD.md defines scope and ENGINEERING.md maps assessment criteria.

## Domain and services

- **Waypoint:** finite X/Y/altitude/speed, local bounds, altitude2–15m and speed0.2–2m/s; ordered sequence; immutable value.
- **Mission:** private copied record, name/route validation, revision checks, archive and copied execution snapshot. Defaults apply when creating points; old unspecified speeds normalize to1m/s.
- **FlightSession:** explicit legal transitions and allowed supervisory commands.
- **FlightCommand:** request IDs/hashes, acceptance/completion/failure/rejection/cancellation and UNKNOWN timeout handling.
- **AlertEngine:** composed LowBatteryRule and StaleTelemetryRule; persisted incident lifecycle.
- **MissionService / FlightService / TelemetryService / ReportService:** use-case orchestration with injected repository/gateway and change publication.
- **AuthService:** configured reusable code, random session/CSRF tokens, cookie/bridge checks and rate budget. Browser sessions are memory-resident.

## Persistence

PostgresRepository stores normalized relational attributes and complete JSONB aggregates under transactions with a scoped advisory lock. Database indexes/constraints protect active-flight uniqueness, request/sample deduplication and unresolved incident uniqueness. Migration002 adds speed_mps. FileRepository is an atomic single-process fallback for explicitly labelled demo operation.

## Frontend

- Console: square canonical map, camera, compass/ruler stack, eight2×4 tiles, altitude history and selected-plan controls.
- Planner:4:6 library/editor split; square uncropped saved previews; click-to-select; independent edit/archive icon tray; bounded square editing map and matching-width details form; scrollable waypoint list with inline border-label numeric controls.
- History/report: readable records, summary tiles, charts, command/incident details and JSON export. Missing/gapped evidence remains visible.
- System & alerts: single screen with connection tiles, incident acknowledgement and runtime details.
- Light/dark styles; reusable8px radius. Fixed desktop workspace with intentional internal scroll regions and hidden scrollbar chrome.

## Simulator

MissionController uses GPS/IMU/gyro and propeller mixing at the world's8ms step. Position control transforms into measured body coordinates. Route yaw is shortest-angle/slew-limited; pause captures current position/heading. Incoming-leg speed limits desired horizontal velocity and approach slows near target. Landing and attitude guards use sensor evidence.

BridgeTransport owns network IO, bounded queues and telemetry acknowledgement flow. SQLite journals command IDs and active flight state. CameraStream copies frames from the simulation loop and converts/transmits outside it, keeping only the latest image. An uncertain prior local flight blocks new starts.

## Identity and contracts

shared/config/drone.json maps internal drone-01 to display/access code BMBL. Code is reusable and does not expire; session and simulator credentials remain separate. This is one installation, not a drone registry. Protocol details are maintained under contracts/; API request schemas are executable in create-app.js.

## Verification

Run npm run check and Python unittest from README. Tests cover domain rules, PostgreSQL behavior, APIs, sockets, camera contracts, UI workflows and controller policy. Actual flight/camera reports remain under evidence/; retained failed trials document earlier defects and are not acceptance passes. Latest code check totals are reported by the test runner rather than maintained as a static historical count here.
