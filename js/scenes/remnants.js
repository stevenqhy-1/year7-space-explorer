import * as THREE from 'three';
import { addStarfield, disposeScene, makeLabel, softPointTexture } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

// ─────────────────────────────────────────────────────────────────────────
//  REMNANTS SCENE
//  Each remnant has a final visual + a formation animation with named phases
//  and DOM caption updates. Each phase runs custom code per remnant.
// ─────────────────────────────────────────────────────────────────────────

export function buildRemnants({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 3500, 1500);
  scene.add(new THREE.AmbientLight(0x222244, 1));

  const objects = {};
  const formations = {};

  // Caption overlay (DOM)
  const captionEl = document.getElementById('formation-caption');
  const stepEl = document.getElementById('formation-step');
  const textEl = document.getElementById('formation-text');

  function setCaption(stepLabel, text) {
    if (!captionEl) return;
    stepEl.textContent = stepLabel;
    textEl.textContent = text;
    captionEl.classList.remove('hidden');
  }
  function hideCaption() {
    if (captionEl) captionEl.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────────────────
  //  WHITE DWARF
  //  Final view: brilliant white core + diffraction spikes + blue glow
  // ─────────────────────────────────────────────────────────────────────
  {
    const g = new THREE.Group();
    g.position.set(-90, 0, 0);
    const mainMeshes = [];

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    core.userData.key = 'white-dwarf';
    g.add(core); mainMeshes.push(core);
    [
      [2.0, 0x88ccff, 0.45],
      [3.0, 0x6699ff, 0.18],
      [4.5, 0x4466cc, 0.08]
    ].forEach(([r, c, op]) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 48, 48),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      g.add(m); mainMeshes.push(m);
    });
    const spikes = makeDiffractionSpikes(8, 0xeaf2ff);
    g.add(spikes); spikes.traverse(c => { if (c.isMesh) mainMeshes.push(c); });

    scene.add(g);
    objects['white-dwarf'] = { mesh: core, group: g, size: 2 };
    addLabel(scene, 'White Dwarf', -90, -8, 0);
    formations['white-dwarf'] = makeWhiteDwarfFormation(g, mainMeshes, setCaption, hideCaption);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  NEUTRON STAR
  // ─────────────────────────────────────────────────────────────────────
  let neutronGroup;
  {
    neutronGroup = new THREE.Group();
    neutronGroup.position.set(-45, 0, 0);
    const mainMeshes = [];
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xeaffff })
    );
    core.userData.key = 'neutron-star';
    neutronGroup.add(core); mainMeshes.push(core);
    const halo1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x66ffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    neutronGroup.add(halo1); mainMeshes.push(halo1);
    const halo2 = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x3399cc, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    neutronGroup.add(halo2); mainMeshes.push(halo2);
    for (let i = 0; i < 3; i++) {
      const tube = new THREE.Mesh(
        new THREE.TorusGeometry(3.5 + i * 0.4, 0.05, 8, 96),
        new THREE.MeshBasicMaterial({ color: 0x88ddff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      tube.rotation.x = Math.PI / 2;
      tube.rotation.z = (i / 3) * Math.PI;
      neutronGroup.add(tube); mainMeshes.push(tube);
    }
    scene.add(neutronGroup);
    objects['neutron-star'] = { mesh: core, group: neutronGroup, size: 2 };
    addLabel(scene, 'Neutron Star', -45, -8, 0);
    formations['neutron-star'] = makeSupernovaCollapseFormation(neutronGroup, mainMeshes, setCaption, hideCaption, {
      parentColor: 0x88aaff, parentRadius: 6,
      remnantLabel: 'a neutron star',
      remnantDescription: 'a city-sized ball so dense one teaspoon weighs as much as Mount Everest'
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  PULSAR
  // ─────────────────────────────────────────────────────────────────────
  let pulsarGroup;
  {
    pulsarGroup = new THREE.Group();
    pulsarGroup.position.set(0, 0, 0);
    const mainMeshes = [];
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xccddff })
    );
    core.userData.key = 'pulsar';
    pulsarGroup.add(core); mainMeshes.push(core);
    const haloMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    pulsarGroup.add(haloMesh); mainMeshes.push(haloMesh);
    for (const dir of [1, -1]) {
      const beamOuter = new THREE.Mesh(
        new THREE.ConeGeometry(4.5, 22, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const beamInner = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 22, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const beamGroup = new THREE.Group();
      beamGroup.add(beamOuter); beamGroup.add(beamInner);
      mainMeshes.push(beamOuter, beamInner);
      beamGroup.position.y = dir * 11;
      if (dir === -1) beamGroup.rotation.x = Math.PI;
      pulsarGroup.add(beamGroup);
    }
    pulsarGroup.rotation.z = 0.45;
    scene.add(pulsarGroup);
    objects.pulsar = { mesh: core, group: pulsarGroup, size: 2.5 };
    addLabel(scene, 'Pulsar', 0, -10, 0);
    formations.pulsar = makeSupernovaCollapseFormation(pulsarGroup, mainMeshes, setCaption, hideCaption, {
      parentColor: 0x77aaff, parentRadius: 6,
      remnantLabel: 'a pulsar',
      remnantDescription: 'a rapidly spinning neutron star whose beams of radio waves sweep past Earth like a lighthouse'
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  //  BLACK HOLE
  // ─────────────────────────────────────────────────────────────────────
  let blackHoleDisk;
  {
    const bhGroup = new THREE.Group();
    bhGroup.position.set(50, 0, 0);
    bhGroup.rotation.x = 0.35;
    bhGroup.rotation.y = 0.15;

    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    horizon.userData.key = 'black-hole';
    bhGroup.add(horizon);

    const photonRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.55, 256),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa, side: THREE.DoubleSide, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    photonRing.rotation.x = Math.PI / 2.15;
    bhGroup.add(photonRing);

    const diskTexture = makeAccretionDiskTexture();
    blackHoleDisk = new THREE.Group();
    const diskGeom = new THREE.RingGeometry(2.7, 9.5, 256, 1);
    const pos = diskGeom.attributes.position;
    const uv = diskGeom.attributes.uv;
    const innerR = 2.7, outerR = 9.5;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const r = Math.sqrt(x*x + y*y);
      const a = Math.atan2(y, x);
      uv.setXY(i, (r - innerR) / (outerR - innerR), (a + Math.PI) / (Math.PI * 2));
    }
    const disk = new THREE.Mesh(
      diskGeom,
      new THREE.MeshBasicMaterial({ map: diskTexture, side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1.0 })
    );
    disk.rotation.x = Math.PI / 2;
    blackHoleDisk.add(disk);
    const disk2 = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 9.5, 128, 1),
      new THREE.MeshBasicMaterial({ map: diskTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    disk2.rotation.x = Math.PI / 2 + 0.05;
    blackHoleDisk.add(disk2);
    bhGroup.add(blackHoleDisk);

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

    const mainMeshes = [];
    bhGroup.traverse(c => { if (c.isMesh) mainMeshes.push(c); });
    formations['black-hole'] = makeBlackHoleFormation(bhGroup, mainMeshes, setCaption, hideCaption);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  SUPERNOVA
  // ─────────────────────────────────────────────────────────────────────
  let supernovaCore, supernovaShells = [], supernovaParticles, supernovaRays;
  {
    const snGroup = new THREE.Group();
    snGroup.position.set(105, 0, 0);

    supernovaCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffee })
    );
    supernovaCore.userData.key = 'supernova';
    snGroup.add(supernovaCore);
    snGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff8aa, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
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
    // Continuous outward particle debris
    {
      const N = 600;
      const positions = new Float32Array(N * 3);
      const velocities = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
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
        const startR = Math.random() * 2;
        positions[i*3] = dirX * startR;
        positions[i*3+1] = dirY * startR;
        positions[i*3+2] = dirZ * startR;
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
    supernovaRays = makeDiffractionSpikes(14, 0xffeecc);
    snGroup.add(supernovaRays);

    scene.add(snGroup);
    objects.supernova = { mesh: supernovaCore, group: snGroup, size: 7 };
    addLabel(scene, 'Supernova', 105, -15, 0);
    const snMain = [];
    snGroup.traverse(c => { if (c.isMesh || c.isPoints) snMain.push(c); });
    formations.supernova = makeSupernovaShowcaseFormation(snGroup, snMain, setCaption, hideCaption);
  }

  camera.position.set(25, 25, 90);
  controls.target.set(25, 0, 0);
  controls.minDistance = 2;
  controls.maxDistance = 500;
  controls.zoomSpeed = 4.0;

  let t = 0;
  function update(dt) {
    t += dt;
    const now = performance.now();
    for (const k in formations) formations[k].update(now);

    if (neutronGroup) neutronGroup.rotation.y += dt * 0.4;
    if (pulsarGroup) pulsarGroup.rotation.y += dt * 3.5;
    if (blackHoleDisk) blackHoleDisk.rotation.z += dt * 0.6;

    for (const shell of supernovaShells) {
      const phase = (t + shell.userData.phase) % 5;
      const tPhase = phase / 5;
      const scale = 1 + tPhase * 8;
      shell.scale.setScalar(scale);
      shell.material.opacity = Math.max(0, 0.55 * (1 - tPhase));
    }
    if (supernovaParticles && !formations.supernova.playing) {
      const pos = supernovaParticles.geometry.attributes.position;
      const vel = supernovaParticles.userData.velocities;
      for (let i = 0; i < pos.count; i++) {
        const r2 = pos.getX(i)**2 + pos.getY(i)**2 + pos.getZ(i)**2;
        if (r2 > 14*14) {
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
    if (supernovaCore && !formations.supernova.playing) {
      const f = 0.92 + Math.random() * 0.16;
      supernovaCore.scale.setScalar(f);
    }
    if (supernovaRays && !formations.supernova.playing) {
      supernovaRays.rotation.z += dt * 0.4;
    }
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

  function dispose() {
    hideCaption();
    disposeScene(scene);
  }

  function playFormation(key) {
    const f = formations[key];
    if (!f) return false;
    // Cancel any other playing formation
    for (const k in formations) if (k !== key) formations[k].stop && formations[k].stop();
    focusOn(key);
    setTimeout(() => f.play(), 1100);
    return true;
  }

  function hasFormation(key) { return !!formations[key]; }

  return { scene, update, focusOn, clearFollow, handleClick, dispose, playFormation, hasFormation };
}

// ═════════════════════════════════════════════════════════════════════════
//  FORMATION ENGINE
//  Each formation is a sequence of phases. Each phase has:
//    - duration: seconds
//    - step: "1 of 5", etc.
//    - caption: text shown over the canvas
//    - onEnter(): runs once at phase start
//    - update(t): runs each frame, t in [0,1]
//    - onExit(): runs once at phase end
//  Main remnant meshes are stashed and hidden during play; restored at end.
// ═════════════════════════════════════════════════════════════════════════

function captureMainBaseline(mainMeshes) {
  for (const m of mainMeshes) {
    if (m && m.material && m.material.opacity !== undefined && m._baseOpacity === undefined) {
      m._baseOpacity = m.material.opacity;
    }
  }
}
function setMainOpacity(mainMeshes, o) {
  for (const m of mainMeshes) {
    if (!m) continue;
    if (m.material) {
      m.material.transparent = true;
      m.material.opacity = (m._baseOpacity ?? 1) * o;
    }
    m.visible = o > 0.01;
  }
}

function makeFormationRunner(phases, mainMeshes, hideCaption) {
  let playing = false;
  let startTime = 0;
  let currentIdx = -1;

  function play() {
    captureMainBaseline(mainMeshes);
    playing = true;
    startTime = performance.now();
    currentIdx = -1;
    setMainOpacity(mainMeshes, 0);
  }

  function stop() {
    if (!playing) return;
    if (currentIdx >= 0 && phases[currentIdx]?.onExit) phases[currentIdx].onExit();
    playing = false;
    setMainOpacity(mainMeshes, 1);
    hideCaption();
  }

  function update(now) {
    if (!playing) return;
    const elapsed = (now - startTime) / 1000;
    let accumulated = 0;
    let idx = -1;
    for (let i = 0; i < phases.length; i++) {
      if (elapsed < accumulated + phases[i].duration) { idx = i; break; }
      accumulated += phases[i].duration;
    }
    if (idx === -1) {
      // Finished
      if (currentIdx >= 0 && phases[currentIdx]?.onExit) phases[currentIdx].onExit();
      playing = false;
      setMainOpacity(mainMeshes, 1);
      hideCaption();
      return;
    }
    if (idx !== currentIdx) {
      if (currentIdx >= 0 && phases[currentIdx]?.onExit) phases[currentIdx].onExit();
      currentIdx = idx;
      const p = phases[idx];
      if (p.onEnter) p.onEnter();
    }
    const p = phases[idx];
    const t = (elapsed - accumulated) / p.duration;
    if (p.update) p.update(t);
  }

  return {
    play, stop, update,
    get playing() { return playing; }
  };
}

// Spherical particle explosion — particles fly outward from origin with given velocities.
function makeExplosionParticles(group, count, colorFn = null) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const dirX = Math.sin(phi) * Math.cos(theta);
    const dirY = Math.sin(phi) * Math.sin(theta);
    const dirZ = Math.cos(phi);
    const speed = 6 + Math.random() * 22;
    velocities[i*3]   = dirX * speed;
    velocities[i*3+1] = dirY * speed;
    velocities[i*3+2] = dirZ * speed;
    positions[i*3] = 0; positions[i*3+1] = 0; positions[i*3+2] = 0;
    if (colorFn) {
      colorFn(tmp, Math.random());
    } else {
      tmp.setRGB(1, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.3);
    }
    colors[i*3] = tmp.r; colors[i*3+1] = tmp.g; colors[i*3+2] = tmp.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    map: softPointTexture(),
    size: 0.5, vertexColors: true,
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
    sizeAttenuation: true, alphaTest: 0.001
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  group.add(pts);
  return { pts, positions, velocities, count };
}

function setExplosionTime(particles, tSec, drag = 0.0) {
  const damping = Math.max(0, 1 - drag * tSec);
  for (let i = 0; i < particles.count; i++) {
    particles.positions[i*3]   = particles.velocities[i*3]   * tSec * damping;
    particles.positions[i*3+1] = particles.velocities[i*3+1] * tSec * damping;
    particles.positions[i*3+2] = particles.velocities[i*3+2] * tSec * damping;
  }
  particles.pts.geometry.attributes.position.needsUpdate = true;
}

// ───────── WHITE DWARF: Sun-like star → red giant → planetary nebula → white dwarf
function makeWhiteDwarfFormation(group, mainMeshes, setCaption, hideCaption) {
  // Parent star: Sun-like → red giant
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffdd66 })
  );
  star.visible = false;
  group.add(star);
  const starGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  starGlow.visible = false;
  group.add(starGlow);
  // Planetary nebula shell — multi-layer with concentric rings
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff77bb, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
  );
  shell.visible = false;
  group.add(shell);
  const shell2 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0x66bbff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
  );
  shell2.visible = false;
  group.add(shell2);

  const phases = [
    {
      duration: 2.2,
      onEnter: () => {
        setCaption('Step 1 of 4', 'A Sun-like star burns hydrogen in its core for about 10 billion years.');
        star.visible = true; starGlow.visible = true;
        star.material.color.setHex(0xffdd66);
        starGlow.material.color.setHex(0xffaa44);
        star.scale.setScalar(1); starGlow.scale.setScalar(1);
        star.material.opacity = 0; starGlow.material.opacity = 0;
        star.material.transparent = true;
      },
      update: (t) => {
        star.material.opacity = Math.min(1, t * 3);
        starGlow.material.opacity = Math.min(0.6, t * 1.8);
        const pulse = 1 + Math.sin(t * 8) * 0.02;
        star.scale.setScalar(pulse);
      }
    },
    {
      duration: 2.5,
      onEnter: () => {
        setCaption('Step 2 of 4', 'After billions of years, the core runs out of hydrogen. The star swells into a red giant.');
      },
      update: (t) => {
        // Star inflates and reddens
        const scale = 1 + t * 2.4;
        star.scale.setScalar(scale);
        starGlow.scale.setScalar(scale * 1.3);
        const r = 1.0, g = 0.85 - t * 0.6, b = 0.4 - t * 0.35;
        star.material.color.setRGB(r, Math.max(0.15, g), Math.max(0.05, b));
        starGlow.material.color.setRGB(r, Math.max(0.2, 0.55 - t * 0.3), 0.15);
        starGlow.material.opacity = 0.6 + t * 0.2;
      }
    },
    {
      duration: 2.5,
      onEnter: () => {
        setCaption('Step 3 of 4', 'The red giant gently sheds its outer layers — forming a glowing planetary nebula.');
        shell.visible = true; shell2.visible = true;
        shell.scale.setScalar(1); shell2.scale.setScalar(0.8);
      },
      update: (t) => {
        // Star shrinks while shell expands outward
        const sScale = Math.max(0.4, 3.4 - t * 3);
        star.scale.setScalar(sScale);
        starGlow.scale.setScalar(sScale * 1.3);
        star.material.opacity = Math.max(0.2, 1 - t * 0.7);
        // Shells expand
        const sh = 1 + t * 9;
        shell.scale.setScalar(sh);
        shell2.scale.setScalar(sh * 0.85);
        shell.material.opacity = 0.7 * (1 - Math.pow(t, 0.7));
        shell2.material.opacity = 0.45 * (1 - Math.pow(t, 0.6));
      }
    },
    {
      duration: 2.8,
      onEnter: () => {
        setCaption('Step 4 of 4', 'What remains: a white dwarf — Earth-sized but as heavy as the Sun.');
      },
      update: (t) => {
        // Shells fade away; star shrinks to white dwarf size; main meshes fade in
        shell.material.opacity = Math.max(0, 0.4 * (1 - t * 1.6));
        shell2.material.opacity = Math.max(0, 0.25 * (1 - t * 1.6));
        const sScale = Math.max(0.15, 0.5 - t * 0.4);
        star.scale.setScalar(sScale);
        // Color shifts from red to white as it cools/contracts
        const blend = Math.min(1, t * 1.4);
        const r = 1.0, g = 0.4 + blend * 0.6, b = 0.2 + blend * 0.8;
        star.material.color.setRGB(r, g, b);
        starGlow.material.opacity = Math.max(0, 0.8 * (1 - t * 1.3));
        setMainOpacity(mainMeshes, Math.min(1, t * 1.5));
        if (t > 0.7) {
          star.material.opacity = Math.max(0, 1 - (t - 0.7) * 3);
        }
      },
      onExit: () => {
        star.visible = false; starGlow.visible = false;
        shell.visible = false; shell2.visible = false;
      }
    }
  ];

  return makeFormationRunner(phases, mainMeshes, hideCaption);
}

// ───────── SUPERNOVA → REMNANT (used for neutron star, pulsar)
// Different remnantLabel/description per call.
function makeSupernovaCollapseFormation(group, mainMeshes, setCaption, hideCaption, opts) {
  const { parentColor, parentRadius, remnantLabel, remnantDescription } = opts;
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(parentRadius, 48, 48),
    new THREE.MeshBasicMaterial({ color: parentColor })
  );
  star.visible = false;
  group.add(star);
  const starGlow = new THREE.Mesh(
    new THREE.SphereGeometry(parentRadius * 1.35, 48, 48),
    new THREE.MeshBasicMaterial({ color: parentColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  starGlow.visible = false;
  group.add(starGlow);
  // Bright supernova flash
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.visible = false;
  group.add(flash);
  // Particle explosion debris
  const debris = makeExplosionParticles(group, 1200, (c, r) => {
    // Color: yellow-hot at low r, orange/red at high r
    c.setHSL(0.08 - r * 0.05, 0.95, 0.4 + r * 0.25);
  });

  const phases = [
    {
      duration: 2.0,
      onEnter: () => {
        setCaption('Step 1 of 5', 'A massive blue supergiant, 10+ times heavier than our Sun.');
        star.visible = true; starGlow.visible = true;
        star.material.opacity = 0; star.material.transparent = true;
        starGlow.material.opacity = 0;
        star.scale.setScalar(0.4); starGlow.scale.setScalar(0.4);
        star.material.color.setHex(parentColor);
      },
      update: (t) => {
        const s = 0.4 + t * 0.6;
        star.scale.setScalar(s);
        starGlow.scale.setScalar(s * 1.2);
        star.material.opacity = Math.min(1, t * 2);
        starGlow.material.opacity = Math.min(0.55, t * 1.2);
      }
    },
    {
      duration: 1.8,
      onEnter: () => {
        setCaption('Step 2 of 5', 'After only a few million years, it burns through its fuel — the core can\'t hold itself up anymore.');
      },
      update: (t) => {
        // Slight inflation + dimming + colour-shift towards yellow-red
        const s = 1 + t * 0.3;
        star.scale.setScalar(s);
        starGlow.scale.setScalar(s * 1.25);
        const r = 0.55 + t * 0.45;
        const g = 0.7 - t * 0.2;
        const b = 1.0 - t * 0.6;
        star.material.color.setRGB(r, g, b);
        starGlow.material.opacity = 0.55 + t * 0.25;
        // Pulse warning
        const pulse = 1 + Math.sin(t * 14) * 0.04;
        star.scale.setScalar(s * pulse);
      }
    },
    {
      duration: 0.9,
      onEnter: () => {
        setCaption('Step 3 of 5', 'Gravity wins. The core collapses inward in less than a second.');
      },
      update: (t) => {
        const ease = t * t;
        const s = 1.3 - ease * 1.2;
        star.scale.setScalar(Math.max(0.05, s));
        starGlow.scale.setScalar(Math.max(0.05, s * 1.2));
        star.material.opacity = Math.max(0.3, 1 - ease * 0.8);
        starGlow.material.opacity = 0.8 - ease * 0.6;
      }
    },
    {
      duration: 2.2,
      onEnter: () => {
        setCaption('Step 4 of 5', 'SUPERNOVA! The outer layers are blown into space at thousands of kilometres per second.');
        flash.visible = true;
        debris.pts.visible = true;
        debris.pts.material.opacity = 0;
        star.scale.setScalar(0.05);
        star.material.opacity = 0;
        starGlow.material.opacity = 0;
      },
      update: (t) => {
        // Bright flash that peaks at t~0.15 and fades
        if (t < 0.15) {
          flash.material.opacity = t / 0.15;
          flash.scale.setScalar(1 + t * 80);
        } else {
          flash.scale.setScalar(13 + (t - 0.15) * 40);
          flash.material.opacity = Math.max(0, 1.0 - (t - 0.15) * 1.8);
        }
        // Debris flies outward (real momentum, scaled by elapsed time within this phase)
        const tSec = t * 2.2;
        setExplosionTime(debris, tSec, 0.0);
        debris.pts.material.opacity = Math.min(1, t * 4) * (1 - Math.max(0, t - 0.7) * 1.5);
      }
    },
    {
      duration: 2.2,
      onEnter: () => {
        setCaption('Step 5 of 5', `What's left of the core: ${remnantLabel} — ${remnantDescription}.`);
      },
      update: (t) => {
        // Debris continues outward but fades
        const tSec = 2.2 + t * 2.2;
        setExplosionTime(debris, tSec, 0.0);
        debris.pts.material.opacity = Math.max(0, 0.45 * (1 - t * 1.3));
        flash.material.opacity = 0;
        // Remnant fades in
        setMainOpacity(mainMeshes, Math.min(1, t * 1.4));
      },
      onExit: () => {
        star.visible = false; starGlow.visible = false;
        flash.visible = false; debris.pts.visible = false;
      }
    }
  ];

  return makeFormationRunner(phases, mainMeshes, hideCaption);
}

// ───────── BLACK HOLE — bigger parent, slower collapse, accretion-disk reveal
function makeBlackHoleFormation(group, mainMeshes, setCaption, hideCaption) {
  const parentRadius = 9;
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(parentRadius, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x88aaff })
  );
  star.visible = false;
  group.add(star);
  const starGlow = new THREE.Mesh(
    new THREE.SphereGeometry(parentRadius * 1.3, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x6688ee, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  starGlow.visible = false;
  group.add(starGlow);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.visible = false;
  group.add(flash);
  const debris = makeExplosionParticles(group, 1500, (c, r) => {
    c.setHSL(0.08 - r * 0.07, 0.95, 0.4 + r * 0.25);
  });

  const phases = [
    {
      duration: 2.0,
      onEnter: () => {
        setCaption('Step 1 of 6', 'An incredibly massive star — 20 to 50 times the Sun\'s mass.');
        star.visible = true; starGlow.visible = true;
        star.material.opacity = 0; star.material.transparent = true;
        star.scale.setScalar(0.4); starGlow.scale.setScalar(0.4);
        star.material.color.setHex(0x88aaff);
      },
      update: (t) => {
        const s = 0.4 + t * 0.6;
        star.scale.setScalar(s);
        starGlow.scale.setScalar(s * 1.2);
        star.material.opacity = Math.min(1, t * 2);
        starGlow.material.opacity = Math.min(0.55, t * 1.2);
      }
    },
    {
      duration: 1.8,
      onEnter: () => setCaption('Step 2 of 6', 'It burns through its fuel in just a few million years and becomes unstable.'),
      update: (t) => {
        const r = 0.55 + t * 0.45, g = 0.7 - t * 0.2, b = 1.0 - t * 0.55;
        star.material.color.setRGB(r, g, b);
        const pulse = 1 + Math.sin(t * 14) * 0.05;
        star.scale.setScalar(1 * pulse);
        starGlow.material.opacity = 0.55 + t * 0.25;
      }
    },
    {
      duration: 1.0,
      onEnter: () => setCaption('Step 3 of 6', 'The core collapses faster than the speed of sound through the star.'),
      update: (t) => {
        const ease = t * t;
        const s = 1.3 - ease * 1.25;
        star.scale.setScalar(Math.max(0.04, s));
        starGlow.scale.setScalar(Math.max(0.04, s * 1.2));
        star.material.opacity = Math.max(0.3, 1 - ease * 0.8);
      }
    },
    {
      duration: 2.2,
      onEnter: () => {
        setCaption('Step 4 of 6', 'SUPERNOVA! The outer star explodes outward.');
        flash.visible = true;
        debris.pts.visible = true;
        debris.pts.material.opacity = 0;
        star.material.opacity = 0;
        starGlow.material.opacity = 0;
      },
      update: (t) => {
        if (t < 0.15) {
          flash.material.opacity = t / 0.15;
          flash.scale.setScalar(1 + t * 90);
        } else {
          flash.scale.setScalar(14 + (t - 0.15) * 45);
          flash.material.opacity = Math.max(0, 1.0 - (t - 0.15) * 1.8);
        }
        const tSec = t * 2.2;
        setExplosionTime(debris, tSec, 0.0);
        debris.pts.material.opacity = Math.min(1, t * 4) * (1 - Math.max(0, t - 0.7) * 1.5);
      }
    },
    {
      duration: 1.8,
      onEnter: () => setCaption('Step 5 of 6', 'But this star is too massive — the core keeps collapsing, past neutron-star density…'),
      update: (t) => {
        const tSec = 2.2 + t * 1.8;
        setExplosionTime(debris, tSec, 0.0);
        debris.pts.material.opacity = Math.max(0, 0.4 * (1 - t * 1.0));
        // Show a tiny dim core hint that gets darker
        star.visible = true;
        star.scale.setScalar(0.05 * Math.max(0.1, 1 - t));
        star.material.color.setRGB(0.3 * (1 - t), 0.15 * (1 - t), 0.3 * (1 - t));
        star.material.opacity = 0.6 * (1 - t);
      }
    },
    {
      duration: 2.2,
      onEnter: () => setCaption('Step 6 of 6', '…until nothing can escape, not even light. A black hole has formed.'),
      update: (t) => {
        const tSec = 4.0 + t * 2.2;
        setExplosionTime(debris, tSec, 0.0);
        debris.pts.material.opacity = Math.max(0, 0.25 * (1 - t * 1.3));
        setMainOpacity(mainMeshes, Math.min(1, t * 1.5));
      },
      onExit: () => {
        star.visible = false; starGlow.visible = false;
        flash.visible = false; debris.pts.visible = false;
      }
    }
  ];

  return makeFormationRunner(phases, mainMeshes, hideCaption);
}

// ───────── SUPERNOVA showcase — the explosion itself is the final state
function makeSupernovaShowcaseFormation(group, mainMeshes, setCaption, hideCaption) {
  const star = new THREE.Mesh(
    new THREE.SphereGeometry(5, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xaaccff })
  );
  star.visible = false;
  group.add(star);
  const starGlow = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x88aadd, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  starGlow.visible = false;
  group.add(starGlow);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  flash.visible = false;
  group.add(flash);

  const phases = [
    {
      duration: 1.8,
      onEnter: () => {
        setCaption('Step 1 of 4', 'A massive star — 8+ times heavier than our Sun, near the end of its life.');
        star.visible = true; starGlow.visible = true;
        star.material.color.setHex(0xaaccff);
        star.scale.setScalar(0.5); starGlow.scale.setScalar(0.5);
        star.material.opacity = 0; star.material.transparent = true;
      },
      update: (t) => {
        const s = 0.5 + t * 0.5;
        star.scale.setScalar(s);
        starGlow.scale.setScalar(s * 1.25);
        star.material.opacity = Math.min(1, t * 2);
        starGlow.material.opacity = Math.min(0.55, t * 1.2);
      }
    },
    {
      duration: 1.6,
      onEnter: () => setCaption('Step 2 of 4', 'Iron builds up in the core. Fusion stops, and there\'s nothing to hold gravity back.'),
      update: (t) => {
        const r = 0.65 + t * 0.35, g = 0.8 - t * 0.15, b = 1.0 - t * 0.4;
        star.material.color.setRGB(r, g, b);
        const pulse = 1 + Math.sin(t * 14) * 0.05;
        star.scale.setScalar(pulse);
      }
    },
    {
      duration: 0.6,
      onEnter: () => setCaption('Step 3 of 4', 'The core collapses. A shockwave bounces back outward — the star is doomed.'),
      update: (t) => {
        const ease = t * t;
        const s = 1 - ease * 0.8;
        star.scale.setScalar(Math.max(0.1, s));
        starGlow.scale.setScalar(Math.max(0.1, s * 1.2));
      }
    },
    {
      duration: 3.0,
      onEnter: () => {
        setCaption('Step 4 of 4', 'A supernova! In one moment, the star outshines an entire galaxy of 100 billion stars.');
        flash.visible = true;
        star.material.opacity = 0;
        starGlow.material.opacity = 0;
      },
      update: (t) => {
        if (t < 0.12) {
          flash.material.opacity = t / 0.12;
          flash.scale.setScalar(1 + t * 100);
        } else {
          flash.scale.setScalar(12 + (t - 0.12) * 35);
          flash.material.opacity = Math.max(0, 0.95 - (t - 0.12) * 1.4);
        }
        // After the flash dies down, reveal the ongoing supernova visuals
        setMainOpacity(mainMeshes, Math.min(1, Math.max(0, (t - 0.3) * 2)));
      },
      onExit: () => {
        star.visible = false; starGlow.visible = false;
        flash.visible = false;
      }
    }
  ];

  return makeFormationRunner(phases, mainMeshes, hideCaption);
}

// ─────────── Helpers ────────────

function addLabel(scene, text, x, y, z) {
  const sprite = makeLabel(text, { fontSize: 60, scale: 24 });
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

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
  const grad2 = ctx.createLinearGradient(0, 0, 0, c.height);
  grad2.addColorStop(0.0, 'rgba(0,0,0,1)');
  grad2.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad2.addColorStop(1.0, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'source-over';
  return new THREE.CanvasTexture(c);
}

function colorToHex(c) {
  const col = new THREE.Color(c);
  return `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},1)`;
}

function makeAccretionDiskTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, c.width, c.height);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const data = imgData.data;
  for (let y = 0; y < c.height; y++) {
    const angle = (y / c.height) * Math.PI * 2;
    const doppler = 0.55 + 0.45 * Math.sin(angle);
    for (let x = 0; x < c.width; x++) {
      const r = x / c.width;
      const radial = Math.pow(1 - r, 2.2) * 1.4 + Math.pow(1 - r, 0.6) * 0.4;
      const intensity = Math.min(1.2, radial * doppler);
      const t = Math.pow(r, 0.7);
      const cr = 1.0 * intensity;
      const cg = (0.4 + 0.6 * (1 - t)) * intensity;
      const cb = (0.2 + 0.7 * Math.pow(1 - t, 2)) * intensity;
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
