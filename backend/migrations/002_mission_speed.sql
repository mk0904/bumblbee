ALTER TABLE app_schema_version DROP CONSTRAINT IF EXISTS app_schema_version_id_check;
ALTER TABLE waypoints ADD COLUMN IF NOT EXISTS speed_mps double precision NOT NULL DEFAULT 1 CHECK (speed_mps >= 0.2 AND speed_mps <= 2);
INSERT INTO app_schema_version(id) VALUES(2) ON CONFLICT DO NOTHING;
