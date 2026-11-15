# Dashboard/backend verification

Date: 2026-11-16 (Asia/Kolkata).

## Automated evidence
- Target Node v24.22.3: npm run check passed.
- 23 backend tests passed: domain invariants, immutable route snapshots, lifecycle/early landing, idempotency/concurrent starts in local repository, alerts/freshness, duplicate/final/out-of-order readings, late command completion, file rollback/reopen, pairing expiry/guess budget/single use, session/CSRF, local-origin rules and external-agent socket command/telemetry exchange.
- Embedded PostgreSQL tests execute actual migration SQL and production repository queries, including foreign keys, active-flight uniqueness, command uniqueness, normalized waypoint updates and transaction rollback. They do not prove hosted multi-client concurrency or performance.
- 4 React component workflow tests passed: demo pairing/no password, four-character normalization/claim, waypoint editing/reordering/save payload, and in-page interrupted-session confirmation.
- Production Vite build passed; chart code is lazy-loaded separately (approximately 275 kB main JS and 367 kB chart JS before gzip at this build).
- Python bridge pairing helper compiled and obtained a correctly shaped code from the actual local backend. Long bridge credential and generated code were not printed in test logs.
- OpenAPI JSON parsed with 16 documented REST paths.

## Visual and browser evidence
- Early browser workflow created a real persisted three-waypoint mission, started backend demo execution, received telemetry and acknowledged pause.
- After requested UI/identity revision, desktop and 390px mobile pairing views were captured: screenshots/pairing-desktop.png and screenshots/pairing-mobile.png.
- Full final interactive browser regression is incomplete: an earlier native confirmation blocked browser interaction. Current code replaces native confirms with accessible in-page dialogs; the new flow is covered by React component tests. Do not claim a complete final-version browser acceptance run from these screenshots.

## External limits
- Supabase direct database hostname did not resolve from this environment. HTTPS Data API responded, but that does not establish SQL connectivity. Session pooler details requested; no remote migration performed.
- Webots is not installed/verified. External socket test client and kinematic demo are not actual Webots flight proof.
- Production Docker configuration is provided but was not built/run here; hosted TLS/deployment and real network latency are pending.
- No Git remote or public deployment configured. Secrets remain only in ignored local environment.
