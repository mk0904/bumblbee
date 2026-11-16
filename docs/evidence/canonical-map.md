# Canonical scaled map — 16 November 2026

ADR-010 implemented. Home pad diameter reduced from 7.334 m to 1.5 m; target pads
from 4.6–6 m to 1.2 m. These are painted dimensions, not controller landing accuracy.
Webots loaded the new texture; screenshot canonical-map/webots-scale.png shows
the grounded Mavic relative to the home pad and 3 m concrete slab seams.

`shared/worlds/training-ground-v1.json` defines yard extents/flight bounds/pads and
footprints. Generator and backend bounds consume it. Webots directly references
shared/worlds/training-yard.jpg; React imports the same JPEG, replacing the old
independently drawn schematic. Full yard ±60 m, operational area ±50 m, same ENU
origin. Markers are interactive overlays with constant screen size while zooming;
transparent centres expose the pad beneath. Background filters removed.

Browser verified full-yard and zoomed planner views and real map pointer input.
Saved mission `P1 — mapped yard`: waypoint x=8 m, y=6 m, altitude=3 m, at the shared
P1 pad centre. The centre-click check produced (0,-0.1) from physical pointer pixel
rounding; pure transform maps exact SVG origin to (0,0). Tests round-trip every pad,
check axis/boundary coordinates and reject outside-flight clicks without clamping.
Screenshots: screenshots/canonical-map/full-yard.png, planner-p1.png and
webots-scale.png. The P1 mission was saved, not flown in this verification.

28 backend + 13 frontend tests, lint, production build and diff checks pass.
Shared-map contract checks assert world mesh UV corners, local texture path and
backend flight limits. Physics/controller and mission DTOs unchanged; no new
flight-accuracy or precision-landing claim. Webots and backend remain running.
