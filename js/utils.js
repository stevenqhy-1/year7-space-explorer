import * as THREE from 'three';

export function addStarfield(scene, count = 3000, radius = 5000) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.8 + Math.random() * 0.2);
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: false });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

export function pickFromMeshes(pointer, camera, raycaster, meshes) {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  return hits[0].object.userData.key || null;
}

export function disposeScene(scene) {
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    }
  });
}

// Soft circular alpha texture for "fuzzy" particles — makes Points look like
// glowing dust instead of hard pixels. Shared across scenes.
let _softPointTex = null;
export function softPointTexture() {
  if (_softPointTex) return _softPointTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _softPointTex = new THREE.CanvasTexture(c);
  return _softPointTex;
}

// Larger, sharper text sprite labels.
// scale is the world-space size of the sprite.
export function makeLabel(text, options = {}) {
  const {
    fontSize = 56,
    color = '#ffffff',
    subtitle = null,
    subtitleColor = '#88aaff',
    scale = 22
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = subtitle ? 256 : 160;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Soft shadow for readability against any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 12;

  ctx.fillStyle = color;
  ctx.font = `600 ${fontSize}px -apple-system, "Helvetica Neue", sans-serif`;
  const titleY = subtitle ? fontSize * 0.95 + 18 : canvas.height / 2;
  ctx.fillText(text, canvas.width / 2, titleY);

  if (subtitle) {
    ctx.fillStyle = subtitleColor;
    ctx.font = `400 ${Math.round(fontSize * 0.55)}px -apple-system, "Helvetica Neue", sans-serif`;
    ctx.fillText(subtitle, canvas.width / 2, titleY + fontSize * 0.95);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  // Maintain aspect ratio so labels don't squish
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(scale, scale / aspect, 1);
  return sprite;
}
