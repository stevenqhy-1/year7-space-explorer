import * as THREE from 'three';
import { addStarfield, pickFromMeshes, disposeScene } from '../utils.js';

export function buildGalaxies({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);
  addStarfield(scene, 1500, 800);
  scene.add(new THREE.AmbientLight(0x444466, 1));

  const meshes = [];

  // Spiral galaxy generator
  function makeSpiral(x, y, z, arms = 4, radius = 25, color = 0xaabbff, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const dist = Math.pow(Math.random(), 0.7) * radius;
      const armAngle = (arm / arms) * Math.PI * 2;
      const twist = dist * 0.18;
      const a = armAngle + twist + (Math.random() - 0.5) * 0.4;
      positions[i*3]   = Math.cos(a) * dist;
      positions[i*3+1] = (Math.random() - 0.5) * 1.5;
      positions[i*3+2] = Math.sin(a) * dist;
      const t = 1 - dist / radius;
      colors[i*3]   = base.r * (0.6 + t * 0.6);
      colors[i*3+1] = base.g * (0.6 + t * 0.6);
      colors[i*3+2] = base.b * (0.6 + t * 0.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.9 });
    const pts = new THREE.Points(geo, mat);
    group.add(pts);

    // Bright core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.9 })
    );
    core.userData.key = key;
    group.add(core);
    meshes.push(core);

    scene.add(group);
    return group;
  }

  // Elliptical galaxy
  function makeElliptical(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 3000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i*3+2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffccaa, size: 0.4 }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.9 })
    );
    core.userData.key = key;
    group.add(core);
    meshes.push(core);
    scene.add(group);
    return group;
  }

  // Irregular galaxy
  function makeIrregular(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      positions[i*3]   = Math.cos(theta) * r + (Math.random() - 0.5) * 8;
      positions[i*3+1] = (Math.random() - 0.5) * 6;
      positions[i*3+2] = Math.sin(theta) * r + (Math.random() - 0.5) * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.4 }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.8 })
    );
    core.userData.key = key;
    group.add(core);
    meshes.push(core);
    scene.add(group);
    return group;
  }

  const milkyway = makeSpiral(-60, 0, 0, 4, 25, 0xaabbff, 'milky-way');
  addLabel(scene, 'Milky Way', -60, -28, 0);

  const andromeda = makeSpiral(0, 0, 0, 2, 28, 0xddccaa, 'andromeda');
  andromeda.rotation.x = 0.3;
  addLabel(scene, 'Andromeda', 0, -30, 0);

  makeElliptical(60, 0, 0, 'elliptical');
  addLabel(scene, 'Elliptical', 60, -22, 0);

  makeIrregular(120, 0, 0, 'irregular');
  addLabel(scene, 'Irregular', 120, -20, 0);

  camera.position.set(30, 40, 110);
  controls.target.set(30, 0, 0);
  controls.minDistance = 10;
  controls.maxDistance = 400;

  function update(dt) {
    milkyway.rotation.y += dt * 0.05;
    andromeda.rotation.y += dt * 0.05;
  }

  function handleClick(pointer, cam, raycaster) {
    const key = pickFromMeshes(pointer, cam, raycaster, meshes);
    if (key) onSelect(key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, handleClick, dispose };
}

function addLabel(scene, text, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 40);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(14, 3.5, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}
