import * as THREE from 'three';
import { addStarfield, disposeScene } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

export function buildGalaxies({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);
  addStarfield(scene, 2000, 1500);
  scene.add(new THREE.AmbientLight(0x444466, 1));

  const objects = {};

  function makeSpiral(x, y, z, arms = 4, radius = 25, color = 0xaabbff, key, tilt = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.x = tilt;
    const count = 8000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const dist = Math.pow(Math.random(), 0.7) * radius;
      const armAngle = (arm / arms) * Math.PI * 2;
      const twist = dist * 0.18;
      const a = armAngle + twist + (Math.random() - 0.5) * 0.45;
      positions[i*3]   = Math.cos(a) * dist;
      positions[i*3+1] = (Math.random() - 0.5) * (1.5 - dist / radius);
      positions[i*3+2] = Math.sin(a) * dist;
      const t = 1 - dist / radius;
      colors[i*3]   = base.r * (0.55 + t * 0.7);
      colors[i*3+1] = base.g * (0.55 + t * 0.7);
      colors[i*3+2] = base.b * (0.55 + t * 0.7);
      sizes[i] = 0.3 + Math.random() * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    group.add(pts);

    // Bright core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    // Soft halo
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    scene.add(group);
    return { core, group };
  }

  function makeElliptical(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 6000;
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
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffccaa, size: 0.4, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    scene.add(group);
    return { core, group };
  }

  function makeIrregular(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 4000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      positions[i*3]   = Math.cos(theta) * r + (Math.random() - 0.5) * 10;
      positions[i*3+1] = (Math.random() - 0.5) * 7;
      positions[i*3+2] = Math.sin(theta) * r + (Math.random() - 0.5) * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.4, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    scene.add(group);
    return { core, group };
  }

  const milkyway = makeSpiral(-60, 0, 0, 4, 25, 0xaabbff, 'milky-way', 0.3);
  addLabel(scene, 'Milky Way', -60, -30, 0);
  objects['milky-way'] = { ...milkyway, size: 22 };

  const andromeda = makeSpiral(0, 0, 0, 2, 28, 0xddccaa, 'andromeda', 0.2);
  addLabel(scene, 'Andromeda', 0, -32, 0);
  objects['andromeda'] = { ...andromeda, size: 25 };

  const elliptical = makeElliptical(60, 0, 0, 'elliptical');
  addLabel(scene, 'Elliptical', 60, -24, 0);
  objects['elliptical'] = { ...elliptical, size: 18 };

  const irregular = makeIrregular(120, 0, 0, 'irregular');
  addLabel(scene, 'Irregular', 120, -22, 0);
  objects['irregular'] = { ...irregular, size: 15 };

  camera.position.set(30, 50, 130);
  controls.target.set(30, 0, 0);
  controls.minDistance = 8;
  controls.maxDistance = 500;
  controls.zoomSpeed = 4.0;

  function update(dt) {
    milkyway.group.rotation.y += dt * 0.05;
    andromeda.group.rotation.y += dt * 0.05;
  }

  function focusOn(key) {
    const o = objects[key];
    if (!o) return;
    const pos = o.group.position.clone();
    flyTo(camera, controls, pos, viewpointFor(pos, o.size, new THREE.Vector3(0.3, 0.6, 1)), 1.2);
    onSelect(key);
  }

  function clearFollow() {}

  function handleClick(pointer, cam, raycaster) {
    raycaster.setFromCamera(pointer, cam);
    const meshes = Object.values(objects).map(o => o.core);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) focusOn(hits[0].object.userData.key);
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, focusOn, clearFollow, handleClick, dispose };
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
