import * as THREE from 'three';
import { addStarfield, disposeScene } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

const CONSTELLATIONS = {
  'southern-cross': {
    label: 'Southern Cross',
    center: [-60, 20, 0],
    stars: [ [0, 8, 0], [0, -8, 0], [-6, 0, 0], [6, 0, 0] ],
    edges: [[0,1],[2,3]]
  },
  orion: {
    label: 'Orion',
    center: [0, 0, 0],
    stars: [
      [-8, 8, 0], [8, 8, 0], [-2, 0, 0], [0, 0, 0], [2, 0, 0],
      [-8, -10, 0], [8, -10, 0]
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
  addStarfield(scene, 5000, 600);
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const objects = {};

  for (const [key, c] of Object.entries(CONSTELLATIONS)) {
    const group = new THREE.Group();
    group.position.set(...c.center);
    for (const [x, y, z] of c.stars) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 24, 24),
        new THREE.MeshBasicMaterial({ color: STAR_COLORS[key] })
      );
      star.position.set(x, y, z);
      star.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 24, 24),
        new THREE.MeshBasicMaterial({ color: STAR_COLORS[key], transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
      ));
      group.add(star);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4477aa, transparent: true, opacity: 0.55 });
    for (const [a, b] of c.edges) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...c.stars[a]),
        new THREE.Vector3(...c.stars[b])
      ]);
      group.add(new THREE.Line(geo, lineMat));
    }
    const clickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(14, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickSphere.userData.key = key;
    group.add(clickSphere);

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
    objects[key] = { clickSphere, group, size: 18 };
  }

  camera.position.set(0, 10, 110);
  controls.target.set(0, 0, 0);
  controls.minDistance = 10;
  controls.maxDistance = 300;
  controls.zoomSpeed = 2.0;

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
