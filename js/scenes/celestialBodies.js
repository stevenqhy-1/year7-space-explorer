// DOM-based "Celestial Bodies" overview page.
// Eight cards, one per body type, each with Year-7 description, key terms, examples.
// A worksheet download button at the top.

export function buildCelestialBodies(container, data, sidebarList) {
  container.innerHTML = '';
  sidebarList.innerHTML = '';

  // Header
  const header = document.createElement('header');
  header.className = 'cb-header';
  header.innerHTML = `
    <h1 class="cb-title">${escapeHtml(data.title)}</h1>
    <p class="cb-hint">${escapeHtml(data.hint)}</p>
    <div class="cb-intentions">
      <h3>Learning intentions</h3>
      <ul>${data.learningIntentions.map(li => `<li>${escapeHtml(li)}</li>`).join('')}</ul>
    </div>
  `;
  container.appendChild(header);

  // Card grid
  const grid = document.createElement('div');
  grid.className = 'cb-grid';
  container.appendChild(grid);

  data.items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'cb-card';
    card.id = `cb-${item.key}`;
    card.style.setProperty('--accent', item.color || '#9cf');

    // Highlight key words inside the description
    let desc = escapeHtml(item.description);
    (item.blanks || []).forEach(term => {
      // Replace only the first occurrence of the term (case-sensitive — terms match how they appear)
      const re = new RegExp(`\\b(${escapeRegex(term)})\\b`);
      desc = desc.replace(re, '<mark>$1</mark>');
    });

    card.innerHTML = `
      <div class="cb-icon">${item.icon || '•'}</div>
      <h2 class="cb-name">${escapeHtml(item.name)}</h2>
      <p class="cb-desc">${desc}</p>
      <div class="cb-meta">
        <span class="cb-meta-label">Examples:</span>
        <span class="cb-examples">${escapeHtml(item.examples)}</span>
      </div>
      <div class="cb-keywords">
        ${(item.wordBank || []).map(w => `<span class="cb-keyword">${escapeHtml(w)}</span>`).join('')}
      </div>
    `;
    grid.appendChild(card);

    // Sidebar entry
    const li = document.createElement('li');
    li.dataset.key = item.key;
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = item.color || '#888';
    li.appendChild(dot);
    li.appendChild(document.createTextNode(item.name));
    li.addEventListener('click', () => {
      document.querySelectorAll('#object-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('cb-pulse');
      setTimeout(() => card.classList.remove('cb-pulse'), 1200);
    });
    sidebarList.appendChild(li);
  });

  // Comparison section
  const compare = document.createElement('section');
  compare.className = 'cb-compare';
  compare.innerHTML = `
    <h2>Test yourself — can you spot the difference?</h2>
    <p class="cb-compare-sub">Try to answer each question before clicking it.</p>
    <div class="cb-compare-list">
      ${data.comparisons.map((c, i) => `
        <details class="cb-q">
          <summary><strong>${i + 1}.</strong> ${escapeHtml(c.q)}</summary>
          <p>${escapeHtml(c.a)}</p>
        </details>
      `).join('')}
    </div>
  `;
  container.appendChild(compare);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
