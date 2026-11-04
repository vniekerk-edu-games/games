'use strict';
/* =========================================================
   APP – screens, profiles, camp hub, Kampwinkel, game shell
   ========================================================= */
const PRAISE = ['Mooi so!', 'Uitstekend!', 'Slimkop!', 'Fantasties!', 'Jy het dit!', 'Bakgat!', 'Wonderlik!'];
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); $(id).classList.remove('hidden'); }

/* ---------- title & profiles ---------- */
$('btnStart').onclick = () => { Snd.init(); Snd.tap(); DB.profiles.length ? showProfiles() : startCreate(); };
function showProfiles() {
  show('scrProfiles'); const w = $('profileCards'); w.innerHTML = '';
  DB.profiles.forEach(p => {
    const c = el('div', 'card', `<div class="av">${avatarSVG(p.av)}</div><div class="nm"></div><div class="st">⭐ ${p.bank} · 🏕️ ${p.owned.length}</div>`);
    c.querySelector('.nm').textContent = p.name;
    c.onclick = () => { Snd.tap(); DB.current = p.id; saveDB(); showHub(); }; w.appendChild(c);
  });
  if (DB.profiles.length < 8) { const n = el('div', 'card new', '＋<span>Nuwe kampeerder</span>'); n.onclick = () => { Snd.tap(); startCreate(); }; w.appendChild(n); }
}

/* ---------- create / edit camper ---------- */
let AV = null, editing = false;
function startCreate(edit = false) {
  editing = edit; const p = prof();
  AV = edit && p ? { ...p.av } : { g: 'seun', skin: 0, hair: 0, shirt: 0, hat: 1 };
  $('inName').value = edit && p ? p.name : ''; $('createTitle').textContent = edit ? 'Verander my kampeerder' : 'Nuwe kampeerder';
  show('scrCreate'); buildOpts();
}
function buildOpts() {
  $('avPreview').innerHTML = avatarSVG(AV);
  const mk = (host, list, key, render) => { const h = $(host); h.innerHTML = ''; list.forEach((v, i) => { const val = v && typeof v === 'object' && v.v !== undefined ? v.v : i; const b = el('button', 'opt' + (AV[key] === val ? ' sel' : '')); render(b, v, i); b.onclick = () => { Snd.tap(); AV[key] = val; buildOpts(); }; h.appendChild(b); }); };
  mk('optG', [{ v: 'seun', t: '👦 Seun' }, { v: 'meisie', t: '👧 Meisie' }], 'g', (b, v) => b.textContent = v.t);
  mk('optSkin', SKINS, 'skin', (b, v) => { b.classList.add('sw'); b.style.background = v; });
  mk('optHair', HAIRS, 'hair', (b, v) => { b.classList.add('sw'); b.style.background = v; });
  mk('optShirt', SHIRTS, 'shirt', (b, v) => { b.classList.add('sw'); b.style.background = v; });
  mk('optHat', HATS, 'hat', (b, v) => { if (v) { b.classList.add('sw'); b.style.background = v; } else b.textContent = 'Geen'; });
}
$('btnCreateBack').onclick = () => { Snd.tap(); editing ? showSettings() : (DB.profiles.length ? showProfiles() : show('scrTitle')); };
$('btnCreateDone').onclick = () => {
  const name = $('inName').value.trim(); if (!name) { toast('Tik eers jou naam 🙂'); $('inName').focus(); return; }
  Snd.good(); $('inName').blur();
  if (editing) { const p = prof(); p.name = name; p.av = { ...AV }; saveDB(); showSettings(); return; }
  const p = newProfile(name, { ...AV }); DB.profiles.push(p); DB.current = p.id; saveDB(); showHub();
  setTimeout(() => toast('Welkom by jou kamp! Los raaisels op om ⭐ te verdien en koop dan goed vir jou kamp. 🛒', 4500), 400);
};
$('inName').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnCreateDone').onclick(); });

/* ---------- hub ---------- */
function medals(p, gid) {
  const g = p.g[gid] || {}, n1 = Object.values(g).reduce((a, v) => a + v.n, 0), n2 = (g[2] ? g[2].n : 0) + (g[3] ? g[3].n : 0), n3 = g[3] ? g[3].n : 0;
  return `<span class="${n1 >= 5 ? '' : 'off'}">🥉</span><span class="${n2 >= 5 ? '' : 'off'}">🥈</span><span class="${n3 >= 5 ? '' : 'off'}">🥇</span>`;
}
function dailyGame() { return GAME_ORDER[todaySeed() % GAME_ORDER.length]; }
function showHub(fresh) {
  const p = prof(); if (!p) { showProfiles(); return; }
  closeGame(); show('scrHub'); closeShop();
  $('hubScene').innerHTML = campSceneSVG(p.owned, fresh);
  $('hubAv').innerHTML = avatarSVG(p.av); $('hubName').textContent = p.name; $('hubStars').textContent = `🏕️ ${p.owned.length} / ${SHOP.length} kampgoed`;
  const st = $('stations'); st.innerHTML = '';
  for (const gid of GAME_ORDER) {
    const G = GAMES[gid];
    const b = el('button', 'station', `<div class="ic">${G.icon}</div><div class="tx"><div class="nm">${G.name}</div><div class="ds">${G.blurb}</div><div class="med">${medals(p, gid)}</div></div>`);
    b.onclick = () => { Snd.tap(); openGame(gid, p.diff[gid] || 1); };
    st.appendChild(b);
  }
  const d = $('btnDaily'), done = p.daily === todayKey();
  d.classList.toggle('done', done);
  d.innerHTML = done ? '✅ Uitdaging klaar!' : `🔥 Dag-uitdaging ${GAMES[dailyGame()].icon}`;
  d.onclick = () => { Snd.tap(); if (done) { toast('Kom môre terug vir \'n nuwe uitdaging! 🌙'); return; } openGame(dailyGame(), 2, { daily: true }); };
  $('wallet').innerHTML = `⭐ <b>${p.bank}</b>`;
  const canBuy = SHOP.some(it => !p.owned.includes(it.id) && it.p <= p.bank);
  $('btnShop').classList.toggle('glow', canBuy);
}
$('btnSwitch').onclick = () => { Snd.tap(); showProfiles(); };

/* ---------- Kampwinkel (shop) ---------- */
let armed = null, armT = null;
function openShop() { Snd.tap(); $('scrHub').classList.add('shopping'); $('shopPanel').classList.remove('hidden'); renderShop(); }
function closeShop() { $('scrHub').classList.remove('shopping'); $('shopPanel').classList.add('hidden'); armed = null; }
$('btnShop').onclick = openShop;
$('shopClose').onclick = () => { Snd.tap(); closeShop(); };
function renderShop() {
  const p = prof(), list = $('shopList'); list.innerHTML = '';
  $('shopBank').innerHTML = `Jy het <b>⭐ ${p.bank}</b> om te spandeer.<br><small>Kies self wat jy by jou kamp wil sit!</small>`;
  const items = SHOP.slice().sort((a, b) => (p.owned.includes(a.id) - p.owned.includes(b.id)) || a.p - b.p);
  for (const it of items) {
    const own = p.owned.includes(it.id), afford = p.bank >= it.p;
    const row = el('div', 'shop-item' + (own ? ' own' : ''), `<span class="e">${it.e}</span><span class="n">${it.n}</span>`);
    const b = el('button', 'buy' + (own ? ' own' : afford ? '' : ' poor') + (armed === it.id ? ' armed' : ''), own ? '✔ In jou kamp' : armed === it.id ? 'Seker? Tik weer!' : `⭐ ${it.p}`);
    if (!own) b.onclick = () => buy(it);
    row.appendChild(b); list.appendChild(row);
  }
}
function buy(it) {
  const p = prof();
  if (p.bank < it.p) { Snd.bad(); toast(`Jy het nog ⭐ ${it.p - p.bank} nodig. Los nog raaisels op! 🧩`, 2200); return; }
  if (armed !== it.id) { armed = it.id; Snd.tap(); clearTimeout(armT); armT = setTimeout(() => { armed = null; if (!$('shopPanel').classList.contains('hidden')) renderShop(); }, 3500); renderShop(); return; }
  armed = null; p.bank -= it.p; p.owned.push(it.id); saveDB(); Snd.coin(); setTimeout(() => Snd.win(), 250);
  showHub(it.id);
  toast(`🎉 Jou kamp het nou 'n ${it.n.toLowerCase()}! ${it.e}`, 2800);
}

/* ---------- settings ---------- */
function showSettings() { show('scrSettings'); $('swSound').classList.toggle('on', prof().sound); }
$('btnSettings').onclick = () => { Snd.tap(); showSettings(); };
$('swSound').onclick = () => { const p = prof(); p.sound = !p.sound; saveDB(); $('swSound').classList.toggle('on', p.sound); Snd.tap(); };
$('btnEditAv').onclick = () => { Snd.tap(); startCreate(true); };
$('btnSetDone').onclick = () => { Snd.tap(); showHub(); };
$('btnDelete').onclick = () => {
  const p = prof(); if (!confirm(`Skrap ${p.name} en al die sterre? Dit kan nie ontdoen word nie.`)) return;
  DB.profiles = DB.profiles.filter(x => x.id !== p.id); DB.current = null; saveDB();
  DB.profiles.length ? showProfiles() : show('scrTitle');
};

/* ---------- game shell ---------- */
let CUR = null;
function closeGame() { if (CUR) { $('gBody').innerHTML = ''; CUR = null; } $('ovWin').classList.add('hidden'); $('ovHelp').classList.add('hidden'); }
function openGame(gid, diff, opts = {}) {
  closeGame(); const p = prof(), G = GAMES[gid];
  if (!opts.daily) { p.diff[gid] = diff; saveDB(); }
  show('scrGame'); $('gIcon').textContent = G.icon; $('gName').textContent = opts.daily ? '🔥 ' + G.name : G.name;
  const dw = $('gDiffs'); dw.innerHTML = '';
  if (!opts.daily) for (let d = 1; d <= 3; d++) { const b = el('button', 'diff' + (d === diff ? ' sel' : ''), `${DIFFS[d].e} ${DIFFS[d].n}`); b.onclick = () => { Snd.tap(); openGame(gid, d); }; dw.appendChild(b); }
  const seed = opts.daily ? todaySeed() * 31 + GAME_ORDER.indexOf(gid) : newSeed();
  const api = {
    status: h => { $('gStatus').innerHTML = h; },
    canUndo: b => { $('gUndo').disabled = !b; },
    win: (stars, msg) => setTimeout(() => winGame(stars, msg), 600)
  };
  CUR = { gid, diff, daily: !!opts.daily, inst: null };
  $('gBody').innerHTML = ''; $('gStatus').innerHTML = '';
  requestAnimationFrame(() => {
    CUR.inst = G.create($('gBody'), diff, makeRng(seed), api);
    if (!p.seenHelp[gid]) { p.seenHelp[gid] = 1; saveDB(); showHelp(); }
  });
}
function showHelp() { if (!CUR) return; const G = GAMES[CUR.gid]; $('helpTitle').textContent = `${G.icon} ${G.name}`; $('helpBody').innerHTML = G.help(CUR.diff); $('ovHelp').classList.remove('hidden'); }
$('helpOk').onclick = () => { Snd.tap(); $('ovHelp').classList.add('hidden'); };
$('gHelp').onclick = () => { Snd.tap(); showHelp(); };
$('gBack').onclick = () => { Snd.tap(); showHub(); };
$('gHint').onclick = () => { if (CUR && CUR.inst) CUR.inst.hint(); };
$('gUndo').onclick = () => { if (CUR && CUR.inst) CUR.inst.undo(); };
$('gRestart').onclick = () => { if (CUR && CUR.inst) { Snd.tap(); CUR.inst.restart(); } };
$('gNew').onclick = () => { if (!CUR) return; Snd.tap(); openGame(CUR.gid, CUR.daily ? 2 : CUR.diff); };
window.addEventListener('resize', () => { if (CUR && CUR.inst && CUR.inst.layout) CUR.inst.layout(); });

function winGame(stars, msg) {
  if (!CUR) return; const p = prof();
  const affordBefore = new Set(SHOP.filter(it => !p.owned.includes(it.id) && it.p <= p.bank).map(it => it.id));
  const bonus = CUR.daily ? 2 : 0;
  p.stars += stars + bonus; p.bank += stars + bonus;
  const s = gstat(p, CUR.gid, CUR.diff); s.n++; s.s += stars;
  if (CUR.daily) p.daily = todayKey();
  saveDB(); Snd.win();
  const fresh = SHOP.filter(it => !p.owned.includes(it.id) && it.p <= p.bank && !affordBefore.has(it.id));
  $('winTitle').textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  $('winStars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('');
  $('winMsg').innerHTML = msg + (bonus ? `<br>🔥 Dag-uitdaging bonus: +${bonus} ⭐` : '');
  $('winReward').innerHTML = `<div class="reward">⭐ Jy het nou <b>${p.bank}</b> sterre om te spandeer.` +
    (fresh.length ? `<br>🛒 Jy kan nou ${fresh.length > 1 ? 'onder andere ' : ''}'n <b>${fresh[0].n.toLowerCase()}</b> ${fresh[0].e} koop!` : '') + '</div>';
  $('winNext').textContent = CUR.daily ? 'Speel nog ▶' : 'Volgende raaisel ▶';
  $('ovWin').classList.remove('hidden');
}
$('winHub').onclick = () => { Snd.tap(); showHub(); };
$('winNext').onclick = () => { Snd.tap(); const c = CUR; openGame(c.gid, c.daily ? (prof().diff[c.gid] || 2) : c.diff); };

/* ---------- full screen ---------- */
const FS_ON = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const FS_OFF = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
const isFS = () => document.fullscreenElement || document.webkitFullscreenElement;
$('btnFS').innerHTML = FS_ON;
$('btnFS').onclick = async () => {
  Snd.init();
  try {
    if (!isFS()) { const d = document.documentElement; if (d.requestFullscreen) await d.requestFullscreen({ navigationUI: 'hide' }); else if (d.webkitRequestFullscreen) d.webkitRequestFullscreen(); else throw 0; try { await screen.orientation.lock('landscape'); } catch (e) { } }
    else { if (document.exitFullscreen) await document.exitFullscreen(); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); }
  } catch (e) { toast('Volskerm werk nie hier nie. Maak die speletjie in sy eie oortjie oop.', 3000); }
};
const fsChange = () => { $('btnFS').innerHTML = isFS() ? FS_OFF : FS_ON; setTimeout(() => { if (CUR && CUR.inst && CUR.inst.layout) CUR.inst.layout(); }, 150); };
document.addEventListener('fullscreenchange', fsChange); document.addEventListener('webkitfullscreenchange', fsChange);
document.addEventListener('pointerdown', () => Snd.init(), { once: true });

/* ---------- boot ---------- */
loadDB(); show('scrTitle');
