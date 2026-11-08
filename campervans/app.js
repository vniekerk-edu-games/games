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
const photo = (slug, n) => `campsites/${slug}/${n}.jpg`;

function addMap(node, points, opts = {}){
  const map = L.map(node, { scrollWheelZoom: false, ...opts });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  return map;
}
const pinIcon = () => L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-10] });

/* ---------- HOME ---------- */
async function home(){
  let all;
  try { all = await loadCampsites(); }
  catch (e) { $('#grid').append(el('p', { class: 'empty' }, 'Could not load the campsite list. Serve this folder over HTTP (see README).')); return; }

  $('#latest').replaceChildren('Latest addition: ', el('a', { href: `campsite.html?id=${all[0].slug}` }, all[0].name));

  const sel = new Set();
  const q = $('#q'), grid = $('#grid'), count = $('#count'), facets = $('#facets');

  facets.append(...FEATURES.map(([name]) => {
    const n = all.filter(c => c.features.includes(name)).length;
    const b = el('button', { class: 'facet', type: 'button', 'aria-pressed': 'false' }, icon(name, 36), name, el('span', { class: 'n' }, String(n)));
    b.onclick = () => { sel.has(name) ? sel.delete(name) : sel.add(name); b.setAttribute('aria-pressed', sel.has(name)); draw(); };
    b.firstChild.removeAttribute('title');
    return b;
  }));
  const clear = () => { sel.clear(); q.value = ''; facets.querySelectorAll('.facet').forEach(b => b.setAttribute('aria-pressed','false')); draw(); };
  $('#clear').onclick = clear;
  q.oninput = draw;

  // map
  const map = addMap('map'); const group = L.layerGroup().addTo(map);
  const markers = new Map(all.map(c => {
    const m = L.marker([c.lat, c.lon], { icon: pinIcon(), title: c.name });
    m.bindPopup(() => el('div', {}, el('b', {}, c.name), el('div', {}, c.town), el('a', { href: `campsite.html?id=${c.slug}` }, 'Open campsite page')));
    return [c.slug, m];
  }));

  function match(c){
    const t = q.value.trim().toLowerCase();
    return [...sel].every(f => c.features.includes(f)) &&
      (!t || [c.name, c.town, c.highlights].some(s => s.toLowerCase().includes(t)));
  }

  function card(c){
    const pic = el('div', { class: 'pic' });
    const img = el('img', { src: photo(c.slug, 1), alt: c.name, loading: 'lazy' });
    img.onerror = () => { img.remove(); pic.append(el('span', {}, c.name)); };
    pic.append(img);
    return el('a', { class: 'card', href: `campsite.html?id=${c.slug}` }, pic, el('h3', {}, c.name), el('div', { class: 'town' }, c.town),
      el('div', { class: 'icons' }, orderedFeatures(c).map(f => icon(f))));
  }

  function draw(){
    const list = all.filter(match);
    grid.replaceChildren(...(list.length ? list.map(card)
      : [el('p', { class: 'empty' }, 'No campsite has every one of those. ', el('button', { class: 'clear', onclick: clear }, 'Clear filters'))]));
    count.textContent = `Showing ${list.length} of ${all.length} campsites`;
    $('#clear').hidden = !sel.size && !q.value;
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
  for (let n = 1; n <= MAX_PHOTOS; n++){
    const ok = await new Promise(r => { const t = new Image(); t.onload = () => r(true); t.onerror = () => r(false); t.src = photo(c.slug, n); });
    if (!ok) break; urls.push(photo(c.slug, n));
  }
  const g = $('#gallery');
  if (!urls.length) g.replaceChildren(el('div', { class: 'nogallery' }, `Add photos to campsites/${c.slug}/ as 1.jpg, 2.jpg…`));
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
