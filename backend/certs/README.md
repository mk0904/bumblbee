# Supabase connection CA

supabase-root-2021.crt is a public CA certificate, not a private key or application credential. It is scoped to the PostgreSQL client through DATABASE_CA_CERT; no system/browser trust settings are changed.

Source (downloaded over verified HTTPS): https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Supabase's verified-TLS guidance: https://supabase.com/docs/guides/platform/ssl-enforcement

Subject: Supabase Root 2021 CA, Supabase Inc.
Validity: 2021-04-28 through 2031-04-26.
SHA-256 fingerprint: 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA.

Set DATABASE_CA_CERT=certs/supabase-root-2021.crt for this provider. The helper resolves relative paths from backend/, consistently for runtime and migration commands, and keeps sslmode=verify-full.
