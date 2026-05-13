import * as THREE from 'three';

// Simple seeded RNG so textures look the same on every load
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeCanvas(w = 1024, h = 512) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Horizontal-band texture for gas giants
export function makeGasGiantTexture({ palette, seed = 1, turbulence = 0.18, bands = 26 }) {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seed);

  // Base wash
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  for (let i = 0; i < palette.length; i++) {
    grad.addColorStop(i / (palette.length - 1), palette[i]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bands
  for (let b = 0; b < bands; b++) {
    const yCenter = (b / bands) * canvas.height + rand() * 8;
    const height = (canvas.height / bands) * (0.6 + rand() * 0.6);
    const colorIdx = Math.floor(rand() * palette.length);
    ctx.fillStyle = palette[colorIdx];
    ctx.globalAlpha = 0.18 + rand() * 0.25;
    // wavy band
    ctx.beginPath();
    ctx.moveTo(0, yCenter);
    for (let x = 0; x <= canvas.width; x += 16) {
      const y = yCenter + Math.sin(x * 0.01 + b) * (turbulence * 12) + rand() * 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, yCenter + height);
    for (let x = canvas.width; x >= 0; x -= 16) {
      const y = yCenter + height + Math.sin(x * 0.012 + b * 1.7) * (turbulence * 12);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Storms / swirls
  for (let i = 0; i < 12; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = 6 + rand() * 36;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, palette[Math.floor(rand() * palette.length)]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.4, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas);
}

// Rocky / cratered surface (Mercury, Mars, etc)
export function makeRockyTexture({ base = '#a06040', spots = ['#7a4030', '#c08060', '#502010'], craterDensity = 0.6, seed = 2 }) {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seed);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Splotches
  for (let i = 0; i < 1400; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = 2 + rand() * 18;
    const color = spots[Math.floor(rand() * spots.length)];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18 + rand() * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters
  ctx.globalAlpha = 1;
  const craterCount = Math.floor(180 * craterDensity);
  for (let i = 0; i < craterCount; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = 3 + rand() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return toTexture(canvas);
}

// Sun surface — turbulent yellows/oranges
export function makeSunTexture() {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(42);

  ctx.fillStyle = '#ffdd55';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Granulation
  for (let i = 0; i < 5000; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = 1 + rand() * 4;
    const hue = 30 + rand() * 25;
    ctx.fillStyle = `hsla(${hue}, 95%, ${50 + rand() * 25}%, ${0.3 + rand() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Darker sunspots
  for (let i = 0; i < 8; i++) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    const r = 6 + rand() * 14;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(80,30,0,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

// Procedural Saturn-like ring texture (radial alpha)
export function makeRingTexture(seed = 5) {
  const canvas = makeCanvas(1024, 16);
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seed);
  // Background
  const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grad.addColorStop(0.0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.15, 'rgba(220,200,160,0.6)');
  grad.addColorStop(0.4, 'rgba(240,220,170,0.9)');
  grad.addColorStop(0.6, 'rgba(180,150,110,0.4)');
  grad.addColorStop(0.85, 'rgba(220,200,160,0.7)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Streaks
  for (let i = 0; i < 200; i++) {
    const x = rand() * canvas.width;
    const w = 1 + rand() * 3;
    ctx.fillStyle = `rgba(${80 + rand() * 80}, ${60 + rand() * 70}, ${30 + rand() * 50}, ${rand() * 0.4})`;
    ctx.fillRect(x, 0, w, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Generic atmosphere shell for any planet — slightly larger transparent sphere
export function makeAtmosphereMaterial(color = 0x6688ff, intensity = 0.4) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: intensity,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}
