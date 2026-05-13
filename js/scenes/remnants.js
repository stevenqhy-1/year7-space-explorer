import * as THREE from 'three';
import { addStarfield, disposeScene, makeLabel } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

export function buildRemnants({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 3500, 1500);
  scene.add(new THREE.AmbientLight(0x222244, 1));

  const objects = {};

  // ───────────────────────── WHITE DWARF ─────────────────────────
  // Brilliantly hot core with diffraction spikes (telescope-style)
  {
    const g = new THREE.Group();
    g.position.set(-90, 0, 0);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    core.userData.key = 'white-dwarf';
    g.add(core);

    // Multi-layer glow
    [
      [2.0, 0x88ccff, 0.45],
      [3.0, 0x6699ff, 0.18],
      [4.5, 0x4466cc, 0.08]
    ].forEach(([r, c, op]) => {
      g.add(new THREE.Mesh(
        new THREE.SphereGeometry(r, 48, 48),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
      ));
    });

    // Diffraction spikes — 4 thin elongated planes
    g.add(makeDiffractionSpikes(8, 0xeaf2ff));

    scene.add(g);
    objects['white-dwarf'] = { mesh: core, group: g, size: 2 };
    addLabel(scene, 'White Dwarf', -90, -8, 0);
  }

  // ───────────────────────── NEUTRON STAR ─────────────────────────
  // Tiny intense core with magnetic field torus loops
  let neutronGroup;
  {
    neutronGroup = new THREE.Group();
    neutronGroup.position.set(-45, 0, 0);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xeaffff })
    );
    core.userData.key = 'neutron-star';
    neutronGroup.add(core);

    // Inner halo
    neutronGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
    neutronGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x3399cc, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    // Magnetic field — three off-axis torus loops
    const fieldMat = new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const tube = new THREE.Mesh(
        new THREE.TorusGeometry(3.5 + i * 0.4, 0.05, 8, 96),
        fieldMat
      );
      tube.rotation.x = Math.PI / 2;
      tube.rotation.z = (i / 3) * Math.PI;
      neutronGroup.add(tube);
    }

    scene.add(neutronGroup);
    objects['neutron-star'] = { mesh: core, group: neutronGroup, size: 2 };
    addLabel(scene, 'Neutron Star', -45, -8, 0);
  }

  // ───────────────────────── PULSAR ─────────────────────────
  // Rotating neutron star with bright sweeping beams + accretion glow
  let pulsarGroup;
  {
    pulsarGroup = new THREE.Group();
    pulsarGroup.position.set(0, 0, 0);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xccddff })
    );
    core.userData.key = 'pulsar';
    pulsarGroup.add(core);

    // Halo
    pulsarGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    // Beam cones — wider, brighter, with intense tip
    for (const dir of [1, -1]) {
      // Outer wide cone
      const beamOuter = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 22, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      // Inner intense core
      const beamInner = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 22, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const beamGroup = new THREE.Group();
      beamGroup.add(beamOuter);
      beamGroup.add(beamInner);
      beamGroup.position.y = dir * 11;
      if (dir === -1) beamGroup.rotation.x = Math.PI;
      pulsarGroup.add(beamGroup);
    }

    // Tilt the rotation axis (real pulsars are tilted)
    pulsarGroup.rotation.z = 0.45;
    scene.add(pulsarGroup);
    objects.pulsar = { mesh: core, group: pulsarGroup, size: 2.5 };
    addLabel(scene, 'Pulsar', 0, -10, 0);
  }

  // ───────────────────────── BLACK HOLE ─────────────────────────
  // Event horizon, photon ring, accretion disk with Doppler-asymmetric brightness, relativistic polar jets
  let blackHoleDisk;
  {
    const bhGroup = new THREE.Group();
    bhGroup.position.set(50, 0, 0);
    bhGroup.rotation.x = 0.35;
    bhGroup.rotation.y = 0.15;

    // Event horizon — pitch black
    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    horizon.userData.key = 'black-hole';
    bhGroup.add(horizon);

    // Photon ring — bright thin ring of light bent around the BH
    const photonRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.55, 256),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa, side: THREE.DoubleSide, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    photonRing.rotation.x = Math.PI / 2.15;
    bhGroup.add(photonRing);

    // Accretion disk — multi-ring with Doppler asymmetry via a custom canvas texture
    const diskTexture = makeAccretionDiskTexture();
    blackHoleDisk = new THREE.Group();

    const diskGeom = new THREE.RingGeometry(2.7, 9.5, 256, 1);
    // Map u to radial coordinate so the texture wraps correctly
    const pos = diskGeom.attributes.position;
    const uv = diskGeom.attributes.uv;
    const innerR = 2.7, outerR = 9.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const r = Math.sqrt(x*x + y*y);
      const a = Math.atan2(y, x); // -PI..PI — for Doppler asymmetry
      uv.setXY(i, (r - innerR) / (outerR - innerR), (a + Math.PI) / (Math.PI * 2));
    }
    const disk = new THREE.Mesh(
      diskGeom,
      new THREE.MeshBasicMaterial({ map: diskTexture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1.0 })
    );
    disk.rotation.x = Math.PI / 2;
    blackHoleDisk.add(disk);

    // Slightly thicker secondary disk for volume
    const disk2 = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 9.5, 128, 1),
      new THREE.MeshBasicMaterial({ map: diskTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    disk2.rotation.x = Math.PI / 2 + 0.05;
    blackHoleDisk.add(disk2);

    bhGroup.add(blackHoleDisk);

    // Polar relativistic jets — narrow, long cones along the rotation axis
    const jetMat = new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const dir of [1, -1]) {
      const jetOuter = new THREE.Mesh(new THREE.ConeGeometry(1.2, 22, 24, 1, true), jetMat);
      const jetInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 22, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xeeffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const jet = new THREE.Group();
      jet.add(jetOuter); jet.add(jetInner);
      jet.position.y = dir * 11;
      if (dir === -1) jet.rotation.x = Math.PI;
      bhGroup.add(jet);
    }

    scene.add(bhGroup);
    objects['black-hole'] = { mesh: horizon, group: bhGroup, size: 6 };
    addLabel(scene, 'Black Hole', 50, -16, 0);
  }

  // ───────────────────────── SUPERNOVA ─────────────────────────
  // Explosion: bright flickering core, expanding particle shells, light rays
  let supernovaCore, supernovaShells = [], supernovaParticles, supernovaRays;
  let snStartTime = 0;
  {
    const snGroup = new THREE.Group();
    snGroup.position.set(105, 0, 0);

    supernovaCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffee })
    );
    supernovaCore.userData.key = 'supernova';
    snGroup.add(supernovaCore);

    // Inner glare
    snGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff8aa, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    ));

    // Two expanding shockwave shells
    for (let i = 0; i < 2; i++) {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xff8844 : 0xffaa66,
          transparent: true, opacity: 0.5,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      shell.userData.phase = i * 1.4;
      snGroup.add(shell);
      supernovaShells.push(shell);
    }

    // Outward particle debris
    {
      const N = 600;
      const positions = new Float32Array(N * 3);
      const velocities = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        // Random direction
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const dirX = Math.sin(phi) * Math.cos(theta);
        const dirY = Math.sin(phi) * Math.sin(theta);
        const dirZ = Math.cos(phi);
        const speed = 1.5 + Math.random() * 3;
        velocities[i*3] = dirX * speed;
        velocities[i*3+1] = dirY * speed;
        velocities[i*3+2] = dirZ * speed;
        // Start at random radius for staggered appearance
        const startR = Math.random() * 2;
        positions[i*3] = dirX * startR;
        positions[i*3+1] = dirY * startR;
        positions[i*3+2] = dirZ * startR;
        // Color: hot yellow → orange → red
        const t = Math.random();
        colors[i*3]   = 1.0;
        colors[i*3+1] = 0.4 + t * 0.5;
        colors[i*3+2] = 0.1 + t * 0.3;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      supernovaParticles = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size: 0.18, vertexColors: true, transparent: true, opacity: 0.95,
          blending: THREE.AdditiveBlending, depthWrite: false
        })
      );
      supernovaParticles.userData.velocities = velocities;
      snGroup.add(supernovaParticles);
    }

    // Light rays — radial planes for that "starburst" effect
    supernovaRays = makeDiffractionSpikes(14, 0xffeecc);
    snGroup.add(supernovaRays);

    scene.add(snGroup);
    objects.supernova = { mesh: supernovaCore, group: snGroup, size: 7 };
    addLabel(scene, 'Supernova', 105, -15, 0);
  }

  camera.position.set(25, 25, 90);
  controls.target.set(25, 0, 0);
  controls.minDistance = 2;
  controls.maxDistance = 500;
  controls.zoomSpeed = 4.0;

  let t = 0;
  function update(dt) {
    t += dt;
    // Neutron star magnetic loops slowly precess
    if (neutronGroup) neutronGroup.rotation.y += dt * 0.4;
    // Pulsar rotates
    if (pulsarGroup) pulsarGroup.rotation.y += dt * 3.5;
    // Black hole accretion disk spins
    if (blackHoleDisk) blackHoleDisk.rotation.z += dt * 0.6;

    // Supernova shells expand and fade in cycles
    for (const shell of supernovaShells) {
      const phase = (t + shell.userData.phase) % 5;
      const tPhase = phase / 5;
      const scale = 1 + tPhase * 8;
      shell.scale.setScalar(scale);
      shell.material.opacity = Math.max(0, 0.55 * (1 - tPhase));
    }
    // Supernova particles drift outward
    if (supernovaParticles) {
      const pos = supernovaParticles.geometry.attributes.position;
      const vel = supernovaParticles.userData.velocities;
      for (let i = 0; i < pos.count; i++) {
        const r2 = pos.getX(i)**2 + pos.getY(i)**2 + pos.getZ(i)**2;
        if (r2 > 14*14) {
          // recycle
          const u = Math.random(), v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          pos.setXYZ(i, Math.sin(phi)*Math.cos(theta)*0.3, Math.sin(phi)*Math.sin(theta)*0.3, Math.cos(phi)*0.3);
        } else {
          pos.setXYZ(i,
            pos.getX(i) + vel[i*3] * dt,
            pos.getY(i) + vel[i*3+1] * dt,
            pos.getZ(i) + vel[i*3+2] * dt
          );
        }
      }
      pos.needsUpdate = true;
    }
    // Supernova core flicker
    if (supernovaCore) {
      const f = 0.92 + Math.random() * 0.16;
      supernovaCore.scale.setScalar(f);
    }
    if (supernovaRays) supernovaRays.rotation.z += dt * 0.4;
  }

  function focusOn(key) {
    const o = objects[key];
    if (!o) return;
    const pos = new THREE.Vector3();
    o.group.getWorldPosition(pos);
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

// ──────────── Helpers ────────────

function addLabel(scene, text, x, y, z) {
  const sprite = makeLabel(text, { fontSize: 60, scale: 24 });
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// Diffraction-spike cross (4 thin elongated planes)
function makeDiffractionSpikes(length, color) {
  const group = new THREE.Group();
  const tex = makeSpikeTexture(color);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 4; i++) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(length * 2, length * 0.18), mat);
    plane.rotation.z = (i / 4) * Math.PI;
    group.add(plane);
  }
  return group;
}

function makeSpikeTexture(color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, c.width, 0);
  const col = colorToHex(color);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, col);
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  // Fade the vertical edges
  const grad2 = ctx.createLinearGradient(0, 0, 0, c.height);
  grad2.addColorStop(0.0, 'rgba(0,0,0,1)');
  grad2.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad2.addColorStop(1.0, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function colorToHex(c) {
  const col = new THREE.Color(c);
  return `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},1)`;
}

// Accretion disk texture: radial gradient + Doppler asymmetry along v-axis.
// Brighter on one half (approaching side), dimmer on the other.
function makeAccretionDiskTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  // Background black
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, c.width, c.height);

  // Each row corresponds to angle around the disk; each column corresponds to radial distance.
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const data = imgData.data;
  for (let y = 0; y < c.height; y++) {
    const angle = (y / c.height) * Math.PI * 2; // 0..2PI
    // Doppler: approaching side (angle near PI/2) brighter; receding (angle near 3PI/2) dimmer
    const doppler = 0.55 + 0.45 * Math.sin(angle);
    for (let x = 0; x < c.width; x++) {
      const r = x / c.width; // 0..1 outward
      // Radial brightness profile — hot at inner edge, cooling outward
      const radial = Math.pow(1 - r, 2.2) * 1.4 + Math.pow(1 - r, 0.6) * 0.4;
      const intensity = Math.min(1.2, radial * doppler);
      // Color temp: inner = blue-white, mid = yellow, outer = red-orange
      const t = Math.pow(r, 0.7);
      const cr = 1.0 * intensity;
      const cg = (0.4 + 0.6 * (1 - t)) * intensity;
      const cb = (0.2 + 0.7 * Math.pow(1 - t, 2)) * intensity;
      // Add some turbulence
      const noise = 0.85 + Math.random() * 0.3;
      const idx = (y * c.width + x) * 4;
      data[idx]   = Math.min(255, cr * 255 * noise);
      data[idx+1] = Math.min(255, cg * 255 * noise);
      data[idx+2] = Math.min(255, cb * 255 * noise);
      data[idx+3] = Math.min(255, intensity * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
