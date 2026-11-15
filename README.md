# Drone Mission Control & Simulation Platform

A hosted mission-control application connected to a local Webots drone. Main objective: demonstrate the complete SDSE rubric through a small, reliable workflow.

## Current state

Phase 0 foundation: npm workspaces, React/JavaScript entry point, Express health endpoint, HTTP boundary tests, lint/build scripts, environment checker and simulator feasibility checklist. No flight controls, WebSocket integration, database schema or simulated movement are implemented yet.

## Local setup

Use Node 24 LTS (`nvm use` if nvm is installed), then:

```sh
npm ci
npm run doctor
npm run check
```

In two terminals:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

Open the Vite URL printed by the second command. Backend defaults to http://127.0.0.1:3000/api/health. The frontend uses a local development proxy; it does not need database credentials. Backend health indicates process liveness only.

Optional backend configuration: copy backend/.env.example to backend/.env. Never commit secrets. Supabase/PostgreSQL connection will be configured server-side when persistence is implemented; the application currently makes no database calls.

## Design and implementation order

- [PRD](docs/PRD.md): scope, FR/NFR and acceptance criteria.
- [Engineering](docs/ENGINEERING.md): architecture, LLD, SOLID, patterns, database and rubric mapping.
- [Build plan](docs/BUILD_PLAN.md): phased work and exit gates.
- [Coding instructions](AGENTS.md).
- [Simulator Phase 1](simulator/README.md): next implementation gate.

Next: prove takeoff/hover/target/landing locally before remote controls or UI polish. Browser 3D streaming is optional; first use the native Webots window.

Git remote is not configured. This workspace is a local repository until a remote is chosen.
