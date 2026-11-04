'use strict';
/* =========================================================
   GAME 1: Parkeer in die Skaduwee  (logic – "tents & trees")
   Every tree gets one camper van next to it (up/down/left/right).
   Camper vans may not touch, not even diagonally.
   Numbers show how many vans are in each row / column.
   ========================================================= */
(function () {
  const CFG = { 1: { n: 5, k: [4, 5] }, 2: { n: 6, k: [6, 7] }, 3: { n: 7, k: [9, 10] } };
  const D4 = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const COLORS = ['#2b9fc9', '#e2502d', '#2f9e4a', '#f5b51a', '#8a4fd6', '#ff7ab0'];

  function inB(n, r, c) { return r >= 0 && r < n && c >= 0 && c < n; }

  function matching(n, trees, campers) {
    const T = [...trees], C = [...campers]; if (T.length !== C.length) return false;
    const cIdx = new Map(C.map((v, i) => [v, i])), matchC = new Array(C.length).fill(-1);
    const adj = T.map(t => { const r = Math.floor(t / n), c = t % n; return D4.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => inB(n, a, b)).map(([a, b]) => cIdx.get(a * n + b)).filter(v => v !== undefined); });
    function tryT(t, seen) { for (const ci of adj[t]) { if (seen[ci]) continue; seen[ci] = 1; if (matchC[ci] < 0 || tryT(matchC[ci], seen)) { matchC[ci] = t; return true; } } return false; }
    for (let t = 0; t < T.length; t++) if (!tryT(t, [])) return false;
    return true;
  }

  function countSolutions(n, trees, rows, cols, limit) {
    const cand = new Uint8Array(n * n);
    for (const t of trees) { const r = Math.floor(t / n), c = t % n; for (const [dr, dc] of D4) { const a = r + dr, b = c + dc; if (inB(n, a, b) && !trees.has(a * n + b)) cand[a * n + b] = 1; } }
    const g = new Uint8Array(n * n), rl = rows.slice(), cl = cols.slice(); let count = 0, nodes = 0;
    const touch = (r, c) => (r > 0 && ((c > 0 && g[(r - 1) * n + c - 1]) || g[(r - 1) * n + c] || (c < n - 1 && g[(r - 1) * n + c + 1]))) || (c > 0 && g[r * n + c - 1]);
    function rec(i) {
      if (count >= limit || ++nodes > 400000) return;
      if (i === n * n) {
        if (rl[n - 1] === 0 && cl.every(v => v === 0)) { const cs = []; for (let j = 0; j < n * n; j++) if (g[j]) cs.push(j); if (matching(n, trees, cs)) count++; }
        return;
      }
      const r = Math.floor(i / n), c = i % n;
      if (c === 0 && r > 0) { if (rl[r - 1] !== 0) return; for (let cc = 0; cc < n; cc++) if (cl[cc] > Math.ceil((n - r) / 2)) return; }
      if (cand[i] && rl[r] > 0 && cl[c] > 0 && !touch(r, c)) { g[i] = 1; rl[r]--; cl[c]--; rec(i + 1); g[i] = 0; rl[r]++; cl[c]++; }
      if (rl[r] <= Math.ceil((n - 1 - c) / 2)) rec(i + 1);
    }
    rec(0);
    return nodes > 400000 ? 99 : count;
  }

  function generate(diff, R) {
    const { n, k: [k0, k1] } = CFG[diff]; let fallback = null;
    for (let att = 0; att < 800; att++) {
      const k = R.int(k0, k1), camp = new Set(), tree = new Set();
      for (const i of R.shuffle([...Array(n * n).keys()])) {
        if (camp.size >= k) break; const r = Math.floor(i / n), c = i % n; let ok = true;
        for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = -1; dc <= 1; dc++) if (inB(n, r + dr, c + dc) && camp.has((r + dr) * n + c + dc)) { ok = false; break; }
        if (ok) camp.add(i);
      }
      if (camp.size < k) continue;
      let fail = false;
      for (const i of R.shuffle([...camp])) {
        const r = Math.floor(i / n), c = i % n;
        const opts = D4.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => inB(n, a, b) && !camp.has(a * n + b) && !tree.has(a * n + b));
        if (!opts.length) { fail = true; break; }
        const [a, b] = R.pick(opts); tree.add(a * n + b);
      }
      if (fail) continue;
      const rows = Array(n).fill(0), cols = Array(n).fill(0);
      for (const i of camp) { rows[Math.floor(i / n)]++; cols[i % n]++; }
      const P = { n, trees: tree, sol: camp, rows, cols };
      if (!fallback) fallback = P;
      if (countSolutions(n, tree, rows, cols, 2) === 1) return P;
    }
    return fallback;
  }

  registerGame({
    id: 'skadu', name: 'Parkeer in die Skaduwee', icon: '🚐', blurb: 'Logika',
    help: () => `<p>Elke kampeerwa wil langs 'n boom in die skaduwee staan!</p><ul>
      <li>🌳 Elke boom kry <b>een</b> kampeerwa langs hom – bo, onder, links of regs.</li>
      <li>🚐 Kampeerwaens mag <b>nie aan mekaar raak nie</b> – ook nie skuins nie.</li>
      <li>🔢 Die getalle wys hoeveel kampeerwaens in elke ry en kolom staan.</li>
      <li>👆 Tik een keer vir 'n kampeerwa, twee keer vir gras (geen kampeerwa), en weer om skoon te maak.</li></ul>
      <p>💡 Tip: Begin by rye met 'n <b>0</b> – daar kom net gras!</p>`,
    create(host, diff, R, api) {
      const P = generate(diff, R), n = P.n;
      const vanCol = {}; [...P.sol].forEach((i, j) => vanCol[i] = COLORS[j % COLORS.length]);
      let g = new Uint8Array(n * n), hist = [], hints = 0, done = false, nudged = false, cells = [], rowEls = [], colEls = [];
      const wrap = el('div', 'sk-wrap'); host.appendChild(wrap);

      function layout() {
        const W = host.clientWidth - 20, H = host.clientHeight - 10;
        const S = Math.floor(Math.min(W / (n + 1), H / (n + 1), 96)) - 4;
        wrap.style.gridTemplateColumns = `${S * .7}px repeat(${n}, ${S}px)`;
        wrap.style.gridTemplateRows = `${S * .7}px repeat(${n}, ${S}px)`;
        wrap.querySelectorAll('.sk-num').forEach(e => e.style.fontSize = Math.max(18, S * .42) + 'px');
      }
      function build() {
        wrap.innerHTML = ''; cells = []; rowEls = []; colEls = [];
        wrap.appendChild(el('div'));
        for (let c = 0; c < n; c++) { const e = el('div', 'sk-num', P.cols[c]); colEls.push(e); wrap.appendChild(e); }
        for (let r = 0; r < n; r++) {
          const e = el('div', 'sk-num', P.rows[r]); rowEls.push(e); wrap.appendChild(e);
          for (let c = 0; c < n; c++) {
            const i = r * n + c, ce = el('div', 'sk-cell'); cells[i] = ce;
            if (P.trees.has(i)) { ce.classList.add('tree'); ce.innerHTML = acaciaSVG(); }
            else ce.onclick = () => tap(i);
            wrap.appendChild(ce);
          }
        }
        layout(); paint();
      }
      function paint() {
        const bad = new Set();
        for (let i = 0; i < n * n; i++) {
          if (g[i] !== 1) continue; const r = Math.floor(i / n), c = i % n;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; if (inB(n, r + dr, c + dc) && g[(r + dr) * n + c + dc] === 1) { bad.add(i); } }
          if (!D4.some(([dr, dc]) => inB(n, r + dr, c + dc) && P.trees.has((r + dr) * n + c + dc))) bad.add(i);
        }
        for (let i = 0; i < n * n; i++) {
          if (P.trees.has(i)) continue; const ce = cells[i];
          ce.classList.toggle('grass', g[i] === 2); ce.classList.toggle('bad', bad.has(i));
          const want = g[i] === 1 ? 'van' : '';
          if (ce.dataset.s !== want) { ce.dataset.s = want; ce.innerHTML = want ? camperSVG(vanCol[i] || COLORS[i % COLORS.length]) : ''; }
        }
        for (let r = 0; r < n; r++) { let k = 0; for (let c = 0; c < n; c++) if (g[r * n + c] === 1) k++; rowEls[r].classList.toggle('ok', k === P.rows[r]); rowEls[r].classList.toggle('over', k > P.rows[r]); }
        for (let c = 0; c < n; c++) { let k = 0; for (let r = 0; r < n; r++) if (g[r * n + c] === 1) k++; colEls[c].classList.toggle('ok', k === P.cols[c]); colEls[c].classList.toggle('over', k > P.cols[c]); }
        api.canUndo(hist.length > 0);
        return bad;
      }
      function tap(i) {
        if (done) return; nudged = false; hist.push(g.slice()); g[i] = (g[i] + 1) % 3;
        g[i] === 1 ? Snd.place() : Snd.tap();
        clearHL(); const bad = paint();
        if (bad.has(i) && g[i] === 1) { cells[i].classList.add('shake'); setTimeout(() => cells[i].classList.remove('shake'), 500); }
        check(bad);
      }
      function check(bad) {
        const campers = []; for (let i = 0; i < n * n; i++) if (g[i] === 1) campers.push(i);
        if (bad.size || campers.length !== P.trees.size) return;
        for (let r = 0; r < n; r++) { let k = 0; for (let c = 0; c < n; c++) if (g[r * n + c] === 1) k++; if (k !== P.rows[r]) return; }
        for (let c = 0; c < n; c++) { let k = 0; for (let r = 0; r < n; r++) if (g[r * n + c] === 1) k++; if (k !== P.cols[c]) return; }
        if (!matching(n, P.trees, campers)) return;
        done = true;
        for (let i = 0; i < n * n; i++) if (g[i] === 0) g[i] = 2;
        paint();
        api.win(starsFrom(3, hints), hints ? `Jy het ${hints} wenk${hints > 1 ? 'e' : ''} gebruik.` : 'Sonder enige wenke – slim!');
      }
      function clearHL() { cells.forEach(c => c && c.classList.remove('hint', 'hl')); }
      function flash(list) { clearHL(); list.forEach(i => cells[i].classList.add('hl')); setTimeout(clearHL, 3500); }
      const neighbourVan = i => { const r = Math.floor(i / n), c = i % n; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && inB(n, r + dr, c + dc) && g[(r + dr) * n + c + dc] === 1) return true; return false; };
      const nextToTree = i => { const r = Math.floor(i / n), c = i % n; return D4.some(([dr, dc]) => inB(n, r + dr, c + dc) && P.trees.has((r + dr) * n + c + dc)); };

      build(); api.status('Elke 🌳 kry een 🚐 langsaan. Kampeerwaens mag nie aan mekaar raak nie.');

      return {
        layout, _debug: () => P,
        undo() { if (!hist.length || done) return; g = hist.pop(); Snd.lift(); clearHL(); paint(); },
        restart() { if (done) return; hist.push(g.slice()); g = new Uint8Array(n * n); clearHL(); paint(); },
        hint() {
          if (done) return; Snd.hint();
          const empties = []; for (let i = 0; i < n * n; i++) if (!P.trees.has(i) && g[i] === 0) empties.push(i);
          const wrong = []; for (let i = 0; i < n * n; i++) if (g[i] === 1 && !P.sol.has(i)) wrong.push(i);
          if (wrong.length) { hints++; flash([wrong[0]]); api.status('💡 Hierdie kampeerwa staan op die verkeerde plek.'); return; }
          const wg = []; for (let i = 0; i < n * n; i++) if (g[i] === 2 && P.sol.has(i)) wg.push(i);
          if (wg.length) { hints++; flash([wg[0]]); api.status('💡 Hier moet tog \'n kampeerwa kom!'); return; }
          // gentle nudges – these do not cost stars (asking again straight away reveals a van)
          if (!nudged) { nudged = true;
          for (let r = 0; r < n; r++) { let k = 0, e = []; for (let c = 0; c < n; c++) { const i = r * n + c; if (g[i] === 1) k++; if (!P.trees.has(i) && g[i] === 0) e.push(i); } if (k === P.rows[r] && e.length) { flash(e); api.status(`💡 Hierdie ry het al ${k === 0 ? 'geen kampeerwaens nodig' : 'genoeg kampeerwaens'} – die oop plekke kry gras.`); return; } }
          for (let c = 0; c < n; c++) { let k = 0, e = []; for (let r = 0; r < n; r++) { const i = r * n + c; if (g[i] === 1) k++; if (!P.trees.has(i) && g[i] === 0) e.push(i); } if (k === P.cols[c] && e.length) { flash(e); api.status(`💡 Hierdie kolom het al ${k === 0 ? 'geen kampeerwaens nodig' : 'genoeg kampeerwaens'} – die oop plekke kry gras.`); return; } }
          const far = empties.filter(i => !nextToTree(i)); if (far.length) { flash(far); api.status('💡 Hierdie plekke is nie langs \'n boom nie – hulle kry gras.'); return; }
          const near = empties.filter(neighbourVan); if (near.length) { flash(near); api.status('💡 Plekke rondom \'n kampeerwa kry gras – kampeerwaens mag nie raak nie.'); return; }
          }
          nudged = false;
          const todo = [...P.sol].filter(i => g[i] !== 1);
          if (todo.length) { hints++; const i = todo[Math.floor(R.f() * todo.length)]; hist.push(g.slice()); g[i] = 1; Snd.place(); const bad = paint(); cells[i].classList.add('hint'); api.status('💡 Hier is een kampeerwa vir jou!'); check(bad); }
        }
      };
    }
  });
})();
