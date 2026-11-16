# ADR-010 — Canonical scaled world/planner map

Date: 2026-11-16. Status: user-directed correction to ADR-009.

## Problem
The previous 7.334 m home pad and 4.6–6 m target pads were oversized relative to
this Mavic model. The planner rendered a separate schematic that could diverge
from Webots' textured yard, despite matching coordinate axes.

## Decision
Use `shared/worlds/training-ground-v1.json` as the world definition (ID/frame,
120×120 m surface extents, ±50 m flight bounds, pad centres/diameters, footprints).
Canonical local `shared/worlds/training-yard.jpg` is generated from that definition
and referenced directly by Webots; Vite imports the very same asset into every
WorldMap instance. No duplicated/rerendered schematic or remote geographic map.
Backend domain limits read the shared pure data definition as well.

Home diameter 1.5 m; P1/P2/A1/B2/C3 diameter 1.2 m. These are painted pads, not
collision surfaces or a claim of automatic precision landing. World ID, coordinates,
collider, physics, controller and mission DTOs remain unchanged. Visual revision 2
is recorded in the definition; no database migration is needed.

Planner displays the complete physical surface (-60..60), with legal flight area
(-50..50) indicated. Shared world↔SVG transforms invert Y explicitly; off-area
clicks are rejected rather than silently clamped into edge waypoints. Zoom up to
4× and a transform-aware SVG metre scale support inspecting the smaller pads.
Waypoint/telemetry locator icons remain screen-readable UI overlays, not physical
models. Background paint and coordinates are drawn to the same scale as Webots.

## Validation
Contract checks cover Webots texture path/mesh corners, shared API limits, origin,
axis orientation, all pad-coordinate round trips and outside-flight clicks.
Browser planner/camera and actual Webots loading provide visual evidence.
