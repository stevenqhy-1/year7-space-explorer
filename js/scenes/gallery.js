// DOM-based gallery — not a Three.js scene.
// Renders a grid of high-res Hubble / JWST images with captions.

export function buildGallery(container, items, sidebarList) {
  container.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'gallery-intro';
  intro.textContent = 'Real images from the Hubble Space Telescope and James Webb Space Telescope. Click any picture to enlarge. All images are public domain (NASA/ESA/CSA).';
  container.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'gallery-grid';
  container.appendChild(grid);

  // Sidebar mirrors the gallery
  sidebarList.innerHTML = '';
  items.forEach((item, idx) => {
    // Card
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.dataset.idx = idx;
    card.innerHTML = `
      <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
      <div class="gallery-card-body">
        <div class="meta">${escapeHtml(item.source)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.caption)}</p>
      </div>
    `;
    card.addEventListener('click', () => openLightbox(item));
    grid.appendChild(card);

    // Sidebar entry
    const li = document.createElement('li');
    li.dataset.key = String(idx);
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = item.source.includes('Webb') ? '#ffaa44' : '#88bbff';
    li.appendChild(dot);
    li.appendChild(document.createTextNode(item.title));
    li.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.outline = '2px solid #6af';
      setTimeout(() => { card.style.outline = ''; }, 1200);
    });
    sidebarList.appendChild(li);
  });
}

function openLightbox(item) {
  closeLightbox();
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.innerHTML = `
    <button class="lightbox-close" aria-label="Close">×</button>
    <img src="${item.image}" alt="${escapeHtml(item.title)}">
    <div class="lightbox-caption">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.caption)}</p>
      <div class="credit">${escapeHtml(item.source)}${item.credit ? ' · ' + escapeHtml(item.credit) : ''}</div>
    </div>
  `;
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.classList.contains('lightbox-close')) closeLightbox();
  });
  document.body.appendChild(box);
  document.addEventListener('keydown', escClose);
}

function closeLightbox() {
  const existing = document.querySelector('.lightbox');
  if (existing) existing.remove();
  document.removeEventListener('keydown', escClose);
}

function escClose(e) {
  if (e.key === 'Escape') closeLightbox();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
