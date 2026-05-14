import * as THREE from 'three';
import { addStarfield, disposeScene, makeLabel } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

// Create a soft round nebula sprite texture once and share it
function makeNebulaTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

const NEBULA_TEX = makeNebulaTexture();

function nebulaCloud(color, size, opacity = 0.45) {
  const mat = new THREE.SpriteMaterial({
    map: NEBULA_TEX, color,
    transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  return s;
}

export function buildGalaxies({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000308);
  addStarfield(scene, 2500, 1800);
  scene.add(new THREE.AmbientLight(0x444466, 1));

  // Distant background nebulae for atmosphere
  for (let i = 0; i < 12; i++) {
    const cloud = nebulaCloud(
      new THREE.Color().setHSL(0.55 + Math.random() * 0.3, 0.6, 0.4),
      80 + Math.random() * 120,
      0.12 + Math.random() * 0.18
    );
    cloud.position.set(
      (Math.random() - 0.5) * 600,
      (Math.random() - 0.5) * 400,
      -200 - Math.random() * 400
    );
    scene.add(cloud);
  }

  const objects = {};

  function makeSpiral(x, y, z, arms = 4, radius = 25, color = 0xaabbff, key, tilt = 0, hueShift = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.x = tilt;
    const count = 14000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      const distNorm = Math.pow(Math.random(), 0.62);
      const dist = distNorm * radius;
      const armAngle = (arm / arms) * Math.PI * 2;
      const twist = dist * 0.21;
      const a = armAngle + twist + (Math.random() - 0.5) * 0.5;
      positions[i*3]   = Math.cos(a) * dist;
      positions[i*3+1] = (Math.random() - 0.5) * (1.8 - distNorm * 1.3);
      positions[i*3+2] = Math.sin(a) * dist;
      // Color: brighter & warmer toward center, blue-ish at the edges
      const tNorm = 1 - distNorm;
      // Per-star variation
      const c = base.clone();
      c.offsetHSL(hueShift + (Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.15);
      colors[i*3]   = c.r * (0.55 + tNorm * 0.85);
      colors[i*3+1] = c.g * (0.55 + tNorm * 0.7);
      colors[i*3+2] = c.b * (0.6 + tNorm * 0.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    group.add(pts);

    // Dust lane — a slightly off-axis dark band of "dust" particles
    {
      const dustCount = 2500;
      const dust = new Float32Array(dustCount * 3);
      const dustColors = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = (0.3 + Math.random() * 0.65) * radius;
        const twist = r * 0.22;
        dust[i*3]   = Math.cos(a + twist) * r;
        dust[i*3+1] = (Math.random() - 0.5) * 0.4;
        dust[i*3+2] = Math.sin(a + twist) * r;
        dustColors[i*3] = 0.35;
        dustColors[i*3+1] = 0.20;
        dustColors[i*3+2] = 0.15;
      }
      const dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
      dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
      const dustMat = new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
      group.add(new THREE.Points(dustGeo, dustMat));
    }

    // Pink star-forming nebula patches scattered along the arms
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.3 + Math.random() * 0.6) * radius;
      const cloud = nebulaCloud(
        new THREE.Color().setHSL(0.92 + Math.random() * 0.05, 0.8, 0.55),  // pink/red H-II
        3 + Math.random() * 4, 0.65
      );
      cloud.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r);
      group.add(cloud);
    }
    // Blue young-star regions
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (0.4 + Math.random() * 0.6) * radius;
      const cloud = nebulaCloud(new THREE.Color(0x88bbff), 4 + Math.random() * 5, 0.5);
      cloud.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.6, Math.sin(a) * r);
      group.add(cloud);
    }

    // Bright core — multi-layer
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.98, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffddaa, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
    group.add(nebulaCloud(0xffeebb, 22, 0.7));

    scene.add(group);
    return { core, group };
  }

  function makeElliptical(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 9000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.5) * 18;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i*3+2] = r * Math.cos(phi);
      const tNorm = 1 - r / 18;
      colors[i*3] = 1.0 * (0.5 + tNorm * 0.5);
      colors[i*3+1] = 0.85 * (0.5 + tNorm * 0.4);
      colors[i*3+2] = 0.7 * (0.5 + tNorm * 0.3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    group.add(nebulaCloud(0xffddaa, 20, 0.5));
    scene.add(group);
    return { core, group };
  }

  function makeIrregular(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const count = 7000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      positions[i*3]   = Math.cos(theta) * r + (Math.random() - 0.5) * 10;
      positions[i*3+1] = (Math.random() - 0.5) * 7;
      positions[i*3+2] = Math.sin(theta) * r + (Math.random() - 0.5) * 10;
      const hue = 0.55 + Math.random() * 0.12;
      const c = new THREE.Color().setHSL(hue, 0.6, 0.65);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(pts);
    // Several pink star-forming patches — irregulars are often full of these
    for (let i = 0; i < 12; i++) {
      const cloud = nebulaCloud(
        new THREE.Color().setHSL(0.92, 0.8, 0.6), 3 + Math.random() * 4, 0.55
      );
      cloud.position.set(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 24
      );
      group.add(cloud);
    }
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    scene.add(group);
    return { core, group };
  }

  const milkyway = makeSpiral(-60, 0, 0, 4, 25, 0xaabbff, 'milky-way', 0.3, 0.0);
  addLabel(scene, 'Milky Way', -60, -34, 0);
  objects['milky-way'] = { ...milkyway, size: 22 };

  const andromeda = makeSpiral(0, 0, 0, 2, 28, 0xddccaa, 'andromeda', 0.2, 0.08);
  addLabel(scene, 'Andromeda', 0, -36, 0);
  objects['andromeda'] = { ...andromeda, size: 25 };

  const elliptical = makeElliptical(60, 0, 0, 'elliptical');
  addLabel(scene, 'Elliptical', 60, -28, 0);
  objects['elliptical'] = { ...elliptical, size: 18 };

  const irregular = makeIrregular(120, 0, 0, 'irregular');
  addLabel(scene, 'Irregular', 120, -26, 0);
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
  const sprite = makeLabel(text, { fontSize: 64, scale: 26 });
  sprite.position.set(x, y, z);
  scene.add(sprite);
}
