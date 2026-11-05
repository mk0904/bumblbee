BEGIN;
CREATE TABLE IF NOT EXISTS app_schema_version (id integer PRIMARY KEY CHECK(id=1));
CREATE TABLE operators (id text PRIMARY KEY, display_name text NOT NULL);
INSERT INTO operators VALUES('operator-01','Mission Operator');
CREATE TABLE drones (id text PRIMARY KEY, world_id text NOT NULL);
INSERT INTO drones VALUES('drone-01','training-ground-v1');
CREATE TABLE missions (
  id uuid PRIMARY KEY, owner_id text NOT NULL REFERENCES operators(id), revision integer NOT NULL CHECK(revision>0),
  data jsonb NOT NULL, created_at timestamptz NOT NULL
);
CREATE TABLE waypoints (
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK(sequence >= 0 AND sequence < 20),
  x_m double precision NOT NULL CHECK(x_m BETWEEN -50 AND 50),
  y_m double precision NOT NULL CHECK(y_m BETWEEN -50 AND 50),
  altitude_m double precision NOT NULL CHECK(altitude_m BETWEEN 2 AND 15),
  PRIMARY KEY(mission_id,sequence)
);
CREATE TABLE flight_sessions (
  id uuid PRIMARY KEY, drone_id text NOT NULL REFERENCES drones(id), mission_id uuid NOT NULL REFERENCES missions(id), owner_id text NOT NULL REFERENCES operators(id),
  state text NOT NULL CHECK(state IN ('STARTING','TAKING_OFF','EXECUTING','PAUSED','LANDING','COMPLETED','FAILED','INTERRUPTED')),
  data jsonb NOT NULL, created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX one_active_flight_per_drone ON flight_sessions(drone_id) WHERE state NOT IN ('COMPLETED','FAILED','INTERRUPTED');
CREATE INDEX flight_history ON flight_sessions(owner_id,created_at DESC);
CREATE TABLE commands (
  id uuid PRIMARY KEY, flight_id uuid NOT NULL REFERENCES flight_sessions(id), owner_id text NOT NULL REFERENCES operators(id),
  request_key text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE(owner_id,request_key)
);
CREATE INDEX command_timeline ON commands(flight_id,created_at);
CREATE TABLE telemetry_samples (
  id uuid PRIMARY KEY, flight_id uuid NOT NULL REFERENCES flight_sessions(id), epoch_id uuid NOT NULL,
  sequence bigint NOT NULL CHECK(sequence>=0), simulation_time double precision NOT NULL CHECK(simulation_time>=0),
  data jsonb NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE(flight_id,epoch_id,sequence)
);
CREATE INDEX telemetry_history ON telemetry_samples(flight_id,simulation_time,id);
CREATE TABLE alerts (
  id uuid PRIMARY KEY, flight_id uuid NOT NULL REFERENCES flight_sessions(id), rule_key text NOT NULL,
  status text NOT NULL CHECK(status IN ('OPEN','ACKNOWLEDGED','RESOLVED')), data jsonb NOT NULL, created_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX one_active_alert ON alerts(flight_id,rule_key) WHERE status != 'RESOLVED';
CREATE INDEX flight_alerts ON alerts(flight_id,status);
-- Application tables are accessed by the trusted server connection, not public Data API clients.
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_schema_version ENABLE ROW LEVEL SECURITY;
INSERT INTO app_schema_version(id) VALUES(1);
COMMIT;
