'use strict';
/* =========================================================
   GAME 4: Oor die Rivier  (planning – river crossing)
   Get everyone across in the canoe. Some animals eat other
   things if no person is with them.
   ========================================================= */
(function () {
  const CH = {
    jakkals: { n: 'Jakkals', e: '🦊' }, hoender: { n: 'Hoender', e: '🐔' }, mielies: { n: 'Mielies', e: '🌽' },
    hond: { n: 'Hond', e: '🐕' }, vleis: { n: 'Braaivleis', e: '🥩' }, kat: { n: 'Kat', e: '🐈' }, vis: { n: 'Vis', e: '🐟' },
    bobbejaan: { n: 'Bobbejaan', e: '🐒' }, piesangs: { n: 'Piesangs', e: '🍌' }
  };
  const RULES = [['jakkals', 'hoender', 'eet'], ['hoender', 'mielies', 'eet'], ['hond', 'vleis', 'eet'], ['hond', 'kat', 'jaag'], ['kat', 'vis', 'eet'],
    ['bobbejaan', 'piesangs', 'steel'], ['bobbejaan', 'mielies', 'steel'], ['hond', 'hoender', 'jaag']];
  const CFG = {
    1: { n: 3, seats: [2], pa: false, range: [5, 9], minR: 2 },
    2: { n: 4, seats: [2, 3], pa: false, range: [7, 13], minR: 2 },
    3: { n: 5, seats: [2, 3], pa: true, range: [9, 19], minR: 3 }
  };

  function makeModel(items, rowers, seats) {
    const ents = rowers.concat(items), N = ents.length, R = rowers.length;
    const rules = RULES.filter(([a, b]) => items.includes(a) && items.includes(b));
    const idx = Object.fromEntries(ents.map((e, i) => [e, i]));
    function conflict(mask, side) {
      for (let r = 0; r < R; r++) if (((mask >> r) & 1) === side) return null;
      for (const [a, b, v] of rules) if (((mask >> idx[a]) & 1) === side && ((mask >> idx[b]) & 1) === side) return [a, b, v];
      return null;
    }
    const safe = mask => !conflict(mask, 0) && !conflict(mask, 1);
    function bfs(startMask, startBoat) {
      const goal = (1 << N) - 1, key = (m, b) => m * 2 + b, prev = new Map([[key(startMask, startBoat), null]]), q = [[startMask, startBoat]];
      while (q.length) {
        const [m, b] = q.shift();
        if (m === goal) { const path = []; let k = key(m, b); while (prev.get(k)) { const p = prev.get(k); path.unshift(p.move); k = p.k; } return path; }
        const here = []; for (let i = 0; i < N; i++) if (((m >> i) & 1) === b) here.push(i);
        const subs = []; (function rec(s, i) { if (s.length && s.length <= seats && s.some(x => x < R)) subs.push(s.slice()); if (s.length >= seats) return; for (let j = i; j < here.length; j++) { s.push(here[j]); rec(s, j + 1); s.pop(); } })([], 0);
        for (const s of subs) {
          let nm = m; for (const i of s) nm ^= 1 << i;
          const k = key(nm, 1 - b); if (prev.has(k) || !safe(nm)) continue;
          prev.set(k, { k: key(m, b), move: s }); q.push([nm, 1 - b]);
        }
      }
      return null;
    }
    return { ents, N, R, rules, idx, conflict, safe, bfs, seats };
  }
  function generate(diff, Rg) {
    const C = CFG[diff], pool = Object.keys(CH); let best = null;
    for (let att = 0; att < 1500; att++) {
      const items = Rg.shuffle(pool.slice()).slice(0, C.n);
      const nr = RULES.filter(([a, b]) => items.includes(a) && items.includes(b)).length;
      if (nr < C.minR) continue;
      const rowers = C.pa && Rg.chance(.6) ? ['ek', 'pa'] : ['ek'];
      const seats = Rg.pick(C.seats);
      const M = makeModel(items, rowers, seats), sol = M.bfs(0, 0);
      if (!sol) continue;
      M.items = items; M.opt = sol.length;
      if (sol.length >= C.range[0] && sol.length <= C.range[1]) return M;
      if (!best || sol.length > best.opt) best = M;
    }
    return best;
  }

  registerGame({
    id: 'rivier', name: 'Oor die Rivier', icon: '🛶', blurb: 'Beplanning',
    help: () => `<p>Almal moet met die kano oor die rivier na die kampeerwa toe.</p><ul>
      <li>👆 Tik op iemand om hom in die kano te sit (of weer uit te haal).</li>
      <li>🛶 Iemand moet <b>roei</b> – net mense kan roei.</li>
      <li>⚠️ Pasop! As jy nie daar is nie, <b>eet</b> sommige diere ander goed op.</li>
      <li>Druk <b>Roei!</b> om oor te gaan.</li>
      <li>⭐ Hoe minder keer jy oorroei, hoe meer sterre!</li></ul>`,
    create(host, diff, Rg, api) {
      const M = generate(diff, Rg), p = prof();
      const info = id => id === 'ek' ? { n: p.name, svg: avatarSVG(p.av) } : id === 'pa' ? { n: 'Pa', svg: avatarSVG({ g: 'seun', skin: p.av.skin, hair: 0, pa: true }) } : { n: CH[id].n, e: CH[id].e };
      let loc = {}, boat = 'L', hist = [], hints = 0, cross = 0, moving = false, done = false, hintSet = new Set();
      M.ents.forEach(e => loc[e] = 'L'); loc.ek = 'B';

      const scene = el('div', 'rv-scene');
      const L = el('div', 'rv-bank L'), Rb = el('div', 'rv-bank R'), river = el('div', 'rv-river'), bt = el('div', 'rv-boat');
      const rules = el('div', 'rv-rules'), row = el('div', 'rv-row');
      scene.append(river, L, Rb, bt, rules, row); host.appendChild(scene);
      M.rules.forEach(([a, b, v]) => rules.appendChild(el('div', 'rule', `${CH[a].e} ${v} ${CH[b].e}`)));
      const rowB = el('button', 'btn green', '🛶 Roei!'); rowB.onclick = rowAcross;
      row.append(el('div', 'rv-info', `Plek vir ${M.seats} in die kano · ${M.R > 1 ? 'Jy en Pa kan roei' : 'Net jy kan roei'}`), rowB);

      const snap = () => JSON.stringify({ loc, boat, cross });
      const isRower = e => e === 'ek' || e === 'pa';
      function tok(e) {
        const I = info(e), t = el('div', 'tok', `<div class="e">${I.svg || I.e}</div><div class="t">${I.n}</div>`);
        if (hintSet.has(e)) t.classList.add('hint');
        const can = !done && !moving && (loc[e] === 'B' || loc[e] === boat);
        if (can && loc[e] !== 'B') t.classList.add('can'); if (!can && loc[e] !== 'B') t.classList.add('dim');
        t.onclick = () => tapEnt(e, t); t.dataset.e = e; return t;
      }
      function render() {
        L.innerHTML = '<div class="lab">⛰️ Hierdie kant</div>'; Rb.innerHTML = '<div class="lab">🚐 Kampkant</div>';
        const vw = el('div'); vw.innerHTML = camperSVG('#2b9fc9'); Object.assign(vw.style, { position: 'absolute', right: '8px', bottom: '6px', width: '42%', opacity: '.9', pointerEvents: 'none' }); Rb.appendChild(vw);
        bt.innerHTML = '<div class="hull"></div>';
        for (const e of M.ents) { const t = tok(e); if (loc[e] === 'L') L.appendChild(t); else if (loc[e] === 'R') Rb.appendChild(t); else { const s = el('div', 'seat'); s.appendChild(t); bt.appendChild(s); } }
        bt.style.left = boat === 'L' ? '30.5%' : 'calc(69.5% - min(26%, 250px))';
        rowB.disabled = !M.ents.some(e => isRower(e) && loc[e] === 'B') || moving || done;
        api.canUndo(hist.length > 0);
      }
      function tapEnt(e, t) {
        if (moving || done) return;
        if (loc[e] === 'B') { hist.push(snap()); loc[e] = boat; Snd.lift(); hintSet.clear(); render(); return; }
        if (loc[e] !== boat) { Snd.bad(); t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 450); toast('Die kano is aan die ander kant!', 1400); return; }
        if (M.ents.filter(x => loc[x] === 'B').length >= M.seats) { Snd.bad(); toast(`Die kano is vol – net plek vir ${M.seats}!`, 1500); return; }
        hist.push(snap()); loc[e] = 'B'; Snd.place(); render();
      }
      function maskOf() { let m = 0; M.ents.forEach((e, i) => { const side = loc[e] === 'B' ? boat : loc[e]; if (side === 'R') m |= 1 << i; }); return m; }
      function rowAcross() {
        if (moving || done) return;
        const passengers = M.ents.filter(e => loc[e] === 'B'); if (!passengers.some(isRower)) return;
        let after = maskOf(); passengers.forEach(e => after ^= 1 << M.idx[e]);
        const c = M.conflict(after, boat === 'L' ? 0 : 1);
        if (c) {
          Snd.bad(); const [a, b, v] = c;
          api.status(`⚠️ Wag! As jy weggaan, ${v} die ${CH[a].n.toLowerCase()} die ${CH[b].n.toLowerCase()}!`);
          scene.querySelectorAll('.tok').forEach(t => { if (t.dataset.e === a || t.dataset.e === b) t.classList.add('bad'); });
          return;
        }
        hist.push(snap()); moving = true; hintSet.clear(); cross++; Snd.splash();
        boat = boat === 'L' ? 'R' : 'L'; render();
        setTimeout(() => {
          moving = false; for (const e of M.ents) if (loc[e] === 'B' && !isRower(e)) loc[e] = boat;
          Snd.place(); render(); status();
          if (M.items.every(e => loc[e] === 'R')) {
            done = true; render();
            const extra = cross - M.opt, base = extra <= 0 ? 3 : extra <= 2 ? 2 : 1;
            api.win(starsFrom(base, hints), `Jy het ${cross} keer oorgeroei. ` + (extra <= 0 ? 'Dit is die beste moontlike plan!' : `Dit kan in ${M.opt} keer – kan jy dit regkry?`));
          }
        }, 1050);
      }
      function status() { api.status(`Kry almal veilig oor na die kampeerwa. Kere oorgeroei: <b>${cross}</b>`); }

      render(); status();
      return {
        layout() { },
        undo() { if (moving || done || !hist.length) return; const s = JSON.parse(hist.pop()); loc = s.loc; boat = s.boat; cross = s.cross; hintSet.clear(); Snd.lift(); render(); status(); },
        restart() { if (moving || done) return; hist.push(snap()); M.ents.forEach(e => loc[e] = 'L'); loc.ek = 'B'; boat = 'L'; cross = 0; hintSet.clear(); render(); status(); },
        hint() {
          if (moving || done) return;
          const path = M.bfs(maskOf(), boat === 'L' ? 0 : 1); if (!path || !path.length) return;
          hints++; Snd.hint();
          const mv = path[0].map(i => M.ents[i]); hintSet = new Set(mv);
          hist.push(snap());
          for (const e of M.ents) if (loc[e] === 'B' && !hintSet.has(e)) loc[e] = boat;
          for (const e of mv) loc[e] = 'B';
          render();
          const items = mv.filter(e => !isRower(e)).map(e => CH[e].n.toLowerCase());
          api.status('💡 ' + (items.length ? `Neem die ${items.join(' en die ')} saam. Druk nou Roei!` : 'Roei sonder passasiers oor. Druk nou Roei!') + ` (Nog ${path.length} keer oorroei)`);
        }
      };
    }
  });
})();
