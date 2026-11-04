'use strict';
/* =========================================================
   GAME 3: Spoorsnyer  (coding / sequencing)
   Build a list of commands so the hiker picks up the firewood
   and reaches the braai at the camper van.
   ========================================================= */
(function () {
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const CFG = {
    1: { w: 5, h: 5, wood: 0, rep: false, obs: [.18, .26], opt: [4, 7], max: 12 },
    2: { w: 6, h: 6, wood: 1, rep: true, obs: [.2, .28], opt: [5, 9], max: 12 },
    3: { w: 7, h: 6, wood: 2, rep: true, obs: [.22, .3], opt: [7, 12], max: 14 }
  };
  const CMD = { f: { i: '⬆', n: 'Vorentoe', c: 'c-f' }, l: { i: '↺', n: 'Draai links', c: 'c-l' }, r: { i: '↻', n: 'Draai regs', c: 'c-r' } };

  // shortest program (number of command blocks) using BFS over (x,y,dir,woodMask)
  function solve(P, rep) {
    const { w, h, blocked, wood, sx, sy, sd, gx, gy } = P, full = (1 << wood.length) - 1;
    const woodAt = (x, y) => wood.findIndex(c => c[0] === x && c[1] === y);
    const key = (x, y, d, m) => ((y * w + x) * 4 + d) * 8 + m;
    const start = { x: sx, y: sy, d: sd, m: 0 }, seen = new Map([[key(sx, sy, sd, 0), null]]), q = [start];
    while (q.length) {
      const s = q.shift();
      if (s.x === gx && s.y === gy && s.m === full) {
        const prog = []; let k = key(s.x, s.y, s.d, s.m); while (seen.get(k)) { const e = seen.get(k); prog.unshift(e.cmd); k = e.prev; }
        return prog;
      }
      const moves = [{ cmd: { c: 'l', n: 1 }, d: (s.d + 3) % 4 }, { cmd: { c: 'r', n: 1 }, d: (s.d + 1) % 4 }];
      if (rep) moves.push({ cmd: { c: 'r', n: 2 }, d: (s.d + 2) % 4 });
      for (const mv of moves) { const k = key(s.x, s.y, mv.d, s.m); if (!seen.has(k)) { seen.set(k, { prev: key(s.x, s.y, s.d, s.m), cmd: mv.cmd }); q.push({ x: s.x, y: s.y, d: mv.d, m: s.m }); } }
      let x = s.x, y = s.y, m = s.m;
      for (let n = 1; n <= (rep ? 5 : 1); n++) {
        x += DX[s.d]; y += DY[s.d];
        if (x < 0 || y < 0 || x >= w || y >= h || blocked[y * w + x]) break;
        const wi = woodAt(x, y); if (wi >= 0) m |= 1 << wi;
        const k = key(x, y, s.d, m); if (!seen.has(k)) { seen.set(k, { prev: key(s.x, s.y, s.d, s.m), cmd: { c: 'f', n } }); q.push({ x, y, d: s.d, m }); }
        if (x === gx && y === gy && m === full) break;
      }
    }
    return null;
  }

  function generate(diff, R) {
    const C = CFG[diff]; let best = null;
    for (let att = 0; att < 600; att++) {
      const { w, h } = C, blocked = new Uint8Array(w * h), dens = C.obs[0] + R.f() * (C.obs[1] - C.obs[0]);
      const kinds = {};
      for (let i = 0; i < w * h; i++) if (R.f() < dens) { blocked[i] = 1; kinds[i] = R.pick(['rock', 'aloe', 'tree']); }
      const free = []; for (let i = 0; i < w * h; i++) if (!blocked[i]) free.push(i);
      if (free.length < 8) continue;
      R.shuffle(free);
      const s = free[0], g = free.find(i => Math.abs(i % w - s % w) + Math.abs(Math.floor(i / w) - Math.floor(s / w)) >= Math.floor((w + h) / 2));
      if (g === undefined) continue;
      const wood = free.filter(i => i !== s && i !== g).slice(0, C.wood).map(i => [i % w, Math.floor(i / w)]);
      const P = { w, h, blocked, kinds, wood, sx: s % w, sy: Math.floor(s / w), sd: R.int(0, 3), gx: g % w, gy: Math.floor(g / w) };
      const sol = solve(P, C.rep); if (!sol) continue;
      const turns = sol.filter(c => c.c !== 'f').length;
      P.sol = sol; P.opt = sol.length;
      if (sol.length >= C.opt[0] && sol.length <= C.opt[1] && turns >= 2) return P;
      if (!best || Math.abs(sol.length - C.opt[0]) < Math.abs(best.opt - C.opt[0])) best = P;
    }
    return best;
  }

  registerGame({
    id: 'spoor', name: 'Spoorsnyer', icon: '🥾', blurb: 'Kodering',
    help: d => `<p>Help die stapper om ${d > 1 ? 'die 🪵 houtjies op te tel en dan ' : ''}by die 🔥 braaivleisvuur uit te kom!</p><ul>
      <li>Bou 'n lys bevele: <b>⬆ Vorentoe</b>, <b>↺ Draai links</b> en <b>↻ Draai regs</b>.</li>
      <li>Die rooi pyltjie wys waarheen die stapper kyk. Links en regs is <b>sy</b> links en regs!</li>
      ${d > 1 ? '<li>🔁 Tik op \'n bevel in jou lys en druk <b>+</b> om dit te herhaal – só gebruik jy minder bevele.</li>' : ''}
      <li>Druk <b>▶ Stap!</b> om te sien of jou plan werk.</li>
      <li>⭐ Hoe minder bevele, hoe meer sterre!</li></ul>`,
    create(host, diff, R, api) {
      const C = CFG[diff], P = generate(diff, R), { w, h } = P;
      let prog = [], hist = [], sel = -1, hints = 0, running = false, done = false, trail = [];
      let pos = { x: P.sx, y: P.sy, d: P.sd, turn: P.sd * 90 }, got = new Set();
      const av = prof().av;

      const area = el('div', 'sp-area'), board = el('div', 'sp-board'), side = el('div', 'sp-side');
      area.appendChild(board); area.appendChild(side); host.appendChild(area);
      const hiker = el('div', 'sp-hiker', avatarSVG(av, 'width="100%" height="100%"') + '<svg class="arr" viewBox="0 0 20 20"><path d="M10 1 L19 15 Q10 11 1 15Z" fill="#d9443b" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>');
      const pal = el('div', 'sp-pal'), progEl = el('div', 'sp-prog'), edit = el('div', 'sp-edit'), go = el('div', 'sp-go');
      side.append(pal, progEl, edit, go);
      for (const k of ['f', 'l', 'r']) { const b = el('button', 'sp-cmd ' + CMD[k].c, `<span class="i">${CMD[k].i}</span>${CMD[k].n}`); b.onclick = () => add(k); pal.appendChild(b); }
      const runB = el('button', 'btn green', '▶ Stap!'), clrB = el('button', 'btn grey', '🧹 Vee uit');
      runB.onclick = run; clrB.onclick = () => { if (running || done || !prog.length) return; hist.push(JSON.stringify(prog)); prog = []; sel = -1; resetHiker(); drawProg(); };
      go.append(clrB, runB);

      let S = 60, cellEls = [];
      function layout() {
        const bw = host.clientWidth - Math.max(320, Math.min(440, host.clientWidth * .42)) - 50, bh = host.clientHeight - 20;
        S = Math.floor(Math.min(bw / w, bh / h, 90)) - 3;
        board.style.gridTemplateColumns = `repeat(${w}, ${S}px)`; board.style.gridTemplateRows = `repeat(${h}, ${S}px)`; board.style.fontSize = S * .6 + 'px';
        hiker.style.width = hiker.style.height = S * .9 + 'px';
        placeHiker(false); drawTrail();
      }
      function buildBoard() {
        board.innerHTML = ''; cellEls = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x, c = el('div', 'sp-cell'); cellEls[i] = c;
          if (P.blocked[i]) c.innerHTML = P.kinds[i] === 'rock' ? rockSVG() : P.kinds[i] === 'aloe' ? aloeSVG() : acaciaSVG();
          else if (x === P.gx && y === P.gy) c.innerHTML = braaiSVG();
          else if (P.wood.some(q => q[0] === x && q[1] === y)) c.innerHTML = got.has(x + ',' + y) ? '' : '<span class="emo">🪵</span>';
          board.appendChild(c);
        }
        board.appendChild(hiker);
      }
      function placeHiker(anim = true) {
        hiker.style.transition = anim ? '' : 'none';
        hiker.style.left = 6 + pos.x * (S + 3) + S * .05 + 'px'; hiker.style.top = 6 + pos.y * (S + 3) + S * .05 + 'px';
        hiker.querySelector('.arr').style.transform = `rotate(${pos.turn}deg) translateY(-${S * .62}px)`;
        if (!anim) void hiker.offsetWidth;
      }
      function drawTrail() {
        board.querySelectorAll('.sp-foot').forEach(e => e.remove());
        trail.forEach(([x, y]) => { const f = el('div', 'sp-foot', '👣'); f.style.left = 6 + x * (S + 3) + S * .3 + 'px'; f.style.top = 6 + y * (S + 3) + S * .3 + 'px'; board.appendChild(f); });
      }
      function resetHiker() { pos = { x: P.sx, y: P.sy, d: P.sd, turn: P.sd * 90 }; got = new Set(); buildBoard(); placeHiker(false); drawTrail(); }

      function drawProg(runIdx = -1, errIdx = -1) {
        progEl.innerHTML = '';
        if (!prog.length) progEl.appendChild(el('div', 'empty', 'Tik op die knoppies hierbo<br>om jou plan te bou.'));
        prog.forEach((p, i) => {
          const c = el('div', 'chip ' + CMD[p.c].c + (i === sel ? ' sel' : '') + (i === runIdx ? ' run' : '') + (i === errIdx ? ' err' : ''), CMD[p.c].i + (p.n > 1 ? `<span class="n">×${p.n}</span>` : ''));
          c.onclick = () => { if (running || done) return; sel = sel === i ? -1 : i; Snd.tap(); drawProg(); };
          progEl.appendChild(c);
        });
        edit.innerHTML = '';
        if (sel >= 0 && prog[sel]) {
          const p = prog[sel];
          if (C.rep) {
            const mi = el('button', '', '−'), pl = el('button', '', '+');
            mi.onclick = () => { if (p.n > 1) { hist.push(JSON.stringify(prog)); p.n--; Snd.tap(); drawProg(); } };
            pl.onclick = () => { if (p.n < (p.c === 'f' ? 5 : 2)) { hist.push(JSON.stringify(prog)); p.n++; Snd.tap(); drawProg(); } };
            edit.append(el('span', '', '🔁 Herhaal'), mi, el('span', 'cnt', '×' + p.n), pl);
          }
          const del = el('button', '', '🗑'); del.onclick = () => { hist.push(JSON.stringify(prog)); prog.splice(sel, 1); sel = Math.min(sel, prog.length - 1); Snd.lift(); drawProg(); };
          edit.appendChild(del);
        } else edit.appendChild(el('span', '', `Bevele: ${prog.length} / ${C.max}` + (prog.length ? ' · Tik op \'n bevel om dit te verander' : '')));
        api.canUndo(hist.length > 0);
      }
      function add(k) {
        if (running || done) return;
        if (prog.length >= C.max) { toast('Jou lys is vol! Gebruik 🔁 herhaal of vee iets uit.'); Snd.bad(); return; }
        hist.push(JSON.stringify(prog)); Snd.tap();
        const at = sel >= 0 ? sel + 1 : prog.length; prog.splice(at, 0, { c: k, n: 1 }); sel = sel >= 0 ? at : -1;
        if (pos.x !== P.sx || pos.y !== P.sy || got.size) resetHiker();
        drawProg();
      }
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      async function run() {
        if (running || done || !prog.length) return;
        running = true; sel = -1; resetHiker(); trail = []; drawTrail(); await sleep(150);
        const full = P.wood.length;
        for (let i = 0; i < prog.length; i++) {
          const p = prog[i]; drawProg(i);
          for (let n = 0; n < p.n; n++) {
            if (p.c === 'l') { pos.d = (pos.d + 3) % 4; pos.turn -= 90; Snd.rotate(); placeHiker(); await sleep(320); continue; }
            if (p.c === 'r') { pos.d = (pos.d + 1) % 4; pos.turn += 90; Snd.rotate(); placeHiker(); await sleep(320); continue; }
            const nx = pos.x + DX[pos.d], ny = pos.y + DY[pos.d];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || P.blocked[ny * w + nx]) {
              Snd.bad(); hiker.classList.add('shake'); drawProg(-1, i);
              const what = nx < 0 || ny < 0 || nx >= w || ny >= h ? 'Oeps! Die stapper het amper van die kaart af geloop.' : P.kinds[ny * w + nx] === 'rock' ? 'Oeps! Daar is \'n rots in die pad.' : P.kinds[ny * w + nx] === 'aloe' ? 'Eina! Die stapper het in \'n aalwyn vasgeloop.' : 'Oeps! Daar staan \'n boom in die pad.';
              api.status('🙈 ' + what + ' Verander jou plan en probeer weer.');
              await sleep(900); hiker.classList.remove('shake'); running = false; return;
            }
            pos.x = nx; pos.y = ny; trail.push([nx, ny]); Snd.step(); placeHiker(); await sleep(330); drawTrail();
            const wi = P.wood.findIndex(q => q[0] === nx && q[1] === ny);
            if (wi >= 0 && !got.has(nx + ',' + ny)) { got.add(nx + ',' + ny); cellEls[ny * w + nx].innerHTML = ''; Snd.good(); }
            if (nx === P.gx && ny === P.gy && got.size === full) { running = false; finish(); return; }
          }
        }
        drawProg(); running = false;
        if (pos.x === P.gx && pos.y === P.gy) api.status(`🪵 Amper! Jy moet eers al die houtjies optel (${got.size} van ${full}).`);
        else api.status('🤔 Die plan is klaar, maar die stapper is nog nie by die braaivleisvuur nie. Probeer weer!');
        Snd.bad();
      }
      function finish() {
        done = true; drawProg();
        const extra = prog.length - P.opt; let base = extra <= 0 ? 3 : extra <= 2 ? 2 : 1;
        const st = starsFrom(base, hints);
        api.win(st, `Jy het ${prog.length} bevel${prog.length > 1 ? 'e' : ''} gebruik. ` + (extra <= 0 ? 'Dit is die kortste plan!' : `Dit kan met ${P.opt} gedoen word – kan jy dit regkry?`));
      }

      buildBoard(); layout(); drawProg();
      api.status(diff > 1 ? `Tel ${P.wood.length === 1 ? 'die houtjie' : 'al die houtjies'} 🪵 op en stap na die braaivleisvuur 🔥.` : 'Bou \'n plan om by die braaivleisvuur 🔥 uit te kom.');
      return {
        layout, _debug: () => P,
        undo() { if (running || done || !hist.length) return; prog = JSON.parse(hist.pop()); sel = -1; Snd.lift(); resetHiker(); drawProg(); },
        restart() { if (running || done) return; hist.push(JSON.stringify(prog)); prog = []; sel = -1; resetHiker(); trail = []; drawTrail(); drawProg(); },
        hint() {
          if (running || done) return; hints++; Snd.hint();
          // walk the best route and show footprints for part (1st hint) or all (2nd+) of it
          let x = P.sx, y = P.sy, d = P.sd; const cells = [];
          for (const c of P.sol) { if (c.c === 'l') d = (d + 3) % 4; else if (c.c === 'r') d = (d + c.n) % 4; else for (let k = 0; k < c.n; k++) { x += DX[d]; y += DY[d]; cells.push([x, y]); } }
          const show = hints === 1 ? Math.ceil(cells.length / 2) : cells.length;
          resetHiker(); trail = cells.slice(0, show); drawTrail();
          api.status(hints === 1 ? '💡 Volg die voetspore – dit is die eerste deel van die beste roete.' : `💡 Hier is die hele roete. Dit kan met ${P.opt} bevele gedoen word.`);
        }
      };
    }
  });
})();
