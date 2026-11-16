# ADR-004: Instrument-focused console and shared navigation

Status: implemented; visual direction explicitly requested by user reference image.

Use a four-surface flight deck: large mission viewport, aircraft status, lower control desk and local heading dial. Replace generic summary cards and marketing-style overview heading. Use neutral charcoal surfaces, restrained status accents, compact typography and a fixed navigation rail with keyboard-visible labels.

Reuse the same surface, typography, spacing, input and action styles across mission library/editor, flight history/report, incident log and diagnostics. The rail has a consistent width/offset, active state, grouped navigation, full viewport height and a compact mobile variant.

FlightConsole is a presentation component accepting backend state and command callbacks. Heading is derived from actual yaw in the local frame; missing data remains a dash. No camera/video/joystick controls are added because those capabilities are not implemented. The viewport presents the local mission world, not a fabricated live camera feed.

Protocol, domain classes, database and command/state rules are unchanged. Component tests cover display toggles, absent data and legal landing during pending takeoff. Browser verification records navigation/planning and desktop/mobile layout separately from Webots acceptance.
