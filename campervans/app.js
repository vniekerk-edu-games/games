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
const PANEL_ROWS = 3;

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
const blurb = (t, n = 150) => { const s = t.split(/\n\s*\n/)[0].replace(/\s+/g, ' '); return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…'; };
const paragraphs = t => t.split(/\n\s*\n/).map(p => el('p', {}, p.trim()));
// tries .webp first, then .jpg, so either format works. Results are cached, so each photo is only looked up once.
const EXTS = ['webp','jpg'];
const photoCache = new Map();
function loadPhoto(slug, n){
  const key = `${slug}/${n}`;
  if (!photoCache.has(key)) photoCache.set(key, new Promise(res => {
    let i = 0;
    const next = () => {
      if (i >= EXTS.length) return res(null);
      const u = `campsites/${slug}/${n}.${EXTS[i++]}`, im = new Image();
      im.onload = () => res(u); im.onerror = next; im.src = u;
    };
    next();
  }));
  return photoCache.get(key);
}
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pref = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r;
  const h = Math.sin(dLa/2)**2 + Math.cos(a.lat*r) * Math.cos(b.lat*r) * Math.sin(dLo/2)**2; return 2 * R * Math.asin(Math.sqrt(h)); };
const fmtKm = d => d < 10 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
// "latest additions": everything added within BATCH_DAYS of the newest `added` date
function latestBatch(all){
  const dated = all.filter(c => c.added).sort((x, y) => y.added.localeCompare(x.added));
  const newest = dated.length ? new Date(dated[0].added) : null;
  return { newest, batch: newest ? dated.filter(c => (newest - new Date(c.added)) / 864e5 <= BATCH_DAYS) : [] };
}
// Areas, in display order. The colours come from the logo.
const REGIONS = [
  ['Breede River','#b8551f','#fff'], ['Winelands & Valleys','#5a6c1f','#fff'], ['Cederberg & North','#f0a81f','#1b3a26'],
  ['Overberg & Route 62','#c24d6b','#fff'], ['Garden Route & Eastern Cape','#3d6b4f','#fff']
];
const REGION_COLOUR = Object.fromEntries(REGIONS.map(r => [r[0], r[1]]));
const QUICK = [['Swimming','#f0a81f','#1b3a26'],['Kids Play Area','#5a6c1f','#fff'],['Hiking Trails','#b8551f','#fff'],['Pet Friendly','#96391f','#fff'],['Private Sites','#1b3a26','#faf3dc']];

const byName = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
const regionIndex = r => { const i = REGIONS.findIndex(x => x[0] === r); return i < 0 ? 99 : i; };
const byRegionName = (a, b) => regionIndex(a.region) - regionIndex(b.region) || a.region.localeCompare(b.region) || byName(a, b);
const colourOf = c => REGION_COLOUR[c.region] || '#1b3a26';
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
function addMap(node, points, opts = {}){
  const map = L.map(node, { scrollWheelZoom: false, ...opts });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: OSM }).addTo(map);
  return map;
}
const pinIcon = (col = '#1b3a26', cls = '') => L.divIcon({ className: '', html: `<div class="pin ${cls}" style="background:${col}"></div>`, iconSize: [18,18], iconAnchor: [9,9], popupAnchor: [0,-10] });

/* ---------- map name labels ---------- */
const label = (m, name) => m.bindTooltip(name, { permanent: true, direction: 'right', offset: [11, 0], className: 'plabel' });
// hide labels that would overlap one already drawn (the earlier campsite wins); zoom in and they come back
function declutter(map, markers){
  requestAnimationFrame(() => {
    if (map.getContainer().classList.contains('nolabels')) return;
    const shown = [];
    for (const m of markers){
      const t = map.hasLayer(m) && m.getTooltip()?.getElement(); if (!t) continue;
      t.classList.remove('clash');
      const r = t.getBoundingClientRect(); if (!r.width) continue;
      if (shown.some(s => r.left < s.right + 2 && r.right > s.left - 2 && r.top < s.bottom && r.bottom > s.top)) t.classList.add('clash');
      else shown.push(r);
    }
  });
}
const SVG = {
  names: '<svg viewBox="0 0 24 24"><path d="M4 18 9 5h1.6l5 13M6 13.5h7.6M16.5 18v-6.5M16.5 12.2c1-1.4 4-1.6 4 1.3V18m0-2.8c-.7 2.8-4.6 3.4-4.6.8 0-2 2.4-2.3 4.6-2"/></svg>',
  locate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22"/></svg>',
  fit: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><circle cx="12" cy="12" r="2.2"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.6" cy="8.6" r="1.1" fill="currentColor"/><circle cx="15.4" cy="15.4" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>'
};
function toolButton(svg, title, onclick){
  const b = el('button', { class: 'tool', type: 'button', title, 'aria-label': title, onclick }); b.innerHTML = svg; return b;
}
function toolbar(map, buttons, position = 'topright'){
  const C = L.Control.extend({ options: { position }, onAdd(){
    const d = L.DomUtil.create('div', 'leaflet-bar tools'); L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
    d.append(...buttons); return d; } });
  new C().addTo(map);
}
// "Names" on/off button, remembered between visits
function namesButton(map, markers){
  const box = map.getContainer();
  const set = on => { box.classList.toggle('nolabels', !on); b.setAttribute('aria-pressed', on); b.title = on ? 'Hide campsite names' : 'Show campsite names'; setPref('cv-names', on ? '1' : '0'); if (on) declutter(map, markers); };
  const b = toolButton(SVG.names, '', () => set(box.classList.contains('nolabels')));
  set(pref('cv-names', '1') === '1');
  map.on('zoomend moveend', () => declutter(map, markers));
  return b;
}

/* ---------- HOME ---------- */
async function home(){
  let all;
  try { all = (await loadCampsites()).sort(byName); }
  catch (e) { $('#regions').append(el('p', { class: 'empty' }, 'Could not load the campsite list. Serve this folder over HTTP (see README).')); return; }
  const { newest, batch } = latestBatch(all);
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
        return el('a', { class: 'lrow', href: `campsite.html?id=${c.slug}` }, th,
          el('div', {}, el('div', { class: 'lt' }, el('h3', {}, c.name), el('span', { class: 'new' }, 'NEW')),
            el('div', { class: 'town', style: 'margin:0 0 6px' }, c.town), el('p', {}, blurb(c.highlights))));
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
  const more = el('button', { class: 'tile', type: 'button', 'aria-expanded': 'false', style: 'border-top-color:#c9bd98' }, `All ${FEATURES.length} filters`, el('small', {}, 'show or hide'));
  more.onclick = () => { const h = $('#more').hidden = !$('#more').hidden; more.setAttribute('aria-expanded', !h); };
  $('#tiles').append(...tiles, more);
  $('#facets').append(...FEATURES.map(([name]) => {
    const b = el('button', { class: 'facet', type: 'button', 'aria-pressed': 'false', 'data-f': name }, icon(name, 34), name, el('span', { class: 'n' }, String(countOf(name))));
    b.firstChild.removeAttribute('title'); b.onclick = () => toggle(name); buttons.push(b); return b;
  }));
  const clear = () => { sel.clear(); newOnly = false; q.value = ''; buttons.forEach(b => b.setAttribute('aria-pressed', 'false')); draw(); };
  $('#clear').onclick = clear; q.oninput = draw;

  // map, with campsite names next to the pins
  const map = addMap('map'); const group = L.layerGroup().addTo(map);
  const markers = new Map(all.map(c => {
    const m = L.marker([c.lat, c.lon], { icon: pinIcon(colourOf(c)), alt: c.name });
    label(m, c.name);
    m.bindPopup(() => el('div', {}, el('b', {}, c.name), el('div', {}, c.town),
      el('a', { href: `campsite.html?id=${c.slug}` }, 'Open campsite page'), ' · ', el('a', { href: `map.html?id=${c.slug}` }, 'Big map')));
    return [c.slug, m];
  }));
  const markerList = [...markers.values()];
  toolbar(map, [namesButton(map, markerList), toolButton(SVG.full, 'Open the full-screen map', () => location.href = 'map.html')]);
  const hot = (c, on) => { const m = markers.get(c.slug); m.getElement()?.classList.toggle('hot', on); m.getTooltip()?.getElement()?.classList.toggle('force', on); };

  // show / hide the map column, animated both ways
  const split = $('.split'), mt = $('#maptoggle'), mapcol = $('#mapcol');
  let lastKey = '', busy = false;
  function flip(mutate){   // cards glide from their old spot to their new one
    const cs = [...$('#regions').querySelectorAll('.card')];
    const first = new Map(cs.map(c => [c, c.getBoundingClientRect()]));
    mutate();
    if (REDUCE) return;
    cs.forEach(c => {
      const f = first.get(c), l = c.getBoundingClientRect(); if (!l.width) return;
      const dx = f.left - l.left, dy = f.top - l.top, s = f.width / l.width;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(s - 1) < .01) return;
      c.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${s})` }, { transformOrigin: '0 0', transform: 'none' }],
        { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  const setMap = open => {
    if (busy) return;
    mt.textContent = open ? 'Hide map' : 'Show map'; mt.setAttribute('aria-expanded', open);
    const shown = () => { map.invalidateSize(); updateMap(all.filter(match), true); };
    if (REDUCE){ split.classList.toggle('nomap', !open); if (open) setTimeout(shown, 50); return; }
    busy = true;
    if (!open){
      mapcol.classList.add('away');   // map slides out, then the cards spread into the space
      setTimeout(() => { flip(() => split.classList.add('nomap')); mapcol.classList.remove('away'); busy = false; }, 260);
    } else {
      mapcol.classList.add('away');   // cards make room, then the map slides in
      flip(() => split.classList.remove('nomap'));
      shown();
      setTimeout(() => { mapcol.classList.remove('away'); busy = false; }, 120);
    }
  };
  mt.onclick = () => setMap(split.classList.contains('nomap'));
  if (window.innerWidth < 900) { split.classList.add('nomap'); mt.textContent = 'Show map'; mt.setAttribute('aria-expanded', 'false'); }
  $('#legend').append(...REGIONS.map(r => el('span', {}, el('i', { class: 'dot', style: `background:${r[1]}` }), r[0])));

  const match = c => (!newOnly || isNew(c)) && [...sel].every(x => c.features.includes(x)) &&
    (!q.value.trim() || [c.name, c.town, c.highlights].some(t => t.toLowerCase().includes(q.value.trim().toLowerCase())));

  // each card is built once and re-used, so typing in the search box never reloads the photos
  const cards = new Map();
  function card(c){
    if (cards.has(c.slug)) return cards.get(c.slug);
    const pic = el('div', { class: 'pic' }, el('span', {}, c.name));
    if (isNew(c)) pic.append(el('em', { class: 'new' }, 'NEW'));
    loadPhoto(c.slug, 1).then(u => { if (u){ pic.prepend(el('img', { src: u, alt: c.name, loading: 'lazy' })); pic.querySelector('span')?.remove(); } });
    const a = el('a', { class: 'card', href: `campsite.html?id=${c.slug}` }, pic,
      el('div', { class: 'cn' }, el('i', { class: 'dot', style: `background:${colourOf(c)}` }), el('h3', {}, c.name)),
      el('div', { class: 'town' }, c.town), el('div', { class: 'icons' }, orderedFeatures(c).map(x => icon(x))));
    a.onmouseenter = () => hot(c, true); a.onmouseleave = () => hot(c, false);
    cards.set(c.slug, a);
    return a;
  }
  function updateMap(list, force){   // only touch the map when the set of campsites actually changes
    const key = list.map(c => c.slug).join();
    if (key === lastKey && !force) return;
    lastKey = key;
    group.clearLayers(); list.forEach(c => group.addLayer(markers.get(c.slug)));
    if (list.length && !split.classList.contains('nomap')) map.fitBounds(L.latLngBounds(list.map(c => [c.lat, c.lon])).pad(.15), { maxZoom: 11 });
    declutter(map, markerList);
  }
  function draw(){
    const list = all.filter(match);   // already alphabetical
    const regions = [...REGIONS.map(r => r[0]), ...new Set(all.map(c => c.region).filter(r => r && !REGION_COLOUR[r]))];
    const secs = regions.map(r => {
      const items = list.filter(c => c.region === r); if (!items.length) return null;
      const [, bg] = REGIONS.find(x => x[0] === r) || [0, '#5d7872'];
      const head = el('div', { class: 'rh' }, el('h2', {}, r), el('span', {}, `${items.length} campsite${items.length > 1 ? 's' : ''}`));
      head.style.borderLeftColor = bg;
      return el('section', {}, head, el('div', { class: 'g3' }, items.map(card)));
    }).filter(Boolean);
    $('#regions').replaceChildren(...(secs.length ? secs : [el('p', { class: 'empty' }, 'No campsite has every one of those. ', el('button', { class: 'clear', onclick: clear }, 'Clear filters'))]));
    count.textContent = `Showing ${list.length} of ${all.length} campsites${newOnly ? ' (new only)' : ''}`;
    $('#clear').hidden = !sel.size && !q.value && !newOnly;
    updateMap(list);
  }
  draw();
}

/* ---------- DETAIL ---------- */
const deco = (name, size) => { const i = icon(name, size); ['title','role','aria-label'].forEach(a => i.removeAttribute(a)); i.setAttribute('aria-hidden', 'true'); return i; };
async function detail(){
  let all;
  try { all = (await loadCampsites()).sort(byRegionName); }   // same order as the home page
  catch (e) { $('#mosaic').replaceChildren(el('div', { class: 'nogallery' }, 'Could not load the campsite list. Serve this folder over HTTP (see README).')); return; }
  const id = new URLSearchParams(location.search).get('id');
  const i = all.findIndex(c => c.slug === id);
  if (i < 0){   // a broken or mistyped link: say so instead of quietly showing another campsite
    document.title = 'Campsite not found | The Camper Vans SA';
    $('#title').textContent = 'Campsite not found';
    $('#crumb').replaceChildren(el('a', { href: 'index.html#campsites' }, '← All campsites'));
    $('#mosaic').replaceChildren(el('div', { class: 'nogallery' }, 'We couldn’t find that campsite. Try the list or the map.'));
    $('#text').append(el('p', {}, el('a', { class: 'btn', href: 'index.html#campsites' }, 'Browse the campsites'), ' ', el('a', { class: 'btn alt', href: 'map.html' }, 'Open the map')));
    $('.side').hidden = true;
    return;
  }
  const c = all[i], col = colourOf(c);
  loadPhoto(c.slug, 1).then(u => { if (u) { const h = $('#hero'); h.style.setProperty('--hero', `url(${u})`); h.classList.add('hasphoto'); } });   // faded header photo
  document.title = `${c.name} | The Camper Vans SA`;
  $('#title').textContent = c.name;
  $('#crumb').replaceChildren(el('a', { href: 'index.html#campsites' }, '← All campsites'), ` / ${c.region}`);
  $('#meta').append(el('i', { class: 'dot', style: `background:${col}` }), `${c.town} · ${c.region}`,
    ...(latestBatch(all).batch.includes(c) ? [' ', el('span', { class: 'new' }, 'NEW')] : []));
  $('#feats').append(...orderedFeatures(c).map(f => el('span', { class: 'chip' }, deco(f, 26), f)));
  $('#text').append(
    el('h2', {}, 'Highlights of the campsite'), ...paragraphs(c.highlights),
    ...(c.remember ? [el('h2', {}, 'Things to remember'), ...paragraphs(c.remember)] : []),
    ...(c.spots ? [el('h2', {}, 'Our recommended spots'), ...paragraphs(c.spots)] : []));
  $('#directions').append(
    el('a', { class: 'btn alt block', href: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`, target: '_blank', rel: 'noopener' }, 'Get directions'),
    el('a', { class: 'bigmap', href: `map.html?id=${c.slug}` }, 'Open on the big map →'));
  if (c.website) $('#website').append(el('a', { class: 'btn block', href: c.website, target: '_blank', rel: 'noopener' }, 'Visit campsite website'));
  else $('#sitepanel').hidden = true;
  const m = addMap('mini', null, { zoomControl: true }); m.setView([c.lat, c.lon], 11);
  label(L.marker([c.lat, c.lon], { icon: pinIcon(col), alt: c.name }), c.name).addTo(m);
  // more in this area: the closest ones first, with distance
  const near = all.filter(x => x.region === c.region && x.slug !== c.slug).map(x => [x, km(c, x)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
  if (near.length){
    $('#more-h').textContent = `More in ${c.region}`;
    $('#more-grid').append(...near.map(([x, d]) => {
      const pic = el('div', { class: 'pic' }, el('span', {}, x.name));
      loadPhoto(x.slug, 1).then(u => { if (u) { pic.prepend(el('img', { src: u, alt: x.name, loading: 'lazy' })); pic.querySelector('span')?.remove(); } });
      return el('a', { class: 'card', href: `campsite.html?id=${x.slug}` }, pic, el('div', { class: 'cn' }, el('i', { class: 'dot', style: `background:${col}` }), el('h3', {}, x.name)), el('div', { class: 'town' }, `${x.town} · ${fmtKm(d)} away`));
    }));
    $('#more').hidden = false;
  }
  // previous / next follow the home page order (area, then A–Z)
  const prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
  $('#pager').append(el('a', { href: `campsite.html?id=${prev.slug}` }, `← ${prev.name}`), el('a', { href: 'index.html#campsites' }, 'All campsites'), el('a', { href: `campsite.html?id=${next.slug}` }, `${next.name} →`));
  // photos: 1.webp/1.jpg, 2.webp/2.jpg … until one is missing
  const urls = [];
  for (let n = 1; n <= MAX_PHOTOS; n++){ const u = await loadPhoto(c.slug, n); if (!u) break; urls.push(u); }
  const mo = $('#mosaic');
  if (!urls.length){ mo.replaceChildren(el('div', { class: 'nogallery' }, `Add photos to campsites/${c.slug}/ as 1.jpg (or 1.webp), 2.jpg…`)); return; }
  const lb = $('#lb'); let cur = 0;
  const show = k => { cur = (k + urls.length) % urls.length; $('#lbimg').src = urls[cur]; $('#lbimg').alt = `${c.name} photo ${cur + 1}`; $('#lbcount').textContent = `${cur + 1} / ${urls.length}`; };
  const open = k => { show(k); lb.showModal(); };
  $('#lbclose').onclick = () => lb.close();
  $('#lbprev').onclick = () => show(cur - 1); $('#lbnext').onclick = () => show(cur + 1);
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
  let sx = null;   // swipe on phones
  lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
  document.querySelectorAll('#lb .lbn').forEach(b => b.hidden = urls.length < 2);
  const shown = urls.slice(0, 5);
  mo.className = 'mosaic m' + shown.length;
  mo.replaceChildren(...shown.map((u, k) => {
    const b = el('button', { class: 'mt', type: 'button', 'aria-label': `Open photo ${k + 1} of ${urls.length}` });
    b.style.backgroundImage = `url(${u})`; b.onclick = () => open(k); return b;
  }));
  if (urls.length > 1) mo.append(el('button', { class: 'showall', type: 'button', onclick: () => open(0) }, `Show all ${urls.length} photos`));
}

/* ---------- FULL-SCREEN MAP (map.html) ---------- */
async function fullmap(){
  let all;
  try { all = (await loadCampsites()).sort(byRegionName); }
  catch (e) { $('#fmap').append(el('p', { class: 'empty', style: 'padding:30px' }, 'Could not load the campsite list. Serve this folder over HTTP (see README).')); return; }
  const { batch } = latestBatch(all);
  const isNew = c => batch.includes(c);
  const fm = $('#fm'), strip = $('#strip'), listBox = $('#flist'), q = $('#fq');
  const regionsOn = new Set(all.map(c => c.region)), feats = new Set();
  let list = all, current = null, you = null, youLayer = null, line = null;

  // base maps (choice is remembered)
  const BASES = {
    'Map': L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: OSM }),
    'Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', attribution: `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>` }),
    'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: `${OSM}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)` }),
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' })
  };
  const map = L.map('fmap', { zoomControl: false, zoomSnap: .5 });
  (BASES[pref('cv-base', 'Map')] || BASES.Map).addTo(map);
  map.on('baselayerchange', e => setPref('cv-base', e.name));
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.layers(BASES, null, { position: 'topright' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
  const group = L.layerGroup().addTo(map);

  const markers = new Map(all.map(c => {
    const m = L.marker([c.lat, c.lon], { icon: pinIcon(colourOf(c), 'big' + (isNew(c) ? ' isnew' : '')), alt: c.name, riseOnHover: true });
    label(m, c.name);
    m.on('click', () => select(c));
    m.on('mouseover', () => hot(c, true)); m.on('mouseout', () => hot(c, false));
    return [c.slug, m];
  }));
  const markerList = () => list.map(c => markers.get(c.slug));
  const hot = (c, on) => {
    const m = markers.get(c.slug); m.getElement()?.classList.toggle('hot', on); m.getTooltip()?.getElement()?.classList.toggle('force', on);
    listBox.querySelector(`[data-slug="${c.slug}"]`)?.classList.toggle('hot', on);
  };
  const fitList = () => list.length && map.flyToBounds(L.latLngBounds(list.map(c => [c.lat, c.lon])).pad(.12), { maxZoom: 12, duration: .7 });

  // toolbar
  const toggleList = () => { fm.classList.toggle('nolist'); setTimeout(() => map.invalidateSize(), 380); };
  const locBtn = toolButton(SVG.locate, 'Find campsites near me', locate);
  toolbar(map, [
    namesButton(map, { [Symbol.iterator]: () => markerList()[Symbol.iterator]() }),
    locBtn,
    toolButton(SVG.fit, 'Zoom to show all results', fitList),
    toolButton(SVG.dice, 'Surprise me – pick a random campsite', () => list.length && select(list[Math.floor(Math.random() * list.length)])),
    ...(fm.requestFullscreen ? [toolButton(SVG.full, 'Full screen', () => document.fullscreenElement ? document.exitFullscreen() : fm.requestFullscreen())] : [])
  ]);
  toolbar(map, [toolButton(SVG.list, 'Show or hide the list', toggleList)], 'topleft');
  $('#fhide').onclick = toggleList;
  document.addEventListener('fullscreenchange', () => setTimeout(() => map.invalidateSize(), 100));

  // near me
  function locate(){
    if (!navigator.geolocation) return toast('Your browser cannot share its location.');
    locBtn.classList.add('busy');
    navigator.geolocation.getCurrentPosition(p => {
      locBtn.classList.remove('busy'); locBtn.setAttribute('aria-pressed', 'true');
      you = { lat: p.coords.latitude, lon: p.coords.longitude };
      youLayer?.remove();
      youLayer = L.layerGroup([
        L.circle([you.lat, you.lon], { radius: p.coords.accuracy, color: '#2a7fff', weight: 1, fillOpacity: .08 }),
        L.marker([you.lat, you.lon], { icon: L.divIcon({ className: '', html: '<div class="you"></div>', iconSize: [18,18], iconAnchor: [9,9] }), interactive: false })
      ]).addTo(map);
      render();
      const near = list.slice(0, 5);
      map.flyToBounds(L.latLngBounds([[you.lat, you.lon], ...near.map(c => [c.lat, c.lon])]).pad(.2), { maxZoom: 11, duration: .9 });
      toast(near.length ? `Closest: ${near[0].name}, ${fmtKm(km(you, near[0]))} away (as the crow flies)` : 'Location found');
      if (current) drawLine(current);
    }, () => { locBtn.classList.remove('busy'); toast('Could not get your location. Check that location access is allowed.'); }, { enableHighAccuracy: false, timeout: 10000 });
  }
  function drawLine(c){
    line?.remove(); line = null;
    if (you) line = L.polyline([[you.lat, you.lon], [c.lat, c.lon]], { color: '#1f3a2a', weight: 2.5, dashArray: '6 8', interactive: false }).addTo(map);
  }
  let toastT;
  function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4200); }

  // filter panel
  const regionChips = REGIONS.filter(r => regionsOn.has(r[0])).map(([name, col]) => {
    const b = el('button', { class: 'rchip', type: 'button', 'aria-pressed': 'true', onclick: () => {
      regionsOn.has(name) ? regionsOn.delete(name) : regionsOn.add(name); b.setAttribute('aria-pressed', regionsOn.has(name)); render(); } },
      el('i', { class: 'dot', style: `background:${col}` }), name);
    return b;
  });
  const featBtns = FEATURES.map(([name]) => {
    const b = el('button', { class: 'fbtn', type: 'button', 'aria-pressed': 'false', title: name, onclick: () => {
      feats.has(name) ? feats.delete(name) : feats.add(name); b.setAttribute('aria-pressed', feats.has(name)); render(); } }, icon(name, 26));
    b.firstChild.removeAttribute('title'); return b;
  });
  $('#fregions').append(...regionChips); $('#ffeats').append(...featBtns);
  const clearAll = () => { q.value = ''; feats.clear(); all.forEach(c => regionsOn.add(c.region));
    [...regionChips].forEach(b => b.setAttribute('aria-pressed', 'true')); featBtns.forEach(b => b.setAttribute('aria-pressed', 'false')); render(); };
  $('#fclear').onclick = clearAll;
  q.oninput = () => render();

  const match = c => regionsOn.has(c.region) && [...feats].every(f => c.features.includes(f)) &&
    (!q.value.trim() || [c.name, c.town, c.region, c.highlights].some(t => t.toLowerCase().includes(q.value.trim().toLowerCase())));
  let lastKey = '';
  function render(){
    list = all.filter(match);
    if (you) list.sort((a, b) => km(you, a) - km(you, b));
    $('#fcount').textContent = `${list.length} of ${all.length} campsites${you ? ' · nearest first' : ''}`;
    $('#fclear').hidden = !q.value && !feats.size && regionsOn.size === new Set(all.map(c => c.region)).size;
    listBox.replaceChildren(...(list.length ? list.map(c => {
      const b = el('button', { class: 'fitem' + (current === c ? ' sel' : ''), type: 'button', 'data-slug': c.slug, onclick: () => select(c) },
        el('i', { class: 'dot', style: `background:${colourOf(c)}` }),
        el('span', { class: 'fi-name' }, c.name, isNew(c) ? el('em', { class: 'new' }, 'NEW') : ''),
        el('span', { class: 'fi-town' }, c.town + (you ? ` · ${fmtKm(km(you, c))}` : '')));
      b.onmouseenter = () => hot(c, true); b.onmouseleave = () => hot(c, false);
      return b;
    }) : [el('p', { class: 'fempty' }, 'Nothing matches. ', el('button', { class: 'clear', type: 'button', onclick: clearAll }, 'Clear filters'))]));
    const key = list.map(c => c.slug).join();
    if (key !== lastKey){ lastKey = key; group.clearLayers(); list.forEach(c => group.addLayer(markers.get(c.slug))); }
    declutter(map, markerList());
  }

  // the info strip
  let token = 0;
  function select(c, fly = true){
    if (current) { markers.get(current.slug).getElement()?.classList.remove('sel'); markers.get(current.slug).setZIndexOffset(0); }
    current = c; const my = ++token;
    const m = markers.get(c.slug); m.getElement()?.classList.add('sel'); m.setZIndexOffset(1000);
    history.replaceState(null, '', `?id=${c.slug}`);
    listBox.querySelectorAll('.fitem').forEach(b => b.classList.toggle('sel', b.dataset.slug === c.slug));
    listBox.querySelector(`[data-slug="${c.slug}"]`)?.scrollIntoView({ block: 'nearest', behavior: REDUCE ? 'auto' : 'smooth' });
    drawLine(c);

    const i = list.indexOf(c), n = list.length;
    const step = d => n && select(list[((i < 0 ? 0 : i) + d + n) % n]);
    const photos = el('div', { class: 'sphotos' }, el('div', { class: 'sph-empty' }, c.name));
    const nearby = all.filter(x => x !== c).map(x => [x, km(c, x)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const dist = you ? ` · ${fmtKm(km(you, c))} from you` : '';
    strip.replaceChildren(
      photos,
      el('div', { class: 'sbody' },
        el('div', { class: 'shead' }, el('i', { class: 'dot', style: `background:${colourOf(c)}` }), el('h2', { id: 'strip-h' }, c.name), isNew(c) ? el('span', { class: 'new' }, 'NEW') : ''),
        el('div', { class: 'smeta' }, `${c.town} · ${c.region}${dist}`),
        el('div', { class: 'sicons' }, orderedFeatures(c).map(f => icon(f, 24))),
        el('p', {}, blurb(c.highlights, 210)),
        el('div', { class: 'snear' }, el('b', {}, 'Nearby: '), ...nearby.flatMap(([x, d], k) => [k ? ' · ' : '',
          el('button', { type: 'button', class: 'linkish', onclick: () => select(x) }, x.name), ` ${fmtKm(d)}`]))),
      el('div', { class: 'sact' },
        el('a', { class: 'btn', href: `campsite.html?id=${c.slug}` }, 'Open campsite page'),
        el('a', { class: 'btn alt', href: `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}`, target: '_blank', rel: 'noopener' }, 'Directions'),
        ...(c.website ? [el('a', { class: 'btn alt', href: c.website, target: '_blank', rel: 'noopener' }, 'Website')] : []),
        el('div', { class: 'spager' },
          el('button', { type: 'button', class: 'sarrow', 'aria-label': 'Previous campsite', onclick: () => step(-1) }, '‹'),
          el('span', {}, i < 0 ? '' : `${i + 1} of ${n}`),
          el('button', { type: 'button', class: 'sarrow', 'aria-label': 'Next campsite', onclick: () => step(1) }, '›'))),
      el('button', { type: 'button', class: 'sclose', 'aria-label': 'Close', onclick: close }, '×'));
    strip.hidden = false; requestAnimationFrame(() => strip.classList.add('open'));
    // photos: show what's there (up to 6), scrollable
    (async () => {
      const urls = [];
      for (let k = 1; k <= 6; k++){ const u = await loadPhoto(c.slug, k); if (my !== token) return; if (!u) break; urls.push(u);
        if (k === 1) photos.replaceChildren(); photos.append(el('img', { src: u, alt: `${c.name} photo ${k}`, onclick: () => location.href = `campsite.html?id=${c.slug}` })); }
      if (urls.length > 1) photos.append(el('span', { class: 'sph-count' }, `${urls.length} photos ›`));
    })();
    if (fly){   // centre the pin in the part of the map the strip doesn't cover
      const z = Math.max(map.getZoom(), 11), h = strip.offsetHeight || 220;
      const p = map.project([c.lat, c.lon], z).add([0, h / 2]);
      map.flyTo(map.unproject(p, z), z, { duration: REDUCE ? 0 : .8 });
    }
  }
  function close(){
    if (!current) return;
    markers.get(current.slug).getElement()?.classList.remove('sel'); markers.get(current.slug).setZIndexOffset(0);
    listBox.querySelectorAll('.fitem.sel').forEach(b => b.classList.remove('sel'));
    current = null; line?.remove(); line = null; token++;
    strip.classList.remove('open'); setTimeout(() => { if (!current) strip.hidden = true; }, 300);
    history.replaceState(null, '', location.pathname);
  }
  map.on('click', close);
  document.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'Escape') close();
    else if (e.key === '/') { e.preventDefault(); if (fm.classList.contains('nolist')) toggleList(); q.focus(); }
    else if (current && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) strip.querySelectorAll('.sarrow')[e.key === 'ArrowRight' ? 1 : 0].click();
  });

  if (window.innerWidth < 760) fm.classList.add('nolist');
  render();
  map.fitBounds(L.latLngBounds(all.map(c => [c.lat, c.lon])).pad(.08));
  const start = all.find(c => c.slug === new URLSearchParams(location.search).get('id'));
  if (start) { map.setView([start.lat, start.lon], 12); select(start); }
}
