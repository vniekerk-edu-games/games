/* The Camper Vans SA – data + behaviour. No build step, no framework. */

// Canonical feature list, in the order of the icon sheet. Add a row here (and an icon in assets/icons) for a new feature.
const FEATURES = [
  ['Cycling','cycling'],['Kids Play Area','kids-play-area'],['Rowing','rowing'],
  ['Electricity','electricity'],['Pet Friendly','pet-friendly'],['Shop available','shop-available'],
  ['Alternative Accommodation','alternative-accommodation'],['Private Ablutions','private-ablutions'],['Swimming','swimming'],
  ['Fishing','fishing'],['Private Sites','private-sites'],['Swimming Pool','swimming-pool'],
  ['Hiking Trails','hiking-trails'],['Restaurant','restaurant'],['4 x 4','4x4']
];
const ICON = Object.fromEntries(FEATURES);
const MAX_PHOTOS = 12;
const BATCH_DAYS = 14;   // campsites added within this many days of the newest one count as the "latest additions"
const PANEL_ROWS = 5;

/* ---------- CSV (handles quoted fields with commas, quotes and line breaks) ---------- */
function parseCSV(text){
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], v = '', q = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (q){
      if (c === '"'){ if (text[i+1] === '"'){ v += '"'; i++; } else q = false; }
      else v += c;
    } else if (c === '"') q = true;
    else if (c === ','){ row.push(v); v = ''; }
    else if (c === '\n' || c === '\r'){
      if (c === '\r' && text[i+1] === '\n') i++;
      row.push(v); v = ''; rows.push(row); row = [];
    } else v += c;
  }
  if (v || row.length){ row.push(v); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h,i) => [h, (r[i] || '').trim()])));
}

async function loadCampsites(){
  const res = await fetch('data/campsites.csv');
  if (!res.ok) throw new Error('Could not load data/campsites.csv');
  return parseCSV(await res.text()).map(c => ({
    ...c,
    lat: parseFloat(c.lat), lon: parseFloat(c.lon),
    features: c.features.split(/[,|]/).map(s => s.trim()).filter(Boolean)
  }));
}

/* ---------- small helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
function el(tag, attrs = {}, ...kids){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === 'class') n.className = v; else if (k.startsWith('on')) n[k] = v; else n.setAttribute(k, v);
  }
  kids.flat().forEach(k => n.append(k.nodeType ? k : document.createTextNode(k)));
  return n;
}
function icon(name, size){
  const i = el('span', { class: 'ic', role: 'img', 'aria-label': name, title: name });
  i.style.setProperty('--src', `url(assets/icons/${ICON[name]}.png)`);
  if (size) i.style.width = i.style.height = size + 'px';
  return i;
}
const orderedFeatures = c => FEATURES.map(f => f[0]).filter(f => c.features.includes(f));
const paragraphs = t => t.split(/\n\s*\n/).map(p => el('p', {}, p.trim()));
// tries .webp first, then .jpg, so either format works
const EXTS = ['webp','jpg'];
function loadPhoto(slug, n){
  return new Promise(res => {
    let i = 0;
    const next = () => {
      if (i >= EXTS.length) return res(null);
      const u = `campsites/${slug}/${n}.${EXTS[i++]}`, im = new Image();
      im.onload = () => res(u); im.onerror = next; im.src = u;
    };
    next();
  });
}
// Areas, in display order. The colours come from the logo.
const REGIONS = [
  ['Breede River','#b8551f','#fff'], ['Winelands & Valleys','#5a6c1f','#fff'], ['Cederberg & North','#f0a81f','#1b3a26'],
  ['Overberg & Route 62','#c24d6b','#fff'], ['Garden Route & Eastern Cape','#3d6b4f','#fff']
];
const REGION_COLOUR = Object.fromEntries(REGIONS.map(r => [r[0], r[1]]));
const QUICK = [['Swimming','#f0a81f','#1b3a26'],['Kids Play Area','#5a6c1f','#fff'],['Hiking Trails','#b8551f','#fff'],['Pet Friendly','#96391f','#fff'],['Private Sites','#1b3a26','#faf3dc']];

function addMap(node, points, opts = {}){
  const map = L.map(node, { scrollWheelZoom: false, ...opts });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return map;
}
const pinIcon = (col = '#1b3a26') => L.divIcon({ className: '', html: `<div class="pin" style="background:${col}"></div>`, iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-10] });

/* ---------- HOME ---------- */
async function home(){
  let all;
  try { all = await loadCampsites(); }
  catch (e) { $('#regions').append(el('p', { class: 'empty' }, 'Could not load the campsite list. Serve this folder over HTTP (see README).')); return; }

  // latest additions: everything added within BATCH_DAYS of the newest `added` date
  const dated = all.filter(c => c.added).sort((x, y) => y.added.localeCompare(x.added));
  const newest = dated.length ? new Date(dated[0].added) : null;
  const batch = newest ? dated.filter(c => (newest - new Date(c.added)) / 864e5 <= BATCH_DAYS) : [];
  const isNew = c => batch.includes(c);
  let newOnly = false;
  const panel = $('#latest');
  if (!batch.length) panel.hidden = true;
  else {
    const when = newest.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    panel.append(el('div', { class: 'lh' }, el('h2', { id: 'latest-h' }, 'Latest additions'), el('span', {}, `Added ${when}`)),
      ...batch.slice(0, PANEL_ROWS).map(c => {
        const th = el('div', { class: 'th' });
        loadPhoto(c.slug, 1).then(u => { if (u) th.style.backgroundImage = `url(${u})`; });
        return el('a', { class: 'lrow', href: `campsite.html?id=${c.slug}` }, th, el('div', {}, el('h3', {}, c.name), el('div', { class: 'town', style: 'margin:0' }, c.town)), el('span', { class: 'new' }, 'NEW'));
      }),
      el('button', { class: 'lmore', type: 'button', onclick: () => { newOnly = true; draw(); $('#campsites').scrollIntoView(); } },
        batch.length > PANEL_ROWS ? `+ ${batch.length - PANEL_ROWS} more · show all ${batch.length} new in the list` : `Show only the ${batch.length} new in the list`));
  }

  const sel = new Set(), q = $('#q'), count = $('#count');
  const buttons = [];
  const toggle = name => { sel.has(name) ? sel.delete(name) : sel.add(name); buttons.forEach(b => b.setAttribute('aria-pressed', sel.has(b.dataset.f))); draw(); };
  const countOf = name => all.filter(c => c.features.includes(name)).length;

  const tiles = QUICK.map(([name, bg, fg]) => {
    const b = el('button', { class: 'tile', type: 'button', 'aria-pressed': 'false', 'data-f': name }, icon(name, 40), name, el('small', {}, `${countOf(name)} campsites`));
    b.style.borderTopColor = bg; b.onclick = () => toggle(name); buttons.push(b); return b;
  });
  const more = el('button', { class: 'tile', type: 'button', 'aria-expanded': 'false', style: 'border-top-color:#c9bd98' }, 'All 15 filters', el('small', {}, 'show or hide'));
  more.onclick = () => { const h = $('#more').hidden = !$('#more').hidden; more.setAttribute('aria-expanded', !h); };
  $('#tiles').append(...tiles, more);

  $('#facets').append(...FEATURES.map(([name]) => {
    const b = el('button', { class: 'facet', type: 'button', 'aria-pressed': 'false', 'data-f': name }, icon(name, 34), name, el('span', { class: 'n' }, String(countOf(name))));
    b.firstChild.removeAttribute('title'); b.onclick = () => toggle(name); buttons.push(b); return b;
  }));
  const clear = () => { sel.clear(); newOnly = false; q.value = ''; buttons.forEach(b => b.setAttribute('aria-pressed', 'false')); draw(); };
  $('#clear').onclick = clear; q.oninput = draw;

  // map
  const map = addMap('map'); const group = L.layerGroup().addTo(map);
  const markers = new Map(all.map(c => {
    const m = L.marker([c.lat, c.lon], { icon: pinIcon(REGION_COLOUR[c.region] || '#1b3a26'), title: c.name });
    m.bindPopup(() => el('div', {}, el('b', {}, c.name), el('div', {}, c.town), el('a', { href: `campsite.html?id=${c.slug}` }, 'Open campsite page')));
    return [c.slug, m];
  }));
  $('#legend').append(...REGIONS.map(r => el('span', {}, el('i', { class: 'dot', style: `background:${r[1]}` }), r[0])));

  const match = c => (!newOnly || isNew(c)) && [...sel].every(x => c.features.includes(x)) &&
    (!q.value.trim() || [c.name, c.town, c.highlights].some(t => t.toLowerCase().includes(q.value.trim().toLowerCase())));

  function card(c){
    const pic = el('div', { class: 'pic' }, el('span', {}, c.name));
    if (isNew(c)) pic.append(el('em', { class: 'new' }, 'NEW'));
    loadPhoto(c.slug, 1).then(u => { if (u) pic.prepend(el('img', { src: u, alt: c.name, loading: 'lazy' })); pic.querySelector('span')?.remove(); });
    const a = el('a', { class: 'card', href: `campsite.html?id=${c.slug}` }, pic,
      el('div', { class: 'cn' }, el('i', { class: 'dot', style: `background:${REGION_COLOUR[c.region] || '#1b3a26'}` }), el('h3', {}, c.name)),
      el('div', { class: 'town' }, c.town), el('div', { class: 'icons' }, orderedFeatures(c).map(x => icon(x))));
    a.onmouseenter = () => markers.get(c.slug)._icon?.classList.add('hot'); a.onmouseleave = () => markers.get(c.slug)._icon?.classList.remove('hot');
    return a;
  }

  function draw(){
    const list = all.filter(match);
    const regions = [...REGIONS.map(r => r[0]), ...new Set(all.map(c => c.region).filter(r => r && !REGION_COLOUR[r]))];
    const secs = regions.map(r => {
      const items = list.filter(c => c.region === r); if (!items.length) return null;
      const [, bg, fg] = REGIONS.find(x => x[0] === r) || [0, '#5d7872', '#fff'];
      const head = el('div', { class: 'rh' }, el('h2', {}, r), el('span', {}, `${items.length} campsite${items.length > 1 ? 's' : ''}`));
      head.style.borderLeftColor = bg;
      return el('section', {}, head, el('div', { class: 'g3' }, items.map(card)));
    }).filter(Boolean);
    $('#regions').replaceChildren(...(secs.length ? secs : [el('p', { class: 'empty' }, 'No campsite has every one of those. ', el('button', { class: 'clear', onclick: clear }, 'Clear filters'))]));
    count.textContent = `Showing ${list.length} of ${all.length} campsites${newOnly ? ' (new only)' : ''}`;
    $('#clear').hidden = !sel.size && !q.value && !newOnly;
    group.clearLayers(); list.forEach(c => group.addLayer(markers.get(c.slug)));
    if (list.length) map.fitBounds(L.latLngBounds(list.map(c => [c.lat, c.lon])).pad(.15), { maxZoom: 11 });
  }
  draw();
}

/* ---------- DETAIL ---------- */
async function detail(){
  const all = await loadCampsites();
  const id = new URLSearchParams(location.search).get('id');
  const i = Math.max(0, all.findIndex(c => c.slug === id)), c = all[i];
  document.title = `${c.name} | The Camper Vans SA`;
  $('#title').textContent = c.name; $('#town').textContent = c.town;

  $('#feats').append(...orderedFeatures(c).map(f => el('div', {}, icon(f, 38), f)));

  $('#text').append(
    el('h2', {}, 'Highlights of the campsite'), ...paragraphs(c.highlights),
    ...(c.remember ? [el('h2', {}, 'Things to remember'), ...paragraphs(c.remember)] : []),
    ...(c.spots ? [el('h2', {}, 'Our recommended spots'), ...paragraphs(c.spots)] : []),
    el('div', {},
      ...(c.website ? [el('a', { class: 'btn', href: c.website, target: '_blank', rel: 'noopener' }, 'Visit campsite website')] : []),
      el('a', { class: 'btn alt', href: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`, target: '_blank', rel: 'noopener' }, 'Directions')
    ));

  // gallery: use 1.jpg, 2.jpg, 3.jpg… until one is missing
  const urls = [];
  for (let n = 1; n <= MAX_PHOTOS; n++){ const u = await loadPhoto(c.slug, n); if (!u) break; urls.push(u); }
  const g = $('#gallery');
  if (!urls.length) g.replaceChildren(el('div', { class: 'nogallery' }, `Add photos to campsites/${c.slug}/ as 1.webp (or 1.jpg), 2.webp…`));
  else {
    const track = el('div', { class: 'track', tabindex: '0', 'aria-label': `${c.name} photos` }, urls.map((u,k) => el('img', { src: u, alt: `${c.name} photo ${k+1}` })));
    g.replaceChildren(track);
    if (urls.length > 1){
      const dots = el('div', { class: 'dots' }, urls.map((_,k) => el('button', { type: 'button', 'aria-label': `Photo ${k+1}`, onclick: () => go(k) })));
      const go = k => track.scrollTo({ left: k * track.clientWidth, behavior: 'smooth' });
      const cur = () => Math.round(track.scrollLeft / track.clientWidth);
      const sync = () => [...dots.children].forEach((d,k) => d.setAttribute('aria-current', k === cur()));
      track.addEventListener('scroll', sync, { passive: true });
      track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(Math.min(cur()+1, urls.length-1)); if (e.key === 'ArrowLeft') go(Math.max(cur()-1, 0)); });
      g.append(el('button', { class: 'arrow prev', type: 'button', 'aria-label': 'Previous photo', onclick: () => go(Math.max(cur()-1, 0)) }, '‹'),
               el('button', { class: 'arrow next', type: 'button', 'aria-label': 'Next photo', onclick: () => go(Math.min(cur()+1, urls.length-1)) }, '›'), dots);
      sync();
    }
  }

  // mini map
  const m = addMap('mini', null, { zoomControl: true }); m.setView([c.lat, c.lon], 11);
  L.marker([c.lat, c.lon], { icon: pinIcon() }).addTo(m);

  // newest-first order in the CSV → "previous" is the next row down
  const prev = all[(i + 1) % all.length], next = all[(i - 1 + all.length) % all.length];
  $('#pager').append(el('a', { href: `campsite.html?id=${next.slug}` }, `← ${next.name}`), el('a', { href: 'index.html#campsites' }, 'All campsites'), el('a', { href: `campsite.html?id=${prev.slug}` }, `${prev.name} →`));
}
