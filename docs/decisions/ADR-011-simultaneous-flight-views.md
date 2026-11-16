# ADR-011: Simultaneous map and onboard camera

Status: Accepted

The operator needs to monitor position, camera and numerical instruments at once. The overview now presents the canonical map, authenticated onboard camera and large flight readouts in adjacent panels. Mission controls, altitude history and heading occupy the second row. Camera viewer lifetime follows the flight deck rather than a selected camera tab; leaving the overview still cleans up the connection. Existing command authorization, state guards and telemetry freshness behavior remain unchanged.

No manual control, weather, GPS quality, return-home or other unsupported capabilities are introduced from the visual reference. Missing telemetry remains a dash. The desktop viewport remains bounded without scroll containers.
