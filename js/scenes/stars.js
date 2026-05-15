// Single-page Solar System size comparison.
// Two stacked rows:
//   1. TRUE-SCALE row — Sun + planets at real relative size. The Sun dominates;
//      planets become small dots, which is the pedagogical point.
//   2. PLANETS-ONLY row — same planets without the Sun, rescaled so Jupiter is
//      large enough to compare planet-to-planet ratios.
// All fits on one screen, no horizontal scroll.

export function buildStars2D(container, data, sidebarList) {
  container.innerHTML = '';
  sidebarList.innerHTML = '';

  const bodies = data.bodies;
  const planets = bodies.filter(b => b.type !== 'Yellow dwarf star');

  // Hint at top
  const intro = document.createElement('p');
  intro.className = 'stars2d-intro';
  intro.textContent = data.hint;
  container.appendChild(intro);

  // Row 1: true scale (Sun included)
  const trueSection = makeSection(
    'True scale',
    'The Sun is 109× wider than Earth. At this scale, all the planets look tiny next to it.'
  );
  trueSection.appendChild(makeRow(bodies, /* maxDia */ Math.max(...bodies.map(b => b.diameter_km)), 360));
  container.appendChild(trueSection);

  // Row 2: planets only, rescaled
  const planetSection = makeSection(
    'Planets only — Jupiter is biggest',
    'Sun removed. Now you can compare planet sizes properly: Mercury vs Earth vs Jupiter.'
  );
  planetSection.appendChild(makeRow(planets, Math.max(...planets.map(b => b.diameter_km)), 160));
  container.appendChild(planetSection);

  // Sidebar — list every body, click to scroll into view + highlight
  bodies.forEach((b, idx) => {
    const li = document.createElement('li');
    li.dataset.key = b.key;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = b.color;
    li.appendChild(dot);
    li.appendChild(document.createTextNode(b.name));
    li.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      showStarInfo(b);
      // Find this body's circles and pulse them briefly
      document.querySelectorAll(`.stars2d-obj-wrap[data-key="${b.key}"]`).forEach(w => {
        w.classList.add('pulse');
        setTimeout(() => w.classList.remove('pulse'), 1400);
      });
    });
    sidebarList.appendChild(li);
  });
}

function makeSection(title, subtitle) {
  const sec = document.createElement('section');
  sec.className = 'stars2d-section';
  const h = document.createElement('h2');
  h.textContent = title;
  const sub = document.createElement('p');
  sub.className = 'stars2d-subtitle';
  sub.textContent = subtitle;
  sec.appendChild(h);
  sec.appendChild(sub);
  return sec;
}

function makeRow(bodies, maxDia, maxPx) {
  const row = document.createElement('div');
  row.className = 'stars2d-row';

  bodies.forEach(obj => {
    const ratio = obj.diameter_km / maxDia;
    const size = Math.max(ratio * maxPx, 2);

    const wrap = document.createElement('div');
    wrap.className = 'stars2d-obj-wrap';
    wrap.dataset.key = obj.key;

    const circle = document.createElement('div');
    circle.className = 'stars2d-obj';
    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.background = obj.css;
    if (obj.glow) {
      const glowSize = Math.max(size * 0.5, 22);
      circle.style.boxShadow = `0 0 ${glowSize}px ${obj.glow}77, 0 0 ${glowSize * 2}px ${obj.glow}33`;
    }
    if (size < 5) {
      circle.style.outline = '1px solid rgba(150,180,220,0.6)';
      circle.style.outlineOffset = '2px';
    }

    const label = document.createElement('div');
    label.className = 'stars2d-label';
    label.innerHTML =
      `<strong>${escapeHtml(obj.name)}</strong>` +
      `<span class="stars2d-size">${formatDiameter(obj.diameter_km)}</span>`;

    wrap.appendChild(circle);
    wrap.appendChild(label);
    wrap.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => {
        x.classList.toggle('active', x.dataset.key === obj.key);
      });
      showStarInfo(obj);
    });
    row.appendChild(wrap);
  });
  return row;
}

function showStarInfo(obj) {
  document.getElementById('info-title').textContent = obj.name;
  document.getElementById('info-type').textContent = obj.type;
  document.getElementById('info-caption').textContent = obj.caption || '';
  const ul = document.getElementById('info-facts');
  ul.innerHTML = '';
  for (const [k, v] of Object.entries(obj.facts || {})) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`;
    ul.appendChild(li);
  }
  // Remove any leftover play-formation button
  const oldBtn = document.getElementById('play-formation-btn');
  if (oldBtn) oldBtn.remove();
  document.getElementById('info-panel').classList.remove('hidden');
}

function formatDiameter(km) {
  if (km >= 1e9) return `${(km / 1e9).toFixed(1)} billion km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(1)} million km`;
  if (km >= 1e3) return `${km.toLocaleString()} km`;
  return `${km} km`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
