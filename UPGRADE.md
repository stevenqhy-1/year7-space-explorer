# Space Explorer: interactive learning upgrade

The learning page at `learn.html` is a mission-control experience for Years 7–9. The original app remains at `classic.html`, including its orbital simulation, constellation scenes, formation animations and gallery.

## New experience

- 26 destinations across planets, stars, remnants, galaxies and smaller celestial objects.
- Local Three.js renderer and Earth texture; procedural surfaces, atmospheric glow, starfield, galaxy particles, accretion-disk particles and pulsar beams.
- Orbit, zoom, pause and camera reset controls.
- Field notes with facts and scientific thinking prompts.
- Three guided discovery missions with progress and completion bonuses.
- Gravity experiment with mass slider; comparative planet diameters, gravity and year lengths.
- Five-question knowledge check with immediate explanatory feedback and retry.
- Discoveries, rank and best quiz score stored locally. Repeated discoveries and repeated quiz scores do not farm XP.
- Responsive phone layout, keyboard-accessible buttons, modal focus management, reduced-motion support and WebGL fallback.

## Run

Run `python3 -m http.server 8765 --bind 127.0.0.1` from the repository, then open http://127.0.0.1:8765. No build or npm install is required. Deploy the repository root on GitHub Pages as before.

## Files

- `learn.html`, `css/explorer.css`, `js/explorer.js`: new experience.
- `data/content.json`: original content plus star-type lessons. Existing `stars.bodies` remains compatible with the original app.
- `vendor/`: Three.js 0.160.0 and OrbitControls, with MIT license.
- `assets/earth.jpg`: Earth texture from the Three.js example planet textures, https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg.
- `classic.html`, `js/main.js`, `js/scenes/`, `css/styles.css`: original experience.

## Teaching notes and limitations

The object viewer uses artistic models: sizes, distances, particle paths and rotation rates are not physically accurate. Planet-comparison circle diameters use one scale. Gravity values are rounded; giant-planet gravity refers to the cloud-top region. Black-hole rendering is not relativistic ray tracing. Star categories represent broad examples, not every evolutionary pathway. Quiz progress belongs to the browser/device, not an individual student account.

The new renderer and content work without external CDN requests. Google Fonts is optional and has system-font fallbacks. The preserved original experience still uses its original external dependencies and image sources.

Scientific references: [NASA star types](https://science.nasa.gov/universe/stars/types/), [NASA black holes](https://science.nasa.gov/universe/black-holes/), [NASA planetary fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/). Planet diameters are rounded mean diameters; some reference sheets instead list equatorial diameters.

## Validation performed

- JavaScript syntax check with Node.
- Opened all 26 destinations in the browser with no new runtime errors after the content adapter fix.
- Logged Earth, refreshed, and verified discovery and quiz XP persisted.
- Completed the five-question quiz (5/5, +150 XP); verified an incorrect answer reveals the explanation.
- Completed the rocky-world mission (4/4): 80 discovery XP + 100 completion XP.
- Gravity lab: 50 kg on Mars → 186 N; Earth → 491 N.
- Comparison: Jupiter/Earth diameter → 10.97; Earth/Earth → 1.00.
- Visually inspected desktop and 390 × 844 mobile layouts and the motion toggle.
- Original application source is retained; its full interaction set was not re-tested.
