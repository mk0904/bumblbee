# Console UI / navigation verification

Date: 2026-11-16, Asia/Kolkata.

## Delivered
- Four-panel flight deck based on the supplied visual reference's proportions: mission viewport, aircraft status, lower controls/readouts and local heading dial.
- Fixed navigation rail with consistent width/content offset, grouped icons, active state, hover/keyboard labels and a compact mobile variant. Editor retains its mission-planner navigation state.
- Shared neutral charcoal surfaces, typography, spacing, inputs, actions and status treatments across library/editor, history/report, alerts and diagnostics.
- Operational controls remain real: view/chart switch, route overlay, map zoom, mission editing, start/control requests, report export. No fabricated camera feed or camera/joystick controls.

## Observed browser checks
- Navigation through overview, mission library, editor, history, report, alerts and system using keyboard activation.
- Created and saved Training circuit with three local-coordinate waypoints to Supabase, then started the labelled demo adapter and observed altitude/speed/yaw, route progress and heading display.
- Opened persisted report after the demo flight completed, including route, charts, sample count and command timeline; closed report and returned to overview.
- The initial landing request expired behind a demo timer backlog while SQL was slow. Fixed timer scheduling to coalesce ticks rather than enqueue them without bounds; added a deterministic regression test. The retained test report truthfully shows the older rejected request. Do not describe that rejected request as successful landing-command proof.
- Removed invalid nested map-tool buttons from the compact minimap button. Empty/partial API responses now produce a readable reconnect error instead of exposing JSON parser wording.
- Desktop console geometry measured within the viewport. Mobile at 390px had document width 390px, fixed sidebar position, and no horizontal overflow; inspected both upper viewport and lower instruments while scrolling.
- Representative screenshots: screenshots/console/overview-desktop.png, overview-mobile.png, instruments-mobile.png, missions.png, planner.png, history.png, report.png, alerts.png, system.png.

## Automated checks
- 25 backend tests + 6 frontend tests pass; lint and production build pass.
- Added console tests for absent telemetry, route/chart toggles, and legal early landing with pause disabled during takeoff.
- Added demo backpressure regression: many timer callbacks during one slow tick yield one scheduled tick, not an unbounded backlog.

Webots physics/controller integration and hosted latency/load targets remain separate acceptance gates. A Supabase-backed kinematic demo is not evidence of physical flight control.
