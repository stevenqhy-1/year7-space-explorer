import * as THREE from 'three';
import { addStarfield, disposeScene, makeLabel, softPointTexture } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

// Shared soft round sprite for nebula clouds
function makeNebulaTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const NEBULA_TEX = makeNebulaTexture();

function nebulaCloud(color, size, opacity = 0.5) {
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
  addStarfield(scene, 3000, 1800);
  scene.add(new THREE.AmbientLight(0x444466, 1));

  // Distant background nebulae
  for (let i = 0; i < 18; i++) {
    const cloud = nebulaCloud(
      new THREE.Color().setHSL(0.55 + Math.random() * 0.3, 0.6, 0.4),
      80 + Math.random() * 140,
      0.10 + Math.random() * 0.18
    );
    cloud.position.set(
      (Math.random() - 0.5) * 700,
      (Math.random() - 0.5) * 450,
      -250 - Math.random() * 500
    );
    scene.add(cloud);
  }

  const objects = {};

  function makeSpiral(x, y, z, opts) {
    const {
      arms = 4,
      radius = 28,
      coreColor = 0xffeebb,
      armColorHue = 0.62,       // blue-white
      tilt = 0.3,
      key,
      hIIChance = 0.10,         // probability of a pink H-II star
      companion = null          // optional { dx, dy, dz, scale, color }
    } = opts;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.x = tilt;

    // ── 1. Soft underglow disk (the "smoky base")
    const baseGlow = nebulaCloud(coreColor, radius * 1.6, 0.28);
    group.add(baseGlow);

    // ── 2. Particle disk (the stars)
    const count = 32000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const arm = i % arms;
      // Distance from center, biased toward middle of disk
      const distNorm = Math.pow(Math.random(), 0.62);
      const dist = distNorm * radius;
      // Spiral arm angle — logarithmic twist
      const armAngle = (arm / arms) * Math.PI * 2;
      const twist = Math.log(dist + 1) * 1.0;
      // Gaussian spread around arm centerline
      const spreadFactor = 0.42 * (1 - distNorm * 0.3);
      const u1 = Math.random(), u2 = Math.random();
      const gauss = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
      const armOffset = gauss * spreadFactor;
      const a = armAngle + twist + armOffset;

      positions[i*3]   = Math.cos(a) * dist;
      // Disk thickness — thinner at the edges
      positions[i*3+1] = (Math.random() - 0.5) * (1.2 - distNorm * 0.8);
      positions[i*3+2] = Math.sin(a) * dist;

      // Pick color
      if (distNorm < 0.18) {
        // Core: warm yellow-white
        tmpColor.setRGB(
          1.0,
          0.85 + Math.random() * 0.15,
          0.55 + Math.random() * 0.25
        );
      } else if (Math.random() < hIIChance && Math.abs(armOffset) < 0.25) {
        // H-II region: pink/magenta star near arm centerline
        tmpColor.setHSL(0.92 + (Math.random() - 0.5) * 0.05, 0.85, 0.55 + Math.random() * 0.2);
      } else {
        // Arm star: blue-white with slight hue variation
        const h = armColorHue + (Math.random() - 0.5) * 0.04;
        const l = 0.62 + Math.random() * 0.18;
        tmpColor.setHSL(h, 0.4, l);
      }
      // Falloff toward the edges
      const falloff = 0.45 + (1 - distNorm) * 0.55;
      colors[i*3]   = tmpColor.r * falloff;
      colors[i*3+1] = tmpColor.g * falloff;
      colors[i*3+2] = tmpColor.b * falloff;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      map: softPointTexture(),
      size: 0.9,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      alphaTest: 0.001
    });
    group.add(new THREE.Points(geo, mat));

    // ── 3. Pink H-II nebula sprites distributed along the arms
    for (let i = 0; i < 60; i++) {
      const arm = i % arms;
      const distNorm = 0.18 + Math.random() * 0.75;
      const dist = distNorm * radius;
      const twist = Math.log(dist + 1) * 1.0;
      const armAngle = (arm / arms) * Math.PI * 2;
      const a = armAngle + twist + (Math.random() - 0.5) * 0.25;
      const cloud = nebulaCloud(
        new THREE.Color().setHSL(0.93, 0.85, 0.6),
        1.5 + Math.random() * 3,
        0.55 + Math.random() * 0.2
      );
      cloud.position.set(
        Math.cos(a) * dist,
        (Math.random() - 0.5) * 0.4,
        Math.sin(a) * dist
      );
      group.add(cloud);
    }

    // ── 4. Blue young-star clouds (smaller, scattered)
    for (let i = 0; i < 30; i++) {
      const arm = i % arms;
      const distNorm = 0.25 + Math.random() * 0.65;
      const dist = distNorm * radius;
      const twist = Math.log(dist + 1) * 1.0;
      const armAngle = (arm / arms) * Math.PI * 2;
      const a = armAngle + twist + (Math.random() - 0.5) * 0.3;
      const cloud = nebulaCloud(
        new THREE.Color().setHSL(0.58 + Math.random() * 0.06, 0.6, 0.7),
        2 + Math.random() * 4,
        0.35
      );
      cloud.position.set(
        Math.cos(a) * dist,
        (Math.random() - 0.5) * 0.4,
        Math.sin(a) * dist
      );
      group.add(cloud);
    }

    // ── 5. Bright multi-layer core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfff4cc, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    core.userData.key = key;
    group.add(core);
    group.add(nebulaCloud(0xffe8b0, 8, 0.85));
    group.add(nebulaCloud(0xffd890, 16, 0.55));
    group.add(nebulaCloud(0xffcc77, 30, 0.25));

    // ── 6. Optional companion galaxy (for M51-style pair)
    if (companion) {
      const compGroup = new THREE.Group();
      compGroup.position.set(companion.dx, companion.dy, companion.dz);
      // Small particle blob
      const compCount = 8000;
      const compPos = new Float32Array(compCount * 3);
      const compColors = new Float32Array(compCount * 3);
      for (let i = 0; i < compCount; i++) {
        const r = Math.pow(Math.random(), 1.4) * companion.scale * 0.9;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        compPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        compPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
        compPos[i*3+2] = r * Math.cos(phi);
        const f = 0.6 + (1 - r / (companion.scale * 0.9)) * 0.4;
        const c = new THREE.Color(companion.color);
        compColors[i*3] = c.r * f;
        compColors[i*3+1] = c.g * f;
        compColors[i*3+2] = c.b * f;
      }
      const compGeo = new THREE.BufferGeometry();
      compGeo.setAttribute('position', new THREE.BufferAttribute(compPos, 3));
      compGeo.setAttribute('color', new THREE.BufferAttribute(compColors, 3));
      const compMat = new THREE.PointsMaterial({
        map: softPointTexture(),
        size: 0.8, vertexColors: true,
        transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
        sizeAttenuation: true, alphaTest: 0.001
      });
      compGroup.add(new THREE.Points(compGeo, compMat));
      compGroup.add(nebulaCloud(companion.color, companion.scale * 1.5, 0.4));
      const compCore = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 32, 32),
        new THREE.MeshBasicMaterial({
          color: companion.color, transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      compGroup.add(compCore);
      group.add(compGroup);
    }

    scene.add(group);
    return { core, group };
  }

  function makeElliptical(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(nebulaCloud(0xffd8a8, 36, 0.4));
    const count = 14000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i*3+2] = r * Math.cos(phi);
      const tNorm = 1 - r / 20;
      colors[i*3]   = 1.0 * (0.5 + tNorm * 0.5);
      colors[i*3+1] = 0.85 * (0.5 + tNorm * 0.45);
      colors[i*3+2] = 0.65 * (0.5 + tNorm * 0.35);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: softPointTexture(),
      size: 0.85, vertexColors: true,
      transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true, alphaTest: 0.001
    }));
    group.add(pts);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.userData.key = key;
    group.add(core);
    group.add(nebulaCloud(0xffe2b0, 10, 0.8));
    group.add(nebulaCloud(0xffd690, 20, 0.4));
    scene.add(group);
    return { core, group };
  }

  function makeIrregular(x, y, z, key) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(nebulaCloud(0xb4ccff, 30, 0.32));
    const count = 12000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      positions[i*3]   = Math.cos(theta) * r + (Math.random() - 0.5) * 10;
      positions[i*3+1] = (Math.random() - 0.5) * 7;
      positions[i*3+2] = Math.sin(theta) * r + (Math.random() - 0.5) * 10;
      const hue = 0.55 + Math.random() * 0.15;
      const c = new THREE.Color().setHSL(hue, 0.55, 0.7);
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: softPointTexture(),
      size: 0.85, vertexColors: true,
      transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true, alphaTest: 0.001
    }));
    group.add(pts);
    // Many pink star-forming patches
    for (let i = 0; i < 20; i++) {
      const cloud = nebulaCloud(
        new THREE.Color().setHSL(0.92, 0.85, 0.6), 2 + Math.random() * 4, 0.55
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

  // Milky Way — classic 4-arm barred spiral
  const milkyway = makeSpiral(-70, 0, 0, {
    arms: 4, radius: 28, key: 'milky-way',
    tilt: 0.3, armColorHue: 0.62
  });
  addLabel(scene, 'Milky Way', -70, -36, 0);
  objects['milky-way'] = { ...milkyway, size: 22 };

  // Andromeda — 2-arm spiral with a small yellow companion (M32-style)
  const andromeda = makeSpiral(5, 0, 0, {
    arms: 2, radius: 32, key: 'andromeda',
    tilt: 0.25, armColorHue: 0.6, hIIChance: 0.08,
    companion: { dx: 38, dy: -8, dz: 12, scale: 6, color: 0xffd590 }
  });
  addLabel(scene, 'Andromeda', 5, -40, 0);
  objects['andromeda'] = { ...andromeda, size: 28 };

  const elliptical = makeElliptical(80, 0, 0, 'elliptical');
  addLabel(scene, 'Elliptical', 80, -30, 0);
  objects['elliptical'] = { ...elliptical, size: 20 };

  const irregular = makeIrregular(140, 0, 0, 'irregular');
  addLabel(scene, 'Irregular', 140, -26, 0);
  objects['irregular'] = { ...irregular, size: 16 };

  camera.position.set(30, 60, 150);
  controls.target.set(35, 0, 0);
  controls.minDistance = 8;
  controls.maxDistance = 500;
  controls.zoomSpeed = 4.0;

  function update(dt) {
    milkyway.group.rotation.y += dt * 0.04;
    andromeda.group.rotation.y += dt * 0.04;
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
