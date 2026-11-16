# Simulator protocol v1

Transport: WSS in production; WS only for local development. External Webots flight/control implementation remains pending. The server socket boundary is implemented and tested against a socket test client, not against Webots.

## Pairing
1. Configure SIMULATOR_TOKEN once on server and bridge host. Never ship it to browser.
2. Bridge POST /api/pairing/request with Authorization: Bearer <bootstrap credential>.
3. Response {code,expiresAt,droneId}; code contains four uppercase letters/digits, at least one of each, expires in 120 seconds, single use. Print on bridge terminal.
4. Browser POST /api/pairing/claim with {code}, correct Origin and rate limit (5/minute per client plus five global guesses per active code).
5. Response sets HttpOnly session cookie and returns user + csrf. Use X-CSRF-Token for mutations. Session lasts at most eight hours and is revoked by logout or backend restart.

Helper: simulator/bridge/pair.py uses Python standard library. This helper obtains a code only; it does not simulate or fly a drone.

## Agent WebSocket
Connect /ws/simulator with Authorization header using bridge credential. Send within 5 seconds:

```json
{"protocolVersion":1,"type":"hello","droneId":"drone-01","epochId":"a-valid-uuid"}
```

Server responds welcome with same epoch. Only latest attached connection is accepted; earlier connection is closed. All following messages include protocolVersion:1.

Send heartbeat at least once per second; server returns heartbeat_ack. Five seconds silence closes connection. Keep sensor/control work independent of socket processing.

Server command: {protocolVersion:1,type:"command",payload:{id,flightId,action,expiresAt,snapshot,...}}. action is START_MISSION, PAUSE, RESUME or LAND. Command ID is payload.id. Validate expiry, legal state, world frame and deduplication before acceptance.

Agent response:
```json
{"protocolVersion":1,"type":"command_result","payload":{"commandId":"command-uuid","status":"ACCEPTED"}}
```
Acceptance must occur before command expiry (10 seconds). Accepted commands have a separate 60-second outcome timeout; late definitive outcomes reconcile UNKNOWN records without reviving ended flights.

Statuses accepted from agent: ACCEPTED, COMPLETED, FAILED, REJECTED; optional bounded error string. Start command completes when execution starts, not when entire mission lands. Landing may cancel a still-pending start; late results for cancelled commands do not revive them.

Telemetry payload: flightId, epochId, sequence (nonnegative integer), simulationTime (seconds), x, y, altitude (metres), speed (m/s), battery (0–100), roll/pitch/yaw (radians), waypoint (zero-based), state, batterySource (synthetic/sensor), optional reason. State reports must traverse TAKING_OFF -> EXECUTING -> LANDING -> COMPLETED, with PAUSED <-> EXECUTING and early LANDING permitted from TAKING_OFF/PAUSED. Never skip intermediate transitions just because a network packet was lost: adapter reconciliation is required.

Sample and epoch identifiers must match flight. Repeated samples are ignored; older sequence cannot overwrite live state. New epoch on existing flight is rejected and needs explicit recovery. Malformed/oversized/out-of-order protocol messages close connection with an application error. Backpressure limits pending ingress work.

## Coordinate frame
WORLD_LOCAL_V1, world training-ground-v1. Local x/y horizontal, altitude positive up relative to fixed pad origin. Bounds x/y ±50 m, waypoint altitude 2–15 m. Adapter must test mapping to selected Webots world axes. Dashboard scenery currently describes a planned world; matching actual Webots geometry remains unverified.

## Dashboard WebSocket
Authenticated cookie + configured Origin at /ws/dashboard. Server sends {type:"snapshot",payload:...}. Data is filtered to the installation's operator principal. Session expiry/logout closes live access. Browser reconnects and rehydrates state. Slow consumers are disconnected and may reconnect; websocket updates are not durable event delivery.

## Recovery limitation
Backend persists command/flight records but does not persist socket sessions. On restart commands with unconfirmed outcomes become UNKNOWN. Demo does not resume an orphaned flight; operator closes it as INTERRUPTED while disconnected and reconnects the demo link. Webots agent restart/reconnect reconciliation and local loss-of-contact landing must be implemented and verified with the actual controller before release. Never blindly resend expired/unknown movement commands.

### Training-world baseline
The local `simulator/worlds/training-ground-v1.wbt` now defines ENU coordinates: Webots x/y map directly to mission x/y, Webots z is altitude above the fixed pad surface z=0. Planner footprints are flat non-colliding scenery. Grounded sensor readings pass; dynamic axis/flight accuracy and a protocol-speaking controller remain unverified. The world_check diagnostic is local console output, not a simulator protocol event.

## Local executor and persistence acknowledgement (ADR-007)
The actual `mission_control` controller now implements the socket protocol. A
`telemetry_ack` response `{protocolVersion:1,type:"telemetry_ack",epochId,sequence}`
is emitted only after telemetry persistence. The bridge permits one outstanding
sample, preserves ordered state changes and coalesces ordinary same-state samples
before sending. Sequence numbers count dispatched samples. Generated cadence is
2 Hz; actual delivery is storage-limited. Heartbeat acknowledgements are immediate
liveness signals and do not establish ordering or command/telemetry persistence.

Local SQLite journals command IDs and active flights; a restart with uncertain
local execution blocks new starts. There is no automatic reconnect/replay. Local
contact-loss landing and attitude guard run independently of network I/O. These
mechanisms do not promise exactly-once execution across crash windows.

## Onboard JPEG channel — FR-16 / ADR-008
Dedicated `/ws/camera/producer`: same bridge Authorization header, then
`{protocolVersion:1,type:"camera_hello",droneId:"drone-01",epochId:<active agent UUID>}`.
Responds `{type:"camera_welcome",epochId}`. Older/superseded/offline command-agent
epochs cannot publish media. Per-stream sequence resets only on new media handshake.

Frame: `{protocolVersion:1,type:"camera_frame",epochId,sequence,simulationTime,
width:640,height:360,jpeg:<canonical base64 JPEG>}`. Increasing nonnegative integer
sequence; finite simulation time; JPEG ≤150,000 decoded bytes / 200,000 base64 chars;
actual SOF dimensions must match. Socket payload ≤210,000 bytes. At most 5 FPS;
excess rate drops frames and responds `{type:"camera_ack",sequence}`. The bridge
waits for ACK before sending another and keeps one latest raw frame pending.

`/ws/camera/viewer` requires paired cookie + configured Origin and is read-only.
Receives frame above plus server `receivedAt` and status
`{type:"camera_status",status:"waiting"|"live"|"stale"|"disconnected"}`.
No images in PostgreSQL/reports. Slow viewers skip sends above 300 KB buffered;
latest frame only, no application frame backlog. Session expiry/logout closes
viewer; silence >3 seconds is stale. Client connects only on Camera tab, closes on
unmount and reconnects transient failures. WS local / WSS hosted as before.
Image-channel failure is not a flight outcome and never substitutes for telemetry.
