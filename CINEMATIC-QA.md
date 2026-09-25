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
