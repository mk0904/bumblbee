# ADR-001: JavaScript workspace and simulator boundary

Status: accepted for repository foundation; simulator feasibility pending.

Context: evaluation requires explicit LLD and working system; user selected React/JavaScript and Node.js/Express without TypeScript.

Decision: npm workspaces for frontend/backend, JavaScript ES modules, Express HTTP adapters and Node test runner. PostgreSQL repositories will be implemented through pg with versioned SQL migrations. Supabase is the candidate hosted PostgreSQL provider; provisioning and credentials are not required for this phase. Python is limited to Webots control/bridge. Default server binds loopback until authentication is implemented.

Alternatives: Python backend (rejected by user preference); direct browser database mission writes (would bypass application invariants); microservices (unnecessary operational scope).

Consequences: contracts cross JS/Python via versioned JSON. One backend process initially; cloud provider does not own mission rules. No domain classes or patterns are added solely for scaffolding.

Runtime: target Node 24 LTS via .nvmrc; initial verification also uses installed Node 26. Exact dependency versions are pinned by package-lock.json. Webots and compatible Python version remain a Phase 1 gate.
