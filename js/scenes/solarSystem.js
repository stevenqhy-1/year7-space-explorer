import * as THREE from 'three';
import { addStarfield, disposeScene } from '../utils.js';
import {
  makeGasGiantTexture, makeRockyTexture, makeSunTexture,
  makeRingTexture, makeAtmosphereMaterial
} from '../textureFactory.js';
import { flyTo, viewpointFor } from '../cameraTween.js';

const THREE_EXAMPLES = 'https://threejs.org/examples/textures/planets';

// realDia (km) and realDist (Mkm) are reference; we render in scene units.
const BODIES = [
  { key: 'sun',     illDia: 9,   illDist: 0,    emissive: true },
  { key: 'mercury', illDia: 0.9, illDist: 18 },
  { key: 'venus',   illDia: 1.4, illDist: 25 },
  { key: 'earth',   illDia: 1.5, illDist: 33 },
  { key: 'moon',    illDia: 0.45,illDist: 35.5, orbits: 'earth', orbitR: 2.5 },
  { key: 'mars',    illDia: 1.2, illDist: 42 },
  { key: 'asteroid',illDist: 52, isBelt: true },
  { key: 'jupiter', illDia: 4.8, illDist: 65 },
  { key: 'saturn',  illDia: 4.2, illDist: 85, hasRings: true },
  { key: 'uranus',  illDia: 2.6, illDist: 105 },
  { key: 'neptune', illDia: 2.5, illDist: 125 },
  { key: 'comet',   illDist: 45, isComet: true },
  { key: 'meteor',  illDist: 36, isMeteor: true }
];

const ORBIT_SPEEDS = {
  mercury: 1.6, venus: 1.2, earth: 1.0, mars: 0.8,
  jupiter: 0.4, saturn: 0.3, uranus: 0.2, neptune: 0.15,
  comet: 0.55, meteor: 1.1
};

export function buildSolarSystem({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  addStarfield(scene, 4000, 1500);

  // Lighting — soft ambient + bright point at the Sun
  scene.add(new THREE.AmbientLight(0x223344, 1.4));
  const sunLight = new THREE.PointLight(0xffffff, 4, 0, 0);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  const earthMap = loader.load(`${THREE_EXAMPLES}/earth_atmos_2048.jpg`);
  const earthNormal = loader.load(`${THREE_EXAMPLES}/earth_normal_2048.jpg`);
  const earthSpec = loader.load(`${THREE_EXAMPLES}/earth_specular_2048.jpg`);
  const moonMap = loader.load(`${THREE_EXAMPLES}/moon_1024.jpg`);
  [earthMap, moonMap].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; });

  const objects = {}; // key -> { mesh, group, body, getWorldPos }

  function addPlanet(body) {
    const group = new THREE.Group();
    scene.add(group);
    const orbitGroup = new THREE.Group();
    group.add(orbitGroup);
    orbitGroup.position.x = body.illDist;

    const geom = new THREE.SphereGeometry(body.illDia, 64, 48);
    let mat;
    let extras = [];

    switch (body.key) {
      case 'sun': {
        mat = new THREE.MeshBasicMaterial({ map: makeSunTexture() });
        // corona
        const corona1 = new THREE.Mesh(
          new THREE.SphereGeometry(body.illDia * 1.15, 48, 48),
          new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        const corona2 = new THREE.Mesh(
          new THREE.SphereGeometry(body.illDia * 1.5, 48, 48),
          new THREE.MeshBasicMaterial({ color: 0xff8822, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        extras.push(corona1, corona2);
        break;
      }
      case 'mercury':
        mat = new THREE.MeshStandardMaterial({ map: makeRockyTexture({ base: '#9a8870', spots: ['#6e5b48', '#bca38a', '#3d2f24'], craterDensity: 1.0, seed: 11 }), roughness: 0.95 });
        break;
      case 'venus': {
        mat = new THREE.MeshStandardMaterial({ map: makeRockyTexture({ base: '#d9a96b', spots: ['#b07a44', '#f0c98c', '#80532a'], craterDensity: 0.05, seed: 12 }), roughness: 0.85 });
        const atm = new THREE.Mesh(new THREE.SphereGeometry(body.illDia * 1.07, 48, 48), makeAtmosphereMaterial(0xeebb77, 0.35));
        extras.push(atm);
        break;
      }
      case 'earth': {
        mat = new THREE.MeshStandardMaterial({
          map: earthMap, normalMap: earthNormal,
          roughnessMap: earthSpec, roughness: 0.85, metalness: 0.05
        });
        const atm = new THREE.Mesh(new THREE.SphereGeometry(body.illDia * 1.04, 48, 48), makeAtmosphereMaterial(0x4488ff, 0.45));
        extras.push(atm);
        break;
      }
      case 'mars':
        mat = new THREE.MeshStandardMaterial({ map: makeRockyTexture({ base: '#c1602e', spots: ['#7a3010', '#e08855', '#3a1408'], craterDensity: 0.5, seed: 13 }), roughness: 0.9 });
        break;
      case 'jupiter':
        mat = new THREE.MeshStandardMaterial({
          map: makeGasGiantTexture({
            palette: ['#e8c39f', '#c4a07a', '#a87a55', '#deb088', '#8b5e3c', '#f0d4a8'],
            seed: 21, bands: 24
          }),
          roughness: 1.0
        });
        break;
      case 'saturn': {
        mat = new THREE.MeshStandardMaterial({
          map: makeGasGiantTexture({
            palette: ['#e6cf99', '#d4b07a', '#bc9a64', '#f0dca8', '#a8854a'],
            seed: 22, bands: 18
          }),
          roughness: 1.0
        });
        const ringTex = makeRingTexture(23);
        const ringGeom = new THREE.RingGeometry(body.illDia * 1.4, body.illDia * 2.4, 128);
        // Map u to radial coordinate
        const pos = ringGeom.attributes.position;
        const uv = ringGeom.attributes.uv;
        const innerR = body.illDia * 1.4, outerR = body.illDia * 2.4;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i);
          const r = Math.sqrt(x*x + y*y);
          uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
        }
        const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true }));
        ring.rotation.x = Math.PI / 2.2;
        extras.push(ring);
        break;
      }
      case 'uranus': {
        mat = new THREE.MeshStandardMaterial({
          map: makeGasGiantTexture({
            palette: ['#bce4e6', '#8fd0d8', '#a8dadf', '#6cb8c4'],
            seed: 24, bands: 8, turbulence: 0.05
          }),
          roughness: 1.0
        });
        const atm = new THREE.Mesh(new THREE.SphereGeometry(body.illDia * 1.05, 48, 48), makeAtmosphereMaterial(0x99ddee, 0.30));
        extras.push(atm);
        break;
      }
      case 'neptune': {
        mat = new THREE.MeshStandardMaterial({
          map: makeGasGiantTexture({
            palette: ['#2a4dbb', '#3766de', '#4a82ee', '#1c3590', '#5b8df7'],
            seed: 25, bands: 12, turbulence: 0.12
          }),
          roughness: 1.0
        });
        const atm = new THREE.Mesh(new THREE.SphereGeometry(body.illDia * 1.05, 48, 48), makeAtmosphereMaterial(0x4477ee, 0.30));
        extras.push(atm);
        break;
      }
      case 'moon':
        mat = new THREE.MeshStandardMaterial({ map: moonMap, roughness: 1 });
        break;
      default:
        mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.key = body.key;
    orbitGroup.add(mesh);
    extras.forEach(e => orbitGroup.add(e));

    // Orbit ring around Sun
    if (body.illDist > 0 && !body.orbits) {
      const ringGeo = new THREE.RingGeometry(body.illDist - 0.05, body.illDist + 0.05, 256);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
    }

    return { body, group, orbitGroup, mesh, extras };
  }

  // Build all bodies
  for (const body of BODIES) {
    if (body.isBelt) continue;
    if (body.isComet) continue;
    if (body.isMeteor) continue;
    objects[body.key] = addPlanet(body);
  }

  // Asteroid belt
  {
    const beltGroup = new THREE.Group();
    const beltDist = BODIES.find(b => b.key === 'asteroid').illDist;
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = beltDist + (Math.random() - 0.5) * 7;
      positions[i*3]   = Math.cos(a) * r;
      positions[i*3+1] = (Math.random() - 0.5) * 0.8;
      positions[i*3+2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb0a890, size: 0.18 }));
    beltGroup.add(pts);
    // Invisible click sphere
    const clickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(2, 16, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    clickSphere.position.set(beltDist, 0, 0);
    clickSphere.userData.key = 'asteroid';
    beltGroup.add(clickSphere);
    scene.add(beltGroup);
    objects.asteroid = { body: { key: 'asteroid', illDist: beltDist, illDia: 2 }, group: beltGroup, mesh: clickSphere, extras: [] };
  }

  // Comet — small icy nucleus with a long glowing tail
  {
    const cometGroup = new THREE.Group();
    const dist = BODIES.find(b => b.key === 'comet').illDist;
    const inner = new THREE.Group();
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xddeeff })
    );
    head.userData.key = 'comet';
    inner.add(head);
    // Coma glow
    const coma = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x99bbee, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    inner.add(coma);
    // Tail — long cone trailing away from Sun
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 8, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -4;
    inner.add(tail);
    inner.position.set(dist, 3, 0);
    cometGroup.add(inner);
    scene.add(cometGroup);
    objects.comet = { body: { key: 'comet', illDist: dist, illDia: 1 }, group: cometGroup, orbitGroup: inner, mesh: head, extras: [coma, tail] };
  }

  // Meteor — bright shooting star streak
  {
    const meteorGroup = new THREE.Group();
    const dist = BODIES.find(b => b.key === 'meteor').illDist;
    const inner = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffcc66 })
    );
    m.userData.key = 'meteor';
    inner.add(m);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.01, 3, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    trail.position.y = -1.5;
    inner.add(trail);
    inner.position.set(dist, 2, -dist * 0.25);
    meteorGroup.add(inner);
    scene.add(meteorGroup);
    objects.meteor = { body: { key: 'meteor', illDist: dist, illDia: 0.6 }, group: meteorGroup, orbitGroup: inner, mesh: m, extras: [trail] };
  }

  // Initial camera
  camera.position.set(0, 70, 160);
  controls.target.set(0, 0, 0);
  controls.minDistance = 1;
  controls.maxDistance = 800;
  controls.zoomSpeed = 2.0;
  controls.rotateSpeed = 0.9;

  // Animation
  let t = 0;
  let followKey = null;
  const tmpVec = new THREE.Vector3();

  function update(dt) {
    t += dt;
    // Orbit planets around the Sun
    for (const key of Object.keys(objects)) {
      const o = objects[key];
      if (!o.body || !o.body.illDist || key === 'moon') continue;
      const speed = ORBIT_SPEEDS[key] ?? 0;
      const angle = t * speed * 0.15;
      const r = o.body.illDist;
      const target = o.orbitGroup || o.mesh;
      if (target && key !== 'asteroid') {
        target.position.x = Math.cos(angle) * r;
        target.position.z = Math.sin(angle) * r;
        if (o.mesh && o.mesh.rotation) o.mesh.rotation.y += dt * 0.4;
      }
    }
    // Moon orbits earth
    const earth = objects.earth, moon = objects.moon;
    if (earth && moon) {
      const ma = t * 1.5;
      const moonR = 2.6;
      moon.orbitGroup.position.x = earth.orbitGroup.position.x + Math.cos(ma) * moonR;
      moon.orbitGroup.position.z = earth.orbitGroup.position.z + Math.sin(ma) * moonR;
    }
    // If following a body, keep controls.target locked to its current position
    if (followKey && objects[followKey]) {
      const o = objects[followKey];
      const node = o.orbitGroup || o.mesh;
      if (node) {
        node.getWorldPosition(tmpVec);
        controls.target.copy(tmpVec);
      }
    }
  }

  function getObjectPosition(key) {
    const o = objects[key];
    if (!o) return null;
    const node = o.orbitGroup || o.mesh;
    const v = new THREE.Vector3();
    node.getWorldPosition(v);
    return v;
  }

  function getObjectRadius(key) {
    const o = objects[key];
    if (!o) return 2;
    return (o.body && o.body.illDia) ? o.body.illDia : 2;
  }

  function focusOn(key) {
    const pos = getObjectPosition(key);
    if (!pos) return;
    const radius = getObjectRadius(key);
    const cameraPos = viewpointFor(pos, radius);
    flyTo(camera, controls, pos, cameraPos, 1.2);
    followKey = key;
    onSelect(key);
  }

  function clearFollow() { followKey = null; }

  function handleClick(pointer, cam, raycaster) {
    raycaster.setFromCamera(pointer, cam);
    const meshes = Object.values(objects).map(o => o.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return;
    focusOn(hits[0].object.userData.key);
  }

  function listObjects() {
    return BODIES.filter(b => b.key !== 'asteroid' || true).map(b => b.key);
  }

  function setScale(tScale) {
    // Mostly a placeholder; subtle stretch of orbit distances
    for (const key of Object.keys(objects)) {
      const o = objects[key];
      if (!o.body || !o.body.illDist) continue;
      const factor = 1 + 2 * tScale;
      if (key === 'moon') continue;
      // Keep angles but stretch radius
      const node = o.orbitGroup || o.mesh;
      const a = Math.atan2(node.position.z, node.position.x);
      node.position.x = Math.cos(a) * o.body.illDist * factor;
      node.position.z = Math.sin(a) * o.body.illDist * factor;
    }
  }

  function dispose() { disposeScene(scene); }

  return { scene, update, focusOn, getObjectPosition, listObjects, clearFollow, handleClick, setScale, dispose };
}
