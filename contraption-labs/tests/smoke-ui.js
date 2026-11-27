/* Contraption Labs — whole-game test in a mock browser (no real browser needed).
 * Drives the real game code with fake mouse/keyboard input.
 * Run from the project folder:   node tests/smoke-ui.js
 */
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const noop = () => {};

/* ---------- fake browser ---------- */
const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 50 }) :
  (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : noop),
  set: (t, k, v) => (t[k] = v, true) });
const listeners = {};
function el(id) {
  return { id, style: {}, dataset: {}, children: [], hidden: false, disabled: false, title: '', className: '',
    classList: { add: noop, remove: noop, toggle: noop },
    _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; }, setAttribute: noop, querySelector: () => null,
    addEventListener(t, f) { (listeners[id + ':' + t] = listeners[id + ':' + t] || []).push(f); },
    getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    setPointerCapture: noop, clientWidth: 1280, clientHeight: 720, width: 0, height: 0, requestFullscreen: noop };
}
const els = {};
const store = {};
global.window = global;
global.devicePixelRatio = 2;
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
global.document = { readyState: 'complete', body: el('body'), getElementById: id => els[id] || (els[id] = el(id)),
  createElement: () => el('x'), querySelectorAll: () => [], addEventListener: (t, f) => (listeners['doc:' + t] = f) };
global.ResizeObserver = class { observe() {} };
let frames = [], clock = 0;
global.requestAnimationFrame = f => frames.push(f);
global.performance = { now: () => clock };

/* load the game exactly as index.html does */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"/g)].forEach(m => require(path.join(ROOT, m[1])));
const CL = global.CL, sb = CL.sandbox;

/* ---------- helpers ---------- */
function runFrames(n) { for (let i = 0; i < n; i++) { clock += 16.7; const f = frames; frames = []; f.forEach(fn => fn(clock)); } }
const S = 0.8; // 1280x720 canvas shows the 1600x900 lab at 0.8 scale
const fire = (t, x, y, extra) => (listeners['lab:' + t] || []).forEach(f => f(Object.assign(
  { clientX: x * S, clientY: y * S, pointerId: 1, pointerType: 'mouse', button: 0, shiftKey: false, preventDefault: noop }, extra)));
const click = (x, y) => { fire('pointerdown', x, y); fire('pointerup', x, y); };
const drag = (x1, y1, x2, y2) => { fire('pointerdown', x1, y1); fire('pointermove', x2, y2); fire('pointerup', x2, y2); };
const key = (k, mods) => listeners['doc:keydown'](Object.assign({ key: k, target: { closest: () => null }, preventDefault: noop }, mods));
const parts = () => sb.world.blocks.filter(k => !k.fixed).length + sb.world.balls.length;
const posKey = () => JSON.stringify(sb.world.balls.map(b => [b.x, b.y]));
let pass = 0, fail = 0;
const check = (n, c, info) => { console.log((c ? '  PASS ' : '  FAIL ') + n + (info ? '  — ' + info : '')); c ? pass++ : fail++; };

/* ---------- 1. boot ---------- */
console.log('\n1. Start-up');
runFrames(100);
check('boots into BUILD mode with the bounce test', sb.mode === 'build' && sb.world.balls.length === 6);
const y0 = sb.world.balls[0].y;
runFrames(100);
check('nothing moves in build mode', sb.world.balls[0].y === y0);
check('first build autosaved', !!store['contraption-labs.sandbox.v1']);

/* ---------- 2. build → run → stop ---------- */
console.log('\n2. Start and Stop');
const built = posKey();
key('Enter');
check('Enter starts the machine', sb.mode === 'run');
runFrames(90);
check('balls fall while running', sb.world.balls[0].y > y0 + 100);
key('Enter');
check('Stop returns to build mode', sb.mode === 'build');
check('Stop puts every ball back exactly where it was built', posKey() === built);
check('trails from the last run stay visible faintly', sb.ghostTrails.length === 6);

/* ---------- 3. determinism ---------- */
console.log('\n3. Same build = same result');
function runSteps(n) { sb.start(); for (let i = 0; i < n; i++) sb.world.step(); const r = posKey(); sb.stop(); return r; }
const runA = runSteps(500), runB = runSteps(500);
check('two runs of the same build end identically', runA === runB);

/* ---------- 4. building, handle, undo/redo ---------- */
console.log('\n4. Building with undo');
sb.loadPreset('empty');
check('empty lab loaded', parts() === 0);
sb.setTool('wood');
click(803, 497);
const plank = sb.world.blocks.find(k => !k.fixed);
check('click places a plank, snapped to the 10 px grid', plank && plank.x === 800 && plank.y === 500);
const h = sb.handlePos(plank);
drag(h.x, h.y, 800 + 150, 500 + 150);
check('yellow handle turns the plank to 45°', Math.abs(plank.angle - Math.PI / 4) < 1e-9);
key('z', { ctrlKey: true });
let p2 = sb.world.blocks.find(k => !k.fixed);
check('Ctrl+Z undoes the turn', p2 && p2.angle === 0);
key('z', { ctrlKey: true });
check('Ctrl+Z again removes the plank', parts() === 0);
key('y', { ctrlKey: true }); key('y', { ctrlKey: true });
p2 = sb.world.blocks.find(k => !k.fixed);
check('Ctrl+Y redoes both steps', p2 && Math.abs(p2.angle - Math.PI / 4) < 1e-4);
key('z', { ctrlKey: true }); // back to a flat plank at (800, 500)

/* ---------- 5. placement rules ---------- */
console.log('\n5. Placement rules');
sb.setTool('tennis');
click(800, 400);                    // place a ball in the air...
drag(800, 400, 800, 500);           // ...then drag it right onto the plank
const tb = sb.world.balls[0];
const onTop = tb && Math.abs(tb.y - (500 - 8 - 11)) < 1 && sb._ballClear(tb);
check('ball dropped onto a plank settles on top of it', onTop, tb && 'y=' + tb.y.toFixed(1));
const before = sb.world.balls.length;
click(tb.x, tb.y - 2); // grabs the existing ball (doesn't place a new one)
check('clicking an existing ball picks it up instead of adding another', sb.world.balls.length === before);
sb.setTool('bowling');
sb.select(null);
const bx = tb.x, by = tb.y;
fire('pointerdown', 300, 300); fire('pointermove', bx, by - 25); fire('pointerup', bx, by - 25);
check('a ball dropped where another ball is gets refused', sb.world.balls.length === before);
sb.setTool('wood');
click(400, 700);
const p3 = sb.world.blocks.filter(k => !k.fixed)[1];
drag(400, 700, bx, by);
check('a plank dragged onto a ball goes back where it was', p3.x === 400 && p3.y === 700);

/* ---------- 6. free play while running (sandbox) ---------- */
console.log('\n6. Free play while running');
const buildCount = parts();
sb.start();
sb.setTool('tennis');
fire('pointerdown', 300, 200);
for (let i = 1; i <= 5; i++) { clock += 10; fire('pointermove', 300 + i * 20, 200); }
fire('pointerup', 400, 200);
const thrown = sb.world.balls.find(b => b.vx > 500);
check('flicking a ball while running throws it', !!thrown);
runFrames(30);
sb.stop();
check('things added while running vanish on Stop', parts() === buildCount);

/* ---------- 7. save file / open file ---------- */
console.log('\n7. Save and open');
const saved = sb.exportLayout();
sb.loadPreset('crash');
sb.importLayout(saved);
check('a saved file opens back to the same build', JSON.stringify(sb.serialize()) === JSON.stringify(JSON.parse(saved)));
let err = '';
try { sb.importLayout('{"hello": 1}'); } catch (e) { err = e.message; }
check('a wrong file gives a friendly message', err === 'That is not a Contraption Labs file.', err);
const odd = sb.importLayout(JSON.stringify({ parts: [{ type: 'rocket', x: 1, y: 1 }, { type: 'tennis', x: 99999, y: 100 }] }));
check('unknown parts are skipped and positions kept inside the lab', odd.skipped === 1 && odd.parts[0].x === 1600);

/* ---------- 8. level groundwork: parts bin + bolted-down parts ---------- */
console.log('\n8. Parts bin and bolted parts (for levels)');
const lv = new CL.Sandbox(document.getElementById('lab2'), { freePlay: false, bin: { tennis: 1 }, autosave: false });
lv.restore(CL.Layout.parse({ parts: [{ type: 'wood', x: 800, y: 600, length: 400, angle: 0, locked: true }] }));
lv.tool = 'tennis';
const fireLv = (t, x, y) => (listeners['lab2:' + t] || []).forEach(f => f({ clientX: x * S, clientY: y * S, pointerId: 1, pointerType: 'mouse', button: 0, preventDefault: noop }));
fireLv('pointerdown', 300, 300); fireLv('pointerup', 300, 300);
fireLv('pointerdown', 500, 300); fireLv('pointerup', 500, 300);
check('bin limits parts (only 1 tennis ball allowed)', lv.world.balls.length === 1 && lv.remaining('tennis') === 0);
const locked = lv.world.blocks.find(k => k.locked);
fireLv('pointerdown', 800, 600); fireLv('pointermove', 900, 400); fireLv('pointerup', 900, 400);
check('bolted-down plank cannot be dragged', locked.x === 800 && locked.y === 600);
lv.remove(locked);
check('bolted-down plank cannot be removed', lv.world.blocks.indexOf(locked) >= 0);
lv.start();
const lb = lv.world.balls[0], ly = lb.y;
fireLv('pointerdown', lb.x, lb.y); fireLv('pointermove', lb.x + 200, lb.y); fireLv('pointerup', lb.x + 200, lb.y);
check('levels: hands off while running', Math.abs(lb.x - 300) < 1 && lb.y === ly);

/* ---------- 9. UI ---------- */
console.log('\n9. Toolbar and info');
check('Start button shows ▶ Start in build mode', els.btnStart.innerHTML.indexOf('Start') >= 0);
sb.start(); runFrames(2);
check('...and ■ Stop while running', els.btnStart.innerHTML.indexOf('Stop') >= 0 && !els.btnPause.disabled);
check('Undo is disabled while running', els.btnUndo.disabled === true);
key(' ');
check('Space pauses while running', sb.running === false);
sb.stop();
check('info card shows the build-mode guide', els.info.innerHTML.indexOf('Build mode') >= 0);
for (const id of CL.PRESET_ORDER) { sb.loadPreset(id); sb.start(); runFrames(120); sb.stop(); }
check('every experiment runs in the full game loop without errors', true);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
