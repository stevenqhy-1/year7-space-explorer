import * as THREE from 'three';
import { addStarfield, disposeScene, makeLabel } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

// Each star: [x, y, z, brightness (0..1), namedColor?]
// Edges connect star indices forming the figure outline.
const ZODIAC = {
  aries: {
    name: 'Aries', symbol: '♈', label: 'The Ram', color: 0xfff0d0,
    stars: [ [-9, 3, 0, 0.85, 0xffe4b8], [-3, 1, 0, 0.5], [3, -1, 0, 0.45], [8, -2, 0, 0.4] ],
    edges: [[0,1],[1,2],[2,3]]
  },
  taurus: {
    name: 'Taurus', symbol: '♉', label: 'The Bull', color: 0xffe0a0,
    stars: [ [-6, -2, 0, 1.0, 0xff8866], [-2, 0, 0, 0.5], [2, 3, 0, 0.5], [6, 7, 0, 0.65], [-1, 4, 0, 0.45], [-6, 7, 0, 0.55] ],
    edges: [[0,1],[1,2],[2,3],[1,4],[4,5]]
  },
  gemini: {
    name: 'Gemini', symbol: '♊', label: 'The Twins', color: 0xfff0c0,
    stars: [
      [-5, 8, 0, 0.85, 0xffeacc],  [-5, 4, 0, 0.4],  [-5, 0, 0, 0.4],  [-5, -4, 0, 0.4],
      [4, 7, 0, 0.85, 0xffdda0],   [4, 3, 0, 0.4],   [4, -1, 0, 0.4],  [4, -5, 0, 0.4]
    ],
    edges: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[0,4]]
  },
  cancer: {
    name: 'Cancer', symbol: '♋', label: 'The Crab', color: 0xd8d8ee,
    stars: [ [0, 4, 0, 0.45], [0, 0, 0, 0.55], [-5, -3, 0, 0.4], [5, -3, 0, 0.4], [0, -6, 0, 0.4] ],
    edges: [[0,1],[1,2],[1,3],[1,4]]
  },
  leo: {
    name: 'Leo', symbol: '♌', label: 'The Lion', color: 0xfff8d0,
    stars: [
      [-8, 6, 0, 0.9, 0xeaf0ff],   // Regulus (blue-white)
      [-9, 2, 0, 0.5], [-7, -1, 0, 0.5], [-3, 0, 0, 0.5], [-1, 4, 0, 0.5], [3, 4, 0, 0.5],
      [9, 1, 0, 0.75], [4, -4, 0, 0.5]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,2]]
  },
  virgo: {
    name: 'Virgo', symbol: '♍', label: 'The Maiden', color: 0xeef0ff,
    stars: [
      [-9, 3, 0, 0.5], [-4, 5, 0, 0.6], [1, 3, 0, 0.45], [4, -1, 0, 0.5],
      [1, -5, 0, 0.95, 0xcce0ff], // Spica (blue-white)
      [-2, -3, 0, 0.4], [-5, -1, 0, 0.4], [-9, -3, 0, 0.4]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
  },
  libra: {
    name: 'Libra', symbol: '♎', label: 'The Scales', color: 0xddeeff,
    stars: [
      [-6, 3, 0, 0.6], [0, 6, 0, 0.5], [6, 3, 0, 0.65],
      [-8, -2, 0, 0.4], [-3, -4, 0, 0.4], [3, -4, 0, 0.4], [8, -2, 0, 0.4]
    ],
    edges: [[0,1],[1,2],[2,0],[0,3],[3,4],[2,6],[6,5]]
  },
  scorpius: {
    name: 'Scorpius', symbol: '♏', label: 'The Scorpion', color: 0xff8866,
    stars: [
      [-11, 5, 0, 0.5], [-7, 6, 0, 0.5], [-3, 4, 0, 0.5],
      [0, 0, 0, 1.0, 0xff5530], // Antares
      [3, -4, 0, 0.55], [6, -7, 0, 0.5], [8, -9, 0, 0.5], [11, -7, 0, 0.55], [12, -3, 0, 0.6]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]
  },
  sagittarius: {
    name: 'Sagittarius', symbol: '♐', label: 'The Archer', color: 0xffe2a8,
    stars: [
      [-6, 0, 0, 0.65], [-3, 3, 0, 0.55], [0, 5, 0, 0.5], [3, 3, 0, 0.55],
      [3, 0, 0, 0.55], [-3, 0, 0, 0.5], [6, 1, 0, 0.5], [7, -2, 0, 0.5]
    ],
    edges: [[0,5],[5,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7],[7,4]]
  },
  capricorn: {
    name: 'Capricorn', symbol: '♑', label: 'The Sea-goat', color: 0xeed8a0,
    stars: [
      [-8, 3, 0, 0.65], [-3, 5, 0, 0.5], [2, 4, 0, 0.55], [6, 1, 0, 0.5],
      [9, -3, 0, 0.5], [5, -6, 0, 0.55], [-1, -5, 0, 0.5], [-6, -2, 0, 0.5]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]]
  },
  aquarius: {
    name: 'Aquarius', symbol: '♒', label: 'The Water-bearer', color: 0xb4d4ff,
    stars: [
      [-8, 4, 0, 0.55], [-3, 3, 0, 0.5], [1, 4, 0, 0.55], [5, 2, 0, 0.5],
      [4, -2, 0, 0.45], [6, -5, 0, 0.45], [1, -5, 0, 0.45], [-3, -3, 0, 0.45]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7]]
  },
  pisces: {
    name: 'Pisces', symbol: '♓', label: 'The Fish', color: 0xb4ecff,
    stars: [
      [-9, 5, 0, 0.45], [-5, 3, 0, 0.45], [-1, 1, 0, 0.45], [1, -1, 0, 0.6],
      [4, -1, 0, 0.45], [7, 0, 0, 0.45], [10, 1, 0, 0.45],
      [-8, 7, 0, 0.45], [-4, 8, 0, 0.45]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,7],[7,8]]
  }
};

const GRID = [
  ['aries', 'taurus', 'gemini', 'cancer'],
  ['leo', 'virgo', 'libra', 'scorpius'],
  ['sagittarius', 'capricorn', 'aquarius', 'pisces']
];

const COL_SPACING = 58;
const ROW_SPACING = 46;

export function buildConstellations({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 6000, 700);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const objects = {};
  const xOffset = -((GRID[0].length - 1) * COL_SPACING) / 2;
  const yOffset = ((GRID.length - 1) * ROW_SPACING) / 2;

  for (let row = 0; row < GRID.length; row++) {
    for (let col = 0; col < GRID[row].length; col++) {
      const key = GRID[row][col];
      const c = ZODIAC[key];
      const x = col * COL_SPACING + xOffset;
      const y = -row * ROW_SPACING + yOffset;

      const group = new THREE.Group();
      group.position.set(x, y, 0);

      // Stars — size + color vary by brightness
      const starMeshes = [];
      for (const s of c.stars) {
        const [sx, sy, sz, brightness = 0.5, namedColor] = s;
        const color = namedColor || c.color;
        const size = 0.3 + brightness * 0.9;
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(size, 24, 24),
          new THREE.MeshBasicMaterial({ color })
        );
        star.position.set(sx, sy, sz);
        // Glow halo
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(size * 2.4, 24, 24),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 + brightness * 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        star.add(glow);
        // Outer soft halo for bright named stars
        if (namedColor || brightness > 0.8) {
          const outer = new THREE.Mesh(
            new THREE.SphereGeometry(size * 4, 24, 24),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
          );
          star.add(outer);
        }
        group.add(star);
        starMeshes.push(star);
      }

      // Connecting lines — subtle glow blue
      for (const [a, b] of c.edges) {
        const pA = new THREE.Vector3(...c.stars[a].slice(0, 3));
        const pB = new THREE.Vector3(...c.stars[b].slice(0, 3));
        const geo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x5588cc, transparent: true, opacity: 0.55 }));
        group.add(line);
      }

      // Big invisible click sphere covering the figure
      const clickSphere = new THREE.Mesh(
        new THREE.SphereGeometry(18, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      clickSphere.userData.key = key;
      group.add(clickSphere);

      // Big label below the figure
      const label = makeLabel(`${c.symbol}  ${c.name}`, {
        fontSize: 56,
        color: '#ffffff',
        subtitle: c.label,
        subtitleColor: '#88aaff',
        scale: 30
      });
      label.position.set(0, -19, 0);
      group.add(label);

      scene.add(group);
      objects[key] = { clickSphere, group, size: 22 };
    }
  }

  // Camera looks at the whole grid from outside
  camera.position.set(0, 0, 220);
  controls.target.set(0, 0, 0);
  controls.minDistance = 8;
  controls.maxDistance = 500;

  function update(dt) {}

  function focusOn(key) {
    const o = objects[key];
    if (!o) return;
    const pos = o.group.position.clone();
    flyTo(camera, controls, pos, viewpointFor(pos, o.size, new THREE.Vector3(0, 0, 1)), 1.2);
    onSelect(key);
  }

  function clearFollow() {}

  function handleClick(pointer, cam, raycaster) {
    raycaster.setFromCamera(pointer, cam);
    const meshes = Object.values(objects).map(o => o.clickSphere);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) focusOn(hits[0].object.userData.key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, focusOn, clearFollow, handleClick, dispose };
}
