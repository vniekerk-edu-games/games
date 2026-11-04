'use strict';
/* =========================================================
   GAME 2: Pak jou Stapsak  (spatial packing puzzle)
   Fit every item into the hiking backpack with no gaps.
   Puzzles are made by cutting the bag into pieces, so a
   solution always exists.
   ========================================================= */
(function () {
  const ITEMS = [
    ['Waterbottel', '💧', '#5ec8ff'], ['Toebroodjies', '🥪', '#f5b51a'], ['Biltong', '🥩', '#d0694a'], ['Kompas', '🧭', '#ff8a7a'],
    ['Kaart', '🗺️', '#7ee08a'], ['Flits', '🔦', '#ffe26a'], ['Pet', '🧢', '#6aa8ff'], ['Sonroom', '🧴', '#ffb86b'],
    ['Appel', '🍎', '#ff9a9a'], ['Pleisters', '🩹', '#ffc0d6'], ['Verkyker', '🔭', '#b58cff'], ['Reënbaadjie', '🧥', '#4fbf6a'],
    ['Beskuit', '🍪', '#e0b060'], ['Kamera', '📷', '#b9afa3'], ['Kaartspel', '🃏', '#ff9fbf'], ['Droëwors', '🌭', '#e07a5a'],
    ['Fluitjie', '📣', '#ffd84d'], ['Bal', '⚽', '#e6eef7']
  ];
  const CFG = {
    1: { W: 4, H: 4, min: 2, max: 4, pc: [4, 6], rot: false, decoy: false },
    2: { W: 5, H: 5, min: 2, max: 5, pc: [6, 8], rot: true, decoy: false },
    3: { W: 6, H: 5, min: 3, max: 5, pc: [7, 8], rot: true, decoy: true }
  };
  const norm = cells => { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => [x - mx, y - my]); };
  const rot90 = cells => norm(cells.map(([x, y]) => [-y, x]));
  const rotN = (cells, r) => { let c = cells; for (let i = 0; i < r; i++) c = rot90(c); return c; };
  const dims = cells => [Math.max(...cells.map(c => c[0])) + 1, Math.max(...cells.map(c => c[1])) + 1];

  function partition(cfg, R) {
    const { W, H, min, max, pc } = cfg;
    const nb = i => { const x = i % W, y = Math.floor(i / W), o = []; if (x > 0) o.push(i - 1); if (x < W - 1) o.push(i + 1); if (y > 0) o.push(i - W); if (y < H - 1) o.push(i + W); return o; };
    for (let att = 0; att < 500; att++) {
      const owner = Array(W * H).fill(-1), pieces = [];
      while (true) {
        const free = []; for (let i = 0; i < W * H; i++) if (owner[i] < 0) free.push(i);
        if (!free.length) break;
        let best = Infinity, cand = [];
        for (const i of free) { const k = nb(i).filter(j => owner[j] < 0).length; if (k < best) { best = k; cand = [i]; } else if (k === best) cand.push(i); }
        const start = R.pick(cand), id = pieces.length, target = R.int(min, max), reg = [start]; owner[start] = id;
        while (reg.length < target) {
          const fr = [...new Set(reg.flatMap(nb).filter(j => owner[j] < 0))]; if (!fr.length) break;
          const j = R.pick(fr); owner[j] = id; reg.push(j);
        }
        pieces.push(reg);
      }
      // merge pieces that are too small into a neighbour
      let ok = true;
      for (let p = 0; p < pieces.length; p++) {
        if (!pieces[p].length || pieces[p].length >= min) continue;
        const adj = [...new Set(pieces[p].flatMap(nb).map(j => owner[j]).filter(o => o !== p))].filter(o => pieces[o].length + pieces[p].length <= max + 1).sort((a, b) => pieces[a].length - pieces[b].length);
        if (!adj.length) { ok = false; break; }
        const q = adj[0]; pieces[p].forEach(j => owner[j] = q); pieces[q] = pieces[q].concat(pieces[p]); pieces[p] = [];
      }
      const final = pieces.filter(p => p.length);
      if (!ok || final.length < pc[0] || final.length > pc[1]) continue;
      if (final.some(p => p.length > max + 1)) continue;
      return final.map(p => p.map(i => [i % W, Math.floor(i / W)]));
    }
    return null;
  }
  function randomShape(n, R) {
    const set = [[0, 0]]; const has = (x, y) => set.some(c => c[0] === x && c[1] === y);
    while (set.length < n) { const [x, y] = R.pick(set); const [dx, dy] = R.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); if (!has(x + dx, y + dy)) set.push([x + dx, y + dy]); }
    return norm(set);
  }

  registerGame({
    id: 'stapsak', name: 'Pak jou Stapsak', icon: '🎒', blurb: 'Ruimtelik',
    help: d => `<p>Ons gaan stap! Pak al jou goed in die stapsak.</p><ul>
      <li>✋ <b>Sleep</b> 'n ding na die sak.</li>
      ${d > 1 ? '<li>🔄 <b>Tik</b> op \'n ding om dit te draai.</li>' : ''}
      <li>↩️ Tik op 'n ding in die sak om dit terug te haal.</li>
      <li>🎒 Die sak moet heeltemal vol wees – <b>geen gaatjies</b> nie!</li>
      ${d === 3 ? '<li>🚐 Pasop: <b>een ding pas nie</b> – dit bly in die kampeerwa!</li>' : ''}</ul>`,
    create(host, diff, R, api) {
      const cfg = CFG[diff], W = cfg.W, H = cfg.H;
      let parts = partition(cfg, R); if (!parts) parts = partition(CFG[1], R);
      const items = R.shuffle(ITEMS.slice());
      const pieces = parts.map((cells, i) => {
        const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
        return { id: i, item: items[i], base: norm(cells), solX: mx, solY: my, rot: cfg.rot ? R.int(0, 3) : 0, at: null };
      });
      if (cfg.decoy) pieces.push({ id: pieces.length, item: items[pieces.length], base: randomShape(R.int(3, 4), R), rot: R.int(0, 3), at: null, decoy: true });
      R.shuffle(pieces);
      let hist = [], hints = 0, done = false, S = 60, T = 36;
      const area = el('div', 'ss-area'), bag = el('div', 'ss-bag'), grid = el('div', 'ss-grid'), tray = el('div', 'ss-tray');
      bag.appendChild(grid); area.appendChild(bag); area.appendChild(tray); host.appendChild(area);

      const cellsOf = p => rotN(p.base, p.rot);
      function occ(except) { const o = Array(W * H).fill(-1); for (const p of pieces) if (p.at && p !== except) for (const [x, y] of cellsOf(p)) o[(p.at[1] + y) * W + p.at[0] + x] = p.id; return o; }
      function fits(p, rot, ax, ay) { const o = occ(p); return rotN(p.base, rot).every(([x, y]) => { const X = ax + x, Y = ay + y; return X >= 0 && Y >= 0 && X < W && Y < H && o[Y * W + X] < 0; }); }
      const snap = () => pieces.map(p => ({ rot: p.rot, at: p.at && p.at.slice() }));
      const restore = s => s.forEach((v, i) => { pieces[i].rot = v.rot; pieces[i].at = v.at; });

      function pieceEl(p, unit) {
        const cs = cellsOf(p), [w, h] = dims(cs), e = el('div', 'ss-piece'); e.style.width = w * unit + 'px'; e.style.height = h * unit + 'px';
        const gap = Math.max(1, unit * .04);
        for (const [x, y] of cs) { const c = el('div', 'pc'); Object.assign(c.style, { left: x * unit + gap + 'px', top: y * unit + gap + 'px', width: unit - gap * 2 + 'px', height: unit - gap * 2 + 'px', background: p.item[2] }); e.appendChild(c); }
        const cx = cs.reduce((a, c) => a + c[0], 0) / cs.length, cy = cs.reduce((a, c) => a + c[1], 0) / cs.length;
        const best = cs.reduce((b, c) => Math.hypot(c[0] - cx, c[1] - cy) < Math.hypot(b[0] - cx, b[1] - cy) ? c : b);
        const l = el('div', 'lbl', p.item[1]); Object.assign(l.style, { left: best[0] * unit + 'px', top: best[1] * unit + 'px', width: unit + 'px', height: unit + 'px', fontSize: unit * .55 + 'px' }); e.appendChild(l);
        return e;
      }
      function layout() {
        const aw = host.clientWidth, ah = host.clientHeight;
        S = Math.floor(Math.min((aw * .5 - 60) / W, (ah - 70) / H, 88));
        T = Math.max(26, Math.floor(S * .58));
        render();
      }
      function render() {
        grid.innerHTML = ''; grid.style.gridTemplateColumns = `repeat(${W}, ${S}px)`; grid.style.gridTemplateRows = `repeat(${H}, ${S}px)`;
        for (let i = 0; i < W * H; i++) grid.appendChild(el('div', 'ss-slot'));
        tray.innerHTML = ''; tray.style.maxWidth = Math.max(260, host.clientWidth - (W * S + 120)) + 'px';
        let left = 0;
        for (const p of pieces) {
          if (p.at) {
            const e = pieceEl(p, S); e.classList.add('ss-placed'); e.style.left = p.at[0] * S + 'px'; e.style.top = p.at[1] * S + 'px';
            e.onpointerdown = ev => down(ev, p, e, S); grid.appendChild(e);
          } else {
            left++; const box = el('div', 'ss-box');
            const e = pieceEl(p, T); e.onpointerdown = ev => down(ev, p, e, T); box.appendChild(e);
            box.appendChild(el('div', 'ss-name', p.item[0])); tray.appendChild(box);
          }
        }
        if (!left) tray.appendChild(el('div', 'ttl', '🎒 Alles is ingepak!'));
        else tray.insertBefore(el('div', 'ttl', cfg.rot ? 'Sleep na die sak · Tik om te draai' : 'Sleep na die sak'), tray.firstChild);
        api.canUndo(hist.length > 0);
      }

      let drag = null;
      function down(ev, p, e, unit) {
        if (done) return; ev.preventDefault(); Snd.init();
        const r = e.getBoundingClientRect();
        drag = { p, e, unit, sx: ev.clientX, sy: ev.clientY, ox: (ev.clientX - r.left) / unit, oy: (ev.clientY - r.top) / unit, moving: false, fl: null, prev: [], ax: null, ay: null, pid: ev.pointerId };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      }
      function clearPrev() { if (drag) { drag.prev.forEach(x => x.remove()); drag.prev = []; } }
      function move(ev) {
        if (!drag || ev.pointerId !== drag.pid) return;
        if (!drag.moving && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 10) return;
        if (!drag.moving) { drag.moving = true; drag.e.classList.add('ghost'); drag.fl = pieceEl(drag.p, S); drag.fl.classList.add('drag'); document.body.appendChild(drag.fl); Snd.lift(); }
        const L = ev.clientX - drag.ox * S, Tp = ev.clientY - drag.oy * S;
        drag.fl.style.left = L + 'px'; drag.fl.style.top = Tp + 'px';
        const gr = grid.getBoundingClientRect(), ax = Math.round((L - gr.left) / S), ay = Math.round((Tp - gr.top) / S);
        if (ax !== drag.ax || ay !== drag.ay) {
          drag.ax = ax; drag.ay = ay; clearPrev();
          if (fits(drag.p, drag.p.rot, ax, ay)) for (const [x, y] of cellsOf(drag.p)) { const pv = el('div', 'ss-prev'); Object.assign(pv.style, { left: (ax + x) * S + 'px', top: (ay + y) * S + 'px', width: S + 'px', height: S + 'px', background: 'rgba(126,224,138,.55)' }); grid.appendChild(pv); drag.prev.push(pv); }
        }
      }
      function up(ev) {
        if (!drag || ev.pointerId !== drag.pid) return;
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        const d = drag; drag = null; clearPrev2(d);
        if (d.moving) {
          if (d.fl) d.fl.remove();
          if (d.ax !== null && fits(d.p, d.p.rot, d.ax, d.ay)) { hist.push(snap()); d.p.at = [d.ax, d.ay]; Snd.place(); }
          else if (d.p.at) { hist.push(snap()); d.p.at = null; Snd.lift(); }
          else Snd.tap();
        } else {
          if (d.p.at) { hist.push(snap()); d.p.at = null; Snd.lift(); }
          else if (cfg.rot) { hist.push(snap()); d.p.rot = (d.p.rot + 1) % 4; Snd.rotate(); }
          else { toast('Sleep dit na die stapsak 🎒', 1500); }
        }
        render(); check();
      }
      function clearPrev2(d) { d.prev.forEach(x => x.remove()); }
      function check() {
        if (occ(null).every(v => v >= 0)) {
          done = true; const left = pieces.find(p => !p.at);
          api.win(starsFrom(3, hints), (left ? `Die ${left.item[0].toLowerCase()} ${left.item[1]} bly in die kampeerwa. ` : '') + (hints ? `Jy het ${hints} wenk${hints > 1 ? 'e' : ''} gebruik.` : 'Sonder wenke – slim!'));
        }
      }

      layout();
      api.status(cfg.decoy ? 'Pak die stapsak heeltemal vol. Een ding pas nie – dit bly agter!' : 'Pak alles in die stapsak – geen gaatjies nie!');
      return {
        layout,
        undo() { if (!hist.length || done) return; restore(hist.pop()); Snd.lift(); render(); },
        restart() { if (done) return; hist.push(snap()); pieces.forEach(p => p.at = null); render(); },
        hint() {
          if (done) return;
          const real = pieces.filter(p => !p.decoy && p.solX !== undefined);
          const wrong = real.filter(p => !(p.at && p.rot === 0 && p.at[0] === p.solX && p.at[1] === p.solY));
          const p = wrong.find(q => !q.at) || wrong[0]; if (!p) return;
          hist.push(snap()); hints++; Snd.hint();
          const target = new Set(p.base.map(([x, y]) => (p.solY + y) * W + p.solX + x));
          for (const q of pieces) if (q !== p && q.at && cellsOf(q).some(([x, y]) => target.has((q.at[1] + y) * W + q.at[0] + x))) q.at = null;
          p.rot = 0; p.at = [p.solX, p.solY]; render();
          const pe = grid.querySelectorAll('.ss-placed'); pe.forEach(e => { if (e.style.left === p.at[0] * S + 'px' && e.style.top === p.at[1] * S + 'px') e.style.animation = 'glow 1s 3'; });
          api.status(`💡 Die ${p.item[0].toLowerCase()} ${p.item[1]} pas hier!`); check();
        }
      };
    }
  });
})();
