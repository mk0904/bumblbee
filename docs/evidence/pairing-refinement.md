# Pairing entry refinement — 16 November 2026

Final user-directed presentation: brand, plain Mission control heading, square
canonical yard preview and connection form. Removed decorative eyebrows, world /
environment labels, numbered setup steps, slogans and repeated footer. No route
is shown on the disconnected preview. Single code field and existing pairing
endpoints/normalization retained; no identity/schema/domain change.

Browser checked 1309×818 and 1101×651 CSS viewports. Square map measured 478×478
and 439×439 respectively; document dimensions match viewport; at minimum desktop
card clientHeight/scrollHeight both 396. No scroll or rectangular letterbox.
Existing protected-code and demo workflow tests pass; label query now ignores
capitalization so its behavior assertion survives the plain-case label.

13 frontend tests, lint, production build and diff checks pass. Screenshot:
screenshots/pairing/simple-square.png. Webots execution unaffected; preview remains
on the disconnected pairing screen for review.

User clarification: restored the large two-line editorial headline and supporting
copy; only decorative small labels stay removed. Square preview retained, measured
349×349 at 1101×651; scene clientHeight/scrollHeight both 509. No scrolling.
13 frontend tests, lint/build and diff check pass after restoration. Current
screenshot: screenshots/pairing/restored-headline.png (supersedes simple-square).

Latest layout direction: one shared rectangular frame containing map on the left
and the form on the right; headline/supporting copy overlay the map with a contrast
gradient. Decorative small labels remain absent. CSS consolidated into a single
current composition. Browser document equals viewport at 1309×818 and 1101×651;
minimum-size form client/scroll heights both 534. Production build and diff check
pass; authentication code unchanged. Current screenshot: screenshots/pairing/unified-card.png.

### Cool neutral palette

Replaced the green interface palette with charcoal, cool grey and restrained blue accents across pairing, workspace panels, charts and map overlays. The canonical yard raster remains unchanged so it still matches Webots. Layout and control behavior are unchanged.

Validation: lint, all 13 frontend tests and production build passed. Browser preview saved at `screenshots/pairing/cool-theme.png`.

### Graphite / ivory visual direction

Supersedes the cool-blue palette: warm ivory connection surface, graphite map panel, copper/champagne interface accents, circular brand mark and larger editorial headline. Canonical map imagery is unchanged; only the entry preview applies a presentation filter. Shared console accents follow the same warm palette. No command, pairing or flight behavior changed.

Validation: lint, 13 frontend tests and production build passed. Browser checked at 1309×818; at 1102×652 the document equals the viewport and the form client/scroll heights both equal 535. Screenshot: `screenshots/pairing/premium-ivory.png`.

### Graphite and porcelain refinement

Updated entry composition with a graphite map surface, porcelain connection panel, larger editorial headline, softer panel corners and a saturated blue primary action. Decorative console accents now use cool blue tones; warning/status colors retain their purpose. No control logic changed.

Lint, 13 frontend tests and production build passed. Live browser verification was blocked by a localhost connection refusal; no new screenshot is presented as verified evidence.

Launch map coverage: pairing opts into SVG `xMidYMid slice` so the canonical square map fills the rectangular left panel without letterboxing or stretching. Interactive operational maps retain their full square extent. Lint, 15 frontend tests and production build passed.

### Drone launch artwork

Replaced decorative launch map with a generated matte-black quadcopter product image, stored locally in frontend/src/assets/drone-launch.png. Image fills the left panel with a text-legibility gradient; operational maps remain canonical. Browser verified screenshot screenshots/pairing/drone-hero.png. Lint, 15 frontend tests and production build passed. Artwork is decorative, not simulator footage.
