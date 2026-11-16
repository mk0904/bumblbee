# Textured yard verification — 16 November 2026

Implemented ADR-009 with a project-authored local 4096×4096 JPEG atlas. Concrete
slabs/grain, asphalt lanes, pad rings/labels, numbers, service footprints and +X/+Y
marks replace the uniform floor and geometric paint. Ground collider, ENU origin,
physics timestep/damping, sensors, motor control and backend contracts unchanged.
No raised/colliding obstacle or automatic landing recognition added.

Actual Webots load passed, texture rendered in the external follow view and the
onboard camera. Camera screenshot shows origin-pad ring, red +X arrow and slab
seams; orientation matches forward +X. Browser decoded 640×360 actual JPEG,
viewport/document both 1309×818, no scrolling. Screenshots:
- screenshots/yard/onboard.png (during the real flight)
- screenshots/yard/world.png (external view, floating camera overlay hidden)

Real flight `3937f6ea-ce07-45b9-b77b-ea10fe67c0a3` passed start/pause/resume/land;
all four commands COMPLETED, upright/hover assertions passed, 38 persisted samples,
final sensor altitude 0.114 m. Report at webots/<flight UUID>.json. Webots, media
bridge and application remain running; drone landed. Earlier global checks apply
to unchanged application/controller code; this visual-only change was verified
by real world load, camera rendering and live flight rather than new mirror tests.

The atlas generator uses a fixed grain seed and explicit metre→pixel mapping. The
shipped asset is canonical; font versions can change regenerated text. Previous
5 m geometric grid is replaced by visible 3 m slab seams; mission bounds remain
±50 m and planner remains schematic. No new network texture asset dependency.
