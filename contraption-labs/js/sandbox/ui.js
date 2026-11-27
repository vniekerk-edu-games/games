/* Contraption Labs — ui.js
 * Shelf, toolbar, info card, keyboard shortcuts and full-screen mode.
 */
(function (CL) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = CL.WORLD.pxPerMetre, F = CL.WORLD.floorY;

  function init(sb) {
    buildShelf(sb);
    bindToolbar(sb);
    bindKeys(sb);
    initFullscreen();
    const stage = $('stage');
    new ResizeObserver(() => sb.renderer.resize()).observe(stage);

    sb.on((type, data) => {
      if (type === 'change' || type === 'select') { refreshShelf(sb); refreshToolbar(sb); renderInfo(sb); }
      if (type === 'tick') liveInfo(sb);
      if (type === 'toast') toast(data);
    });
    refreshShelf(sb); refreshToolbar(sb); renderInfo(sb);
  }

  /* ---------- shelf ---------- */
  function shelfButton(label, html, onClick, data) {
    const b = document.createElement('button');
    b.className = 'shelf-item';
    b.innerHTML = html + '<span>' + label + '</span>';
    b.addEventListener('click', onClick);
    Object.keys(data || {}).forEach(k => (b.dataset[k] = data[k]));
    return b;
  }

  function buildShelf(sb) {
    const balls = $('shelfBalls'), build = $('shelfBuild'), exp = $('shelfExperiments');
    build.appendChild(shelfButton('Move', '<i class="emoji">✋</i>', () => sb.setTool('hand'), { tool: 'hand' }));
    CL.SHELF.balls.forEach(t => balls.appendChild(
      shelfButton(CL.BALLS[t].name, '<canvas data-kind="ball" data-type="' + t + '"></canvas>', () => sb.setTool(t), { tool: t })));
    CL.SHELF.build.forEach(t => build.appendChild(
      shelfButton(CL.SURFACES[t].name, '<canvas data-kind="block" data-type="' + t + '"></canvas>', () => sb.setTool(t), { tool: t })));
    CL.PRESET_ORDER.forEach(id => {
      const p = CL.PRESETS[id];
      exp.appendChild(shelfButton(p.name, '<i class="emoji">' + p.icon + '</i>', () => sb.loadPreset(id), { preset: id }));
    });
    requestAnimationFrame(() => document.querySelectorAll('.shelf canvas').forEach(c =>
      CL.art.drawIcon(c, c.dataset.kind, c.dataset.type)));
  }

  function refreshShelf(sb) {
    document.querySelectorAll('.shelf-item[data-tool]').forEach(b =>
      b.classList.toggle('active', b.dataset.tool === sb.tool));
  }

  /* ---------- toolbar ---------- */
  function bindToolbar(sb) {
    $('btnPlay').onclick = () => sb.toggleRun();
    $('btnReset').onclick = () => sb.reset();
    $('btnSlow').onclick = () => sb.toggleSlow();
    $('btnTrails').onclick = () => sb.toggleTrails();
    $('btnClearBalls').onclick = () => sb.clearBalls();
  }

  function refreshToolbar(sb) {
    $('btnPlay').innerHTML = sb.running ? '⏸ <span>Pause</span>' : '▶ <span>Play</span>';
    $('btnPlay').classList.toggle('on', !sb.running);
    $('btnSlow').setAttribute('aria-pressed', sb.slowmo);
    $('btnTrails').setAttribute('aria-pressed', sb.trails);
  }

  function bindKeys(sb) {
    document.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); sb.toggleRun(); }
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); sb.remove(sb.selected); }
      else if (k === 'q') sb.rotateSelected(-5);
      else if (k === 'e') sb.rotateSelected(5);
      else if (k === 'r') sb.reset();
      else if (k === 's') sb.toggleSlow();
      else if (k === 't') sb.toggleTrails();
      else if (k === 'f') toggleFullscreen();
      else if (k === 'escape') sb.select(null);
    });
  }

  /* ---------- info card ---------- */
  function bars(label, n, cls) {
    let s = '<div class="stat"><span>' + label + '</span><div class="bar ' + cls + '">';
    for (let i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'f' : '') + '"></i>';
    return s + '</div></div>';
  }

  function renderInfo(sb) {
    const el = $('info');
    const o = sb.selected;
    let kind, type;
    if (o) { kind = o.kind; type = o.type; }
    else if (CL.BALLS[sb.tool]) { kind = 'ball'; type = sb.tool; }
    else if (CL.SURFACES[sb.tool]) { kind = 'block'; type = sb.tool; }

    if (!kind) {
      el.innerHTML = '<h3>✋ Move tool</h3><p>Drag things around the lab.</p>' +
        '<p><b>Flick</b> a ball to throw it. A quick flick throws it harder!</p>' + helpHTML();
      return;
    }
    const d = kind === 'ball' ? CL.BALLS[type] : CL.SURFACES[type];
    let h = '<div class="info-head"><canvas id="infoIcon" data-kind="' + kind + '" data-type="' + type + '"></canvas><h3>' + d.name + '</h3></div>';
    if (kind === 'ball') {
      h += bars('Weight', d.stats.weight, 'w') + bars('Bounce', d.stats.bounce, 'b') + bars('Air push', d.stats.air, 'a');
      if (d.gravityScale < 0) h += '<p class="badge">⬆ Floats up!</p>';
    } else {
      h += bars('Grip', d.stats.grip, 'w') + bars('Spring', d.stats.spring, 'b');
    }
    h += '<p>' + d.fact + '</p><p class="notice">👀 ' + d.notice + '</p>';
    if (o && kind === 'ball') {
      h += '<div class="live"><div><small>Speed</small><b id="liveSpeed">0</b> m/s</div>' +
        '<div><small>Height</small><b id="liveHeight">0</b> m</div></div>';
    }
    if (o && kind === 'block') h += '<p class="tip">Drag the <b>yellow handle</b> to turn or stretch it. Keys <kbd>Q</kbd> <kbd>E</kbd> also turn it.</p>';
    if (o) h += '<button class="danger" id="btnDelete">🗑 Remove</button>';
    else h += '<p class="tip">Click in the lab to place one.</p>';
    el.innerHTML = h;
    CL.art.drawIcon($('infoIcon'), kind, type);
    if (o) $('btnDelete').onclick = () => sb.remove(o);
    liveInfo(sb);
  }

  function liveInfo(sb) {
    const o = sb.selected;
    if (!o || o.kind !== 'ball') return;
    const s = $('liveSpeed'), hgt = $('liveHeight');
    if (!s) return;
    const sp = o.held ? 0 : Math.hypot(o.vx, o.vy) / M;
    s.textContent = sp < 0.05 ? '0' : sp.toFixed(1);
    hgt.textContent = Math.max(0, (F - o.y - o.r) / M).toFixed(1);
  }

  function helpHTML() {
    return '<div class="keys"><b>Shortcuts</b><br><kbd>Space</kbd> pause/play · <kbd>R</kbd> reset<br>' +
      '<kbd>S</kbd> slow-mo · <kbd>T</kbd> trails · <kbd>F</kbd> full screen<br><kbd>Del</kbd> remove selected</div>';
  }

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
  }

  /* ---------- full screen ---------- */
  const app = () => $('app');
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFullscreen() {
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const a = app();
      const req = a.requestFullscreen || a.webkitRequestFullscreen;
      if (req) req.call(a);
    }
  }
  function initFullscreen() {
    const btn = $('btnFull');
    const a = app();
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
