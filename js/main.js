import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSolarSystem } from './scenes/solarSystem.js';
import { buildStars } from './scenes/stars.js';
import { buildRemnants } from './scenes/remnants.js';
import { buildGalaxies } from './scenes/galaxies.js';
import { buildConstellations } from './scenes/constellations.js';

const container = document.getElementById('canvas-container');
const infoPanel = document.getElementById('info-panel');
const infoTitle = document.getElementById('info-title');
const infoType = document.getElementById('info-type');
const infoCaption = document.getElementById('info-caption');
const infoFacts = document.getElementById('info-facts');
const sceneHint = document.getElementById('scene-hint');
const scaleToggle = document.getElementById('scale-toggle');
const scaleSlider = document.getElementById('scale-slider');
const scaleLabel = document.getElementById('scale-label');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

let content = {};
let currentScene = null;
let currentSceneKey = 'solar';

async function loadContent() {
  const res = await fetch('data/content.json');
  content = await res.json();
}

const sceneBuilders = {
  solar: buildSolarSystem,
  stars: buildStars,
  remnants: buildRemnants,
  galaxies: buildGalaxies,
  constellations: buildConstellations
};

function loadScene(key) {
  if (currentScene && currentScene.dispose) currentScene.dispose();
  currentSceneKey = key;
  const sceneData = content[key];
  sceneHint.textContent = sceneData.hint || '';

  currentScene = sceneBuilders[key]({
    sceneData,
    camera,
    controls,
    onSelect: showInfo
  });

  if (key === 'solar') {
    scaleToggle.classList.remove('hidden');
    scaleSlider.value = 0;
    scaleLabel.textContent = 'Illustrative';
  } else {
    scaleToggle.classList.add('hidden');
  }

  hideInfo();
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
  infoPanel.classList.remove('hidden');
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
