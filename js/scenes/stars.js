import * as THREE from 'three';
import { addStarfield, disposeScene } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

const STARS = [
  { key: 'red-dwarf',  color: 0xff5533, size: 3,   x: -30 },
  { key: 'sun-like',   color: 0xffdd66, size: 6,   x: -10 },
  { key: 'blue-giant', color: 0x88bbff, size: 12,  x:  18 },
  { key: 'red-giant',  color: 0xff7744, size: 22,  x:  60 }
];

export function buildStars({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  addStarfield(scene, 3000, 1200);
  scene.add(new THREE.AmbientLight(0x222244, 1));

  const objects = {};
  for (const s of STARS) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.size, 64, 48),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    mesh.position.x = s.x;
    mesh.userData.key = s.key;
    scene.add(mesh);

    // Multi-layer glow
    const glow1 = new THREE.Mesh(
      new THREE.SphereGeometry(s.size * 1.15, 48, 48),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    const glow2 = new THREE.Mesh(
      new THREE.SphereGeometry(s.size * 1.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mesh.add(glow1); mesh.add(glow2);

    addLabel(scene, labelFor(s.key), s.x, -s.size - 5, 0);
    objects[s.key] = { mesh, size: s.size };
  }

  camera.position.set(15, 25, 100);
  controls.target.set(15, 0, 0);
  controls.minDistance = 2;
  controls.maxDistance = 400;
  controls.zoomSpeed = 2.0;

  function update(dt) {
    for (const k in objects) objects[k].mesh.rotation.y += dt * 0.08;
  }

  function focusOn(key) {
    const o = objects[key];
    if (!o) return;
    const pos = o.mesh.position.clone();
    flyTo(camera, controls, pos, viewpointFor(pos, o.size), 1.2);
    onSelect(key);
  }

  function clearFollow() {}

  function handleClick(pointer, cam, raycaster) {
    raycaster.setFromCamera(pointer, cam);
    const meshes = Object.values(objects).map(o => o.mesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) focusOn(hits[0].object.userData.key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, focusOn, clearFollow, handleClick, dispose };
}

function labelFor(key) {
  return { 'red-dwarf': 'Red Dwarf', 'sun-like': 'Sun-like', 'blue-giant': 'Blue Giant', 'red-giant': 'Red Giant' }[key] || key;
}

function addLabel(scene, text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(12, 3, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}
