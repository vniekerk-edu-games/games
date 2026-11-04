'use strict';
/* =========================================================
   GAME 7: Kampliggies  (patterns & connections)
   Turn the cable pieces so power runs from the camper van's
   plug to every lamp. No loose cable ends allowed!
   ========================================================= */
(function () {
  const CFG = { 1: { W: 4, H: 4 }, 2: { W: 5, H: 5 }, 3: { W: 6, H: 6 } };
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], BIT = [1, 2, 4, 8], OPP = [2, 3, 0, 1];
  const rot = m => ((m << 1) | (m >> 3)) & 15;
  const rotN = (m, k) => { for (let i = 0; i < k; i++) m = rot(m); return m; };
  const bits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

  function generate(diff, R) {
    const { W, H } = CFG[diff];
    for (let att = 0; att < 200; att++) {
      const N = W * H, mask = new Array(N).fill(0), inT = new Uint8Array(N);
      const src = R.int(1, H - 2) * W + R.int(1, W - 2);
      inT[src] = 1; const active = [src];
      while (active.length) {           // growing-tree: mixes long paths and branches
        const ai = R.chance(.6) ? active.length - 1 : R.int(0, active.length - 1), c = active[ai];
        const x = c % W, y = (c / W) | 0, opts = [];
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!inT[j] && bits(mask[c]) < 3) opts.push([d, j]); }
        if (!opts.length) { active.splice(ai, 1); continue; }
        const [d, j] = R.pick(opts); mask[c] |= BIT[d]; mask[j] |= BIT[OPP[d]]; inT[j] = 1; active.push(j);
      }
      if (inT.some(v => !v)) continue;
      const lamps = []; for (let i = 0; i < N; i++) if (i !== src && bits(mask[i]) === 1) lamps.push(i);
      const want = { 1: [3, 6], 2: [4, 9], 3: [6, 12] }[diff];
      if (lamps.length < want[0] || lamps.length > want[1]) continue;
      const start = mask.map(m => rotN(m, R.int(0, 3)));
      let minTaps = 0; for (let i = 0; i < N; i++) { let k = 0; while (rotN(start[i], k) !== mask[i]) k++; minTaps += k; }
      if (minTaps < N * .8) continue;
      return { W, H, src, sol: mask, start, lamps: new Set(lamps), minTaps };
    }
    return null;
  }
  function wireSVG(m) {
    let s = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">';
    const ends = [[50, 0], [100, 50], [50, 100], [0, 50]];
    for (const pass of ['under', 'wire']) for (let d = 0; d < 4; d++) if (m & BIT[d]) s += `<path class="${pass}" d="M50 50 L${ends[d][0]} ${ends[d][1]}"/>`;
    s += `<circle class="knot" cx="50" cy="50" r="${bits(m) > 1 ? 11 : 8}"/>`;
    return s + '</svg>';
  }
  const lampSVG = () => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle class="glow" cx="50" cy="50" r="40"/>
    <rect x="40" y="18" width="20" height="8" rx="3" fill="#3a2a17"/><path d="M34 28 H66 L70 70 Q50 80 30 70Z" class="glass"/><rect x="36" y="70" width="28" height="9" rx="3" fill="#3a2a17"/><path d="M44 18 Q50 6 56 18" stroke="#3a2a17" stroke-width="3" fill="none"/></svg>`;

  registerGame({
    id: 'ligte', name: 'Kampliggies', icon: '💡', blurb: 'Patrone',
    help: () => `<p>Dit word donker! Kry die krag van die kampeerwa na al die liggies.</p><ul>
      <li>👆 Tik op 'n kabelstuk om dit te <b>draai</b>.</li>
      <li>⚡ Die krag kom uit die kampeerwa 🚐. Kabels wat krag het, word <b>geel</b>.</li>
      <li>🏮 Elke liggie moet brand.</li>
      <li>🔌 Geen los kabelpunte nie – elke kabel moet aan 'n ander kabel vas wees.</li>
      <li>💡 Tip: Begin by die hoeke en kante – daar kan 'n stuk net op een of twee maniere pas!</li></ul>`,
    create(host, diff, R, api) {
      const P = generate(diff, R), { W, H, src } = P, N = W * H;
      let cur = P.start.slice(), turns = new Array(N).fill(0), hist = [], hints = 0, taps = 0, done = false;
      const board = el('div', 'lg-board'); host.appendChild(board);
      const cells = [];
      for (let i = 0; i < N; i++) {
        const c = el('div', 'lg-cell'), r = el('div', 'lg-rot', wireSVG(P.start[i]));
        c.appendChild(r);
        if (i === src) { c.classList.add('src'); c.appendChild(el('div', 'lg-top', camperSVG('#2b9fc9'))); }
        else if (P.lamps.has(i)) { c.classList.add('lamp'); c.appendChild(el('div', 'lg-top', lampSVG())); }
        c.onclick = () => tap(i);
        cells.push({ c, r }); board.appendChild(c);
      }
      function layout() {
        const S = Math.floor(Math.min((host.clientWidth - 30) / W, (host.clientHeight - 16) / H, 100));
        board.style.gridTemplateColumns = `repeat(${W}, ${S}px)`; board.style.gridTemplateRows = `repeat(${H}, ${S}px)`;
      }
      function lit() {
        const L = new Uint8Array(N), q = [src]; L[src] = 1;
        while (q.length) { const i = q.pop(), x = i % W, y = (i / W) | 0; for (let d = 0; d < 4; d++) { if (!(cur[i] & BIT[d])) continue; const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!L[j] && (cur[j] & BIT[OPP[d]])) { L[j] = 1; q.push(j); } } }
        return L;
      }
      function loose() { let k = 0; for (let i = 0; i < N; i++) { const x = i % W, y = (i / W) | 0; for (let d = 0; d < 4; d++) if (cur[i] & BIT[d]) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || !(cur[ny * W + nx] & BIT[OPP[d]])) k++; } } return k; }
      function paint() {
        const L = lit(); let on = 0;
        cells.forEach(({ c, r }, i) => { c.classList.toggle('on', !!L[i]); r.style.transform = `rotate(${turns[i] * 90}deg)`; if (L[i] && P.lamps.has(i)) on++; });
        api.status(`🏮 Liggies aan: <b>${on} / ${P.lamps.size}</b> · Draaie: <b>${taps}</b>`);
        api.canUndo(hist.length > 0);
        if (!done && L.every(v => v) && loose() === 0) {
          done = true; Snd.win(); board.classList.add('done');
          const extra = taps - P.minTaps, base = extra <= Math.max(4, P.minTaps * .3) ? 3 : extra <= P.minTaps ? 2 : 1;
          api.win(starsFrom(base, hints), `Al die liggies brand! Jy het ${taps} keer gedraai.`);
        }
      }
      function tap(i) {
        if (done) return; hist.push(i); taps++; turns[i]++; cur[i] = rot(cur[i]); Snd.rotate();
        cells[i].c.classList.remove('hint'); paint();
      }

      layout(); paint();
      return {
        layout, _debug: () => P,
        undo() { if (done || !hist.length) return; const i = hist.pop(); turns[i]--; cur[i] = rotN(cur[i], 3); taps = Math.max(0, taps - 1); Snd.lift(); paint(); },
        restart() { if (done) return; cur = P.start.slice(); turns = turns.map(t => t - (((t % 4) + 4) % 4)); hist = []; taps = 0; paint(); },
        hint() {
          if (done) return;
          const L = lit(), wrong = []; for (let i = 0; i < N; i++) if (cur[i] !== P.sol[i]) wrong.push(i);
          if (!wrong.length) return;
          const near = wrong.filter(i => { const x = i % W, y = (i / W) | 0; return L[i] || [0, 1, 2, 3].some(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < W && ny < H && L[ny * W + nx]; }); });
          const i = (near.length ? near : wrong)[0];
          hints++; Snd.hint();
          while (cur[i] !== P.sol[i]) { turns[i]++; cur[i] = rot(cur[i]); }
          cells[i].c.classList.add('hint'); paint();
          if (!done) api.status('💡 Hierdie stuk is nou reg gedraai. Kyk wat sy bure moet doen!');
        }
      };
    }
  });
})();
