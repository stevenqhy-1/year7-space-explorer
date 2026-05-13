import * as THREE from 'three';
import { addStarfield, pickFromMeshes, disposeScene } from '../utils.js';

// Illustrative vs true-scale data
// Real diameters in km; real distances in million km from Sun
const BODIES = [
  { key: 'sun',     color: 0xffcc33, realDia: 1392000, realDist: 0,    illDia: 8,   illDist: 0,    label: 'Sun',     emissive: true },
  { key: 'mercury', color: 0xa9a9a9, realDia: 4879,    realDist: 57.9, illDia: 0.8, illDist: 15,   label: 'Mercury' },
  { key: 'venus',   color: 0xe5b87a, realDia: 12104,   realDist: 108,  illDia: 1.2, illDist: 22,   label: 'Venus' },
  { key: 'earth',   color: 0x4a8fe7, realDia: 12742,   realDist: 150,  illDia: 1.3, illDist: 30,   label: 'Earth' },
  { key: 'moon',    color: 0xcccccc, realDia: 3474,    realDist: 150.4,illDia: 0.4, illDist: 32,   label: 'Moon',   orbits: 'earth' },
  { key: 'mars',    color: 0xc1440e, realDia: 6779,    realDist: 228,  illDia: 1.0, illDist: 40,   label: 'Mars' },
  { key: 'asteroid',color: 0x888888, realDia: 0,       realDist: 380,  illDia: 0,   illDist: 50,   label: 'Asteroids', isBelt: true },
  { key: 'jupiter', color: 0xd4a373, realDia: 139820,  realDist: 778,  illDia: 4.5, illDist: 65,   label: 'Jupiter' },
  { key: 'saturn',  color: 0xe6cf99, realDia: 116460,  realDist: 1430, illDia: 3.8, illDist: 85,   label: 'Saturn', hasRings: true },
  { key: 'uranus',  color: 0x9fd8e0, realDia: 50724,   realDist: 2870, illDia: 2.5, illDist: 105,  label: 'Uranus' },
  { key: 'neptune', color: 0x4166f5, realDia: 49244,   realDist: 4500, illDia: 2.4, illDist: 125,  label: 'Neptune' },
  { key: 'comet',   color: 0xeeeeff, realDia: 0,       realDist: 200,  illDia: 0.6, illDist: 45,   label: 'Comet', isComet: true },
  { key: 'meteor',  color: 0xffaa66, realDia: 0,       realDist: 150,  illDia: 0.3, illDist: 35,   label: 'Meteor', isMeteor: true }
];

export function buildSolarSystem({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);

  addStarfield(scene, 3000, 800);

  // Ambient + sun light
  scene.add(new THREE.AmbientLight(0x333344, 1));
  const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
  scene.add(sunLight);

  const meshes = [];
  const orbitLines = [];

  for (const body of BODIES) {
    let mesh;
    if (body.isBelt) {
      // Asteroid belt — ring of small points
      const group = new THREE.Group();
      const count = 400;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = body.illDist + (Math.random() - 0.5) * 6;
        positions[i*3] = Math.cos(a) * r;
        positions[i*3+1] = (Math.random() - 0.5) * 0.6;
        positions[i*3+2] = Math.sin(a) * r;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.15 }));
      group.add(pts);
      // Invisible click sphere
      const clickSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      clickSphere.position.set(body.illDist, 0, 0);
      clickSphere.userData.key = body.key;
      group.add(clickSphere);
      meshes.push(clickSphere);
      scene.add(group);
      continue;
    }

    if (body.isComet) {
      const group = new THREE.Group();
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xddeeff })
      );
      // Tail: simple cone
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 4, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -2;
      group.add(head); group.add(tail);
      group.position.set(body.illDist * 0.7, 4, body.illDist * 0.5);
      group.userData.key = body.key;
      head.userData.key = body.key;
      tail.userData.key = body.key;
      scene.add(group);
      meshes.push(head);
      continue;
    }

    if (body.isMeteor) {
      // A small bright streak near Earth
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffcc66 })
      );
      m.position.set(body.illDist, 2, -body.illDist * 0.3);
      m.userData.key = body.key;
      scene.add(m);
      meshes.push(m);
      // Trail
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.01, 2, 6),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.5 })
      );
      trail.rotation.z = Math.PI / 4;
      m.add(trail);
      continue;
    }

    const geom = new THREE.SphereGeometry(body.illDia, 32, 32);
    const mat = body.emissive
      ? new THREE.MeshBasicMaterial({ color: body.color })
      : new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.85 });
    mesh = new THREE.Mesh(geom, mat);
    mesh.position.x = body.illDist;
    mesh.userData.key = body.key;
    mesh.userData.body = body;
    scene.add(mesh);
    meshes.push(mesh);

    if (body.emissive) {
      // Sun glow
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(body.illDia * 1.3, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.18 })
      );
      mesh.add(glow);
    }

    if (body.hasRings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(body.illDia * 1.4, body.illDia * 2.2, 64),
        new THREE.MeshBasicMaterial({ color: 0xddcc99, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.PI / 2.3;
      mesh.add(ring);
    }

    // Orbit ring
    if (body.illDist > 0 && !body.orbits) {
      const ringGeo = new THREE.RingGeometry(body.illDist - 0.02, body.illDist + 0.02, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x223344, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      orbitLines.push(ring);
    }
  }

  camera.position.set(0, 60, 140);
  camera.lookAt(0, 0, 0);
  controls.target.set(0, 0, 0);
  controls.minDistance = 5;
  controls.maxDistance = 800;

  // Animation state
  let t = 0;
  const orbitSpeeds = { mercury: 1.6, venus: 1.2, earth: 1.0, moon: 1.0, mars: 0.8, jupiter: 0.4, saturn: 0.3, uranus: 0.2, neptune: 0.15, comet: 0.6, meteor: 1.0 };

  function update(dt) {
    t += dt;
    for (const mesh of meshes) {
      const b = mesh.userData.body;
      if (!b || !b.illDist) continue;
      const speed = orbitSpeeds[b.key] || 0;
      const angle = t * speed * 0.2;
      mesh.position.x = Math.cos(angle) * b.illDist;
      mesh.position.z = Math.sin(angle) * b.illDist;
      mesh.rotation.y += dt * 0.5;
    }
  }

  function setScale(tScale) {
    // tScale: 0 = illustrative, 1 = true-ish scale
    // Even at "true scale" we can't go fully real (Earth would be invisible),
    // but we exaggerate the contrast: planets shrink, distances stretch.
    for (const mesh of meshes) {
      const b = mesh.userData.body;
      if (!b) continue;
      const sizeFactor = 1 - 0.85 * tScale; // shrink up to 85%
      const distFactor = 1 + 3 * tScale;    // up to 4x distance
      mesh.scale.setScalar(sizeFactor);
      if (b.illDist) {
        // Reposition keeping angle
        const a = Math.atan2(mesh.position.z, mesh.position.x);
        const r = b.illDist * distFactor;
        mesh.position.x = Math.cos(a) * r;
        mesh.position.z = Math.sin(a) * r;
        b._currentDist = r;
      }
    }
    // Scale orbit rings
    orbitLines.forEach((ring, i) => {
      ring.scale.setScalar(1 + 3 * tScale);
    });
  }

  function handleClick(pointer, cam, raycaster) {
    const key = pickFromMeshes(pointer, cam, raycaster, meshes);
    if (key) onSelect(key);
  }

  function dispose() {
    disposeScene(scene);
  }

  return { scene, update, setScale, handleClick, dispose };
}
