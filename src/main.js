import './styles.css';
import { getInventory } from './services/inventory.js';
import { Scanner } from './services/scanner.js';

const app = document.querySelector('#app');
const inventory = await getInventory();
const scanner = new Scanner({ onStatus: updateStatus, onFound: showPiece, onLost: losePiece, onError: showError });
let selected = inventory[0] ?? null;
let activeFilter = 'Todas';

app.innerHTML = `
  <header class="topbar"><a class="brand" href="#inicio" aria-label="Casa de Oficios, inicio"><span class="brand-mark">CO</span><span>CASA DE OFICIOS<small>INVENTARIO VIVO · 2026</small></span></a><nav><a href="#inventario">Colección <span>${String(inventory.length).padStart(2,'0')}</span></a><button class="nav-scan" data-scan>◉ <span>Escanear</span></button></nav></header>
  <main id="inicio">
    <section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="dot"></span> ARCHIVO DE OBJETOS · COLOMBIA</p><h1>Lo hecho a mano<br>también <em>deja huella.</em></h1><p class="lede">Un inventario vivo de objetos, saberes y manos artesanas. Acerca la cámara a una pieza y descubre todo lo que guarda.</p><div class="hero-actions"><button class="primary" data-scan><span>Escanear una pieza</span><span>↗</span></button><a class="text-link" href="#inventario">Explorar colección <span>↓</span></a></div><div class="hero-note"><span class="note-icon">⌖</span><span>Busca la etiqueta correspondiente a la pieza y escanéala con la cámara de tu dispositivo.<br><small>Permite el acceso a la cámara para escanear.</small></span></div></div><div class="hero-art"><div class="art-frame"><img src="${inventory[0]?.coverImage ?? ''}" alt="Portada del Tapete de mota" onerror="this.style.display='none'"><div class="art-caption"><span>01 — OBJETO EN ESTUDIO</span><span>●</span></div></div><div class="art-stamp">HECHO<br>CON<br>TIEMPO</div><span class="art-index">FIG. 001 / ${inventory[0]?.name?.toUpperCase() ?? 'COLECCIÓN'}</span></div></section>
    <section class="manifesto"><span class="eyebrow">UNA COLECCIÓN, MUCHAS HISTORIAS</span><p>Cada objeto lleva la memoria de <em>quien lo hizo.</em></p><span class="manifesto-count">${String(inventory.length).padStart(2,'0')} PIEZA${inventory.length === 1 ? '' : 'S'} CATALOGADA${inventory.length === 1 ? '' : 'S'}</span></section>
    <section class="collection" id="inventario"><div class="section-head"><div><p class="eyebrow">EL INVENTARIO</p><h2>Objetos con <em>origen.</em></h2></div><span class="section-count">${String(inventory.length).padStart(2,'0')} / COLECCIÓN</span></div><div class="collection-tools"><label class="search"><span>⌕</span><input id="search" placeholder="Buscar una pieza…" aria-label="Buscar una pieza"></label><div class="filters" id="filters"></div></div><div class="grid" id="grid"></div></section>
  </main><footer><span>CASA DE OFICIOS</span><span>UN ARCHIVO EN MOVIMIENTO</span><span>COLOMBIA · 2026</span></footer>
  <div class="scanner hidden" id="scanner"><div class="camera-mount" id="camera"></div><div class="scanner-top"><button class="close-scan" id="closeScan" aria-label="Cerrar escáner">×</button><span class="live-label"><i></i> <span id="cameraLabel">CÁMARA ACTIVA</span></span><button class="scan-again" id="scanAgain">← Seguir escaneando</button><span class="scan-count" id="scanCount">01 / ${String(inventory.length).padStart(2,'0')}</span></div><div class="scan-guide" id="scanGuide"><div class="guide-corners"><i></i><i></i><i></i><i></i><span class="guide-line"></span></div><div class="guide-label"><span class="guide-eye">⌖</span><strong id="statusText">Buscando una pieza</strong><small id="statusSub">Centra la imagen dentro del marco</small></div></div><div class="ar-controls" id="arControls"><button id="rotateLeft" aria-label="Rotar a la izquierda">↶</button><button id="scaleDown" aria-label="Reducir tamaño">−</button><button id="view360" aria-pressed="false" title="Rotar automáticamente en 360 grados">360°</button><span>ÓRBITA X/Y · PINZA ZOOM</span><button id="scaleUp" aria-label="Aumentar tamaño">+</button><button id="rotateRight" aria-label="Rotar a la derecha">↷</button><button id="resetModel" aria-label="Restablecer">⟲</button></div><aside class="tech-sheet" id="sheet"><div class="sheet-grip" id="sheetGrip"><span></span></div><div class="sheet-header"><div><span class="sheet-overline" id="sheetCategory">PIEZA · 01</span><h2 id="sheetTitle">Tapete de mota</h2></div><button class="sheet-toggle" id="sheetToggle" aria-label="Contraer ficha">⌄</button></div><div class="sheet-tabs"><button class="tab active" data-tab="materials">Materiales</button><button class="tab" data-tab="craft">Elaboración</button><button class="tab" data-tab="artisan">Artesano</button></div><div class="sheet-content" id="sheetContent"></div><div class="sheet-actions"><a href="#inventario" id="moreInfo">Ver en el inventario ↗</a></div></aside><div class="scanner-hint" id="scannerHint"><span class="hint-spinner"></span><span id="hintText">Preparando cámara…</span></div></div>
  <div class="toast" id="toast" role="status"></div>`;

const grid = document.querySelector('#grid');
const filters = document.querySelector('#filters');
const search = document.querySelector('#search');
const scannerEl = document.querySelector('#scanner');
const sheet = document.querySelector('#sheet');
const tabs = ['materials', 'craft', 'artisan'];
let currentTab = 'materials';
let toastTimer;

function renderFilters() {
  const categories = ['Todas', ...new Set(inventory.map((p) => p.category).filter(Boolean))];
  filters.innerHTML = categories.map((category) => `<button class="filter ${category === activeFilter ? 'active' : ''}" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
}
function renderGrid() {
  const query = search.value.trim().toLocaleLowerCase('es');
  const items = inventory.filter((piece) => (activeFilter === 'Todas' || piece.category === activeFilter) && `${piece.name} ${piece.category} ${piece.description}`.toLocaleLowerCase('es').includes(query));
  grid.innerHTML = items.length ? items.map((piece, index) => `<article class="card"><button class="card-open" data-piece="${escapeHtml(piece.id)}" aria-label="Ver ${escapeHtml(piece.name)}"><div class="card-image">${piece.coverImage ? `<img src="${escapeHtml(piece.coverImage)}" alt="Portada de ${escapeHtml(piece.name)}">` : ''}<span class="card-number">${String(index + 1).padStart(2,'0')}</span><span class="card-arrow">↗</span></div><div class="card-meta"><span>${escapeHtml(piece.category || 'Sin categoría')}</span><span>ARUCO ${String(piece.markerId ?? 0).padStart(2,'0')}</span></div><h3>${escapeHtml(piece.name)}</h3><p>${escapeHtml(piece.description)}</p></button></article>`).join('') : '<p class="empty">No encontramos piezas con esa búsqueda.</p>';
}
function escapeHtml(text = '') { return String(text).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function showToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200); }
function updateStatus(message, detail = '') { document.querySelector('#statusText').textContent = message; document.querySelector('#statusSub').textContent = detail; document.querySelector('#hintText').textContent = message; }
function showError(message) { updateStatus('No pudimos iniciar la cámara', message); showToast(message); document.querySelector('#scannerHint').classList.add('error'); }
function renderDetailValue(label, value) {
  if (label === 'Sitio web' && /^https:\/\//i.test(value)) return `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">Visitar sitio ↗</a>`;
  if (label === 'Contacto de referencia') return value.split(' · ').map((part) => {
    if (part.includes('@')) return `<a href="mailto:${encodeURIComponent(part)}">${escapeHtml(part)}</a>`;
    const digits = part.replace(/[^\d+]/g, '');
    return digits.length >= 7 ? `<a href="tel:${escapeHtml(digits)}">${escapeHtml(part)}</a>` : escapeHtml(part);
  }).join(' · ');
  return escapeHtml(value);
}
function showPiece(piece) { selected = piece; scanner.setPiece(piece); document.querySelector('#sheetTitle').textContent = piece.name; document.querySelector('#sheetCategory').textContent = `${piece.category || 'PIEZA'} · ARUCO ${String(piece.markerId ?? 0).padStart(2,'0')}`; document.querySelector('#moreInfo').dataset.piece = piece.id; const pieceIndex = inventory.findIndex((item) => item.id === piece.id) + 1; document.querySelector('#scanCount').textContent = `${String(pieceIndex).padStart(2,'0')} / ${String(inventory.length).padStart(2,'0')}`; updateStatus(piece.name, 'Arrastra para orbitar en X/Y · pellizca para acercar'); document.querySelector('#scanAgain').classList.add('visible'); document.querySelector('#scanGuide').classList.add('hidden'); document.querySelector('#cameraLabel').textContent='VISTA PREVIA 3D'; document.querySelector('#camera').classList.add('preview-mode'); scannerEl.classList.add('piece-preview'); document.querySelector('#scannerHint').classList.add('found'); const view360=document.querySelector('#view360'); view360.classList.add('active'); view360.setAttribute('aria-pressed','true'); view360.textContent='Ⅱ'; view360.title='Pausar rotación suave'; document.querySelector('#arControls').classList.add('visible'); sheet.classList.add('visible'); renderSheet(); }
function losePiece(piece) { document.querySelector('#scannerHint').classList.remove('found'); document.querySelector('#arControls').classList.remove('visible'); sheet.classList.remove('visible'); updateStatus('Buscando una pieza', 'Centra la imagen dentro del marco'); }
function renderSheet() {
  const content = document.querySelector('#sheetContent');
  document.querySelectorAll('.tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === currentTab));
  const data = selected?.[currentTab];
  if (!data) { content.innerHTML = '<p class="sheet-empty">Ficha técnica pendiente de documentación.</p>'; return; }
  const descriptions = {materials: data.summary, craft: data.technique || data.summary, artisan: data.summary || data.name};
  const rows = currentTab === 'materials' ? [['Materia prima', (data.items || []).join(' · ')], ['Origen', data.origin]] : currentTab === 'craft' ? [['Proceso', data.process || data.summary], ['Herramientas', data.tools], ['Tiempo', data.time]] : [['Taller / referencia', data.workshop], ['Ubicación', data.location], ['Contacto de referencia', data.contact], ['Sitio web', data.website]];
  const reference = currentTab === 'materials' && selected?.referenceImage ? `<img class="sheet-reference" src="${escapeHtml(selected.referenceImage)}" alt="Referencia visual de ${escapeHtml(selected.name)}" loading="lazy">` : '';
  content.innerHTML = `<div class="sheet-intro ${reference ? 'with-reference' : ''}">${reference}<p class="sheet-description">${escapeHtml(descriptions[currentTab] || '')}</p></div><div class="detail-list">${rows.filter(([, value]) => value).map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${renderDetailValue(label, String(value))}</strong></div>`).join('')}</div>`;
}
async function openScanner() { scannerEl.classList.remove('hidden','piece-preview'); document.body.classList.add('scan-open'); document.querySelector('#scannerHint').classList.remove('error','found'); document.querySelector('#arControls').classList.remove('visible'); document.querySelector('#scanAgain').classList.remove('visible'); document.querySelector('#scanGuide').classList.remove('hidden'); document.querySelector('#camera').classList.remove('preview-mode'); document.querySelector('#cameraLabel').textContent='CÁMARA ACTIVA'; sheet.classList.remove('visible'); updateStatus('Preparando cámara', 'Permite el acceso cuando el navegador lo solicite'); try { await scanner.start(); } catch (error) { showError(error.message || 'Revisa los permisos de cámara y vuelve a intentarlo.'); } }
async function resumeScanning() { try { await scanner.resumeScanning(); scannerEl.classList.remove('piece-preview'); document.querySelector('#scanAgain').classList.remove('visible'); document.querySelector('#scanGuide').classList.remove('hidden'); document.querySelector('#cameraLabel').textContent='CÁMARA ACTIVA'; document.querySelector('#camera').classList.remove('preview-mode'); document.querySelector('#arControls').classList.remove('visible'); sheet.classList.remove('visible'); document.querySelector('#scannerHint').classList.remove('found'); const view360=document.querySelector('#view360'); view360.classList.remove('active'); view360.setAttribute('aria-pressed','false'); view360.textContent='360°'; updateStatus('Buscando marcador ArUco', 'Enfoca el marcador de otra pieza'); } catch (error) { showError(error.message); } }
async function closeScanner() { await scanner.stop(); scannerEl.classList.add('hidden'); document.body.classList.remove('scan-open'); }

renderFilters(); renderGrid();
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-scan]')) openScanner();
  const filter = event.target.closest('[data-filter]'); if (filter) { activeFilter = filter.dataset.filter; renderFilters(); renderGrid(); }
  const card = event.target.closest('[data-piece]'); if (card?.classList.contains('card-open')) { selected = inventory.find((p) => p.id === card.dataset.piece); currentTab = 'materials'; showPiece(selected); scannerEl.classList.remove('hidden'); document.body.classList.add('scan-open'); updateStatus(selected.name, 'Vista de ficha · activa el escáner para realidad aumentada'); document.querySelector('#scannerHint').classList.add('found'); document.querySelector('#arControls').classList.remove('visible'); }
  const tab = event.target.closest('[data-tab]'); if (tab) { currentTab = tab.dataset.tab; renderSheet(); }
});
search.addEventListener('input', renderGrid);
document.querySelector('#closeScan').addEventListener('click', closeScanner);
document.querySelector('#scanAgain').addEventListener('click', resumeScanning);
document.querySelector('#sheetToggle').addEventListener('click', () => sheet.classList.toggle('collapsed'));
document.querySelector('#sheetGrip').addEventListener('click', () => sheet.classList.toggle('collapsed'));
document.querySelector('#rotateLeft').addEventListener('click', () => scanner.rotate(-0.2));
document.querySelector('#view360').addEventListener('click', (event) => { const active = scanner.toggle360(); event.currentTarget.classList.toggle('active', active); event.currentTarget.setAttribute('aria-pressed', String(active)); event.currentTarget.textContent = active ? 'Ⅱ' : '360°'; event.currentTarget.title = active ? 'Pausar giro 360' : 'Rotar automáticamente en 360 grados'; });
document.querySelector('#rotateRight').addEventListener('click', () => scanner.rotate(0.2));
document.querySelector('#scaleDown').addEventListener('click', () => scanner.scale(0.85));
document.querySelector('#scaleUp').addEventListener('click', () => scanner.scale(1.18));
document.querySelector('#resetModel').addEventListener('click', () => scanner.reset());
