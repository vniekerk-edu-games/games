/* Contraption Labs — whole-game test in a mock browser (no real browser needed).
 * Drives the real game code with fake mouse/keyboard input.
 * Run from the project folder:   node tests/smoke-ui.js
 */
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const noop = () => {};

/* ---------- fake browser ---------- */
let drawCalls = 0;
const ctx2d = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'measureText' ? () => ({ width: 50 }) :
  (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : () => { drawCalls++; }),
  set: (t, k, v) => (t[k] = v, true) });
const listeners = {};
function el(id) {
  return { id, style: {}, dataset: {}, children: [], hidden: false, disabled: false, title: '', className: '', value: '',
    classList: { add: noop, remove: noop, toggle: noop },
    _html: '', set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    set textContent(v) { this._text = v; }, get textContent() { return this._text; },
    appendChild(c) { this.children.push(c); return c; }, setAttribute: noop, querySelector: () => null, querySelectorAll: () => [],
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
const userParts = () => sb.world.blocks.filter(k => !k.fixed).length + sb.world.balls.length;
const posKey = () => JSON.stringify(sb.world.balls.map(b => [b.x, b.y]));
const findBlock = t => sb.world.blocks.find(k => k.type === t);
let pass = 0, fail = 0;
const check = (n, c, info) => { console.log((c ? '  PASS ' : '  FAIL ') + n + (info ? '  — ' + info : '')); c ? pass++ : fail++; };

/* ---------- 1. boot ---------- */
console.log('\n1. Start-up');
runFrames(100);
check('boots into BUILD mode with the Mouse power experiment', sb.mode === 'build' && !!findBlock('hamster') && sb.world.links.length === 3);
const y0 = sb.world.balls[0].y;
runFrames(100);
check('nothing moves in build mode', sb.world.balls[0].y === y0);
check('first build autosaved', !!store['contraption-labs.sandbox.v1']);

/* ---------- 2. build → run → stop ---------- */
console.log('\n2. Start and Stop');
const built = posKey();
key('Enter');
check('Enter starts the machine', sb.mode === 'run');
runFrames(200);
check('the hamster wakes and the conveyor turns while running', findBlock('hamster').running && findBlock('conveyor').omega > 0);
key('Enter');
check('Stop returns to build mode with everything back in place', sb.mode === 'build' && posKey() === built);
check('...hamster asleep again, belts still fitted', !findBlock('hamster').running && sb.world.links.length === 3);

/* ---------- 3. determinism ---------- */
console.log('\n3. Same build = same result');
function runSteps(n) { sb.start(); for (let i = 0; i < n; i++) sb.world.step(); const r = posKey(); sb.stop(); return r; }
check('two runs of the chain reaction end identically', runSteps(900) === runSteps(900));

/* ---------- 4. building with undo ---------- */
console.log('\n4. Building with undo');
sb.loadPreset('empty');
check('empty lab loaded', userParts() === 0 && sb.world.links.length === 0);
sb.setTool('wood');
click(803, 497);
const plank = sb.world.blocks.find(k => !k.fixed);
check('click places a plank, snapped to the grid', plank && plank.x === 800 && plank.y === 500);
const h = sb.handlePos(plank);
drag(h.x, h.y, 950, 650);
check('yellow handle turns the plank to 45°', Math.abs(plank.angle - Math.PI / 4) < 1e-9);
key('z', { ctrlKey: true });
check('Ctrl+Z undoes the turn', sb.world.blocks.find(k => !k.fixed).angle === 0);
key('z', { ctrlKey: true });
check('Ctrl+Z again removes the plank', userParts() === 0);
key('y', { ctrlKey: true }); key('y', { ctrlKey: true });
check('Ctrl+Y redoes both steps', Math.abs(sb.world.blocks.find(k => !k.fixed).angle - Math.PI / 4) < 1e-4);
key('z', { ctrlKey: true });

/* ---------- 5. placement rules ---------- */
console.log('\n5. Placement rules');
sb.setTool('tennis');
click(800, 400); drag(800, 400, 800, 500);
const tb = sb.world.balls[0];
check('ball dropped onto a plank settles on top of it', tb && Math.abs(tb.y - (500 - 8 - 11)) < 1);
sb.setTool('bowling'); sb.select(null);
fire('pointerdown', 300, 300); fire('pointermove', tb.x, tb.y - 25); fire('pointerup', tb.x, tb.y - 25);
check('a ball dropped onto another ball is refused', sb.world.balls.length === 1);

/* ---------- 6. gears and belts ---------- */
console.log('\n6. Gears, belts and cords');
sb.loadPreset('empty');
sb.setTool('motor'); click(300, 400);
sb.setTool('gearLarge'); click(600, 400);
sb.setTool('gearSmall'); click(600 + 95, 404);
const big = findBlock('gearLarge'), small = findBlock('gearSmall');
check('a small gear dropped near a big gear clicks into mesh', Math.abs(Math.hypot(small.x - big.x, small.y - big.y) - 90) < 1e-6);
sb.setTool('belt'); click(300, 400); click(600, 400);
check('belt tool: click motor, then gear → belt fitted', sb.world.links.length === 1 && sb.world.links[0].type === 'belt');
sb.setTool('belt'); click(300, 400); click(600, 400);
check('click the same two again → belt removed', sb.world.links.length === 0);
key('z', { ctrlKey: true });
check('Undo puts the belt back', sb.world.links.length === 1);
sb.setTool('cord'); click(600, 400);
check('cord tool refuses a gear', !sb.linkFrom);
sb.setTool('switch'); click(150, 845);
sb.setTool('cord'); click(150, 845); click(300, 400);
check('cord from switch to motor', sb.world.links.some(l => l.type === 'cord'));
const sw = findBlock('switch');
sb.select(sw); sb.setOption(sw, 'on', true);
check('switch set to start ON (saved in the build)', sb.serialize().parts.find(p => p.type === 'switch').on === true);
sb.start(); runFrames(30);
check('running: switch → motor → belt → big gear → small gear turns twice as fast',
  findBlock('gearSmall').omega === -2 * findBlock('gearLarge').omega && findBlock('gearLarge').omega === 10);
const mx = findBlock('motor').x;
drag(300, 400, 500, 300);                  // (cord tool still selected: acts like Move while running)
sb.setTool('hand'); drag(300, 400, 500, 300);
check('machines stay put while running', findBlock('motor').x === mx);
click(150, 845);
sb.setTool('cord'); runFrames(2);
check('clicking a switch while running flips it OFF', findBlock('switch').on === false || (click(150, 845), false));
runFrames(2);
check('...and the gears stop', findBlock('gearLarge').omega === 0);
sb.stop();
check('Stop brings the switch back to ON', findBlock('switch').on === true);
sb.select(findBlock('gearLarge')); key('Delete');
check('removing a gear also removes its belt', !sb.world.links.some(l => l.type === 'belt'));

/* ---------- 7. free play while running ---------- */
console.log('\n7. Free play while running');
sb.loadPreset('empty');
sb.start();
sb.setTool('tennis');
fire('pointerdown', 300, 200);
for (let i = 1; i <= 5; i++) { clock += 10; fire('pointermove', 300 + i * 20, 200); }
fire('pointerup', 400, 200);
check('flicking a ball while running throws it', sb.world.balls.some(b => b.vx > 500));
sb.stop();
check('things added while running vanish on Stop', userParts() === 0);

/* ---------- 8. save file / open file ---------- */
console.log('\n8. Save and open');
sb.loadPreset('chain');
const saved = sb.exportLayout();
sb.loadPreset('empty');
sb.importLayout(saved);
check('a saved chain reaction opens with all its belts and cords', JSON.stringify(sb.serialize()) === JSON.stringify(JSON.parse(saved)));
let err = '';
try { sb.importLayout('{"hello": 1}'); } catch (e) { err = e.message; }
check('a wrong file gives a friendly message', err === 'That is not a Contraption Labs file.');

/* ---------- 9. levels groundwork ---------- */
console.log('\n9. Parts bin and bolted parts (for levels)');
const lv = new CL.Sandbox(document.getElementById('lab2'), { freePlay: false, bin: { tennis: 1, belt: 1 }, autosave: false });
lv.restore(CL.Layout.parse({ parts: [{ id: 1, type: 'wood', x: 800, y: 600, length: 400, angle: 0, locked: true }] }));
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

/* ---------- 10. drawing ---------- */
console.log('\n10. Drawing every part');
let artErr = '';
try {
  CL.SHELF.sections.forEach(s => s.items.forEach(t => {
    if (t === 'hand') return;
    CL.art.drawIcon(el('icon'), CL.LINKS[t] ? 'link' : CL.BALLS[t] ? 'ball' : CL.RIGIDS[t] ? 'rigid' : 'block', t);
  }));
} catch (e) { artErr = e.stack; }
check('every shelf icon draws', !artErr, artErr.split('\n').slice(0, 2).join(' '));
artErr = '';
try {
  for (const id of CL.PRESET_ORDER) {
    sb.loadPreset(id); sb.trails = true; runFrames(3);
    sb.start(); runFrames(240); sb.stop(); runFrames(2);
  }
} catch (e) { artErr = e.stack; }
check('every experiment draws and runs in the full game loop', !artErr, artErr.split('\n').slice(0, 3).join(' '));
artErr = '';
try {
  for (const t of ['gearLarge', 'motor', 'conveyor', 'cat', 'mouse', 'switch', 'fan', 'hamster', 'seesaw']) {
    sb.loadPreset('chain');
    const o = sb.world.blocks.find(k => k.type === t) || sb.world.balls.find(b => b.type === t) || (sb.setTool(t), click(1200, 200), sb.selected);
    sb.select(o); runFrames(1);
  }
  sb.select(sb.world.links[0]); runFrames(1);
  sb.setTool('belt'); click(330, 600); fire('pointermove', 800, 300); runFrames(1);
} catch (e) { artErr = e.stack; }
check('info cards, selections and the belt preview draw', !artErr, artErr.split('\n').slice(0, 3).join(' '));

/* ---------- 11. Stage 4: boxes and ropes ---------- */
console.log('\n11. Dominoes, ropes and pulleys (mouse clicks)');
sb.setTool('hand'); sb.loadPreset('empty');
sb.setTool('domino'); click(600, 845);
const dom = sb.world.rigids[0];
check('a domino dropped near the floor stands on it', dom && Math.abs(dom.y - (CL.WORLD.floorY - 30)) < 1);
sb.select(dom); key('e');
check('Q/E tilts a domino in build mode', Math.abs(dom.angle - 5 * Math.PI / 180) < 1e-9);
key('q');
sb.setTool('domino'); click(612, 845);
check('a second domino can\u2019t go inside the first', sb.world.rigids.length === 1);
sb.setTool('pulley'); click(800, 200);
sb.setTool('hook'); click(300, 150);
sb.setTool('bucket'); click(760, 500);
sb.setTool('crate'); click(840, 500);
sb.setTool('bowling'); click(300, 400);
sb.setTool('rope');
click(760, 480); click(800, 200); click(840, 500);
const r1 = sb.world.links.find(l => l.type === 'rope');
check('rope tool: bucket → pulley → crate makes a pulley rope', r1 && r1.via && r1.via.type === 'pulley' && r1.a.type === 'bucket' && r1.b.type === 'crate');
click(300, 400); click(300, 150);
check('rope tool: ball → hook', sb.world.links.filter(l => l.type === 'rope').length === 2);
sb.setTool('rope'); click(800, 200);
check('starting a rope on a pulley is refused (pulleys go in the middle)', !sb.linkFrom);
const savedL = r1.L;
sb.setTool('hand'); drag(840, 500, 840, 600);
check('moving the crate in build mode makes the rope longer', sb.world.links.find(l => l.via).L > savedL + 90);
key('z', { ctrlKey: true });
sb.start(); runFrames(60);
check('running: the rope holds the ball up under its hook', Math.abs(sb.world.balls[0].y - 400) < 2);
sb.stop();
check('Stop puts the ropes back', sb.world.links.filter(l => l.type === 'rope').length === 2);
sb.select(sb.world.links.find(l => l.type === 'rope' && !l.via)); key('Delete');
check('a selected rope can be deleted', sb.world.links.filter(l => l.type === 'rope').length === 1);
sb.setTool('candle'); click(1200, 820);
const cnd = sb.world.blocks.find(k => k.type === 'candle');
sb.select(cnd); sb.setOption(cnd, 'lit', false);
check('candle can be set to start unlit (saved)', sb.serialize().parts.find(p => p.type === 'candle').lit === false);
sb.setTool('crate'); sb.start();
fire('pointerdown', 840, 500); for (let i = 1; i <= 5; i++) { clock += 10; fire('pointermove', 840 + i * 15, 500); } fire('pointerup', 915, 500);
check('a crate can be grabbed and flung while running', sb.world.rigids.find(r => r.type === 'crate').vx > 300);
sb.stop();
let e4 = '';
try { for (const id of ['dominoes', 'pulley', 'swing', 'balloon', 'snip']) { sb.loadPreset(id); sb.start(); runFrames(300); sb.stop(); } } catch (e) { e4 = e.stack; }
check('all Stage 4 experiments run in the full game loop', !e4, e4.split('\n').slice(0, 3).join(' '));

/* ---------- 12. toolbar ---------- */
console.log('\n11. Toolbar');
sb.setTool('hand'); sb.loadPreset('gears');
check('Start button shows ▶ Start in build mode', els.btnStart.innerHTML.indexOf('Start') >= 0);
sb.start(); runFrames(2);
check('...and ■ Stop while running', els.btnStart.innerHTML.indexOf('Stop') >= 0 && !els.btnPause.disabled);
key(' ');
check('Space pauses while running', sb.running === false);
sb.stop();

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
