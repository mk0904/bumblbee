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
