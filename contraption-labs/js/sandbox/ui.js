/* Contraption Labs — ui.js
 * Shelf, toolbar, info card, keyboard shortcuts, save/open files, full screen.
 */
(function (CL) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = CL.WORLD.pxPerMetre, F = CL.WORLD.floorY, TAU = Math.PI * 2;

  function init(sb) {
    buildShelf(sb);
    bindToolbar(sb);
    bindKeys(sb);
    initFullscreen();
    new ResizeObserver(() => sb.renderer.resize()).observe($('stage'));

    sb.on((type, data) => {
      if (type === 'change' || type === 'select' || type === 'mode') { refreshShelf(sb); refreshToolbar(sb); renderInfo(sb); }
      if (type === 'tick') liveInfo(sb);
      if (type === 'toast') toast(data);
    });
    refreshShelf(sb); refreshToolbar(sb); renderInfo(sb);
  }

  /* ---------- shelf ---------- */
  function kindOf(t) {
    if (t === 'hand') return 'hand';
    if (CL.LINKS[t]) return 'link';
    return CL.BALLS[t] ? 'ball' : CL.RIGIDS[t] ? 'rigid' : 'block';
  }
  function nameOf(t) {
    if (t === 'hand') return 'Move';
    return (CL.BALLS[t] || CL.RIGIDS[t] || CL.SURFACES[t] || CL.LINKS[t]).name;
  }

  function shelfButton(label, html, onClick, data) {
    const b = document.createElement('button');
    b.className = 'shelf-item';
    b.innerHTML = html + '<span>' + label + '</span><b class="count" hidden></b>';
    b.addEventListener('click', onClick);
    Object.keys(data || {}).forEach(k => (b.dataset[k] = data[k]));
    return b;
  }

  /* Categories fold open and shut (one open at a time) so the shelf never
   * becomes a long scroll. The open one is remembered. */
  const OPEN_KEY = 'contraption-labs.shelf.open';
  const cats = [];
  let openCat = null;

  function setOpen(id) {
    openCat = id;
    cats.forEach(c => {
      const on = c.id === id;
      c.body.hidden = !on;
      c.wrap.className = 'cat' + (on ? ' open' : '');
      c.head.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    try { localStorage.setItem(OPEN_KEY, id || ''); } catch (e) { /* ignore */ }
  }

  function buildShelf(sb) {
    const shelf = $('shelf');
    shelf.innerHTML = '';
    cats.length = 0;
    const list = CL.SHELF.sections.map(s => ({ id: s.title.toLowerCase().replace(/\W+/g, '-'), title: s.title, icon: s.icon, items: s.items }))
      .concat([{ id: 'experiments', title: 'Experiments', icon: '🧪', presets: CL.PRESET_ORDER }]);

    list.forEach(sec => {
      const wrap = document.createElement('section');
      wrap.className = 'cat';
      const head = document.createElement('button');
      head.className = 'cat-head';
      const n = (sec.items || sec.presets).length;
      head.innerHTML = '<span class="cat-icon">' + sec.icon + '</span><span class="cat-title">' + sec.title +
        '</span><span class="cat-dot" aria-hidden="true"></span><span class="cat-count">' + n + '</span><span class="chev" aria-hidden="true">▾</span>';
      const body = document.createElement('div');
      body.className = 'shelf-group';
      if (sec.presets) body.id = 'shelfExperiments';
      (sec.items || []).forEach(t => {
        const kind = kindOf(t);
        body.appendChild(shelfButton(nameOf(t), '<canvas data-kind="' + kind + '" data-type="' + t + '"></canvas>', () => sb.setTool(t), { tool: t }));
      });
      (sec.presets || []).forEach(id => {
        const p = CL.PRESETS[id];
        body.appendChild(shelfButton(p.name, '<i class="emoji">' + p.icon + '</i>', () => sb.loadPreset(id), { preset: id }));
      });
      head.onclick = () => setOpen(openCat === sec.id ? null : sec.id);
      wrap.appendChild(head); wrap.appendChild(body); shelf.appendChild(wrap);
      cats.push({ id: sec.id, items: sec.items || [], wrap, head, body });
    });

    let saved = null;
    try { saved = localStorage.getItem(OPEN_KEY); } catch (e) { /* ignore */ }
    setOpen(saved !== null && (saved === '' || cats.some(c => c.id === saved)) ? (saved || null) : cats[0].id);
    requestAnimationFrame(() => document.querySelectorAll('.shelf canvas').forEach(c =>
      CL.art.drawIcon(c, c.dataset.kind, c.dataset.type)));
  }

  function refreshShelf(sb) {
    document.querySelectorAll('.shelf-item[data-tool]').forEach(b => {
      const t = b.dataset.tool;
      b.classList.toggle('active', t === sb.tool);
      const badge = b.querySelector('.count');
      if (!badge) return;
      if (sb.bin) {
        const n = Math.max(0, sb.remaining(t));
        badge.hidden = false; badge.textContent = '×' + n;
        b.classList.toggle('empty', n === 0);
      } else { badge.hidden = true; b.classList.remove('empty'); }
    });
    // a dot on a closed category shows that's where the part in your hand came from
    cats.forEach(c => (c.wrap.className = 'cat' + (c.id === openCat ? ' open' : '') + (c.items.indexOf(sb.tool) >= 0 ? ' holding' : '')));
    refreshHand(sb);
  }

  /* ---------- the Move hand (always visible at the top of the shelf) ---------- */
  function refreshHand(sb) {
    const btn = $('btnHand'), held = $('holding');
    const hand = sb.tool === 'hand';
    btn.className = 'hand-btn' + (hand ? ' on' : '');
    btn.innerHTML = hand ? '✋ <span>Move</span>' : '✋ <span>Back to Move</span>';
    held.hidden = hand;
    if (!hand) {
      $('holdingName').textContent = nameOf(sb.tool);
      const c = $('holdingIcon');
      if (c.dataset.type !== sb.tool) { c.dataset.type = sb.tool; CL.art.drawIcon(c, kindOf(sb.tool), sb.tool); }
    }
  }

  /* ---------- toolbar ---------- */
  function bindToolbar(sb) {
    $('btnHand').onclick = () => sb.toHand();
    $('btnStart').onclick = () => sb.toggleStartStop();
    $('btnPause').onclick = () => sb.togglePause();
    $('btnUndo').onclick = () => sb.undo();
    $('btnRedo').onclick = () => sb.redo();
    $('btnSnap').onclick = () => sb.toggleSnap();
    $('btnSlow').onclick = () => sb.toggleSlow();
    $('btnTrails').onclick = () => sb.toggleTrails();
    $('btnClearBalls').onclick = () => sb.clearBalls();
    $('btnSave').onclick = () => saveFile(sb);
    $('btnOpen').onclick = () => $('fileOpen').click();
    $('fileOpen').onchange = e => openFile(sb, e.target);
  }

  function refreshToolbar(sb) {
    const build = sb.building;
    const start = $('btnStart');
    start.innerHTML = build ? '▶ <span>Start</span>' : '■ <span>Stop</span>';
    start.className = 'btn big ' + (build ? 'go' : 'stop');
    start.title = build ? 'Start the machine (Enter)' : 'Stop and go back to your build (Enter / R)';
    const pause = $('btnPause');
    pause.disabled = build;
    pause.innerHTML = (!build && !sb.running) ? '▶ <span>Play</span>' : '⏸ <span>Pause</span>';
    pause.classList.toggle('on', !build && !sb.running);
    $('btnUndo').disabled = !build || !sb.past.length;
    $('btnRedo').disabled = !build || !sb.future.length;
    $('btnSnap').disabled = !build;
    $('btnSnap').setAttribute('aria-pressed', sb.snap);
    $('btnSlow').setAttribute('aria-pressed', sb.slowmo);
    $('btnTrails').setAttribute('aria-pressed', sb.trails);
    document.body.classList.toggle('mode-run', !build);
    document.body.classList.toggle('mode-build', build);
  }

  /* ---------- save / open ---------- */
  function saveFile(sb) {
    const blob = new Blob([sb.exportLayout()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'my-contraption.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('💾 Saved! Look for my-contraption.json in your Downloads folder.');
  }

  function openFile(sb, input) {
    const f = input.files && input.files[0];
    input.value = '';
    if (!f) return;
    f.text().then(text => {
      try { sb.importLayout(text); } catch (err) { toast('😕 ' + err.message); }
    });
  }

  /* ---------- keyboard ---------- */
  function bindKeys(sb) {
    document.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); sb.undo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); sb.redo(); }
        else if (k === 's') { e.preventDefault(); saveFile(sb); }
        return;
      }
      if (k === 'enter') { e.preventDefault(); sb.toggleStartStop(); }
      else if (k === ' ') { e.preventDefault(); sb.toggleRun(); }
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); sb.remove(sb.selected); }
      else if (k === 'q') sb.rotateSelected(-5);
      else if (k === 'e') sb.rotateSelected(5);
      else if (k === 'r') sb.stop();
      else if (k === 'g') sb.toggleSnap();
      else if (k === 's') sb.toggleSlow();
      else if (k === 't') sb.toggleTrails();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'escape') sb.toHand();
    });
  }

  /* ---------- info card ---------- */
  function bars(label, n, cls) {
    let s = '<div class="stat"><span>' + label + '</span><div class="bar ' + cls + '">';
    for (let i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'f' : '') + '"></i>';
    return s + '</div></div>';
  }

  function modeCard(sb) {
    if (sb.building) {
      return '<div class="mode-card build"><b>🛠 Build mode</b>Arrange your parts. Nothing moves yet. ' +
        'Press <b>▶ Start</b> to test your idea.</div>';
    }
    return '<div class="mode-card run"><b>▶ Running!</b>Watch what happens. Press <b>■ Stop</b> to go back ' +
      'to your build and try a change.</div>';
  }

  /* live numbers for the selected thing: [label, valueFn, unit] */
  function liveRows(o) {
    if (o.kind === 'rigid') {
      return [['Speed', () => { const sp = o.held ? 0 : Math.hypot(o.vx, o.vy) / M; return sp < 0.05 ? '0' : sp.toFixed(1); }, 'm/s'],
        ['Tilt', () => { let d = Math.round(o.angle * 180 / Math.PI) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d + '°'; }, '']];
    }
    if (o.kind === 'ball') {
      const rows = [['Speed', () => { const sp = o.held ? 0 : Math.hypot(o.vx, o.vy) / M; return sp < 0.05 ? '0' : sp.toFixed(1); }, 'm/s'],
        ['Height', () => Math.max(0, (F - o.y - o.r) / M).toFixed(1), 'm']];
      if (o.def.creature) rows.push(['Mood', () => mood(o), '']);
      return rows;
    }
    const rows = [];
    if (o.def.axle) rows.push(['Turns', () => (Math.abs(o.omega) / TAU).toFixed(2), 'per sec']);
    if (o.def.conveyor) rows.push(['Belt speed', () => (Math.abs(o.omega) * CL.DRIVE.conveyorGain / M).toFixed(1), 'm/s']);
    if (o.def.gear) rows.push(['Teeth', () => o.def.teeth, '']);
    if (o.def.powered) rows.push(['Power', () => (o.powered ? '⚡ ON' : 'OFF'), '']);
    if (o.type === 'switch') rows.push(['Switch', () => (o.on ? 'ON' : 'OFF'), '']);
    if (o.type === 'hamster') rows.push(['Hamster', () => (o.running ? (o.jammed ? 'stuck!' : 'running') : 'asleep'), '']);
    if (o.def.pivoted) rows.push(['Tilt', () => Math.round(-o.angle * 180 / Math.PI) + '°', '']);
    if (o.def.flame) rows.push(['Flame', () => (o.lit ? '🔥 lit' : 'out'), '']);
    if (o.def.cutter) rows.push(['Power', () => (o.powered ? '⚡ ON' : 'OFF'), '']);
    return rows;
  }
  function mood(o) {
    return { sleep: '😴 asleep', idle: '🙂 calm', seek: '🧀 hungry', flee: '😱 scared', eat: '😋 munching', chase: '😼 chasing' }[o.state] || '🙂 calm';
  }

  function optionsHTML(sb, o) {
    const ops = o.def.options || [];
    if (!ops.length) return '';
    const can = sb.building && !o.locked;
    let h = '';
    ops.forEach(op => {
      h += '<div class="opt"><small>' + op.label + '</small><div class="seg">';
      op.values.forEach((v, i) => {
        h += '<button data-opt="' + op.key + '" data-i="' + i + '" class="' + (o.opts[op.key] === v[0] ? 'on' : '') + '"' +
          (can ? '' : ' disabled') + '>' + v[1] + '</button>';
      });
      h += '</div></div>';
    });
    if (!sb.building) h += '<p class="tip">Settings can be changed in build mode.</p>';
    return h;
  }

  function linkCard(sb, l) {
    const L = CL.LINKS[l.type];
    let h = modeCard(sb) + '<div class="info-head"><canvas id="infoIcon" data-kind="link" data-type="' + l.type + '"></canvas><h3>' + L.name + '</h3></div>';
    h += '<p>' + L.fact + '</p>';
    h += '<p class="tip">Joins the <b>' + l.a.def.name.toLowerCase() + '</b> and the <b>' + l.b.def.name.toLowerCase() + '</b>' +
      (l.via ? ', over the <b>pulley</b>' : '') + '.</p>';
    if (l.type === 'rope') h += '<div class="live"><div><small>Length</small><b>' + (l.L / M).toFixed(1) + '</b> m</div>' +
      '<div><small>Rope</small><b>' + ((l.slack || 0) > 2 ? 'floppy' : 'tight') + '</b></div></div>';
    if (sb.building) h += '<button class="danger" id="btnDelete">✂️ Remove ' + L.name.toLowerCase() + '</button>';
    return h;
  }

  function renderInfo(sb) {
    const el = $('info');
    const o = sb.selected;
    if (o && o.kind === 'link') {
      el.innerHTML = linkCard(sb, o);
      CL.art.drawIcon($('infoIcon'), 'link', o.type);
      if ($('btnDelete')) $('btnDelete').onclick = () => sb.remove(o);
      return;
    }
    if (!o && CL.LINKS[sb.tool]) {
      const L = CL.LINKS[sb.tool];
      el.innerHTML = modeCard(sb) + '<div class="info-head"><canvas id="infoIcon" data-kind="link" data-type="' + sb.tool + '"></canvas><h3>' + L.name + '</h3></div>' +
        '<p>' + L.fact + '</p><p class="notice">👉 ' + L.notice + '</p><p class="tip">Click the same two parts again to take it off.</p>';
      CL.art.drawIcon($('infoIcon'), 'link', sb.tool);
      return;
    }
    let kind, type;
    if (o) { kind = o.kind; type = o.type; }
    else if (CL.BALLS[sb.tool]) { kind = 'ball'; type = sb.tool; }
    else if (CL.RIGIDS[sb.tool]) { kind = 'rigid'; type = sb.tool; }
    else if (CL.SURFACES[sb.tool]) { kind = 'block'; type = sb.tool; }

    let h = modeCard(sb);
    if (!kind) {
      el.innerHTML = h + '<h3>✋ Move</h3><p>Drag things around the lab. Tap something to see what it does.</p>' +
        '<p>While it is running, <b>flick</b> a ball to throw it, or click a switch to flip it!</p>' + helpHTML();
      return;
    }
    const d = kind === 'ball' ? CL.BALLS[type] : kind === 'rigid' ? CL.RIGIDS[type] : CL.SURFACES[type];
    h += '<div class="info-head"><canvas id="infoIcon" data-kind="' + kind + '" data-type="' + type + '"></canvas><h3>' + d.name + '</h3></div>';
    (d.stats || []).forEach(s => (h += bars(s[0], s[1], s[2])));
    if (kind === 'ball' && d.gravityScale < 0) h += '<p class="badge">⬆ Floats up!</p>';
    if (o && o.jammed) h += '<p class="warn">⚠️ <b>Jammed!</b> These parts are locked together and can\u2019t turn. Look for gears in a loop, or two motors pulling against each other.</p>';
    h += '<p>' + d.fact + '</p><p class="notice">👀 ' + d.notice + '</p>';
    if (o) {
      h += optionsHTML(sb, o);
      const rows = liveRows(o);
      if (rows.length) {
        h += '<div class="live">' + rows.map((r, i) => '<div><small>' + r[0] + '</small><b id="live' + i + '">–</b> ' + r[2] + '</div>').join('') + '</div>';
      }
    }
    if (o && o.locked) h += '<p class="tip">🔩 This part is bolted down.</p>';
    else if (o && sb.hasHandle(o)) h += '<p class="tip">Drag the <b>yellow handle</b> to ' + (d.rotatable ? (d.stretchable ? 'turn or stretch' : 'turn') : 'stretch') + ' it.' + (d.rotatable ? ' Keys <kbd>Q</kbd> <kbd>E</kbd> also turn it.' : '') + '</p>';
    if (o && (d.axle || d.powered || d.powerSource) && sb.building) h += '<p class="tip">🔗 Use the <b>' + (d.axle ? 'Belt' : 'Power cord') + '</b> tool to join it to other machines.</p>';
    if (o && (d.ropeAnchor || d.pulley || kind === 'rigid') && sb.building) h += '<p class="tip">🪢 Use the <b>Rope</b> tool to tie things on.' + (kind === 'rigid' ? ' Keys <kbd>Q</kbd> <kbd>E</kbd> tilt it.' : '') + '</p>';
    if (o && !o.locked && (sb.building || sb.canEdit(o))) h += '<button class="danger" id="btnDelete">🗑 Remove</button>';
    else if (!o) h += '<p class="tip">Click in the lab to place one.</p>';
    el.innerHTML = h;
    CL.art.drawIcon($('infoIcon'), kind, type);
    if ($('btnDelete')) $('btnDelete').onclick = () => sb.remove(o);
    el.querySelectorAll('[data-opt]').forEach(btn => {
      btn.onclick = () => {
        const op = d.options.find(x => x.key === btn.dataset.opt);
        sb.setOption(o, op.key, op.values[+btn.dataset.i][0]);
      };
    });
    liveInfo(sb);
  }

  function liveInfo(sb) {
    const o = sb.selected;
    if (!o || o.kind === 'link') return;
    liveRows(o).forEach((r, i) => { const el = $('live' + i); if (el) el.textContent = r[1](); });
  }

  function helpHTML() {
    return '<div class="keys"><b>Shortcuts</b><br>' +
      '<kbd>Enter</kbd> start / stop · <kbd>Space</kbd> pause<br>' +
      '<kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Ctrl</kbd>+<kbd>Y</kbd> redo<br>' +
      '<kbd>G</kbd> snap · <kbd>S</kbd> slow-mo · <kbd>T</kbd> trails<br>' +
      '<kbd>F</kbd> full screen · <kbd>Del</kbd> remove<br>' +
      '<b>Right-click</b> or <kbd>Esc</kbd> puts down what you hold</div>';
  }

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4600);
  }

  /* ---------- full screen ---------- */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFullscreen() {
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const a = $('app');
      const req = a.requestFullscreen || a.webkitRequestFullscreen;
      if (req) req.call(a);
    }
  }
  function initFullscreen() {
    const btn = $('btnFull');
    const a = $('app');
    if (!(a.requestFullscreen || a.webkitRequestFullscreen)) { btn.hidden = true; return; }
    btn.onclick = toggleFullscreen;
    const upd = () => {
      const on = !!fsEl();
      btn.innerHTML = on ? '🗗 <span>Exit full screen</span>' : '⛶ <span>Full screen</span>';
      document.body.classList.toggle('is-fullscreen', on);
    };
    document.addEventListener('fullscreenchange', upd);
    document.addEventListener('webkitfullscreenchange', upd);
    upd();
  }

  CL.UI = { init, toast };
})(window.CL = window.CL || {});
