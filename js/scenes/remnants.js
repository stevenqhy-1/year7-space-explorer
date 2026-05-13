import * as THREE from 'three';
import { addStarfield, pickFromMeshes, disposeScene } from '../utils.js';

export function buildRemnants({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 2500, 700);
  scene.add(new THREE.AmbientLight(0x222244, 1));

  const meshes = [];

  // ---------- White Dwarf ----------
  {
    const wd = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xeeeeff })
    );
    wd.position.set(-60, 0, 0);
    wd.userData.key = 'white-dwarf';
    wd.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.25 })
    ));
    scene.add(wd);
    meshes.push(wd);
    addLabel(scene, 'White Dwarf', -60, -5, 0);
  }

  // ---------- Neutron Star ----------
  {
    const ns = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ns.position.set(-30, 0, 0);
    ns.userData.key = 'neutron-star';
    ns.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.3 })
    ));
    scene.add(ns);
    meshes.push(ns);
    addLabel(scene, 'Neutron Star', -30, -5, 0);
  }

  // ---------- Pulsar ----------
  let pulsarGroup;
  {
    pulsarGroup = new THREE.Group();
    pulsarGroup.position.set(0, 0, 0);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xccddff })
    );
    core.userData.key = 'pulsar';
    pulsarGroup.add(core);
    meshes.push(core);

    // Two beams (cones)
    for (const dir of [1, -1]) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 18, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      beam.position.y = dir * 9;
      if (dir === -1) beam.rotation.x = Math.PI;
      pulsarGroup.add(beam);
    }
    pulsarGroup.rotation.z = 0.4;
    scene.add(pulsarGroup);
    addLabel(scene, 'Pulsar', 0, -5, 0);
  }

  // ---------- Black Hole ----------
  let blackHoleDisk;
  {
    const bhGroup = new THREE.Group();
    bhGroup.position.set(35, 0, 0);

    // Event horizon
    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    horizon.userData.key = 'black-hole';
    bhGroup.add(horizon);
    meshes.push(horizon);

    // Accretion disk — multi-ring with color gradient
    blackHoleDisk = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const inner = 2.8 + i * 0.5;
      const outer = inner + 0.45;
      const hue = 0.08 - i * 0.012;
      const col = new THREE.Color().setHSL(hue, 1, 0.55 - i * 0.04);
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 96),
        new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.85 - i * 0.07 })
      );
      disk.rotation.x = Math.PI / 2.1;
      blackHoleDisk.add(disk);
    }
    bhGroup.add(blackHoleDisk);

    // Outer glow halo
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 2.7, 96),
      new THREE.MeshBasicMaterial({ color: 0xffaa55, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    halo.rotation.x = Math.PI / 2.1;
    bhGroup.add(halo);

    scene.add(bhGroup);
    addLabel(scene, 'Black Hole', 35, -5, 0);
  }

  // ---------- Supernova ----------
  let supernovaCore, supernovaShell;
  {
    const snGroup = new THREE.Group();
    snGroup.position.set(75, 0, 0);

    supernovaCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    );
    supernovaCore.userData.key = 'supernova';
    snGroup.add(supernovaCore);
    meshes.push(supernovaCore);

    supernovaShell = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.4 })
    );
    snGroup.add(supernovaShell);

    scene.add(snGroup);
    addLabel(scene, 'Supernova', 75, -8, 0);
  }

  camera.position.set(15, 15, 70);
  controls.target.set(15, 0, 0);
  controls.minDistance = 5;
  controls.maxDistance = 300;

  let t = 0;
  function update(dt) {
    t += dt;
    if (pulsarGroup) pulsarGroup.rotation.y += dt * 4;
    if (blackHoleDisk) blackHoleDisk.rotation.z += dt * 0.6;
    if (supernovaShell) {
      const pulse = 1 + Math.sin(t * 1.5) * 0.25;
      supernovaShell.scale.setScalar(pulse);
      supernovaShell.material.opacity = 0.5 - (pulse - 1) * 0.6;
    }
    if (supernovaCore) {
      const flicker = 0.9 + Math.random() * 0.2;
      supernovaCore.scale.setScalar(flicker);
    }
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
  sprite.scale.set(10, 2.5, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}
