'use strict';
/* =========================================================
   GAME 6: Wie Sit Waar?  (deduction – logic clues)
   Friends sit on numbered camp chairs around the fire and
   each brought one thing to play with. Use the clues to work
   out who sits where and who brought what.
   Every puzzle is checked to have exactly one answer.
   ========================================================= */
(function () {
  const KIDS = [['Ruan', 'seun'], ['Anja', 'meisie'], ['Liam', 'seun'], ['Mia', 'meisie'], ['Thabo', 'seun'], ['Lerato', 'meisie'],
    ['Pieter', 'seun'], ['Elsa', 'meisie'], ['Johan', 'seun'], ['Zané', 'meisie'], ['Sipho', 'seun'], ['Carla', 'meisie']];
  const ITEMS = [['sokkerbal', '⚽'], ['krieketbat', '🏏'], ['bordspel', '🎲'], ['kitaar', '🎸'], ['flits', '🔦'], ['visstok', '🎣'], ['rugbybal', '🏉'], ['kaartspel', '🃏']];
  const CHAIR = ['#e2502d', '#2b84ff', '#2f9e4a', '#f5b51a', '#8a4fd6'];
  const CFG = { 1: { n: 3, max: 5 }, 2: { n: 4, max: 7 }, 3: { n: 5, max: 9 } };
  const W = { // clue weights per level (direct clues get rarer as it gets harder)
    1: { posIs: 2, itemIs: 2, posNot: 1, itemNot: 1, adj: 1, left: .8, itemPos: 1, notAdj: 0, nextR: 0, itemAdj: 0 },
    2: { posIs: .6, itemIs: .7, posNot: 1, itemNot: 1, adj: 1.4, left: 1.2, itemPos: 1, notAdj: 1, nextR: 1, itemAdj: 1 },
    3: { posIs: .25, itemIs: .35, posNot: 1, itemNot: 1, adj: 1.4, left: 1.3, itemPos: 1, notAdj: 1.2, nextR: 1.2, itemAdj: 1.3 }
  };
  function perms(n) { const out = []; (function rec(a, used) { if (a.length === n) { out.push(a.slice()); return; } for (let i = 0; i < n; i++) if (!used[i]) { used[i] = 1; a.push(i); rec(a, used); a.pop(); used[i] = 0; } })([], []); return out; }

  function generate(diff, R) {
    const { n, max } = CFG[diff], P = perms(n);
    for (let att = 0; att < 60; att++) {
      const kids = R.shuffle(KIDS.slice()).slice(0, n), items = R.shuffle(ITEMS.slice()).slice(0, n);
      const sp = R.shuffle([...Array(n).keys()]), si = R.shuffle([...Array(n).keys()]);   // seat of kid k, item of kid k
      const K = k => kids[k][0], I = j => items[j][0], seatName = s => `stoel ${s + 1}`;
      const pool = [], add = (type, t, f) => pool.push({ type, t, f, w: W[diff][type] });
      for (let k = 0; k < n; k++) {
        add('posIs', `${K(k)} sit op ${seatName(sp[k])}.`, (p) => p[k] === sp[k]);
        add('itemIs', `${K(k)} het die ${I(si[k])} gebring.`, (p, q) => q[k] === si[k]);
        for (let s = 0; s < n; s++) if (s !== sp[k]) add('posNot', `${K(k)} sit nie op ${seatName(s)} nie.`, (p) => p[k] !== s);
        for (let j = 0; j < n; j++) if (j !== si[k]) add('itemNot', `${K(k)} het nie die ${I(j)} gebring nie.`, (p, q) => q[k] !== j);
        for (let m = 0; m < n; m++) {
          if (m === k) continue;
          const d = sp[k] - sp[m];
          if (k < m && Math.abs(d) === 1) add('adj', `${K(k)} sit langs ${K(m)}.`, (p) => Math.abs(p[k] - p[m]) === 1);
          if (k < m && Math.abs(d) > 1) add('notAdj', `${K(k)} sit nie langs ${K(m)} nie.`, (p) => Math.abs(p[k] - p[m]) !== 1);
          if (d < 0) add('left', `${K(k)} sit êrens links van ${K(m)}.`, (p) => p[k] < p[m]);
          if (d === 1) add('nextR', `${K(k)} sit op die stoel net regs van ${K(m)}.`, (p) => p[k] === p[m] + 1);
          if (Math.abs(d) === 1) add('itemAdj', `Die kind met die ${I(si[k])} sit langs ${K(m)}.`, (p, q) => { const o = q.indexOf(si[k]); return o !== m && Math.abs(p[o] - p[m]) === 1; });
        }
      }
      for (let j = 0; j < n; j++) { const owner = si.indexOf(j); add('itemPos', `Die kind met die ${I(j)} sit op ${seatName(sp[owner])}.`, (p, q) => p[q.indexOf(j)] === sp[owner]); }
      // weighted shuffle
      pool.forEach(c => c.key = c.w > 0 ? -Math.log(R.f() + 1e-9) / c.w : Infinity); pool.sort((a, b) => a.key - b.key);
      let cands = []; for (const p of P) for (const q of P) cands.push([p, q]);
      const chosen = [];
      for (const c of pool) {
        if (c.key === Infinity) break;
        const next = cands.filter(([p, q]) => c.f(p, q));
        if (next.length < cands.length) { chosen.push(c); cands = next; }
        if (cands.length === 1) break;
      }
      if (cands.length !== 1) continue;
      // remove clues that are not needed
      for (const c of R.shuffle(chosen.slice())) {
        const rest = chosen.filter(x => x !== c); let cnt = 0;
        for (const p of P) { for (const q of P) { if (rest.every(x => x.f(p, q))) { cnt++; if (cnt > 1) break; } } if (cnt > 1) break; }
        if (cnt === 1) chosen.splice(chosen.indexOf(c), 1);
      }
      if (chosen.length > max) continue;
      const order = R.shuffle(chosen.slice());
      return { n, kids, items, sp, si, clues: order };
    }
    return null;
  }

  registerGame({
    id: 'wie', name: 'Wie Sit Waar?', icon: '🕵️', blurb: 'Afleiding',
    help: () => `<p>Die maats sit om die kampvuur. Elkeen het iets gebring om mee te speel.</p><ul>
      <li>🔎 Lees die <b>leidrade</b> mooi.</li>
      <li>👆 Tik op 'n stoel se <b>?</b> om te kies wie daar sit, en wat hy of sy gebring het.</li>
      <li>✏️ Tik op 'n leidraad om dit af te merk as jy dit klaar gebruik het.</li>
      <li>⬅️ Die stoele is van <b>links na regs</b> genommer: stoel 1 is heel links.</li>
      <li>💡 Tip: Begin met die leidrade wat jou presies sê waar iemand sit!</li></ul>`,
    create(host, diff, R, api) {
      const Z = generate(diff, R), n = Z.n;
      const kidAv = k => { const g = Z.kids[k][1]; return { g, skin: (k * 2 + n) % 4, hair: (k + 1) % 4, shirt: (k * 3 + 1) % 6, hat: g === 'seun' ? (k % 2 ? 1 : 0) : 0 }; };
      const solKid = Array(n), solItem = Array(n); for (let k = 0; k < n; k++) { solKid[Z.sp[k]] = k; solItem[Z.sp[k]] = Z.si[k]; }
      let kidAt = Array(n).fill(-1), itemAt = Array(n).fill(-1), used = new Set(), hist = [], hints = 0, done = false, bad = new Set();

      const area = el('div', 'wi-area'), left = el('div', 'wi-left'), right = el('div', 'wi-clues');
      area.append(left, right); host.appendChild(area);
      const chairs = el('div', 'wi-chairs'), fire = el('div', 'wi-fire');
      fire.innerHTML = `<svg viewBox="0 0 200 60"><ellipse cx="100" cy="40" rx="70" ry="16" fill="#6b5a4a"/>${[30, 55, 80, 120, 145, 170].map((x, i) => `<ellipse cx="${x}" cy="${i % 2 ? 46 : 36}" rx="13" ry="8" fill="#9a8f84"/>`).join('')}<path d="M70 40 Q72 0 88 18 Q94 -10 104 14 Q114 -4 120 20 Q130 10 130 40Z" fill="#ff8a1a"/><path d="M86 40 Q90 18 98 28 Q104 12 110 28 Q116 22 116 40Z" fill="#ffd84d"/></svg>`;
      left.append(el('div', 'wi-lr', '<span>⬅ links</span><span>regs ➡</span>'), chairs, fire);
      const pick = el('div', 'wi-pick hidden'); host.appendChild(pick);

      const snap = () => JSON.stringify([kidAt, itemAt]);
      function render() {
        chairs.innerHTML = '';
        for (let s = 0; s < n; s++) {
          const c = el('div', 'wi-chair');
          c.style.setProperty('--cc', CHAIR[s]);
          const kd = el('button', 'wi-kid', kidAt[s] >= 0 ? `${avatarSVG(kidAv(kidAt[s]))}<b>${Z.kids[kidAt[s]][0]}</b>` : '<span class="q">?</span><b>Wie?</b>');
          kd.onclick = e => openPick(s, 'kid', kd);
          const it = el('button', 'wi-item', itemAt[s] >= 0 ? `<span class="e">${Z.items[itemAt[s]][1]}</span><b>${Z.items[itemAt[s]][0]}</b>` : '<span class="q">?</span><b>Wat?</b>');
          it.onclick = e => openPick(s, 'item', it);
          c.append(kd, el('div', 'wi-seat', `<span>${s + 1}</span>`), it);
          chairs.appendChild(c);
        }
        right.innerHTML = '<div class="wi-h">🔎 Leidrade</div>';
        Z.clues.forEach((c, i) => {
          const e = el('div', 'wi-clue' + (used.has(i) ? ' used' : '') + (bad.has(i) ? ' bad' : ''), `<span class="no">${i + 1}</span><span class="tx">${c.t}</span>`);
          e.onclick = () => { if (used.has(i)) used.delete(i); else used.add(i); Snd.tap(); render(); };
          right.appendChild(e);
        });
        api.canUndo(hist.length > 0);
      }
      function openPick(s, kind, anchor) {
        if (done) return; Snd.tap();
        pick.innerHTML = ''; pick.classList.remove('hidden');
        const list = kind === 'kid' ? Z.kids.map((k, i) => [i, `${avatarSVG(kidAv(i))}<b>${k[0]}</b>`]) : Z.items.map((it, i) => [i, `<span class="e">${it[1]}</span><b>${it[0]}</b>`]);
        list.forEach(([i, html]) => {
          const arr = kind === 'kid' ? kidAt : itemAt, where = arr.indexOf(i);
          const b = el('button', 'wi-opt' + (where >= 0 && where !== s ? ' taken' : '') + (where === s ? ' cur' : ''), html + (where >= 0 && where !== s ? `<small>stoel ${where + 1}</small>` : ''));
          b.onclick = () => { hist.push(snap()); const a = kind === 'kid' ? kidAt : itemAt; const o = a.indexOf(i); if (o >= 0) a[o] = -1; a[s] = i; Snd.place(); closePick(); changed(); };
          pick.appendChild(b);
        });
        const clr = el('button', 'wi-opt clr', '🧹<b>Maak leeg</b>'); clr.onclick = () => { hist.push(snap()); (kind === 'kid' ? kidAt : itemAt)[s] = -1; Snd.lift(); closePick(); changed(); }; pick.appendChild(clr);
        const r = anchor.getBoundingClientRect(), hr = host.getBoundingClientRect();
        pick.style.left = clamp(r.left - hr.left + r.width / 2 - 170, 6, hr.width - 346) + 'px';
        pick.style.top = clamp(r.bottom - hr.top + 6, 6, hr.height - pick.offsetHeight - 6) + 'px';
      }
      function closePick() { pick.classList.add('hidden'); }
      host.addEventListener('pointerdown', e => { if (!pick.contains(e.target) && !e.target.closest('.wi-kid,.wi-item')) closePick(); });
      function changed() {
        bad = new Set();
        const full = kidAt.every(v => v >= 0) && itemAt.every(v => v >= 0);
        if (full) {
          const p = Array(n), q = Array(n); for (let s = 0; s < n; s++) { p[kidAt[s]] = s; q[kidAt[s]] = itemAt[s]; }
          Z.clues.forEach((c, i) => { if (!c.f(p, q)) bad.add(i); });
          if (!bad.size) { done = true; render(); Snd.good(); api.win(starsFrom(3, hints), hints ? `Jy het ${hints} wenk${hints > 1 ? 'e' : ''} gebruik.` : 'Sonder wenke – jy is \'n regte speurder! 🕵️'); return; }
          Snd.bad(); api.status(`🤔 Amper! ${bad.size === 1 ? 'Een leidraad klop' : bad.size + ' leidrade klop'} nog nie – kyk na die rooi ${bad.size === 1 ? 'een' : 'enes'}.`);
        } else api.status('Lees die leidrade en vul die stoele in. Wie sit waar, en wat het elkeen gebring?');
        render();
      }

      render(); changed();
      return {
        layout() { closePick(); }, _debug: () => Z,
        undo() { if (done || !hist.length) return; [kidAt, itemAt] = JSON.parse(hist.pop()); Snd.lift(); changed(); },
        restart() { if (done) return; hist.push(snap()); kidAt = Array(n).fill(-1); itemAt = Array(n).fill(-1); used.clear(); changed(); },
        hint() {
          if (done) return;
          const s = [...Array(n).keys()].find(s => kidAt[s] !== solKid[s] || itemAt[s] !== solItem[s]); if (s === undefined) return;
          hints++; Snd.hint(); hist.push(snap());
          for (const [a, v] of [[kidAt, solKid[s]], [itemAt, solItem[s]]]) { const o = a.indexOf(v); if (o >= 0) a[o] = -1; a[s] = v; }
          changed();
          const c = chairs.children[s]; if (c) c.classList.add('hint');
          if (!done) api.status(`💡 ${Z.kids[solKid[s]][0]} sit op stoel ${s + 1} en het die ${Z.items[solItem[s]][0]} gebring.`);
        }
      };
    }
  });
})();
