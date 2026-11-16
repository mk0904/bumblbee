# Run the complete project

## Prerequisites

- Node.js24–26 and npm; Node24 is the baseline.
- Python3.11 and the compatible Webots application.
- PostgreSQL or Supabase session-pooler access.
- A desktop browser window at least1100×650 CSS pixels.

Run commands from the repository root. On the original development machine:

```sh
cd "/Users/mk2004/Documents/ChatGPT/SDSE project"
```

## First-time setup

```sh
npm ci
cp backend/.env.example backend/.env
python3.11 -m venv simulator/.venv
simulator/.venv/bin/pip install -r simulator/requirements.txt
```

Do not overwrite an existing configured backend/.env. Set these values in that ignored file:

```dotenv
HOST=127.0.0.1
PORT=3000
APP_ORIGIN=http://127.0.0.1:5174
BACKEND_URL=http://127.0.0.1:3000
SIMULATOR_MODE=webots
SIMULATOR_TOKEN=<long-random-value>
DATABASE_URL=<your-postgresql-connection-string>
# Supabase verified-TLS provider CA, if applicable:
# DATABASE_CA_CERT=certs/supabase-root-2021.crt
```

Generate a host-side token with `openssl rand -hex 32`. Never publish this file or put its credential in frontend code. Apply the schema after configuring the database:

```sh
npm run db:migrate
```

## Start all three components

### Terminal1: frontend and backend

```sh
npm run dev
```

Keep the terminal running. It starts both services:

- Dashboard: http://127.0.0.1:5174/
- Backend: http://127.0.0.1:3000/

Alternatively, run them in separate terminals:

```sh
npm run dev:backend
```

```sh
npm run dev:frontend
```

Use either the combined command or separate commands, not both at once.

### Terminal2: Webots

After the backend reports server_started:

```sh
./simulator/run-webots.sh
```

The launcher opens simulator/worlds/training-ground-v1.wbt with mission_control, uses the project's Python environment and selects Webots port1250. The controller/bridge and camera worker start automatically; do not start a separate competing bridge.

The default executable is /Applications/Webots.app/Contents/MacOS/webots. Override it if needed:

```sh
WEBOTS_EXECUTABLE="/path/to/webots" ./simulator/run-webots.sh
```

Wait for bridge_connected and camera_connected in the Webots/controller output. Leave the simulator running in real time. The Webots pause button stops the physics/control loop; use dashboard Pause for a flying position hold.

### Browser: connect and fly

1. Open http://127.0.0.1:5174/.
2. Enter the installation code BMBL. The current implementation uses the permanent configured code in shared/config/drone.json.
3. Open Mission planner, create/save a route or select a saved tile.
4. Confirm simulator status is connected before pressing Start mission.
5. Pause/resume/land from the console; inspect results in Flight history.

To install the six templates while the backend is running:

```sh
node --env-file=backend/.env scripts/seed-mission-templates.js
```

This saves missing templates and does not fly them.

## Quick health check

```sh
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:5174/api/auth/config
npm run doctor
```

A healthy HTTP response confirms server reachability, not a connected simulator or successful flight. Check connection state in the dashboard and actual bridge output separately.

## Stop and restart

Land first and wait for simulator-confirmed completion. Stop the Node process with Ctrl+C; close Webots when grounded. Browser sessions are in-memory and may require entry again after backend restart. Unconfirmed command outcomes and controller journals must be reconciled honestly; never delete the journal to hide an uncertain flight.

## Troubleshooting

| Symptom | Check / action |
|---|---|
| Browser connection refused | Start npm run dev and keep its terminal open |
| Backend connection interrupted | Check terminal error, database reachability and port3000; restart only the backend if frontend is still running |
| Port5174 already in use | Stop the duplicate development process; Vite intentionally uses strict port5174 |
| Simulator offline | Start backend first, then Webots; verify matching token/BACKEND_URL and bridge_connected |
| Camera disconnected | Check camera_connected and live simulator epoch; never infer camera from HTTP health alone |
| Database/TLS error | Verify DATABASE_URL and certificate configuration; run migrations before runtime |
| Missing Python packages | Install simulator/requirements.txt into simulator/.venv, then launch using run-webots.sh |
| Drone refuses a new start after restart | Inspect uncertain prior flight/journal and perform supported reconciliation; do not blindly resend movement |
| Code rejected | Use the configured installation code; wait after rate limiting and check config if another installation uses a different code |

## Verification commands

```sh
npm run check
simulator/.venv/bin/python3 -m unittest discover -s simulator/tests
```

Real movement acceptance (idle connected Webots only):

```sh
node --env-file=backend/.env scripts/test-webots.js
```

This creates and executes a simulated flight. Do not run during another operator mission. See README for evidence and qualification limits.
