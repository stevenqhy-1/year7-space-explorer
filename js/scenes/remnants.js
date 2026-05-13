import * as THREE from 'three';
import { addStarfield, disposeScene } from '../utils.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

export function buildRemnants({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 3000, 1200);
  scene.add(new THREE.AmbientLight(0x222244, 1));

  const objects = {};

  // White Dwarf
  {
    const g = new THREE.Group();
    g.position.set(-60, 0, 0);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xeeffff })
    );
    core.userData.key = 'white-dwarf';
    g.add(core);
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x6699ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
    scene.add(g);
    objects['white-dwarf'] = { mesh: core, group: g, size: 2 };
    addLabel(scene, 'White Dwarf', -60, -5, 0);
  }

  // Neutron Star
  {
    const g = new THREE.Group();
    g.position.set(-30, 0, 0);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    core.userData.key = 'neutron-star';
    g.add(core);
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x88ffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    ));
    scene.add(g);
    objects['neutron-star'] = { mesh: core, group: g, size: 1.5 };
    addLabel(scene, 'Neutron Star', -30, -5, 0);
  }

  // Pulsar
  let pulsarGroup;
  {
    pulsarGroup = new THREE.Group();
    pulsarGroup.position.set(0, 0, 0);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xccddff })
    );
    core.userData.key = 'pulsar';
    pulsarGroup.add(core);
    for (const dir of [1, -1]) {
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 18, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      beam.position.y = dir * 9;
      if (dir === -1) beam.rotation.x = Math.PI;
      pulsarGroup.add(beam);
    }
    pulsarGroup.rotation.z = 0.4;
    scene.add(pulsarGroup);
    objects.pulsar = { mesh: core, group: pulsarGroup, size: 2 };
    addLabel(scene, 'Pulsar', 0, -5, 0);
  }

  // Black Hole — fancier accretion disk
  let blackHoleDisk;
  {
    const bhGroup = new THREE.Group();
    bhGroup.position.set(38, 0, 0);

    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    horizon.userData.key = 'black-hole';
    bhGroup.add(horizon);

    blackHoleDisk = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const inner = 2.6 + i * 0.45;
      const outer = inner + 0.4;
      const hue = 0.10 - i * 0.008;
      const col = new THREE.Color().setHSL(hue, 1, 0.6 - i * 0.04);
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 128),
        new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.9 - i * 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      disk.rotation.x = Math.PI / 2.15;
      blackHoleDisk.add(disk);
    }
    bhGroup.add(blackHoleDisk);

    // Bright photon ring
    const photonRing = new THREE.Mesh(
      new THREE.RingGeometry(2.3, 2.55, 128),
      new THREE.MeshBasicMaterial({ color: 0xffeecc, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    photonRing.rotation.x = Math.PI / 2.15;
    bhGroup.add(photonRing);

    scene.add(bhGroup);
    objects['black-hole'] = { mesh: horizon, group: bhGroup, size: 5 };
    addLabel(scene, 'Black Hole', 38, -7, 0);
  }

  // Supernova
  let supernovaCore, supernovaShell;
  {
    const snGroup = new THREE.Group();
    snGroup.position.set(80, 0, 0);
    supernovaCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    );
    supernovaCore.userData.key = 'supernova';
    snGroup.add(supernovaCore);
    supernovaShell = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    snGroup.add(supernovaShell);
    scene.add(snGroup);
    objects.supernova = { mesh: supernovaCore, group: snGroup, size: 4 };
    addLabel(scene, 'Supernova', 80, -8, 0);
  }

  camera.position.set(20, 20, 80);
  controls.target.set(20, 0, 0);
  controls.minDistance = 2;
  controls.maxDistance = 400;
  controls.zoomSpeed = 2.0;

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
