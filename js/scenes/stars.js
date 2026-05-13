import * as THREE from 'three';
import { addStarfield, pickFromMeshes, disposeScene } from '../utils.js';

const STARS = [
  { key: 'red-dwarf',  color: 0xff5533, size: 3,   x: -30, label: 'Red Dwarf' },
  { key: 'sun-like',   color: 0xffdd66, size: 6,   x: -10, label: 'Sun-like' },
  { key: 'blue-giant', color: 0x88bbff, size: 12,  x:  15, label: 'Blue Giant' },
  { key: 'red-giant',  color: 0xff7744, size: 22,  x:  50, label: 'Red Giant' }
];

export function buildStars({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000010);
  addStarfield(scene, 2000, 600);

  scene.add(new THREE.AmbientLight(0x222244, 1));

  const meshes = [];
  for (const s of STARS) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.size, 48, 48),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    mesh.position.x = s.x;
    mesh.userData.key = s.key;
    scene.add(mesh);
    meshes.push(mesh);

    // Glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(s.size * 1.25, 48, 48),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.18 })
    );
    mesh.add(glow);

    // Label as floating sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.label, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(12, 3, 1);
    sprite.position.set(s.x, -s.size - 4, 0);
    scene.add(sprite);
  }

  camera.position.set(10, 20, 80);
  controls.target.set(10, 0, 0);
  controls.minDistance = 5;
  controls.maxDistance = 300;

  function update(dt) {
    for (const m of meshes) m.rotation.y += dt * 0.1;
  }

  function handleClick(pointer, cam, raycaster) {
    const key = pickFromMeshes(pointer, cam, raycaster, meshes);
    if (key) onSelect(key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, handleClick, dispose };
}
