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

// Real orbital elements — mean longitudes at J2000 + sidereal periods (days).
// Used to place each planet at its true position for any given virtual date.
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const ORBITAL = {
  mercury: { period: 87.969,   lambda0: 252.25 },
  venus:   { period: 224.701,  lambda0: 181.98 },
  earth:   { period: 365.256,  lambda0: 100.46 },
  mars:    { period: 686.971,  lambda0: 355.43 },
  jupiter: { period: 4332.589, lambda0: 34.40  },
  saturn:  { period: 10759.22, lambda0: 49.94  },
  uranus:  { period: 30688.5,  lambda0: 313.23 },
  neptune: { period: 60182.0,  lambda0: 304.88 }
};
// Moon — orbits Earth (synodic ~29.5 days, sidereal ~27.32; we use sidereal for clean math)
const MOON_PERIOD = 27.32166;
const MOON_LAMBDA0 = 218.32;

export function buildSolarSystem({ camera, controls, onSelect }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000005);
  // Layered starfields: a dense nearby field at moderate radius +
  // a volumetric field of stars throughout space, so when you zoom out
  // they stream past the camera and feel like real travel.
  addStarfield(scene, 3500, 1200);
  const volStars = addVolumetricStars(scene, 18000, 4500);

  // Milky Way galactic context — fades in as you zoom out.
  const milkyWay = buildMilkyWayContext();
  scene.add(milkyWay.group);

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
  controls.maxDistance = 5000; // allow zooming out far enough to see the galaxy
  controls.zoomSpeed = 4.0;
  controls.rotateSpeed = 0.9;

  // Animation
  let t = 0;
  let followKey = null;
  let distScale = 1;   // 1 = illustrative, increases toward "true scale"
  let sizeFactor = 1;  // planets shrink at higher scale
  const tmpVec = new THREE.Vector3();

  // Virtual clock — drives real planet positions.
  // virtualMs = milliseconds since epoch (Unix time) for the "in-simulation date".
  // timeScale = how many seconds of virtual time pass per second of real time.
  //   0       => paused
  //   86400   => 1 day per real second
  //   604800  => 1 week per real second (default)
  //   31536000=> 1 year per real second
  let virtualMs = Date.now();
  let timeScale = 604800; // 1 virtual week per real second by default
  // Comet/meteor positions use a separate internal accumulator so they look
  // alive at any time scale without depending on virtual date.
  let cometT = 0;

  function planetAngle(key, daysSinceJ2000) {
    const orb = ORBITAL[key];
    if (!orb) return 0;
    return ((orb.lambda0 + daysSinceJ2000 * 360 / orb.period) % 360) * Math.PI / 180;
  }

  function update(dt) {
    t += dt;
    virtualMs += dt * 1000 * timeScale;
    cometT += dt;
    const daysSinceJ2000 = (virtualMs - J2000_MS) / 86400000;

    // Real-position orbits for Mercury → Neptune
    for (const key of Object.keys(objects)) {
      const o = objects[key];
      if (!o.body || !o.body.illDist || key === 'moon') continue;
      const target = o.orbitGroup || o.mesh;
      if (!target || key === 'asteroid') continue;
      const r = o.body.illDist * distScale;
      let angle;
      if (ORBITAL[key]) {
        angle = planetAngle(key, daysSinceJ2000);
      } else {
        // Comet & meteor — use the internal accumulator so they stay lively
        const speed = ORBIT_SPEEDS[key] ?? 0;
        angle = cometT * speed * 0.15;
      }
      target.position.x = Math.cos(angle) * r;
      target.position.z = Math.sin(angle) * r;
      // Visual spin — fixed rate, doesn't scale with time so it looks sensible
      if (o.mesh && o.mesh.rotation) o.mesh.rotation.y += dt * 0.4;
    }

    // Moon orbits Earth at its true phase
    const earth = objects.earth, moon = objects.moon;
    if (earth && moon) {
      const ma = ((MOON_LAMBDA0 + daysSinceJ2000 * 360 / MOON_PERIOD) % 360) * Math.PI / 180;
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
    // Milky Way fades in as camera distance grows
    const camDist = camera.position.distanceTo(controls.target);
    const galaxyT = THREE.MathUtils.clamp((camDist - 300) / 1500, 0, 1);
    milkyWay.setOpacity(galaxyT);
    milkyWay.rotate(dt * 0.003);
    // Volumetric stars stay visible always (they ARE the stars passing by)
    volStars.material.opacity = 0.55 + 0.45 * galaxyT;
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
    // tScale: 0 = illustrative (current), 1 = closer to true scale
    // - distScale stretches the orbit radii (used by update() every frame)
    // - sizeFactor shrinks the planets/sun — at "true scale" the planets would
    //   be vanishingly small dots, which is exactly the pedagogical point.
    distScale = 1 + 3 * tScale;          // up to 4x further apart
    sizeFactor = 1 - 0.85 * tScale;      // shrink planets up to 85%
    for (const key of Object.keys(objects)) {
      const o = objects[key];
      if (!o.mesh) continue;
      o.mesh.scale.setScalar(sizeFactor);
      if (o.extras) {
        o.extras.forEach(e => e.scale && e.scale.setScalar(sizeFactor));
      }
    }
  }

  function dispose() { disposeScene(scene); }

  // ── Time-control API ──
  function setTimeScale(secsPerSec) {
    timeScale = Math.max(0, Number(secsPerSec) || 0);
  }
  function getTimeScale() { return timeScale; }
  function jumpToNow() { virtualMs = Date.now(); }
  function getVirtualDate() { return new Date(virtualMs); }

  return {
    scene, update, focusOn, getObjectPosition, listObjects, clearFollow,
    handleClick, setScale, dispose,
    setTimeScale, getTimeScale, jumpToNow, getVirtualDate
  };
}

// ─────────── Galactic context (Milky Way) ───────────

// Volumetric star field — particles distributed throughout a sphere of given radius
// so that as the camera moves, stars at different depths parallax past at different
// rates. Returns the Points object (caller can tweak material).
function addVolumetricStars(scene, count, maxRadius) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Cube root distribution = roughly uniform in volume
    const r = Math.pow(Math.random(), 1 / 3) * maxRadius;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
    // Slight color variation — yellow-white to blue-white
    const c = 0.7 + Math.random() * 0.3;
    const b = 0.85 + Math.random() * 0.15;
    colors[i*3] = c;
    colors[i*3+1] = c;
    colors[i*3+2] = b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}

// Builds a face-on spiral galaxy at large scale with the solar system positioned
// in one of the arms. The whole thing fades in opacity as the camera zooms out.
function buildMilkyWayContext() {
  const group = new THREE.Group();
  // Galactic center placed offset from origin — solar system (at 0,0,0) lives
  // in an outer spiral arm.
  const centerOffset = new THREE.Vector3(-900, 0, 0);
  group.position.copy(centerOffset);

  // Spiral arm stars
  const armCount = 4;
  const totalStars = 70000;
  const positions = new Float32Array(totalStars * 3);
  const colors = new Float32Array(totalStars * 3);
  const radius = 1400;
  for (let i = 0; i < totalStars; i++) {
    const arm = i % armCount;
    const distNorm = Math.pow(Math.random(), 0.55);
    const dist = distNorm * radius + 60;
    const armAngle = (arm / armCount) * Math.PI * 2;
    // Logarithmic spiral twist
    const twist = Math.log(dist + 1) * 0.85;
    const a = armAngle + twist + (Math.random() - 0.5) * 0.55;
    positions[i*3]   = Math.cos(a) * dist;
    positions[i*3+1] = (Math.random() - 0.5) * 50 * (1 - distNorm * 0.7);
    positions[i*3+2] = Math.sin(a) * dist;
    // Color: cooler/redder near edges, hotter/bluer toward center
    const tNorm = 1 - distNorm;
    colors[i*3]   = 0.85 + tNorm * 0.15;
    colors[i*3+1] = 0.75 + tNorm * 0.2;
    colors[i*3+2] = 0.9 + tNorm * 0.1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const armMat = new THREE.PointsMaterial({
    size: 4,
    vertexColors: true,
    transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
    sizeAttenuation: true
  });
  const armPoints = new THREE.Points(geo, armMat);
  group.add(armPoints);

  // Bulge — a bright central glow
  const bulge = new THREE.Mesh(
    new THREE.SphereGeometry(180, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffeebb, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  group.add(bulge);

  const bulgeOuter = new THREE.Mesh(
    new THREE.SphereGeometry(320, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffcc88, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  group.add(bulgeOuter);

  // Faint disk halo
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.95, 96),
    new THREE.MeshBasicMaterial({
      color: 0x445588, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
  );
  disk.rotation.x = Math.PI / 2;
  group.add(disk);

  // "Solar System is here" marker — bright pinpoint at the world origin
  // (after the group offset, that's local position +900,0,0).
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 })
  );
  marker.position.copy(centerOffset).negate(); // back to (0,0,0) in world
  group.add(marker);

  const markerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(9, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffff66, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  markerGlow.position.copy(marker.position);
  group.add(markerGlow);

  return {
    group,
    setOpacity(o) {
      armMat.opacity = o * 0.9;
      bulge.material.opacity = o * 0.55;
      bulgeOuter.material.opacity = o * 0.30;
      disk.material.opacity = o * 0.12;
      // Marker becomes visible only when galaxy is visible (mid-far zoom)
      const m = Math.max(0, Math.min(1, (o - 0.1) * 1.6));
      marker.material.opacity = m;
      markerGlow.material.opacity = m * 0.7;
    },
    rotate(da) {
      group.rotation.y += da;
    }
  };
}
