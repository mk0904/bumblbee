# ADR-012: Route-facing yaw and operator heading

Status: Accepted

The previous controller deliberately held yaw at zero. During EXECUTING, the controller now slews its desired heading toward atan2(dy, dx) for waypoint distances greater than 1.2m. Rate is bounded at 0.35 rad/s, with shortest-angle wrapping. Existing body-frame position stabilization uses measured yaw. Takeoff initializes heading from IMU, pause captures measured yaw, and landing retains heading. Network behavior, mission snapshots and command contracts are unchanged. No manual yaw API is added.

Compass bearing is local, clockwise from +Y: bearing = (90 - yawDegrees) modulo 360. This is not geographic/magnetic north. A fixed aircraft marker and rotating local-axis rose show measured bearing; missing telemetry stays blank and stale data is marked. Actual sensor yaw, pitch and roll remain in the camera instrument strip.

Verification: Python wrap/rate tests; frontend ENU conversion and stale-display test; real Webots flight bff4a933-ae80-41f9-81c9-f14549583255 with --yaw acceptance gate, takeoff/pause/resume/landing completed. Recorded yaw range -0.19 to 31.70 degrees, peak absolute roll 0.01075rad and pitch 0.06975rad. This validates a single short route, not arbitrary-route stability qualification.
