# ADR-009 — Textured training yard

Date: 2026-11-16. Status: accepted user-directed visual change.

## Decision
Replace the uniform ground/flat geometric paint with a project-authored 4096×4096
JPEG yard atlas on a non-colliding IndexedFaceSet at z=0.001 m. Preserve the
120×120×0.2 m ground collider centered at z=-0.1, ENU frame, z=0 datum, drone,
controller, damping, timestep and mission bounds. No raised obstacles or navigation
logic changes. Existing planner scenery footprints and origin remain aligned.

The atlas includes 3 m concrete slabs with seeded aggregate grain/scuffs, asphalt
lanes, yellow ±50 m boundary, painted service footprints, origin H, inspection pads
P1/P2 and A1/B2/C3, numbers and +X/+Y marks. `build_yard_texture.py` records the
metre→pixel mapping and seed. Generated JPEG is shipped locally so no remote texture
fetch/license dependency. Font resolution uses installed Arial Bold or DejaVu Sans;
regeneration on a different font/version may differ, so the shipped asset is canonical.

## Consequences
The world is easier to read in the live camera. Paint is visualization only, not
collision/safety enforcement or automatic landing recognition. The existing mission
planner remains a schematic rather than a photorealistic map. New 3 m visible slab
seams replace the previous 5 m geometric grid; explicit coordinate/bounds contracts
are unchanged. Verify actual Webots load, texture orientation and camera stream.
