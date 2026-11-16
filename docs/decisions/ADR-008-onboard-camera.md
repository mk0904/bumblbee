# ADR-008 — Ephemeral onboard camera feed

Date: 2026-11-16. Status: user-authorized scope extension; local verification recorded separately.

## Decision
FR-16 adds a live onboard Webots camera to the existing non-scrolling console.
Map, Camera and Altitude share the main viewport. This is JPEG image transport,
not a second 3D renderer. No recording, audio, WebRTC, storage bucket or database
migration. The external Webots follow view remains available independently.

The world mounts a 640×360 Camera. Main control thread reads/copies BGRA at 200 ms
simulation intervals into a one-slot owned-frame queue. `CameraStream` compresses
JPEG quality 65 and uploads on its own thread/socket, at most 5 FPS wall time.
One outstanding frame requires an ACK; newer queued frames replace older ones.
Media errors do not change the command transport or motor controller state.

`createCameraChannel` in the Node process handles dedicated producer/viewer sockets.
Producer uses the existing drone-scoped bridge credential, then validates its epoch
against the active command agent. Viewer requires the operator cookie and matching
Origin. Frames validate version, UUID, increasing sequence, size, encoding, JPEG
header and actual dimensions. The relay retains one latest frame in memory, caps
rate, skips slow-viewer sends, checks session expiry/revocation and fences old epochs.
No image processing/persistence is in the domain or SQL transaction path.

`CameraFeed` opens only while the Camera tab is mounted. It closes on unmount,
reconnects transient loss and dims old images with waiting/stale/disconnected labels.
Three seconds without new frames is stale. A paused Webots simulator freezes image
capture, whereas dashboard mission Pause holds the drone and keeps images flowing.

## Consequences
Image buffers are bounded but sockets share the backend event loop and machine
resources; separate sockets do not imply total resource isolation. Image capture
adds rendering/GPU cost, so actual FPS and flight behavior require live tests.
5 FPS is a target, not guaranteed. Pillow 11.3.0 and websocket-client 1.8.0 are
pinned for the tested Python 3.11 runtime. Hosted WSS/throughput still needs testing.
