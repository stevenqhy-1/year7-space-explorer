// 2D DOM-based size-comparison scene. Not a Three.js scene.
// Renders panels: each panel scales its objects relative to the panel's largest.

export function buildStars2D(container, data, sidebarList) {
  container.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'stars2d-intro';
  intro.textContent = data.hint;
  container.appendChild(intro);

  sidebarList.innerHTML = '';

  data.panels.forEach((panel, idx) => {
    const section = document.createElement('section');
    section.className = 'stars2d-panel';
    section.id = `stars-panel-${idx}`;

    const titleEl = document.createElement('h2');
    titleEl.textContent = panel.title;
    section.appendChild(titleEl);

    if (panel.subtitle) {
      const sub = document.createElement('p');
      sub.className = 'stars2d-subtitle';
      sub.textContent = panel.subtitle;
      section.appendChild(sub);
    }

    const row = document.createElement('div');
    row.className = 'stars2d-row';

    const maxDia = Math.max(...panel.objects.map(o => o.diameter_km));
    const minDia = Math.min(...panel.objects.map(o => o.diameter_km));
    // Largest gets ~60% viewport height (capped). Tweak per panel: huge ratios
    // mean smallest objects can be < 1 px, which is the pedagogical point.
    const maxPx = Math.min(window.innerHeight * 0.58, 540);

    panel.objects.forEach(obj => {
      const ratio = obj.diameter_km / maxDia;
      const size = Math.max(ratio * maxPx, 1);

      const wrap = document.createElement('div');
      wrap.className = 'stars2d-obj-wrap';
      wrap.style.minWidth = `${Math.max(size, 90)}px`;

      const circle = document.createElement('div');
      circle.className = 'stars2d-obj';
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.background = obj.css;
      if (obj.glow) {
        const glowSize = Math.max(size * 0.5, 25);
        circle.style.boxShadow = `0 0 ${glowSize}px ${obj.glow}77, 0 0 ${glowSize * 2}px ${obj.glow}33`;
      }
      // If too small to see, add a faint outline so it's not invisible
      if (size < 4) {
        circle.style.outline = '1px solid rgba(150,180,220,0.6)';
        circle.style.outlineOffset = '2px';
      }

      const label = document.createElement('div');
      label.className = 'stars2d-label';
      label.innerHTML =
        `<strong>${escapeHtml(obj.name)}</strong>` +
        `<span class="stars2d-type">${escapeHtml(obj.type)}</span>` +
        `<span class="stars2d-size">${formatDiameter(obj.diameter_km)}</span>`;

      wrap.appendChild(circle);
      wrap.appendChild(label);
      row.appendChild(wrap);

      wrap.addEventListener('click', () => showStarInfo(obj));
    });

    section.appendChild(row);
    container.appendChild(section);

    // Sidebar entry — scroll to panel
    const li = document.createElement('li');
    li.dataset.key = String(idx);
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = panel.objects[panel.objects.length - 1].color;
    li.appendChild(dot);
    li.appendChild(document.createTextNode(panel.title.replace(/^\d+\.\s*/, '')));
    li.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    sidebarList.appendChild(li);
  });
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
