# ADR-005 — Webots training-world baseline

Date: 2026-11-16. Status: accepted for local world setup; flight acceptance pending.

## Context
The user requested a world for project testing after Webots launch troubleshooting.
R2025a on this macOS 27.2 host exits with false port-in-use errors; upstream fix
https://github.com/cyberbotics/webots/pull/7032 is merged. The installed replacement
is R2025b Nightly Build 13/11/2026, commit c85603f2280c68ebdcc0a4102e43026fcbf2bc71.
Dashboard/backend work already exists per ADR-002; actual flight remains M5.

## Decision
Use one pinned Cyberbotics Mavic2Pro EXTERNPROTO in a project-authored ENU world,
8 ms timestep, ground/pad surface at z=0, identity WORLD_LOCAL_V1 coordinate mapping.
Match existing planner scenery as flat non-colliding footprints, keeping MVP
free of obstacle avoidance. A project-authored grounded sensor controller turns
motors off and reports GPS/IMU/gyro. Do not silently enable autonomous takeoff or
claim backend integration from a world-load check. Record asset license and runtime.

## Consequences
World loading and sensor API compatibility can be checked independently of network
and flight control. Referenced assets need first-run download/cache. Nightly build
and observed Python 3.9.6 compatibility are limited to this baseline; final bridge
runtime pin, navigation calibration and full FR-06–09/15 acceptance remain open.
The robot reference-point height is distinct from the pad surface; no boot-time
altitude subtraction is introduced. Schema and backend architecture do not change.
