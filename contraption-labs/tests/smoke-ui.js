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
check('opens on the puzzle list', els.overlay.hidden === false && els.overlayCard.innerHTML.indexOf('Puzzles') >= 0);
CL.UI.hideOverlay();
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

/* ---------- 12. shelf categories and the Move hand ---------- */
console.log('\n12. Folding shelf and the Move hand');
const cats = els.shelf.children.slice(-(CL.SHELF.sections.length + 1));
check('shelf has one folding category per section, plus Experiments', cats.length === CL.SHELF.sections.length + 1 &&
  cats.every(c => c.children.length === 2));
const openCount = () => cats.filter(c => !c.children[1].hidden).length;
check('only one category is open at a time', openCount() === 1);
cats[3].children[0].onclick();
check('tapping a category header opens it and closes the others', !cats[3].children[1].hidden && openCount() === 1);
cats[3].children[0].onclick();
check('tapping the open header folds it shut', openCount() === 0);
check('the open category is remembered', store['contraption-labs.shelf.open'] === '');
check('Move is no longer inside a category', !CL.SHELF.sections.some(sec => sec.items.indexOf('hand') >= 0));
sb.setTool('tennis'); runFrames(1);
check('holding a part shows it above the shelf', els.holding.hidden === false && els.holdingName.textContent === 'Tennis ball');
check('...and marks the category it came from', cats[0].className.indexOf('has-tool') >= 0);
els.btnHand.onclick();
check('the ✋ button puts it down (back to Move)', sb.tool === 'hand' && els.holding.hidden === true);
sb.setTool('rope'); sb.loadPreset('pulley'); sb.setTool('rope');
click(766, 500);
check('(rope started)', !!sb.linkFrom);
fire('pointerdown', 900, 600, { button: 2 });
check('right-click puts down the rope tool and cancels the half-made rope', sb.tool === 'hand' && !sb.linkFrom);
const nParts = userParts();
click(1200, 300);
check('with the Move hand, tapping empty space adds nothing', userParts() === nParts);
sb.setTool('crate'); key('Escape');
check('Esc also goes back to Move', sb.tool === 'hand');

/* ---------- 13. toolbar ---------- */
console.log('\n11. Toolbar');
sb.setTool('hand'); sb.loadPreset('gears');
check('Start button shows ▶ Start in build mode', els.btnStart.innerHTML.indexOf('Start') >= 0);
sb.start(); runFrames(2);
check('...and ■ Stop while running', els.btnStart.innerHTML.indexOf('Stop') >= 0 && !els.btnPause.disabled);
key(' ');
check('Space pauses while running', sb.running === false);
sb.stop();

/* ---------- 14. puzzles ---------- */
console.log('\n14. Playing a puzzle');
sb.loadPreset('gears');
const sandboxSave = store['contraption-labs.sandbox.v1'];
const L1 = CL.LEVELS.find(l => l.id === 'ramp');
CL.UI.showLevels(sb);
check('puzzle list shows every puzzle', CL.LEVELS.every(l => els.overlayCard.innerHTML.indexOf(l.name) >= 0));
CL.UI.showIntro(sb, L1);
check('start card shows the goal and the parts you get', els.overlayCard.innerHTML.indexOf(L1.goalText) >= 0 && els.overlayCard.innerHTML.indexOf('Wood plank') >= 0);
els.ovGo.onclick(); runFrames(2);
check('puzzle loaded: bowling ball bolted down, banner says Puzzle 2', sb.level === L1 && sb.world.balls[0].locked && els.modeTag.textContent.indexOf('Puzzle 2') >= 0);
const lastCat = els.shelf.children[els.shelf.children.length - 1];   // (the mock DOM keeps old children)
check('the shelf only offers the puzzle\u2019s parts', lastCat.children[0].innerHTML.indexOf('Your parts') >= 0 && lastCat.children[1].children.length === 1);
drag(300, 200, 700, 500);
check('bolted-down ball can\u2019t be dragged', sb.world.balls[0].x === 300 && sb.world.balls[0].y === 200);
sb.setTool('bowling'); click(900, 300);
check('parts that are not in the bin can\u2019t be added', sb.world.balls.length === 1);
sb.setTool('wood'); click(420, 430);
const pl = sb.world.blocks.find(k => k.type === 'wood' && !k.locked);
const hp = sb.handlePos(pl);
drag(hp.x, hp.y, 420 + 200 * Math.cos(25 * Math.PI / 180), 430 + 200 * Math.sin(25 * Math.PI / 180));
sb.setTool('wood'); click(1000, 300);
check('bin: only one plank (a second is refused)', sb.world.blocks.filter(k => k.type === 'wood').length === 1 && sb.remaining('wood') === 0);
check('the save/open buttons are off during puzzles', els.btnSave.disabled && els.btnOpen.disabled && els.btnHint.hidden === false);
let wonEvt = false; sb.on(t => { if (t === 'win') wonEvt = true; });
sb.start(); runFrames(60 * 7);
check('the ball rolls home and the puzzle is solved', wonEvt && sb.won);
check('progress is remembered (3 stars: no hints used)', JSON.parse(store['contraption-labs.progress']).done.ramp === 3);
const attempt = store['contraption-labs.level.ramp'];
sb.stop();
check('Stop puts the ball back (and keeps your plank)', sb.world.balls[0].y === 200 && sb.world.blocks.some(k => k.type === 'wood'));
sb.leaveLevel(); runFrames(2);
check('free play comes back exactly as it was', store['contraption-labs.sandbox.v1'] === sandboxSave && !sb.level && !!sb.world.blocks.find(k => k.type === 'motor'));
sb.loadLevel(L1);
check('reopening the puzzle brings back your last attempt', sb.world.blocks.some(k => k.type === 'wood' && !k.locked) && store['contraption-labs.level.ramp'] === attempt);
sb.resetLevel();
check('Start over takes your parts out again', !sb.world.blocks.some(k => k.type === 'wood'));
const L6 = CL.LEVELS.find(l => l.id === 'dragon');
sb.loadLevel(L6); sb.setTool('candle'); click(500, 835);
const myCandle = sb.world.blocks.find(k => k.type === 'candle' && !k.locked);
sb.setOption(myCandle, 'lit', true);
check('puzzle rules: candles from the bin start unlit and can\u2019t be switched on', myCandle && !myCandle.lit && !myCandle.opts.lit);
const L2 = CL.LEVELS.find(l => l.id === 'hot');
sb.loadLevel(L2); sb.select(sb.world.links[0]); key('Delete');
check('a rope that is part of the puzzle can\u2019t be removed', sb.world.links.length === 1);
let e5 = '';
try { CL.LEVELS.forEach(l => { sb.loadLevel(l); runFrames(2); sb.start(); runFrames(120); sb.stop(); }); } catch (e) { e5 = e.stack; }
check('every puzzle draws and runs in the full game loop', !e5, e5.split('\n').slice(0, 3).join(' '));

/* the "solved" card appears a moment after winning */
sb.loadLevel(L1); sb.start(); runFrames(60 * 7);
setTimeout(() => {
  check('a "Solved!" card explains the science', els.overlay.hidden === false && els.overlayCard.innerHTML.indexOf(L1.why) >= 0 && !!els.ovNext);
  els.ovNext.onclick();
  const nxt = CL.LEVELS[CL.LEVELS.indexOf(L1) + 1];
  check('"Next puzzle" opens the start card for the next one', els.overlayCard.innerHTML.indexOf(nxt.name) >= 0);
  part15();

}, 1300);

/* ---------- 15. chapters, hints, tutorial checklist, stars ---------- */
function part15() {
  console.log('\n15. Chapters, hints and tutorials');
  CL.UI.showLevels(sb);
  const list = els.overlayCard.innerHTML;
  check('puzzle list is grouped into chapters', CL.CHAPTERS.every(c => list.indexOf(c.name.replace(/&/g, '&amp;')) >= 0));
  check('tutorial puzzles are marked 🎓 Learn, and difficulty is shown', list.indexOf('🎓 Learn') >= 0 && list.indexOf('Brain-buster') >= 0);
  check('old Stage 5 progress (true) still counts as solved', (store['contraption-labs.progress'] = JSON.stringify({ done: { hot: true } }), CL.UI.progress().done.hot === 3));

  // a tutorial: the checklist ticks itself off
  const drop = CL.LEVELS.find(l => l.id === 'drop');
  CL.UI.showIntro(sb, drop); els.ovGo.onclick(); runFrames(2);
  check('tutorial checklist appears with step 1 highlighted', els.coach.hidden === false && /class="now">Tap the <b>Bowling/.test(els.coach.innerHTML));
  sb.setTool('bowling'); runFrames(7);
  check('...picking the bowling ball ticks step 1', /class="ok">Tap the <b>Bowling/.test(els.coach.innerHTML));
  click(1100, 300); runFrames(7);
  check('...placing it ticks step 2', (els.coach.innerHTML.match(/class="ok"/g) || []).length === 2);
  sb.start(); runFrames(7);
  check('...pressing Start ticks step 3', (els.coach.innerHTML.match(/class="ok"/g) || []).length === 3);
  runFrames(60 * 3);
  check('...and the puzzle is solved', sb.won);
  sb.stop();

  // hints on a normal puzzle
  const lift = CL.LEVELS.find(l => l.id === 'lift');
  CL.UI.showIntro(sb, lift); els.ovGo.onclick(); runFrames(2);
  check('no checklist on a normal puzzle', els.coach.hidden === true);
  els.btnHint.onclick();
  check('💡 hint 1 of 3: a nudge', els.hintBox.hidden === false && els.hintBox.innerHTML.indexOf(lift.hints[0]) >= 0);
  els.hbMore.onclick();
  check('hint 2 of 3: a clue', els.hintBox.innerHTML.indexOf(lift.hints[1]) >= 0);
  els.hbMore.onclick();
  check('hint 3: "Show me" reveals one ghost part', sb.showCount === 1 && sb.shownHints().length === 1 && sb.shownHints()[0].items[0].obj.type === 'bowling');
  let e = ''; try { runFrames(2); } catch (x) { e = x.stack; }
  check('ghost parts draw without errors', !e, e.split('\n')[0]);
  els.hbMore.onclick();
  check('"Show me the next part" reveals the rope', sb.showCount === 2 && sb.shownHints()[1].key === 'link:rope');
const chainLv = CL.LEVELS.find(l => l.id === 'chain');
sb.loadLevel(chainLv, true); sb.showMore();
check('8 dominoes are revealed together as ONE step', sb.shownHints()[0].items.length === 8);
sb.loadLevel(lift); sb.showCount = 2;
  sb.setTool('bowling'); click(770, 330);
  check('a ghost disappears once your part is in the right place', sb.missingHints().length === 1 && sb.missingHints()[0].kind === 'link');
  sb.setTool('rope'); click(766, 500); click(800, 160); click(834, F_ - 26);
  check('...and the rope ghost too, once the rope is fitted', sb.missingHints().length === 0);
  sb.setTool('hand'); sb.start(); runFrames(60 * 4);
  check('solved with "Show me": 1 star', sb.won && JSON.parse(store['contraption-labs.progress']).done.lift === 1);
  setTimeout(() => {
    check('the solved card shows the stars', els.overlayCard.innerHTML.indexOf('win-stars') >= 0);
    sb.stop();
    // all puzzles' ghost hints draw
    let e2 = '';
    try { CL.LEVELS.forEach(l => { sb.loadLevel(l, true); sb.showCount = 99; runFrames(1); }); } catch (x) { e2 = x.stack; }
    check('every puzzle\u2019s "Show me" ghosts draw', !e2, e2.split('\n').slice(0, 2).join(' '));
    console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
    process.exit(fail ? 1 : 0);
  }, 1300);
}
const F_ = CL.WORLD.floorY;
