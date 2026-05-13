# Year 7 Space Explorer

An interactive 3D web page for Year 7 science (Western Australia curriculum) covering planets, stars, moons, asteroids, meteors, comets, constellations and galaxies.

## Run locally

```bash
cd ~/year7-space-explorer
python3 -m http.server 8765
```

Then open <http://localhost:8765/> in Safari or Chrome on the MacBook.

> No build step. No dependencies. Three.js is loaded from a CDN.

## What students can do

| Scene | What's in it |
|-------|--------------|
| **Solar System** | Sun, 8 planets, Moon, asteroid belt, comet, meteor. Click anything for a short caption. **Scale slider** shows the difference between textbook ("illustrative") and real-world ("true") scale. |
| **Stars** | Red dwarf, Sun-like, blue giant and red giant placed side-by-side so students can compare sizes and colours. |
| **Stellar Remnants** | White dwarf, neutron star, pulsar (with rotating beams), black hole (with accretion disk), supernova (pulsing). |
| **Galaxies** | Milky Way, Andromeda, plus elliptical and irregular galaxy examples. |
| **Constellations** | Southern Cross, Orion, Scorpius — visible from WA. |

Controls: drag to rotate, scroll to zoom, click an object for info.

## Editing content

All captions, facts and labels live in **`data/content.json`**. Edit that file and refresh the page — no code changes needed.

The structure is:

```json
{
  "<scene>": {
    "hint": "Short hint shown in the corner",
    "objects": {
      "<object-key>": {
        "name": "Display name",
        "type": "Star / Planet / etc.",
        "caption": "Short paragraph",
        "facts": { "Diameter": "...", "Year length": "..." }
      }
    }
  }
}
```

## Version history (rollback)

Each milestone is a git tag. To see what changed:

```bash
git log --oneline
git tag
```

To roll back to any version:

```bash
git checkout v0.4-remnants     # try an older version
git checkout main              # back to latest
```

Available tags:

- `v0.1-skeleton` — empty page with navigation
- `v0.2-solar-system` — first scene added
- `v0.3-stars` — star types comparison
- `v0.4-remnants` — pulsar, black hole, supernova
- `v0.5-galaxies` — galaxy types
- `v0.6-constellations` — Southern Cross etc.
- `v1.0` — first classroom-ready release

## Deploy to GitHub Pages

1. Create a public repo on GitHub (suggested name: `year7-space-explorer`).
2. Push:
   ```bash
   git remote add origin https://github.com/stevenqhy-1/year7-space-explorer.git
   git branch -M main
   git push -u origin main --tags
   ```
3. On GitHub: **Settings → Pages → Source → Deploy from branch → main / root**.
4. Wait ~1 min. Site appears at <https://stevenqhy-1.github.io/year7-space-explorer/>.

## Curriculum alignment

WA Science Year 7 outcome targeted:

> *Describe objects in space including planets, stars, moons, asteroids, meteors, comets, constellations and galaxies.*

Every category in that outcome has at least one clickable example with a short caption.
