/* Smoke test: runs the full game (renderer, sandbox, UI) against a fake browser.
 * Catches runtime errors without needing a real browser.  node tests/smoke-ui.js */
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const noop = () => {};
const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 50 }) :
  (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : noop),
  set: (t, k, v) => (t[k] = v, true) });
const listeners = {};
function el(id) {
  const e = { id, style: {}, dataset: {}, children: [], classList: { add: noop, remove: noop, toggle: noop },
    _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; }, setAttribute: noop, addEventListener(t, f) { (listeners[id + ':' + t] = listeners[id + ':' + t] || []).push(f); },
    getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    setPointerCapture: noop, clientWidth: 1280, clientHeight: 720, width: 0, height: 0, requestFullscreen: noop };
  return e;
}
const els = {};
global.window = global;
global.devicePixelRatio = 2;
global.document = { readyState: 'complete', body: el('body'), getElementById: id => els[id] || (els[id] = el(id)),
  createElement: () => el('x'), querySelectorAll: () => [], addEventListener: (t, f) => (listeners['doc:' + t] = f) };
global.ResizeObserver = class { observe() {} };
let frames = [];
global.requestAnimationFrame = f => frames.push(f);
global.performance = { now: () => clock };
let clock = 0;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
scripts.forEach(s => require(path.join(ROOT, s)));
const CL = global.CL, sb = CL.sandbox;
function runFrames(n) { for (let i = 0; i < n; i++) { clock += 16.7; const f = frames; frames = []; f.forEach(fn => fn(clock)); } }
const fire = (t, x, y, extra) => listeners['lab:' + t].forEach(f => f(Object.assign({ clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, preventDefault: noop }, extra)));
let ok = true; const check = (n, c) => { console.log((c ? '  PASS ' : '  FAIL ') + n); ok = ok && c; };

runFrames(200);
check('boots with bounce test (6 balls)', sb.world.balls.length === 6);
// world→screen: scale = min(1280/1600, 720/900)=0.8
const S = 0.8, sx = x => x * S, sy = y => y * S;
for (const id of CL.PRESET_ORDER) { sb.loadPreset(id); runFrames(120); }
check('all presets run in the UI loop', true);
sb.loadPreset('empty'); sb.setTool('wood');
fire('pointerdown', sx(800), sy(500)); fire('pointerup', sx(800), sy(500));
check('click places a plank', sb.world.blocks.filter(k => !k.fixed).length === 1);
const plank = sb.selected, h = sb.handlePos(plank);
fire('pointerdown', sx(h.x), sy(h.y)); fire('pointermove', sx(800 + 150), sy(500 + 150), {}); fire('pointerup', sx(950), sy(650));
check('handle rotates plank to 45°', Math.abs(plank.angle - Math.PI / 4) < 1e-9);
sb.setTool('tennis');
fire('pointerdown', sx(300), sy(200));
for (let i = 1; i <= 5; i++) { clock += 10; fire('pointermove', sx(300 + i * 20), sy(200)); }
fire('pointerup', sx(400), sy(200));
const ball = sb.world.balls[0];
check('flick throws the ball to the right', ball && ball.vx > 500);
sb.toggleTrails(); runFrames(300);
check('trails record', sb.trailMap.size === 1);
listeners['doc:keydown']({ key: 'Delete', target: { closest: () => null }, preventDefault: noop });
check('Delete removes selected', sb.world.balls.length === 0);
listeners['doc:keydown']({ key: ' ', target: { closest: () => null }, preventDefault: noop });
check('Space pauses', !sb.running);
sb.toggleSlow(); sb.toggleRun(); runFrames(60);
check('info card renders', els.info.innerHTML.length > 50);
console.log(ok ? '\nUI smoke test passed\n' : '\nUI smoke test FAILED\n');
process.exit(ok ? 0 : 1);
