# ADR-013: Public drone identity and explicit route preview

> Current interpretation: Display-only code decision is superseded by ADR-014; explicit mission selection remains applicable.

Status: Accepted

Use a public four-letter installation identity (BMBL) from shared/config/drone.json. Retain internal database identity drone-01. Neither is an authentication credential; existing short-lived pairing remains unchanged. Multiple simultaneous drones and durable operator pairing are not implemented by this change.

The flight deck must not display an arbitrary first saved route. The operator selects a saved mission explicitly; the UI stores its ID in Workspace. An active flight always takes precedence using its immutable execution snapshot. Selection alone issues no flight command. Remove route hide/show, preserving zoom/reset controls.

Camera has its own landscape image panel. Attitude belongs in the telemetry parameter panel. No schema or simulator protocol changes.
