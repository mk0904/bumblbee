# ADR-015: Default and incoming-leg speed

Status: Accepted

User requested functional default and per-waypoint speed. Mission defaults are speed1m/s and altitude8m. New points inherit current defaults; modifying defaults does not silently overwrite existing points. Each waypoint's speed controls the horizontal approach leg ending at that point. Supported range0.2–2m/s. Missing values in legacy routes resolve to1m/s.

Speed is validated at HTTP, domain and simulator boundaries, stored in mission JSON and normalized waypoints.speed_mps (migration002), included in immutable flight snapshots. Controller computes a capped desired horizontal velocity and acceleration-limited PD tracking, slowing near waypoints. This is a requested cruise cap, not a guarantee of exact measured speed under dynamics. Heading behavior and command safeguards retained.
