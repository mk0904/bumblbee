# ADR-006 — Desktop-only viewport

> Current interpretation: Internal list scrolling is allowed by later user direction; the outer page remains fixed.

Date: 2026-11-16. Status: accepted by user direction.

## Decision
Support desktop browsers with a content viewport of at least 1100 × 650 CSS pixels.
Phones and tablets show an unsupported-device screen; smaller desktop windows show
a resize prompt. No document or panel scrolling in the workspace or reports.

Collections use pagination (missions 3, flights 4, alerts 3 per page). The planner
edits one selected waypoint while retaining the whole route on its map. Reports
use section tabs, a metric selector and paginated command/incident records.

## Consequences
This supersedes earlier responsive/mobile acceptance expectations. Pagination is
view state, not a change to API or domain contracts. Browser/device heuristics are
a usability gate, not authentication. Desktop zoom may require a larger window.
