'use strict';
/* =========================================================
   GAME 8: Wat het in die Nag Verander?  (memory & attention)
   Look at the campsite. The lights go out... in the morning
   some things have changed. Find all the changes!
   ========================================================= */
(function () {
  const ITEMS = [['🪑', 'stoel'], ['⚽', 'sokkerbal'], ['🎒', 'rugsak'], ['🔦', 'flits'], ['🧢', 'pet'], ['🥾', 'stapskoen'], ['🍉', 'waatlemoen'],
    ['🎸', 'kitaar'], ['🎣', 'visstok'], ['🏏', 'krieketbat'], ['🎲', 'dobbelsteen'], ['🧃', 'sappie'], ['☕', 'beker'], ['🪵', 'houtstomp'],
    ['🧸', 'teddiebeer'], ['🐸', 'padda'], ['🦎', 'akkedis'], ['🐌', 'slak'], ['🦉', 'uil'], ['🏉', 'rugbybal'], ['🌭', 'worsbroodjie'],
    ['🧺', 'mandjie'], ['🪁', 'vlieër'], ['🍳', 'pan'], ['🧦', 'sokkie'], ['🦔', 'krimpvarkie'], ['🍌', 'piesang'], ['🥚', 'eier']];
  const CFG = { 1: { c: 3, r: 3, items: 6, ch: 2 }, 2: { c: 4, r: 3, items: 8, ch: 3 }, 3: { c: 5, r: 3, items: 10, ch: 4 } };

  function generate(diff, R) {
    const C = CFG[diff], N = C.c * C.r, pool = R.shuffle(ITEMS.slice());
    const day = Array(N).fill(null), slots = R.shuffle([...Array(N).keys()]);
    for (let k = 0; k < C.items; k++) day[slots[k]] = pool[k];
    let spare = pool.slice(C.items);
    const night = day.slice(), changes = [], usedSlots = new Set();
    let guard = 0;
    while (changes.length < C.ch && guard++ < 100) {
      const type = R.pick(diff === 1 ? ['weg', 'nuut', 'ander'] : ['weg', 'nuut', 'ander', 'ander']);
      const cand = [...Array(N).keys()].filter(i => !usedSlots.has(i) && (type === 'nuut' ? !day[i] : !!day[i]));
      if (!cand.length || (type !== 'weg' && !spare.length)) continue;
      const i = R.pick(cand); usedSlots.add(i);
      if (type === 'weg') { night[i] = null; changes.push({ i, type, was: day[i] }); }
      else { const it = spare.shift(); night[i] = it; changes.push({ i, type, was: day[i], now: it }); }
    }
    return { ...C, N, day, night, changes };
  }
  const say = ch => ch.type === 'weg' ? `Die ${ch.was[1]} ${ch.was[0]} is weg!` : ch.type === 'nuut' ? `Daar is nou 'n ${ch.now[1]} ${ch.now[0]}!` : `Die ${ch.was[1]} ${ch.was[0]} is nou 'n ${ch.now[1]} ${ch.now[0]}!`;

  registerGame({
    id: 'nag', name: 'Wat het in die Nag Verander?', icon: '🌙', blurb: 'Geheue',
    help: d => `<p>Kyk mooi na die kampterrein en onthou waar alles is.</p><ul>
      <li>👀 Neem jou tyd. Druk <b>🌙 Lig af!</b> as jy reg is.</li>
      <li>🌅 Die volgende oggend het <b>${CFG[d].ch} dinge verander</b>: iets is weg, iets is nuut, of iets het in iets anders verander.</li>
      <li>👆 Tik op die plekke wat verander het.</li>
      <li>💡 Die wenk-knoppie wys jou die kamp weer vir 'n oomblik.</li>
      <li>⭐ Hoe minder foute, hoe meer sterre!</li></ul>`,
    create(host, diff, R, api) {
      const Z = generate(diff, R);
      let phase = 'day', found = new Set(), wrong = 0, hints = 0, done = false, peekT = null;
      const wrap = el('div', 'ng-wrap'), board = el('div', 'ng-board'), bar = el('div', 'ng-bar');
      wrap.append(board, bar); host.appendChild(wrap);
      const cells = [];
      for (let i = 0; i < Z.N; i++) { const c = el('div', 'ng-cell'); c.onclick = () => tap(i); cells.push(c); board.appendChild(c); }
      const curtain = el('div', 'ng-curtain hidden', '<div class="moon">🌙</div><div class="zz">Zzz…</div><div class="t">Almal slaap…</div>');
      wrap.appendChild(curtain);

      function layout() {
        const S = Math.floor(Math.min((host.clientWidth - 30) / Z.c, (host.clientHeight - 110) / Z.r, 130));
        board.style.gridTemplateColumns = `repeat(${Z.c}, ${S}px)`; board.style.gridTemplateRows = `repeat(${Z.r}, ${S}px)`; board.style.fontSize = S * .52 + 'px';
      }
      function show(arr) { cells.forEach((c, i) => { c.innerHTML = arr[i] ? `<span>${arr[i][0]}</span>` : ''; }); }
      function renderBar() {
        bar.innerHTML = '';
        if (phase === 'day') { const b = el('button', 'btn big-ish', '🌙 Lig af!'); b.onclick = lightsOut; bar.appendChild(b); }
        else bar.appendChild(el('div', 'ng-count', `Gevind: <b>${found.size} / ${Z.changes.length}</b> · Foute: <b>${wrong}</b>`));
      }
      function startDay() {
        phase = 'day'; found = new Set(); wrong = 0; board.className = 'ng-board day'; show(Z.day);
        cells.forEach(c => c.classList.remove('found', 'miss'));
        api.status('👀 Kyk mooi en onthou waar alles is. Druk <b>🌙 Lig af!</b> as jy reg is.'); renderBar();
      }
      function lightsOut() {
        Snd.night(); curtain.classList.remove('hidden');
        setTimeout(() => {
          phase = 'morning'; board.className = 'ng-board morning'; show(Z.night);
          curtain.classList.add('hidden'); Snd.tap();
          api.status(`🌅 Goeiemôre! <b>${Z.changes.length} dinge</b> het in die nag verander. Tik waar iets anders is.`); renderBar();
        }, 1800);
      }
      function tap(i) {
        if (phase !== 'morning' || done || peekT) return;
        const ch = Z.changes.find(c => c.i === i);
        if (ch) {
          if (found.has(i)) return;
          found.add(i); cells[i].classList.add('found'); Snd.good(); api.status('✔ ' + say(ch)); renderBar();
          if (found.size === Z.changes.length) {
            done = true; const base = wrong === 0 ? 3 : wrong <= 2 ? 2 : 1;
            api.win(starsFrom(base, hints), `Jy het al ${Z.changes.length} veranderinge gevind` + (wrong ? ` met ${wrong} fout${wrong > 1 ? 'e' : ''}.` : ' sonder een fout! 🦉'));
          }
        } else {
          wrong++; Snd.bad(); cells[i].classList.add('miss'); setTimeout(() => cells[i].classList.remove('miss'), 600);
          api.status('🙈 Nee, hier het niks verander nie.'); renderBar();
        }
      }

      layout(); startDay(); api.canUndo(false);
      return {
        layout, _debug: () => Z,
        undo() { },
        restart() { if (done) return; clearTimeout(peekT); peekT = null; startDay(); },
        hint() {
          if (done || peekT) return;
          if (phase === 'day') { toast('Kyk eers mooi – druk dan 🌙 Lig af!', 1600); return; }
          hints++; Snd.hint(); board.className = 'ng-board day peek'; show(Z.day);
          api.status('💡 So het die kamp gisteraand gelyk…');
          peekT = setTimeout(() => { peekT = null; board.className = 'ng-board morning'; show(Z.night); found.forEach(i => cells[i].classList.add('found')); api.status('Tik waar iets verander het.'); }, 2500);
        }
      };
    }
  });
})();
