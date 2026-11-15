# ADR-002: Dashboard/backend first, Webots later

Status: accepted by explicit user direction.

The user changed the delivery order: build the complete dashboard/application repository before integrating Webots. This overrides previous simulator-first milestone instructions in planning documents.

Build a labelled deterministic demo adapter implementing the simulator transport contract. Mission planning, flight lifecycle, command acknowledgements, telemetry recording, alerts and reports operate through backend services; no movement logic belongs in the frontend. Webots mode must show disconnected until an actual authenticated agent connects. Never silently fall back to demo.

Local demo storage may be file-backed so the project runs without cloud credentials. PostgreSQL/Supabase remains the production repository, with actual schema/transactions and integration tests. Demo storage is single-process only and must not be described as production concurrency evidence.

Keep Webots feasibility, host deployment and physical control accuracy as explicitly pending acceptance gates. Finish local UI/server behaviour, contract tests, documentation and deployment configuration first.

Sites skill used for repository dashboard workflow; this is local repository implementation, not registration/publication. Express and persistent simulator sockets are retained as selected by user.
