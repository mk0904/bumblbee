# Operational verification checklist

This replaces the phased project-construction plan. The historical plan is archived in archive/development/BUILD_PLAN.md.

## Before operating

- Install locked dependencies and apply all SQL migrations.
- Confirm correct backend origin, PostgreSQL TLS settings and matching host-side simulator credential.
- Start backend/frontend, then Webots with the pinned Python environment.
- Verify simulator connection and camera state; inspect uncertain prior sessions before starting a new flight.

## Release checks

- npm run check: lint, backend/frontend tests, production asset build.
- Python unittest discover under simulator/tests.
- Confirm desktop geometry, readable light/dark contrast, visible inputs and bounded internal scrolling.
- Verify selected mission/revision, input boundaries, default/per-leg speed and explicit start.
- Exercise start, pause, resume, land and report with real Webots; retain sensor evidence.
- Check missing/stale telemetry, invalid auth, deduplication, concurrent start, SQL rollback and ordered samples.
- Treat UNKNOWN outcomes and incomplete recordings explicitly.

## Qualification boundaries

Short local successful flights do not establish arbitrary-route reliability, exact-speed tracking, all-template stability, deliberate network-fault recovery, public deployment security or multi-client load performance. These remain additional qualification work, not hidden completed features.
