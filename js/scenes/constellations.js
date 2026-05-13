import * as THREE from 'three';
import { addStarfield, pickFromMeshes, disposeScene } from '../utils.js';

// Each constellation has named stars (positioned in 3D) and edges connecting them.
const CONSTELLATIONS = {
  'southern-cross': {
    label: 'Southern Cross',
    center: [-60, 20, 0],
    stars: [
      [0, 8, 0],   // top
      [0, -8, 0],  // bottom (Acrux)
      [-6, 0, 0],  // left
      [6, 0, 0]    // right
    ],
    edges: [[0,1],[2,3]]
  },
  orion: {
    label: 'Orion',
    center: [0, 0, 0],
    stars: [
      [-8, 8, 0],   // Betelgeuse
      [8, 8, 0],    // Bellatrix
      [-2, 0, 0],   // belt L (Alnitak)
      [0, 0, 0],    // belt M (Alnilam)
      [2, 0, 0],    // belt R (Mintaka)
      [-8, -10, 0], // Saiph
      [8, -10, 0]   // Rigel
    ],
    edges: [[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[5,6]]
  },
  scorpius: {
    label: 'Scorpius',
    center: [60, -10, 0],
    stars: [
      [-10, 8, 0], [-6, 6, 0], [0, 4, 0],
      [4, 0, 0], [6, -4, 0], [4, -8, 0],
      [0, -10, 0], [-4, -8, 0], [-6, -4, 0]
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]]
  }
};

const STAR_COLORS = {
  'southern-cross': 0xaaccff,
  'orion': 0xffffff,
  'scorpius': 0xff8844
};

export function buildConstellations({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 4000, 500);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const clickMeshes = [];

  for (const [key, c] of Object.entries(CONSTELLATIONS)) {
    const group = new THREE.Group();
    group.position.set(...c.center);

    // Stars
    const starPositions = c.stars;
    for (const [x, y, z] of starPositions) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 16, 16),
        new THREE.MeshBasicMaterial({ color: STAR_COLORS[key] })
      );
      star.position.set(x, y, z);
      // Glow
      star.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: STAR_COLORS[key], transparent: true, opacity: 0.25 })
      ));
      group.add(star);
    }

    // Edges
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4477aa, transparent: true, opacity: 0.5 });
    for (const [a, b] of c.edges) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...starPositions[a]),
        new THREE.Vector3(...starPositions[b])
      ]);
      group.add(new THREE.Line(geo, lineMat));
    }

    // Large invisible click sphere covering the constellation
    const clickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(14, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickSphere.userData.key = key;
    group.add(clickSphere);
    clickMeshes.push(clickSphere);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.label, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(12, 3, 1);
    sprite.position.set(0, -16, 0);
    group.add(sprite);

    scene.add(group);
  }

  camera.position.set(0, 10, 100);
  controls.target.set(0, 0, 0);
  controls.minDistance = 30;
  controls.maxDistance = 250;

  function update(dt) {}

  function handleClick(pointer, cam, raycaster) {
    raycaster.setFromCamera(pointer, cam);
    const hits = raycaster.intersectObjects(clickMeshes, false);
    if (hits.length === 0) return;
    onSelect(hits[0].object.userData.key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, handleClick, dispose };
}
