# Webots mission controller

The training world now selects `mission_control`, which connects to the Express
backend and uses real Webots GPS, IMU and gyro readings to drive four propellers.
The dashboard map is a telemetry view, not the source of drone motion.

## Run locally on this Mac

1. Keep ignored `backend/.env` configured with `SIMULATOR_MODE=webots`, the existing
   database settings and a long `SIMULATOR_TOKEN`. Never place that token in React.
2. From the repo root, run `npm run dev` for backend and dashboard.
3. One-time Python setup (tested Python 3.11.18):

   ```sh
   python3.11 -m venv simulator/.venv
   simulator/.venv/bin/pip install -r simulator/requirements.txt
   ```
4. Run `simulator/run-webots.sh`. It prepends the virtual environment to PATH so
   Webots' `python3` resolves to this interpreter. Uses local port 1250.
5. Enter the bridge's four-character terminal code at http://127.0.0.1:5174/.
   If expired, request another with
   `simulator/.venv/bin/python simulator/bridge/pair.py --env-file backend/.env`.
6. Plan/save/start a route; watch Webots and dashboard together. Start with a small
   route at 3 m. Pause sets a position-hold target, Resume restores the next
   waypoint, Land descends at the current position. Completion requires touchdown
   sensor evidence. Normal route completion also lands at its final waypoint.

For repeatable backend-to-real-agent checks:

```sh
node --env-file=backend/.env scripts/test-webots.js
```

This creates a test mission, commands start/pause/resume/land, checks physical
attitude and hover altitude, and saves the actual report under docs/evidence/webots.
It requires an idle connected real Webots agent, not demo mode. Do not run it during
another operator flight. `--inspect` reports connection/flight state; `--reconcile`
explicitly closes unknown backend flights only while the agent is disconnected,
as INTERRUPTED, never as a successful landing.

## World/frame contract

`training-ground-v1`, `WORLD_LOCAL_V1`, Webots ENU: x/y horizontal; z altitude above
fixed pad surface z=0. Ground is 120 × 120 m, bounds ±50 m, altitude 2–15 m,
5 m grid, pad at (0,0), red +X / green +Y. A grounded GPS reference reads around
0.066 m: do not subtract an arbitrary launch reading. Gray scenery footprints are
flat/non-colliding; no obstacle avoidance is implemented.

One DJI Mavic 2 Pro, initial translation (0,0,0.1), yaw=0, 8 ms physics timestep,
linear/angular damping 0.5. Network work is on a thread with bounded queues;
Webots APIs stay on the simulation thread. SQLite journals live only in ignored
`simulator/.runtime`. Repeated command IDs do not repeat movement. An unfinished
local flight after restart blocks new starts; automatic recovery is not implemented.
Do not delete that journal to conceal an unknown outcome.

Generated telemetry targets 2 Hz; one persisted sample is outstanding at a time,
so actual delivery depends on SQL latency. State changes are retained; ordinary
same-state samples may be coalesced before dispatch. Battery is synthetic.
Contact loss triggers local landing; extreme attitude triggers FAILED/motors off.
A paused Webots simulation freezes its physics/control loop; it cannot execute a
landing while paused. Use dashboard Pause to test hovering.

## Runtime and attribution

Tested locally: macOS 27.2; Webots R2025b Nightly Build 13/11/2026, commit
`c85603f2280c68ebdcc0a4102e43026fcbf2bc71`; Python 3.11.18;
websocket-client 1.8.0. R2025a has a startup port-detection failure on this host;
see ADR-005. This is an observed local compatibility combination.

The pinned Mavic model is referenced under the Cyberbotics Webots asset license:
https://cyberbotics.com/webots_assets_license . First load needs asset download/cache.
Stabilization/motor mixing adapts the installed Cyberbotics mavic2pro_patrol.py,
Apache-2.0 (1996–2025 Cyberbotics Ltd.). License and NOTICE accompany the controller.
Mission execution, transport, journaling and conservative smoothed navigation are
project code. The old `world_check` controller remains a motors-off diagnostic.

See ADR-007 and docs/evidence/webots-integration.md for results and remaining gates.
Hosted WSS, network-fault recovery, full navigation accuracy/repetition and restart
reconciliation are separate from this local end-to-end test.

## Tracking the drone
The saved Viewpoint uses `follow "SDSE Mavic"` with a close Tracking Shot. It
follows drone translation while keeping a stable world orientation. Use the
Webots View → Follow Object submenu to switch modes; Restore Viewpoint returns
to the saved close view. This camera does not alter physics or sensor telemetry.
A dashboard camera stream remains unimplemented and needs a separate bounded
image transport; telemetry alone does not transmit images.

## Onboard dashboard camera — FR-16 / ADR-008
The world now mounts a 640×360 onboard Camera. Select **Camera** beside Mission view
in the console. Main thread copies BGRA every 200 ms simulation time; the separate
`CameraStream` worker compresses JPEG quality 65 and sends at most 5 FPS wall time.
The one-slot raw-frame queue replaces old frames, and the image socket waits for
an ACK. Compression/upload never waits in the motor loop. Pillow 11.3.0 is now
required by simulator/requirements.txt; rerun pip install after updating.

The feed has its own protected producer/viewer sockets and no SQL persistence.
A media error does not stop flight. Old images dim with a stale/disconnected label.
The on-drone viewpoint sees outward from its gimbal; the external follow viewpoint
is the way to watch the drone itself. Local measured stream/flight evidence is in
docs/evidence/camera-integration.md. `scripts/test-camera.js` observes 45 seconds of
real media; run alongside the Webots acceptance driver to verify changing images.

## Textured yard — ADR-009
The ground now uses local `assets/training-yard.jpg`: concrete slabs, asphalt lanes,
painted service footprints, home H and coloured inspection pads. The visible slabs
are 3 m squares; bounds remain ±50 m, altitude datum z=0, unchanged ground collider.
The atlas mesh is visual-only at z=0.001 m. It adds no raised/colliding obstacles.
Regenerate with `simulator/.venv/bin/python simulator/tools/build_yard_texture.py`.
The shipped JPEG is canonical; font versions can affect regenerated labels.

For an unobstructed external follow view, use **Overlays → Hide All Camera Overlays**.
This hides Webots' local floating camera preview, not the dashboard camera stream.

## Canonical scaled map — ADR-010
The canonical atlas is now `shared/worlds/training-yard.jpg`, described by adjacent
training-ground-v1.json; both Webots and every dashboard map use this same image.
This replaces simulator/assets/training-yard.jpg and the independent schematic.
Home pad diameter is 1.5 m, all other pad diameters 1.2 m. Physical surface remains
120×120 m; flyable area ±50 m. Smaller pads are visual paint, not a change to
landing accuracy. Regenerate via the existing build_yard_texture.py command.
