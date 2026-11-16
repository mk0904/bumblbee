# Supabase connection verification

Date: 2026-11-16, Asia/Kolkata.

- User supplied the shared session-pooler URI; password remains only in ignored backend/.env.
- Pooler resolved and was reachable. Default trust stores initially rejected its private CA chain.
- Downloaded the public Supabase Root 2021 CA from the provider's HTTPS download endpoint. Configured it for this PostgreSQL client only, with verify-full chain and hostname validation. No rejectUnauthorized:false or global TLS bypass.
- Verified SELECT connectivity to database postgres.
- Confirmed no existing application tables before running initial migration 001.
- Created application schema and checked all nine application tables have RLS enabled.
- Verified a temporary mission insert/read and rolled back that test transaction; no verification mission retained.
- Enabled DATABASE_URL for the running backend after schema verification. Authenticated dashboard API returned HTTP 200 and storage=postgresql, execution adapter=demo, missions=0.
- Earlier local-file demo records remain unchanged; no automatic data import was performed.
- 24 backend tests plus 4 frontend tests, lint and frontend production build passed after connection configuration changes.

Pending: actual Webots integration, hosted app deployment, real concurrent-client/load evidence and latency measurements. Database connectivity does not prove those capabilities.
