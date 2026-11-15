# bumbl.bee — Drone Mission Control

A modern React/JavaScript ground station with a Node.js/Express backend. Plan local-coordinate missions, execute them through a labelled demo adapter, monitor telemetry/alerts, and inspect saved flight reports. Webots is integrated last through a defined external-agent interface.

## Start locally

Node 24 LTS is the target (`nvm use` if available). Node 26 also works in local checks.

```sh
npm ci
npm run dev
```

Dashboard: http://127.0.0.1:5174 — choose **Open demo workspace**. No login or signup. The backend listens on 127.0.0.1:3000. Vite proxies /api and /ws. Port 5174 is deliberate to avoid an existing service on 5173. To change it, update Vite and APP_ORIGIN together.

Demo mode stores records in backend/.data/store.json (when run with the workspace command), with atomic single-process writes. It is explicitly labelled in the UI and is not Webots flight physics. No cloud credentials are required to explore.

```sh
npm run check  # ESLint, backend/domain/protocol/embedded-PostgreSQL tests, frontend build
npm run doctor
```

## Four-character bridge pairing

No accounts are created. Configure the same long random SIMULATOR_TOKEN on backend and bridge host once. Copy backend/.env.example to backend/.env and set your environment; never commit secrets.

```sh
python3 simulator/bridge/pair.py --env-file backend/.env
```

Enter the printed four-character letter/digit code on the dashboard. Code expires in two minutes and works once. Pairing exchanges it for an HttpOnly random session, with origin and CSRF protection. Five failed guesses exhaust a code; endpoints are rate limited. The bridge's long bootstrap credential stays off the frontend. This helper obtains pairing codes only; it does not run a drone controller.

## PostgreSQL / Supabase

Use Supabase as managed PostgreSQL behind Express. The browser does not connect directly to mission tables; a publishable key cannot run SQL migrations.

1. Get a suitable database connection string from Supabase **Connect**. If direct endpoint is unreachable, use the **Session pooler** settings. Use verified TLS and the provider's correct certificate/connection settings.
2. Put DATABASE_URL in ignored backend/.env. Do not use a VITE_ variable for the database password or bridge token.
3. Apply the migration:

```sh
npm run db:migrate
```

4. Restart backend. System page must show **postgresql**, rather than local-file-demo.

The user-provided direct endpoint did not resolve during this session; hosted setup is pending session pooler details. Supabase credentials are not in Git. Do not describe local demo storage or embedded SQL tests as hosted verification.

For local PostgreSQL, if Docker is available:

```sh
docker compose up -d
```

Compose binds PostgreSQL to loopback and initializes the schema on a new volume. Its password is local development only. Set DATABASE_URL to that local database before starting backend. Do not delete a volume to apply future migrations.

Schema includes relational operators, drones, missions/waypoints, flight sessions, commands, telemetry and alerts. JSONB preserves aggregate payloads and flight snapshots. RLS is enabled without browser-client policies; use the trusted backend connection. Single active flight, duplicate command/sample and open-alert constraints are enforced in PostgreSQL.

## Webots integration later

Set SIMULATOR_MODE=webots and configure SIMULATOR_TOKEN. Dashboard shows **offline** until a valid external agent connects. It never silently falls back to demo. Protocol and control responsibilities are in [contracts/protocol.md](contracts/protocol.md). Actual Webots controller, world matching, watchdog landing and reconnect reconciliation remain pending.

In demo mode, disconnect fault injection deliberately suspends test execution. It is not a physics/failsafe demonstration. After server restart, a persisted ongoing session is not resumed: close it as interrupted while disconnected, then reconnect the demo link from System.

## Hosted deployment

Build frontend with npm run build. Backend serves frontend/dist in addition to API/WS. Set APP_ORIGIN to the exact served origin. For local single-server preview use APP_ORIGIN=http://127.0.0.1:3000.

Dockerfile builds static assets and runs one Node process. Production requires NODE_ENV=production, SIMULATOR_MODE=webots, DATABASE_URL, HTTPS APP_ORIGIN and a long SIMULATOR_TOKEN. Run migrations before launch. Use a host supporting long-lived WebSockets behind TLS; no deploy was performed. Session/pairing maps are ephemeral; re-pair after server restart. Do not scale to multiple workers without shared sessions and socket routing.

## Evaluation and design

- [As-built implementation / all 10 rubric items](docs/IMPLEMENTATION.md)
- [PRD and acceptance criteria](docs/PRD.md)
- [Engineering design](docs/ENGINEERING.md)
- [Phased build plan](docs/BUILD_PLAN.md) (order revised by ADR-002)
- [REST OpenAPI](contracts/openapi.json) / [WebSocket protocol](contracts/protocol.md)
- [Decision records](docs/decisions)
- [Coding instructions](AGENTS.md)

Repository is local on codex/project-foundation; no GitHub remote has been configured.
