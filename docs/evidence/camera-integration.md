# FR-16 onboard camera verification — 16 November 2026

Actual local Webots camera is enabled: 640×360 BGRA capture, Pillow JPEG worker,
authenticated dedicated camera sockets, transient Node relay and paired React view.
No camera frames are written to Supabase. The original map, altitude chart and
Webots follow viewpoint remain available. See ADR-008 for architecture/contracts.

## Passing live evidence
- Browser Camera tab rendered an actual decoded JPEG with natural dimensions
  640×360; viewport/document dimensions matched 1309×818 CSS pixels, no scrolling.
- A real viewer observed 216 frames over 45.003 seconds, **4.78 FPS**, average
  encoded JPEG 6,831 bytes, 175 distinct image hashes while the drone flew.
  This is a local measurement, not a hosted-network guarantee. Evidence:
  camera/stream-check.json, first.jpg and last.jpg. Synthetic fixtures are confined
  to backend/tests/fixtures and are never used by the application/bridge.
- Concurrent real flight `163a5a43-b98a-4e8a-b5a0-523ab86ad32b` completed
  START_MISSION → PAUSE → RESUME → LAND with all four commands COMPLETED.
  47 persisted sensor samples, upright attitude/hover quality assertions passed,
  final GPS altitude 0.113 m with sensor-confirmed touchdown. Actual report:
  webots/163a5a43-b98a-4e8a-b5a0-523ab86ad32b.json.
- Camera feed also remains available while grounded, independently of whether
  there is an active mission. Plain floor/sky is expected when that is all the
  onboard camera sees; the scene contains flat training scenery.

- Grounded simulator Pause produced **Camera feed stale** in the browser; resuming
  Webots returned to **LIVE · ONBOARD** without re-pairing. This checks real capture
  silence/recovery, separate from dashboard mission Pause. Screenshots:
  screenshots/camera/stale.png and screenshots/camera/live.png. Browser image
  decoded at 640×360; document/viewport both 1309×818, confirming no document scroll.

## Automated verification
27 backend tests, 11 frontend tests and 6 Python tests pass. New coverage includes
unauthorized viewers/producers, wrong epoch, real JPEG dimension/header limits,
duplicate frame sequence, session revocation, image failure independent of command
connection, stale UI/unmount cleanup, demo unavailability and latest-only owned raw
buffer handoff. Lint and frontend production build pass.

## Limitations
5 FPS is the target; rendering/compression/network and shared process resources
can reduce it. Three-second silence is marked stale. No recording, sound, WebRTC,
browser 3D scene, image database, inference or external camera hardware. WSS works
by configuration but hosted media/latency/load behavior remains unverified.
Pausing Webots freezes sensor generation; dashboard Pause holds flight while the
camera continues. Restart recovery limitations of the command bridge still apply.
