# ADR-003: Short-code pairing and Supabase repository

Status: pairing implemented; hosted database connectivity pending.

User requested no login/signup and a four-character code obtained from the Python bridge. Replace password login with a bridge-issued pairing flow. No public registration or password storage is needed.

Bridge host receives one long bootstrap credential during installation, stored in its ignored environment. It authenticates POST /api/pairing/request and prints the returned four-character alphanumeric code. Browser claims it once within two minutes; successful claim creates a random 256-bit HttpOnly session and a CSRF token. Claim endpoint is origin checked and rate limited; code is stored hashed, and five failed claims exhaust its guessing budget. New code supersedes old code. The four-character code is never used as the lasting command credential or a database password. This is scoped to one drone/workspace, not a multi-tenant identity platform.

Demo uses an explicit local-only pairing shortcut. Production disables that shortcut and requires a long bridge token, HTTPS origin, PostgreSQL and Webots mode. Pairing gives access to the installation's one operator principal; any device holding a valid bridge code can control that workspace. Account-based roles are deliberately outside scope.

Supabase is used as managed PostgreSQL behind Express. Publishable key/URL are not SQL credentials. User-supplied connection details were stored only in ignored backend/.env; no secret is committed or returned to the browser. The direct database hostname did not resolve during connection testing. Session pooler hostname/user/port are pending; no hosted migration or successful Supabase connection is claimed. Local file demo storage remains clearly labelled.

The initial schema uses relational mission, waypoint, flight, command, telemetry and alert tables, plus seeded operator/drone identities. JSONB stores aggregate payloads/snapshots with indexed identity/state columns. Repository updates normalized waypoint rows transactionally with mission payload. RLS is enabled with no client policies: the trusted backend database connection is the access path, not direct browser Data API writes. Single-operator bootstrap identity is configuration-based; session/pairing maps are ephemeral and require re-pairing after server restart.

2026-11-16 follow-up: user supplied session pooler details; verified TLS with the public Supabase CA, applied migration 001, verified rollback-safe write/read, and switched runtime to PostgreSQL. Earlier pending-connectivity notes are historical. Real load/concurrency and Webots remain pending.
