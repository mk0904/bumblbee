# ADR-015 — Site-wide light appearance

> Number collision: this theme record shares 015 with the independent mission-leg-speed record. Cite the full filename to disambiguate.

Status: accepted. User requested a light theme and a theme icon at the bottom of
navigation, replacing the tether/session icon (2026-11-16).

Light is the default for a browser without a saved preference. The bottom sidebar
sun/moon button switches the document theme and saves `bumbl-theme` in localStorage.
A blocked storage API falls back to a working tab-local theme. Pairing also offers
the toggle. Disconnect control session moves to System; authentication behavior
and session lifetime do not change.

A final appearance stylesheet defines light surfaces, ink, muted text, purple
accents and state colors across pairing, flight instruments, mission editing,
history, reports, alerts, forms, dialogs and notifications. Chart colors use CSS
variables. Camera images and canonical world-map assets preserve their source
colors. Existing desktop sizing and command guards are retained.

Verification: lint, frontend tests and production build; browser checks of pairing,
overview, planner, history, report and alerts/System. Dark selection survived a
reload and switching back restored light. No flight command issued. Screenshot:
`../evidence/screenshots/desktop/light-theme.jpg`.
