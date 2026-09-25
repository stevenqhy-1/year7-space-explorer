# Cinematic universe — plan and baseline QA

## Confirmed direction
Guided cinematic entrance followed by free exploration. An imaginative wormhole-like flight from an Interstellar-inspired black hole into the Solar System. Prioritise powerful computers, maximum visual effects and optional sound. Visual curiosity and a sense of scale are the primary experience; remove lessons and numerical parameter panels from the main journey.

## Baseline QA (before implementation)
- Current site loads and the black-hole destination renders; no console errors in the reviewed session.
- Opening is Earth within a dashboard, not a full-screen black hole.
- Black hole is a sphere, torus and flat particle disk; lacks warped-light structure and cinematic luminosity.
- Destinations are replaced individually; zoom is clamped to 5–17 scene units, so there is no continuous scale journey.
- Fact panels, missions, XP and navigation compete with the visuals.
- Existing assets, procedural planet textures and Three.js can be reused. Existing learning and classic experiences should remain accessible.

## Implementation
1. Preserve the existing learning experience at learn.html.
2. Build a full-screen black-hole shader with curved light paths, turbulent accretion emission, bloom and a sparse entrance UI.
3. Implement a skippable cinematic flight, with optional original synthesised audio.
4. Build connected exploration layers: planets / Solar System / stellar neighbourhood / Milky Way / galaxies.
5. Support planet selection, drag/orbit, wheel/pinch zoom, explicit outward/inward steps, home and replay controls.
6. Add adaptive rendering quality, optional reduced motion and recoverable loading/WebGL states.
7. QA the entrance, full journey, repeat navigation, touch layout, reduced motion, audio and performance; deliver updates to the existing GitHub review branch.

## Visual thesis
An astronomical film you can move through: almost-black space, warm white-gold accretion light, deep blue atmospheres and violet nebulae. The universe fills the screen; interface controls stay at the edges. No movie footage, soundtrack or branding is used. Scale layers are artistic transitions, not a physically accurate continuous coordinate system.
