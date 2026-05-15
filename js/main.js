import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSolarSystem } from './scenes/solarSystem.js';
import { buildStars2D } from './scenes/stars.js';
import { buildRemnants } from './scenes/remnants.js';
import { buildGalaxies } from './scenes/galaxies.js';
import { buildConstellations } from './scenes/constellations.js';
import { buildGallery } from './scenes/gallery.js';
import { flyTo } from './cameraTween.js';

const container = document.getElementById('canvas-container');
const stars2dContainer = document.getElementById('stars2d-container');
const stars2dPrev = document.getElementById('stars2d-prev');
const stars2dNext = document.getElementById('stars2d-next');
const galleryContainer = document.getElementById('gallery-container');
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoType = document.getElementById('info-type');
const infoCaption = document.getElementById('info-caption');
const infoFacts = document.getElementById('info-facts');
const sceneHint = document.getElementById('scene-hint');
const scaleToggle = document.getElementById('scale-toggle');
const scaleSlider = document.getElementById('scale-slider');
const scaleLabel = document.getElementById('scale-label');
const objectList = document.getElementById('object-list');
const sidebarTitle = document.getElementById('sidebar-title');
const resetViewBtn = document.getElementById('reset-view');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = false; // we handle wheel/pinch manually below for proper magnitude scaling

// Magnitude-aware wheel & trackpad-pinch zoom, with zoom-to-cursor.
// We pivot the dolly around the world point under the cursor, so mouse position drives
// where the camera ends up — not just the scene origin.
const _camOffset = new THREE.Vector3();
const _tgtOffset = new THREE.Vector3();
const _viewDir = new THREE.Vector3();
const _ndc = new THREE.Vector3();
const _pivot = new THREE.Vector3();
const _plane = new THREE.Plane();
const _ray = new THREE.Ray();

function getCursorPivot(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const mx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const my = -((clientY - rect.top) / rect.height) * 2 + 1;
  // Plane through controls.target, perpendicular to view direction
  camera.getWorldDirection(_viewDir);
  _plane.setFromNormalAndCoplanarPoint(_viewDir, controls.target);
  // Ray from camera through cursor
  _ndc.set(mx, my, 0.5).unproject(camera);
  _ray.origin.copy(camera.position);
  _ray.direction.copy(_ndc.sub(camera.position).normalize());
  if (_ray.intersectPlane(_plane, _pivot)) return _pivot;
  return controls.target.clone();
}

// Classify wheel events:
//   - ctrlKey true        => trackpad pinch     => zoom
//   - large |deltaY| (>50) and no deltaX => mouse scroll wheel => zoom
//   - everything else (small magnitudes, possibly with deltaX) => trackpad 2-finger swipe => pan
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _panOffset = new THREE.Vector3();

renderer.domElement.addEventListener('wheel', (e) => {
  if (galleryContainer.classList.contains('hidden') === false) return;
  if (stars2dContainer.classList.contains('hidden') === false) return;
  e.preventDefault();

  const isPinch = e.ctrlKey === true;
  const isMouseWheel = !e.ctrlKey && Math.abs(e.deltaY) > 50 && Math.abs(e.deltaX) < 1;
  const isSwipe = !isPinch && !isMouseWheel;

  if (isSwipe) {
    // Pan: move both camera and target along the screen-plane axes.
    // Pan speed scales with distance so it feels consistent at any zoom.
    const dist = camera.position.distanceTo(controls.target);
    const panSpeed = dist * 0.0018;
    camera.getWorldDirection(_viewDir);
    _right.crossVectors(_viewDir, camera.up).normalize();
    _up.crossVectors(_right, _viewDir).normalize();
    _panOffset.set(0, 0, 0)
      .addScaledVector(_right, -e.deltaX * panSpeed)
      .addScaledVector(_up, e.deltaY * panSpeed);
    camera.position.add(_panOffset);
    controls.target.add(_panOffset);
    return;
  }

  // Zoom path — pivot around the world point under the cursor
  let exponent = e.deltaY * (isPinch ? 0.02 : 0.012);
  if (exponent > 0.7) exponent = 0.7;
  if (exponent < -0.7) exponent = -0.7;
  const factor = Math.exp(exponent);

  const pivot = getCursorPivot(e.clientX, e.clientY);
  _camOffset.subVectors(camera.position, pivot).multiplyScalar(factor);
  _tgtOffset.subVectors(controls.target, pivot).multiplyScalar(factor);
  camera.position.copy(pivot).add(_camOffset);
  controls.target.copy(pivot).add(_tgtOffset);

  const dist = camera.position.distanceTo(controls.target);
  if (dist < controls.minDistance) {
    const d = camera.position.clone().sub(controls.target).normalize().multiplyScalar(controls.minDistance);
    camera.position.copy(controls.target).add(d);
  } else if (dist > controls.maxDistance) {
    const d = camera.position.clone().sub(controls.target).normalize().multiplyScalar(controls.maxDistance);
    camera.position.copy(controls.target).add(d);
  }
}, { passive: false });

// Inside the stars2d page, vertical wheel scrolls horizontally — so mouse-wheel users
// can flip through panels just by scrolling normally.
stars2dContainer.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) > 0) {
    e.preventDefault();
    stars2dContainer.scrollLeft += e.deltaY * 2.5;
  }
}, { passive: false });

stars2dPrev.addEventListener('click', () => {
  stars2dContainer.scrollBy({ left: -stars2dContainer.clientWidth, behavior: 'smooth' });
});
stars2dNext.addEventListener('click', () => {
  stars2dContainer.scrollBy({ left: stars2dContainer.clientWidth, behavior: 'smooth' });
});

let content = {};
let currentScene = null;
let currentSceneKey = 'solar';

async function loadContent() {
  const res = await fetch('data/content.json');
  content = await res.json();
}

const sceneBuilders = {
  solar: buildSolarSystem,
  remnants: buildRemnants,
  galaxies: buildGalaxies,
  constellations: buildConstellations
};

const initialCameraStates = {};

function loadScene(key) {
  if (currentScene && currentScene.dispose) currentScene.dispose();
  // Hide any leftover formation caption from a previous scene
  const cap = document.getElementById('formation-caption');
  if (cap) cap.classList.add('hidden');
  currentSceneKey = key;

  // DOM-only scenes
  if (key === 'gallery') {
    container.style.display = 'none';
    stars2dContainer.classList.add('hidden');
    stars2dPrev.classList.add('hidden');
    stars2dNext.classList.add('hidden');
    galleryContainer.classList.remove('hidden');
    scaleToggle.classList.add('hidden');
    sidebarTitle.textContent = 'Categories';
    sceneHint.textContent = '';
    buildGallery(galleryContainer, content.gallery, objectList);
    hideInfo();
    currentScene = null;
    return;
  }
  if (key === 'stars') {
    container.style.display = 'none';
    galleryContainer.classList.add('hidden');
    stars2dContainer.classList.remove('hidden');
    stars2dPrev.classList.add('hidden');  // single-page now — no arrows needed
    stars2dNext.classList.add('hidden');
    scaleToggle.classList.add('hidden');
    sidebarTitle.textContent = 'Bodies';
    sceneHint.textContent = content.stars.hint || '';
    buildStars2D(stars2dContainer, content.stars, objectList);
    hideInfo();
    currentScene = null;
    return;
  }

  container.style.display = 'block';
  galleryContainer.classList.add('hidden');
  stars2dContainer.classList.add('hidden');
  stars2dPrev.classList.add('hidden');
  stars2dNext.classList.add('hidden');

  const sceneData = content[key];
  sceneHint.textContent = sceneData.hint || '';

  currentScene = sceneBuilders[key]({
    sceneData,
    camera,
    controls,
    onSelect: showInfo
  });

  // Cache initial camera state for reset
  initialCameraStates[key] = {
    pos: camera.position.clone(),
    target: controls.target.clone()
  };

  if (key === 'solar') {
    scaleToggle.classList.remove('hidden');
    scaleSlider.value = 0;
    scaleLabel.textContent = 'Illustrative';
  } else {
    scaleToggle.classList.add('hidden');
  }

  populateSidebar(key);
  hideInfo();
}

function populateSidebar(key) {
  const sceneData = content[key];
  if (!sceneData || !sceneData.objects) {
    objectList.innerHTML = '';
    return;
  }
  sidebarTitle.textContent = sceneTitle(key);
  objectList.innerHTML = '';
  for (const [objKey, obj] of Object.entries(sceneData.objects)) {
    const li = document.createElement('li');
    li.dataset.key = objKey;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = objectColor(key, objKey);
    li.appendChild(dot);
    li.appendChild(document.createTextNode(obj.name));
    li.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      if (currentScene && currentScene.focusOn) {
        currentScene.focusOn(objKey);
      } else {
        showInfo(objKey);
      }
    });
    objectList.appendChild(li);
  }
}

function sceneTitle(key) {
  return {
    solar: 'Solar System',
    stars: 'Star Types',
    remnants: 'Stellar Remnants',
    galaxies: 'Galaxies',
    constellations: 'Constellations'
  }[key] || 'Objects';
}

function objectColor(scene, key) {
  const map = {
    sun: '#ffcc55', mercury: '#aaaaaa', venus: '#e5b87a', earth: '#4a8fe7',
    moon: '#cccccc', mars: '#c1602e', asteroid: '#888', jupiter: '#d4a373',
    saturn: '#e6cf99', uranus: '#9fd8e0', neptune: '#4166f5',
    comet: '#bbccff', meteor: '#ffaa66',
    'red-dwarf': '#ff5533', 'sun-like': '#ffdd66', 'blue-giant': '#88bbff', 'red-giant': '#ff7744',
    'white-dwarf': '#eeeeff', 'neutron-star': '#ffffff', pulsar: '#aaccff',
    'black-hole': '#222', supernova: '#ffaa44',
    'milky-way': '#aabbff', andromeda: '#ddccaa', elliptical: '#ffccaa', irregular: '#aaccff',
    'southern-cross': '#aaccff', orion: '#ffffff', scorpius: '#ff8844'
  };
  return map[key] || '#888';
}

function showInfo(objectKey) {
  const data = content[currentSceneKey]?.objects?.[objectKey];
  if (!data) return;
  infoTitle.textContent = data.name;
  infoType.textContent = data.type;
  infoCaption.textContent = data.caption;
  infoFacts.innerHTML = '';
  for (const [k, v] of Object.entries(data.facts || {})) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${k}:</strong> ${v}`;
    infoFacts.appendChild(li);
  }
  // If the scene has a formation animation for this object, show a Play button
  const existing = document.getElementById('play-formation-btn');
  if (existing) existing.remove();
  if (currentScene && currentScene.hasFormation && currentScene.hasFormation(objectKey)) {
    const btn = document.createElement('button');
    btn.id = 'play-formation-btn';
    btn.className = 'play-formation-btn';
    btn.innerHTML = '▶ Play formation animation';
    btn.addEventListener('click', () => {
      currentScene.playFormation(objectKey);
    });
    infoFacts.parentElement.appendChild(btn);
  }
  infoPanel.classList.remove('hidden');
  document.querySelectorAll('#object-list li').forEach(x => {
    x.classList.toggle('active', x.dataset.key === objectKey);
  });
}

function hideInfo() {
  infoPanel.classList.add('hidden');
}

document.getElementById('close-info').addEventListener('click', hideInfo);

document.querySelectorAll('#scene-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#scene-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadScene(btn.dataset.scene);
  });
});

scaleSlider.addEventListener('input', (e) => {
  const t = +e.target.value / 100;
  scaleLabel.textContent = t < 0.05 ? 'Illustrative' : t > 0.95 ? 'True scale' : 'Mixed';
  if (currentScene && currentScene.setScale) currentScene.setScale(t);
});

function smoothResetView() {
  if (currentScene && currentScene.clearFollow) currentScene.clearFollow();
  const cached = initialCameraStates[currentSceneKey];
  if (cached) {
    flyTo(camera, controls, cached.target, cached.pos, 1.4);
  }
  document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
}
resetViewBtn.addEventListener('click', smoothResetView);

// Click handling
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY;
});
renderer.domElement.addEventListener('pointerup', (e) => {
  if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (currentScene && currentScene.handleClick) {
    currentScene.handleClick(pointer, camera, raycaster);
  }
});

// Double-click anywhere on the canvas smoothly resets the view
renderer.domElement.addEventListener('dblclick', smoothResetView);

// User drag = stop following
controls.addEventListener('start', () => {
  // Don't break the tween animation, only stop follow when user drags
});
renderer.domElement.addEventListener('pointerdown', () => {
  if (currentScene && currentScene.clearFollow) {
    // Only clear follow on right-click / middle drag (panning), not just any drag
    // Actually: keep follow until user clicks reset. Simpler.
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  const dt = clock.getDelta();
  controls.update();
  if (currentScene) {
    if (currentScene.update) currentScene.update(dt);
    renderer.render(currentScene.scene, camera);
  }
  requestAnimationFrame(animate);
}

(async () => {
  await loadContent();
  loadScene('solar');
  animate();
})();
