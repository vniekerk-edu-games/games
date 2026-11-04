'use strict';
/* =========================================================
   GAME 5: Hout vir die Vuur  (push puzzle – thinking ahead)
   Push every log onto a fire pit. Logs can only be pushed,
   never pulled. Puzzles are built backwards from the solved
   state, then checked by a solver, so they can always be done.
   ========================================================= */
(function () {
  const CFG = {
    1: { W: 5, H: 5, boxes: 2, walls: [2, 4], push: [4, 9] },
    2: { W: 6, H: 6, boxes: 2, walls: [4, 7], push: [7, 15] },
    3: { W: 7, H: 6, boxes: 3, walls: [5, 8], push: [10, 22] }
  };
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ARW = ['⬆', '➡', '⬇', '⬅'];

  function reach(W, H, wall, boxSet, start) {
    const v = new Uint8Array(W * H), q = [start]; v[start] = 1;
    while (q.length) {
      const i = q.pop(), x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (v[j] || wall[j] || boxSet.has(j)) continue; v[j] = 1; q.push(j); }
    }
    return v;
  }
  function deadCells(W, H, wall, goals) {
    const d = new Uint8Array(W * H), blk = (x, y) => x < 0 || y < 0 || x >= W || y >= H || wall[y * W + x];
    for (let i = 0; i < W * H; i++) { if (wall[i] || goals.includes(i)) continue; const x = i % W, y = (i / W) | 0; if ((blk(x, y - 1) || blk(x, y + 1)) && (blk(x - 1, y) || blk(x + 1, y))) d[i] = 1; }
    return d;
  }
  // breadth-first search on pushes → shortest list of pushes {from, d}
  function solve(P, boxes, player, limit = 120000) {
    const { W, H, wall, goals } = P, gs = new Set(goals), dead = deadCells(W, H, wall, goals);
    const st0 = boxes.slice().sort((a, b) => a - b), r0 = reach(W, H, wall, new Set(st0), player);
    const k0 = st0.join(',') + '|' + r0.indexOf(1);
    if (st0.every(b => gs.has(b))) return [];
    const seen = new Map([[k0, null]]); let frontier = [{ bs: st0, p: player, k: k0 }], nodes = 0;
    while (frontier.length) {
      const next = [];
      for (const s of frontier) {
        const bset = new Set(s.bs), r = reach(W, H, wall, bset, s.p);
        for (const b of s.bs) {
          const bx = b % W, by = (b / W) | 0;
          for (let d = 0; d < 4; d++) {
            const [dx, dy] = DIRS[d], px = bx - dx, py = by - dy, tx = bx + dx, ty = by + dy;
            if (px < 0 || py < 0 || px >= W || py >= H || tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
            const pi = py * W + px, ti = ty * W + tx;
            if (!r[pi] || wall[ti] || bset.has(ti) || dead[ti]) continue;
            const nbs = s.bs.map(c => c === b ? ti : c).sort((a, c) => a - c);
            const nr = reach(W, H, wall, new Set(nbs), b), k = nbs.join(',') + '|' + nr.indexOf(1);
            if (seen.has(k)) continue;
            seen.set(k, { prev: s.k, push: { from: b, d } });
            if (nbs.every(c => gs.has(c))) { const out = []; let kk = k; while (seen.get(kk)) { const e = seen.get(kk); out.unshift(e.push); kk = e.prev; } return out; }
            if (++nodes > limit) return null;
            next.push({ bs: nbs, p: b, k });
          }
        }
      }
      frontier = next;
    }
    return null;
  }
  function generate(diff, R) {
    const C = CFG[diff], { W, H } = C; let best = null;
    for (let att = 0; att < 400; att++) {
      const wall = new Uint8Array(W * H), nw = R.int(C.walls[0], C.walls[1]), kinds = {};
      for (let k = 0; k < nw; k++) { const i = R.int(0, W * H - 1); wall[i] = 1; kinds[i] = R.pick(['rock', 'aloe', 'bush']); }
      const floor = []; for (let i = 0; i < W * H; i++) if (!wall[i]) floor.push(i);
      const v = reach(W, H, wall, new Set(), floor[0]); if (floor.some(i => !v[i])) continue;
      const dead0 = deadCells(W, H, wall, []);
      const cand = R.shuffle(floor.filter(i => !dead0[i])); if (cand.length < C.boxes + 3) continue;
      const goals = cand.slice(0, C.boxes), boxes = goals.slice(); let player = cand[C.boxes];
      for (let step = 0; step < 500; step++) {
        const [dx, dy] = DIRS[R.int(0, 3)], px = player % W, py = (player / W) | 0, nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx; if (wall[ni] || boxes.includes(ni)) continue;
        const bx = px - dx, by = py - dy, bi = bx >= 0 && by >= 0 && bx < W && by < H ? by * W + bx : -1, bIdx = boxes.indexOf(bi);
        if (bIdx >= 0 && R.chance(.65)) boxes[bIdx] = player;
        player = ni;
      }
      if (boxes.some(b => goals.includes(b))) continue;
      const P = { W, H, wall, kinds, goals };
      const sol = solve(P, boxes, player, 60000); if (!sol) continue;
      Object.assign(P, { boxes, player, sol, opt: sol.length });
      if (sol.length >= C.push[0] && sol.length <= C.push[1]) return P;
      if (sol.length <= C.push[1] && (!best || sol.length > best.opt)) best = P;
    }
    return best;
  }

  const logSVG = lit => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${lit ? `<path d="M22 66 Q22 22 40 38 Q44 6 56 32 Q66 12 70 40 Q82 30 78 66Z" fill="#ff8a1a"><animate attributeName="d" values="M22 66 Q22 22 40 38 Q44 6 56 32 Q66 12 70 40 Q82 30 78 66Z;M22 66 Q28 26 42 40 Q50 10 58 34 Q70 18 72 42 Q86 36 78 66Z;M22 66 Q22 22 40 38 Q44 6 56 32 Q66 12 70 40 Q82 30 78 66Z" dur=".7s" repeatCount="indefinite"/></path><path d="M34 66 Q36 40 46 50 Q50 30 56 48 Q64 40 66 66Z" fill="#ffd84d"/>` : ''}
    <ellipse cx="50" cy="84" rx="38" ry="6" fill="rgba(0,0,0,.25)"/>
    <rect x="12" y="56" width="76" height="28" rx="14" fill="#8a5a2b"/><rect x="12" y="56" width="76" height="9" rx="5" fill="#a8743f"/>
    <ellipse cx="80" cy="70" rx="9" ry="14" fill="#e2b77a" stroke="#8a5a2b" stroke-width="2"/><ellipse cx="80" cy="70" rx="4" ry="7" fill="none" stroke="#b07a3a" stroke-width="2"/>
    <path d="M28 62 L40 62 M50 76 L64 76" stroke="#6b4220" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  const pitSVG = () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="62" rx="36" ry="20" fill="#5a4a3a"/>
    ${[[18, 60], [30, 48], [50, 44], [70, 48], [82, 60], [70, 74], [50, 78], [30, 74]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="7" fill="#9a8f84" stroke="#6b6159" stroke-width="2"/>`).join('')}
    <circle cx="44" cy="62" r="3" fill="#ff6a1a" opacity=".7"/><circle cx="56" cy="64" r="2.5" fill="#ff8a1a" opacity=".7"/></svg>`;

  registerGame({
    id: 'hout', name: 'Hout vir die Vuur', icon: '🪵', blurb: 'Vooruit dink',
    help: () => `<p>Dit is braaityd! Stoot die houtstompe na die vuurplekke.</p><ul>
      <li>👆 Gebruik die pyltjies, of tik langs jouself om te stap. Tik verder weg om daarheen te loop.</li>
      <li>🪵 Loop teen 'n stomp om dit te <b>stoot</b>. Jy kan net stoot – <b>nie trek nie</b>!</li>
      <li>🔥 Elke vuurplek moet 'n stomp kry.</li>
      <li>⚠️ Pasop vir hoeke – 'n stomp in 'n hoek kan nie weer uitkom nie. Druk ↶ as dit gebeur.</li>
      <li>⭐ Hoe minder keer jy stoot, hoe meer sterre!</li></ul>`,
    create(host, diff, R, api) {
      const P = generate(diff, R), { W, H, wall, goals } = P, gs = new Set(goals), dead = deadCells(W, H, wall, goals);
      let boxes = P.boxes.slice(), player = P.player, pushes = 0, hist = [], hints = 0, done = false, busy = false, hintShown = null, face = 1;
      const av = prof().av;
      const area = el('div', 'ht-area'), board = el('div', 'ht-board'), pad = el('div', 'ht-pad');
      area.append(board, pad); host.appendChild(area);
      const pl = el('div', 'ht-player', avatarSVG(av, 'width="100%" height="100%"'));
      let S = 70, logEls = [], cellEls = [], hintEls = [];

      [[null, 0, null], [3, null, 1], [null, 2, null]].forEach(row => row.forEach(d => {
        const b = el('button', d === null ? 'ht-k blank' : 'ht-k', d === null ? '' : ARW[d]);
        if (d !== null) b.onclick = () => { if (!busy) step(d); };
        pad.appendChild(b);
      }));
      pad.children[4].textContent = '🔥'; pad.children[4].classList.add('mid');

      function layout() {
        const aw = host.clientWidth - 260, ah = host.clientHeight - 16;
        S = Math.floor(Math.min(aw / W, ah / H, 96));
        board.style.width = W * S + 16 + 'px'; board.style.height = H * S + 16 + 'px';
        cellEls.forEach((c, i) => { Object.assign(c.style, { left: 8 + (i % W) * S + 'px', top: 8 + ((i / W) | 0) * S + 'px', width: S + 'px', height: S + 'px' }); });
        pl.style.width = pl.style.height = S * .92 + 'px';
        render(false);
      }
      function build() {
        board.innerHTML = ''; cellEls = [];
        for (let i = 0; i < W * H; i++) {
          const c = el('div', 'ht-cell' + (((i % W) + ((i / W) | 0)) % 2 ? ' alt' : ''));
          if (wall[i]) { c.classList.add('wall'); c.innerHTML = P.kinds[i] === 'rock' ? rockSVG() : P.kinds[i] === 'aloe' ? aloeSVG() : bushSVG(); }
          else if (gs.has(i)) { c.classList.add('pit'); c.innerHTML = pitSVG(); }
          c.onclick = () => tapCell(i); cellEls.push(c); board.appendChild(c);
        }
        logEls = boxes.map(() => { const e = el('div', 'ht-log'); board.appendChild(e); return e; });
        board.appendChild(pl);
      }
      function pos(e, i, sc = 1) { const off = S * (1 - sc) / 2; e.style.left = 8 + (i % W) * S + off + 'px'; e.style.top = 8 + ((i / W) | 0) * S + off + 'px'; }
      function render(anim = true) {
        [pl, ...logEls].forEach(e => e.style.transition = anim ? '' : 'none');
        boxes.forEach((b, k) => { const e = logEls[k]; e.style.width = e.style.height = S + 'px'; pos(e, b); const lit = gs.has(b); if (e.dataset.lit !== String(lit)) { e.dataset.lit = String(lit); e.innerHTML = logSVG(lit); } });
        pos(pl, player, .92); pl.style.transform = `scaleX(${face})`;
        api.canUndo(hist.length > 0);
        const onGoal = boxes.filter(b => gs.has(b)).length;
        api.status(`🔥 Vure aan die brand: <b>${onGoal} / ${goals.length}</b> · Kere gestoot: <b>${pushes}</b>`);
      }
      function clearHint() { hintEls.forEach(e => e.remove()); hintEls = []; hintShown = null; }
      function step(d, quiet) {
        if (done) return false;
        const [dx, dy] = DIRS[d], x = player % W, y = (player / W) | 0, nx = x + dx, ny = y + dy;
        if (dx) face = dx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || wall[ny * W + nx]) { if (!quiet) { Snd.bad(); pl.classList.add('shake'); setTimeout(() => pl.classList.remove('shake'), 400); } render(); return false; }
        const ni = ny * W + nx, bk = boxes.indexOf(ni);
        if (bk >= 0) {
          const tx = nx + dx, ty = ny + dy;
          if (tx < 0 || ty < 0 || tx >= W || ty >= H || wall[ty * W + tx] || boxes.includes(ty * W + tx)) { if (!quiet) Snd.bad(); return false; }
          hist.push({ boxes: boxes.slice(), player, pushes }); clearHint();
          boxes[bk] = ty * W + tx; player = ni; pushes++; Snd.push();
          if (gs.has(boxes[bk])) Snd.fire();
          render(); afterPush(bk); return true;
        }
        if (!quiet) hist.push({ boxes: boxes.slice(), player, pushes });
        player = ni; Snd.step(); render(); return true;
      }
      function afterPush(bk) {
        if (boxes.every(b => gs.has(b))) {
          done = true; const extra = pushes - P.opt, base = extra <= 2 ? 3 : extra <= 8 ? 2 : 1;
          setTimeout(() => api.win(starsFrom(base, hints), `Jy het ${pushes} keer gestoot. ` + (extra <= 0 ? 'Dit is die beste moontlike!' : `Dit kan met ${P.opt} keer – kan jy dit regkry?`)), 300);
          return;
        }
        if (dead[boxes[bk]]) { api.status('⚠️ O nee! Daardie stomp sit vas in \'n hoek. Druk ↶ om terug te gaan.'); logEls[bk].classList.add('shake'); setTimeout(() => logEls[bk].classList.remove('shake'), 500); }
      }
      function path(to) {
        const prev = new Map([[player, -1]]), q = [player], bs = new Set(boxes);
        while (q.length) { const i = q.shift(); if (i === to) break; const x = i % W, y = (i / W) | 0; for (let d = 0; d < 4; d++) { const nx = x + DIRS[d][0], ny = y + DIRS[d][1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (prev.has(j) || wall[j] || bs.has(j)) continue; prev.set(j, [i, d]); q.push(j); } }
        if (!prev.has(to)) return null; const out = []; let k = to; while (k !== player) { const [p, d] = prev.get(k); out.unshift(d); k = p; } return out;
      }
      async function walk(ds) {
        if (!ds || !ds.length) return; busy = true; hist.push({ boxes: boxes.slice(), player, pushes });
        for (const d of ds) { step(d, true); await new Promise(r => setTimeout(r, 120)); }
        busy = false;
      }
      function tapCell(i) {
        if (done || busy || wall[i]) return;
        const x = player % W, y = (player / W) | 0, tx = i % W, ty = (i / W) | 0;
        if (Math.abs(tx - x) + Math.abs(ty - y) === 1) { step(DIRS.findIndex(([dx, dy]) => dx === tx - x && dy === ty - y)); return; }
        if (boxes.includes(i)) { toast('Gaan staan langs die stomp en stoot dit 🪵', 1500); return; }
        const p = path(i); if (p) walk(p); else Snd.bad();
      }
      window.addEventListener('keydown', keyH);
      function keyH(e) { if (!document.body.contains(board)) { window.removeEventListener('keydown', keyH); return; } const m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (m !== undefined && !busy) { e.preventDefault(); step(m); } }

      build(); layout();
      return {
        layout, _debug: () => P,
        undo() { if (done || busy || !hist.length) return; const s = hist.pop(); boxes = s.boxes; player = s.player; pushes = s.pushes; clearHint(); Snd.lift(); render(); },
        restart() { if (done || busy) return; hist.push({ boxes: boxes.slice(), player, pushes }); boxes = P.boxes.slice(); player = P.player; pushes = 0; clearHint(); render(); },
        async hint() {
          if (done || busy) return;
          const sol = solve(P, boxes, player, 150000);
          if (!sol) { Snd.bad(); api.status('💡 Hmm, so werk dit nie meer nie. Druk ↶ of 🔄 om terug te gaan.'); return; }
          const nx = sol[0], [dx, dy] = DIRS[nx.d], stand = nx.from - dx - dy * W;
          if (hintShown === nx.from + ':' + nx.d) {           // second tap: do it
            clearHint(); const p = path(stand); await walk(p); step(nx.d); return;
          }
          hints++; Snd.hint(); clearHint(); hintShown = nx.from + ':' + nx.d;
          const a = el('div', 'ht-hint', ARW[nx.d]); a.style.width = a.style.height = S + 'px'; a.style.fontSize = S * .5 + 'px'; pos(a, nx.from); board.appendChild(a);
          const s = el('div', 'ht-stand'); s.style.width = s.style.height = S + 'px'; pos(s, stand); board.appendChild(s);
          hintEls = [a, s];
          api.status('💡 Gaan staan op die geel plek en stoot hierdie stomp in die rigting van die pyltjie. (Tik weer op 💡 om dit vir jou te doen.)');
        }
      };
    }
  });
})();
