# Desktop layout verification — 2026-11-16

Implemented ADR-006: desktop-only, minimum 1100 × 650 CSS viewport; bounded
workspace, paging and report tabs. Nine frontend tests pass, including device gate
and pagination; ESLint, production build and diff whitespace checks pass.

Browser checked overview, mission collection/editor, system, flight history,
report and empty alerts. Console/status/control panels and system panels reported
matching client/scroll heights after compact status spacing fix. Small browser
viewport displays the resize gate. Phone/tablet detection has pure unit coverage;
no physical mobile-device test is claimed. Screenshot: screenshots/desktop/overview.png.

Demo data used; this does not verify Webots command/telemetry integration.

### Labelled sidebar refinement

Replaced the 80px icon rail with a shared 208px labelled sidebar across workspace screens. Restored visible navigation, active selection, connection summary and an explicit disconnect control. Removed session identity text from the footer. The content area offsets by the same sidebar width; bounded desktop layout remains in force. Browser verified the real workspace overview without issuing flight commands. Screenshot: `screenshots/desktop/labelled-sidebar.png`. Lint, 13 frontend tests and production build passed before the final CSS-only navigation margin reset.

### Warm neutral palette

Replaced blue decorative accents with warm porcelain/copper and graphite across frontend surfaces, navigation, inputs and chart/map overlays. Canonical world texture and behavior are unchanged. Browser overview verified; screenshot `screenshots/desktop/copper-theme.png`. Lint, all 13 frontend tests and production build passed.
