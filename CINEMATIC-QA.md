# Cinematic journey — implementation and QA

## Delivered

- Full-screen black-hole entrance with an approximate curved-ray shader. Rays encounter a turbulent emissive accretion disk, producing the upper and lower warped-disk images around the dark centre. Fine strands, moving plasma noise, background star distortion and HDR bloom replace the former sphere/torus/flat-particle model.
- Ten-second, skippable black-hole dive and original star-tunnel flight into the Solar System.
- Five connected visual layers: Solar System, nearby stars, Milky Way, galaxy field and cosmic web. Camera travel and scale/fade transitions connect the layers.
- Eight planet approaches, following moving planets, Earth’s Moon, Saturn’s rings, solar glow, asteroid particles and atmospheres.
- A 65,000-star main galaxy, procedural diffuse dust and stellar light, 46 galaxies in the outer field, and particle filaments connecting galaxy-cluster nodes.
- Edge navigation, planet dock, drag/orbit and wheel/pinch zoom. Zoom thresholds transition between scale layers; explicit closer/further-out controls provide an alternative.
- Original optional ambient synthesis, mute, pause, fullscreen, maximum/balanced detail, gentle motion and adaptive render resolution.
- Learning dashboard preserved at `learn.html`; original app preserved at `classic.html`.

## QA performed before implementation

See CINEMATIC-PLAN.md for the baseline inspection and confirmed user choices.

## Final browser checks

- Entrance renders without shader or runtime errors; desktop and portrait black-hole compositions visually reviewed.
- Uninterrupted cinematic entrance reaches the Solar System. Skip button and Escape support immediate arrival.
- All five scale destinations visited in both directions; selected title and navigation state follow the current destination.
- Scrolling outward from the Solar System triggers the nearby-star transition.
- All eight planet dock buttons open the correct planet. Earth and Saturn close-ups visually reviewed.
- Return-to-start and repeated entry work. Gentle motion enters directly without the flight and removes interpolated stage travel.
- Maximum and balanced quality settings switch and resize the renderer; settings persist across reloads.
- Sound on/off updates its accessible state without console errors; sound is off by default. Pause/resume updates its state.
- Desktop (1280 × 720) and portrait (390 × 844) inspected. Mobile close-up labels were moved above the planet and scale navigation is hidden during a close-up to avoid obscuring it.
- The frame counter reported approximately 60 fps during inspected desktop black-hole and galaxy views on this machine. This is not a cross-device performance benchmark.
- JavaScript syntax and local import checks passed.

## Explicit scope

This is an artistic scale journey and an interest stimulator. Planet sizes, distances, speeds and transitions are compressed. The black-hole flight is imaginative and the rendering is not a full general-relativity solver. These notes live in settings rather than blocking the experience.

No movie assets or soundtrack are included. Audio is synthesised locally. The WebGL-unavailable/context-loss paths exist but were not forced in the browser QA. Sound controls were tested, not a separate audio-quality measurement. Touch layout and shared zoom logic were reviewed; physical-device pinch input was not tested.

## 25 September 2026 — discovery and scale update

- Added a 3.5-second “Made by / Mr. Qiu” entrance credit and persistent bottom credit.
- Nearby-stars → Milky Way now transforms the neighbourhood and camera together into a galactic patch, then pulls out over 5.8 seconds with eased exponential distance. Corrected particle sizes to respect world scaling, removing a bright oversized-particle flash discovered during browser QA.
- Milky Way: 90,000 stars, central bar, textured dust in the diffuse disk. Galaxy gallery: spiral, barred spiral, elliptical, lenticular and irregular distributions.
- Five cosmic objects support object/dock selection, camera approach, a discovery dialog, close/reopen and return to collection. The collection is separate from automatic scale-wheel navigation.
- Browser-tested all five discovery dialogs; all four NASA-hosted observation images loaded with nonzero intrinsic widths. Wormholes explicitly show no photograph and explain their hypothetical status.
- Browser-checked 1280px desktop and 390px phone layouts, including scrollable discovery dialogs, navigation, credit, object dock and scale explanation. Increased phone collection viewing distance to keep edge objects in frame.
- Verified the entrance credit, scale-guide opening/closing, gentle-motion navigation and restored cinematic motion. Console checks returned no warnings or errors.
- Rechecked numerical comparisons: 60 AU / 105 metres ≈ 85.5 billion pitches; 50 light-years / 60 AU ≈ 52,701 Solar System widths. Displayed comparisons are approximate. Large regions are explicitly illustrative rather than measured scene bounds.
- JavaScript syntax checks and git whitespace validation passed.

Limitations: artistic models, not a physically scaled atlas; wormholes are hypothetical; black-hole/galaxy geometry is an illustration. Telescope images are credited, with instrument/wavelength caveats and source links. Laptop/mobile GPU performance can differ from the tested desktop.

## Gallery and challenge update

- Added a ten-question, untimed space challenge with shuffled questions/answers, locked answer selection, explanatory feedback and retry support.
- Browser-tested completed rounds at 7/10 (no badge) and 8/10 (Cosmic Explorer badge). Verified the earned state survives a reload on an isolated test origin, so the main preview retains a fresh personal record.
- Unit checks cover 0%, 70%, 80%, 100%, an empty denominator, question count, one correct choice per question and shuffle integrity.
- A static SVG badge download is available after earning the badge. SVG XML validates. The embedded browser did not report the initial dynamic-download event; replaced that implementation with a regular downloadable SVG asset link.
- Restored a six-image gallery with full-image views, previous/next controls, arrow-key navigation, credits and NASA source links. All six images loaded with nonzero intrinsic dimensions. Tested next, previous and back-to-grid interactions.
- Visually inspected desktop gallery, phone question controls and phone image viewer; reduced image letterboxing on mobile. Native dialogs retain keyboard focus and support Escape.
- JavaScript syntax and git whitespace checks passed. Best scores are local to this browser, with a session-only fallback when storage is unavailable.

## 24 October 2026 — deeper universe

- Rebuilt the entrance as a 16-second approach, curved dust-and-star tunnel, and overlapping reveal of the moving Solar System. Two HDR scenes blend before bloom, avoiding the previous cut. Skip and gentle-motion paths remain available.
- Quintic easing, overlapping scale views and exponential camera distances soften travel; nearby stars transform with the camera into a galactic patch for a 7.2-second pullback. Requests during travel are queued.
- Increased wheel, trackpad-pinch and touch-pinch responsiveness, with strongest trackpad response in the Solar System. Physical two-finger hardware input was not tested.
- Added an illustrative observable-universe volume after the cosmic web, with a clear distinction between the observable horizon and all space.
- Added an Interstellar-inspired black-hole system with three original fictional worlds, a close approach, and interactive clock comparison. Simplified stationary Schwarzschild clocks are separate from the explicitly fictional seven-years-per-hour preset. Mass changes the displayed horizon radius; scene geometry is artistic.
- Rebuilt eight cosmic portraits with lensing, volumetric gas, shock shells, jets and illustrative magnetic fields. Added pulsars, magnetars and planetary nebulae. Cards appear after camera travel and fade in; non-photographic illustrations are labelled.
- Desktop browser checks: full entrance arrival, nearby-to-galactic travel, all eight collection models rendering, delayed magnetar card, observable universe, black-hole approach/overview, ocean-world approach, both clock modes and mass selection. No rendering warnings/errors in these checks.
- Automated tests cover the stationary-clock limit, horizon exclusion, mass scaling, cinematic conversion, bounded monotonic easing and stationary endpoints. All journey JavaScript syntax and whitespace checks pass.

Scientific references: NASA “How Big Is Space?” (observable diameter approximately 92 billion light-years), Einstein Online time dilation, University of Maryland ASTR350 lecture 8 (Schwarzschild redshift), NASA HEASARC pulsars, and NASA Imagine the Universe neutron stars. Sources are linked in the relevant interface. Black-hole lensing, the wormhole flight, magnetic field illustrations and planetary orbits are artistic teaching visuals, not a relativistic simulation.

## 25 October 2026 — follow-up QA and visual polish

- Added Scenic view (diamond control or H) with a persistent Show controls button and Escape exit. Hidden controls are inert so keyboard focus cannot disappear into the interface.
- Hid black-hole orbit guides during close approaches, planet focus and Scenic view. Updated camera-facing portraits after camera movement to eliminate a one-frame orientation lag.
- Browser-tested all eight discovery dialogs with gentle motion, all three expedition worlds and return to overview, scenic entry/Escape exit, paused clock reset, gallery access and trivia introduction. All six gallery images loaded. No browser warnings or errors were reported in the follow-up checks.
- Existing automated relativity/easing tests, JavaScript syntax checks and whitespace validation pass. Physical trackpad/touch gestures and GPU performance on other computers remain unverified.
- Live deployment smoke test caught a cached older animation module paired with the new HTML. Added release query versions to the entry scripts, stylesheet and relative journey-module imports so existing visitors receive a consistent release.

## 25 October 2026 — living worlds and nebula voyage

- Solar System time selector: freeze, 1, 10, 50 or 200 simulated days per second, with elapsed-day feedback and a visible paused state. Orbital periods keep their approximate real ratios; displayed sizes, distances and spin remain illustrative. Verified accelerated time advances and freeze holds the counter unchanged.
- Sun is selectable through its dock button and directly on the canvas. Added animated granulation, sunspots, corona and prominence loops; increased sphere tessellation for close approaches.
- All eight planets now use 2048×1024 Solar System Scope maps (CC BY 4.0), with mapped Earth clouds, atmosphere, ocean highlights and subtle terrain shading. Moon uses a mapped surface too. Attribution is in assets/planets/ATTRIBUTION.md and the in-app About section. All ten downloaded assets validate as JPEGs.
- The black-hole system's ray-bending view uses the world-space camera direction; verified camera dragging changes the disk from face-on to inclined. Planets and orbit guides share the same tilted Kepler ellipse calculation with the black hole at a focus. Unit tests verify periapsis/apoapsis, tilt-preserved radius, orbital periods and frozen time.
- Added nebula.html: a ray-marched cloud volume with three blending palettes, embedded stars, orbit/zoom, drift pause, re-centre, Scenic view/Escape and real Webb photos. Tested palette selection, pause, scenic return, photo loading and navigation back. About 47 fps observed on this desktop; adaptive resolution reduces rendering load when needed. GPU performance on other devices is unverified.
- Visual QA covered desktop and 390×844 layouts, Sun/Mars/Earth/Jupiter close-ups, and selection of every planet. Fixed an overlapping time panel, reduced overly harsh procedural terrain, replaced generic maps and refined nebula contrast. Browser checks reported no shader errors or warnings.
- Five math tests pass, all journey modules pass syntax checks, and git whitespace checks pass. Physical touch/pinch hardware was not tested.

## Pillars and galactic heart — 25 October 2026

- Nebula opens on an artistic three-pillar formation, with three selectable stars, eased approach/return flights and a whole-nebula reset.
- Explicit back controls on both the voyage and real-photo dialog; dialog return and star approach verified in browser.
- Rebuilt barred spiral galaxy with dust, bulge, star-forming regions and Sagittarius A* approach/return; visually checked in browser.
- Milky Way home marker retained at larger scales; observable-universe marker and return verified.
- Cinema is the initial clock mode (1 hour = 7 years); selecting Physics enables the radius slider and changes the ratio. Verified in browser.
- Five existing orbit/relativity tests pass. Browser reported no JavaScript errors during main exploration.
- Mobile viewport override did not take effect in this browser session; mobile layout has not been visually verified for this release.
- Nebula geometry, star names, lensing and close-up scales are illustrative, labelled accordingly.

## Restore original nebula — 25 October 2026

- Restored the original cloud-volume nebula shader and three original palettes, retaining explicit back links.
- Expanded camera distance from 1.1–8 to 0.35–13. Doubled normal zoom sensitivity and added faster trackpad pinch response.
- Removed floating solar planet labels and orbital path geometry. Planet selection remains available in the dock.
- Desktop browser visual QA confirms the restored clouds, inward/outward zoom and reset, and the solar scene without path lines or floating names. No solar console errors observed. JavaScript syntax and whitespace checks passed.

## Cosmic futures and a sense of home — 26 October 2026

- Restored Solar System orbit paths at low opacity (0.09), hidden during close-ups. Added a procedural galactic sky band and a brighter distant star dome.
- Home marker follows Earth, then the Solar System, then the Sun’s approximate galactic location and the Milky Way at larger scales. Marker actions step back towards home. Cosmic-web copy distinguishes the network from supercluster neighbourhoods.
- Nearby-star and galaxy spatial extents are 5× the prior values; satellite galaxy models are 3× larger. Camera framing and maximum distance adjusted independently to preserve the feeling of depth. These are artistic scene coordinates, not a revised physical measurement.
- New futures.html: three 32-second chapters, pause/replay/scrubbing, reduced-motion initial pause, modal science notes, and source links. Collapse/bounce and static balance are clearly speculative. Expansion includes red giant, shell shedding, white dwarf, distant recession, and eventual fading, with compressed timescales explained.
- Desktop browser checks: Solar System orbit/sky/home appearance; nearby and galaxy scale views; collapse, sustain and expansion chapter selection; scrubbing and ending/replay labels; science modal return; direct futures-to-Solar-System navigation; gallery and challenge back controls. No JavaScript errors in observed futures or main-page sessions.
- All standalone HTML pages now expose a route to #solar-system (nebula, futures, learning explorer and classic explorer). Gallery and challenge retain state with explicit Back controls; photo/detail/settings dialogs retain close/return controls.
- JavaScript syntax checks, whitespace checks and five orbit/relativity tests passed. No mobile device performance claim; primary visual QA was desktop.

## Automatic wide reveals and galaxy recession — 26 October 2026

- Solar System → nearby stars and Milky Way → galaxies now use dedicated eight-second pullbacks. Incoming scenery is revealed early at its full extent, with wider automatic landing distances (2,300 / 3,200 scene units). Students no longer need another manual zoom to reveal the surroundings.
- Increased nearby field to 24,000 stars and the galaxy region to 100 surrounding galaxies; per-galaxy particle count reduced to limit cost.
- Replaced the Last Light solar evolution scene with 95 independently oriented spiral/elliptical galaxies. Positions separate exponentially while individual geometry remains unchanged; the chapter ends in darkness. Updated narrative and science notes to match.
- Desktop visual checks confirmed wider automatic landings, the beginning/middle/end of recession, and replay after completion. No observed main-page JavaScript errors. Five existing math tests, syntax and whitespace checks pass. Mobile performance not verified.
