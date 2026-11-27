/* Contraption Labs — physics tests (no browser needed)
 * Run from the project folder:   node tests/run-tests.js
 */
'use strict';
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/engine/catalog.js', 'js/engine/bodies.js', 'js/engine/collide.js',
  'js/engine/world.js', 'js/engine/layout.js', 'js/sandbox/presets.js'];
global.window = global; // the game files attach themselves to window.CL
for (const f of FILES) require(path.join(ROOT, f));
const CL = global.CL;
const { Ball, Block, World, WORLD } = CL;
const F = WORLD.floorY, W = WORLD.width, H = WORLD.height;

let pass = 0, fail = 0;
function check(name, ok, info) {
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (info ? '  — ' + info : ''));
  ok ? pass++ : fail++;
}
function lab() {
  const w = new World();
  w.add(new Block('floor', W / 2, F + 60, { length: W + 400, thickness: 120, fixed: true }));
  w.add(new Block('wall', -60, H / 2, { length: 120, thickness: 2000, fixed: true }));
  w.add(new Block('wall', W + 60, H / 2, { length: 120, thickness: 2000, fixed: true }));
  w.add(new Block('wall', W / 2, -60, { length: W + 400, thickness: 120, fixed: true }));
  return w;
}
const run = (w, s) => { for (let i = 0; i < Math.round(s * 120); i++) w.step(); };
const bad = (b) => !isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.av);

// 1. Bounce heights from 4 m
console.log('\n1. Drop from 4 m — first rebound height');
const rebound = {};
for (const t of ['bowling', 'basketball', 'tennis', 'bouncy', 'beach']) {
  const w = lab(); const r = CL.BALLS[t].radius;
  const b = w.add(new Ball(t, 800, F - r - 400));
  let landed = false, peak = Infinity, prevVy = 0;
  for (let i = 0; i < 120 * 6; i++) {
    w.step();
    if (prevVy > 0 && b.vy <= 0) landed = true;
    if (landed && b.vy < 0) peak = Math.min(peak, b.y);
    if (landed && prevVy < 0 && b.vy >= 0) break;
    prevVy = b.vy;
  }
  const h = peak === Infinity ? 0 : (F - r - peak);
  rebound[t] = h / 400;
  console.log('     ' + t.padEnd(11) + (h / 100).toFixed(2) + ' m  (' + Math.round(h / 4) + '%)');
}
check('bouncy > basketball > tennis > beach > bowling',
  rebound.bouncy > rebound.basketball && rebound.basketball > rebound.tennis &&
  rebound.tennis > rebound.beach && rebound.beach > rebound.bowling);
check('bowling ball barely bounces (<5%)', rebound.bowling < 0.05);
check('no ball gains height on a normal floor', Object.values(rebound).every(v => v < 1));

// 2. Air resistance: beach vs bowling dropped together
console.log('\n2. Air resistance');
{
  const w = lab();
  const bw = w.add(new Ball('bowling', 600, F - 700));
  const bb = w.add(new Ball('beach', 1000, F - 700 + 20 - 34)); // same drop distance
  let tBow = 0, tBeach = 0;
  let pBow = 0, pBeach = 0;
  for (let i = 1; i < 120 * 5 && (!tBow || !tBeach); i++) {
    w.step(); // landing = downward motion stops
    if (!tBow && pBow > 50 && bw.vy <= 0) tBow = i / 120;
    if (!tBeach && pBeach > 50 && bb.vy <= 0) tBeach = i / 120;
    pBow = bw.vy; pBeach = bb.vy;
  }
  check('bowling ball lands before beach ball', tBow < tBeach, tBow.toFixed(2) + ' s vs ' + tBeach.toFixed(2) + ' s');
  const w2 = lab(); const bl = w2.add(new Ball('balloon', 800, 700)); run(w2, 4);
  check('balloon floats to the ceiling', bl.y < bl.r + 5, 'y=' + bl.y.toFixed(1));
}

// 3. Resting contact is stable
console.log('\n3. Resting');
{
  const w = lab(); const bs = CL.SHELF.balls.filter(t => t !== 'balloon')
    .map((t, i) => w.add(new Ball(t, 200 + i * 200, F - CL.BALLS[t].radius)));
  run(w, 5);
  const maxV = Math.max(...bs.map(b => Math.hypot(b.vx, b.vy)));
  const maxPen = Math.max(...bs.map(b => b.y + b.r - F));
  check('balls sit still on the floor', maxV < 2, 'max speed ' + maxV.toFixed(3) + ' px/s');
  check('no sinking into floor', maxPen < 1.5, 'max overlap ' + maxPen.toFixed(2) + ' px');
}

// 4. Rolling vs sliding on a ramp (wood vs ice)
console.log('\n4. Ramp: wood rolls, ice slides');
for (const surf of ['wood', 'ice']) {
  const th = 14 * Math.PI / 180;
  const w = lab();
  w.add(new Block(surf, 800, 500, { length: 1400, angle: th }));
  const r = 11, hh = 8;
  const b = w.add(new Ball('tennis', 800 - Math.cos(th) * 600 + Math.sin(th) * (hh + r),
    500 - Math.sin(th) * 600 - Math.cos(th) * (hh + r)));
  run(w, 0.3); const v0 = Math.hypot(b.vx, b.vy);
  run(w, 0.5); const v1 = Math.hypot(b.vx, b.vy);
  const acc = (v1 - v0) / 0.5;
  const muIce = Math.sqrt(0.6 * 0.001), slide = 981 * (Math.sin(th) - muIce * Math.cos(th)), roll = 981 * Math.sin(th) / (1 + 0.6);
  const spinRatio = Math.abs(b.av * r) / v1; // 1 = perfect rolling, 0 = pure sliding
  console.log('     ' + surf.padEnd(5) + ' accel ' + acc.toFixed(0) + ' px/s²  (slide theory ' +
    slide.toFixed(0) + ', roll theory ' + roll.toFixed(0) + ')  spin ratio ' + spinRatio.toFixed(2));
  if (surf === 'wood') check('wood: rolls without slipping', spinRatio > 0.95 && Math.abs(acc - roll) / roll < 0.1);
  else check('ice: slides, little spin, faster', spinRatio < 0.3 && Math.abs(acc - slide) / slide < 0.1);
}

// 5. Heavy vs light collision (momentum)
console.log('\n5. Bowling ball hits beach ball');
{
  const w = lab();
  const bw = w.add(new Ball('bowling', 300, F - 20)); bw.vx = 400; bw.av = 400 / 20;
  const bb = w.add(new Ball('beach', 700, F - 34));
  for (let i = 0; i < 240 && bb.vx < 1; i++) w.step(); run(w, 0.05); // just after impact
  check('beach ball flies off faster than bowling ball', Math.abs(bb.vx) > 1.3 * Math.abs(bw.vx),
    'beach ' + bb.vx.toFixed(0) + ', bowling ' + bw.vx.toFixed(0) + ' px/s');
  check('bowling ball keeps going', bw.vx > 250);
}

// 6. Trampoline
console.log('\n6. Trampoline');
{
  const w = lab(); w.add(new Block('trampoline', 800, F - 7, { length: 200 }));
  const b = w.add(new Ball('bowling', 800, F - 14 - 20 - 400));
  let landed = false, peak = Infinity, prev = 0;
  for (let i = 0; i < 600; i++) { w.step(); if (prev > 0 && b.vy <= 0) landed = true;
    if (landed) peak = Math.min(peak, b.y); if (landed && prev < 0 && b.vy >= 0) break; prev = b.vy; }
  const ratio = (F - 14 - 20 - peak) / 400;
  check('bowling ball bounces high on trampoline', ratio > 0.6, Math.round(ratio * 100) + '%');
}

// 7. Fast ball does not tunnel through a plank
console.log('\n7. Tunnelling');
{
  const w = lab(); w.add(new Block('wood', 800, 500, { length: 400 }));
  const b = w.add(new Ball('bouncy', 800, 200)); b.vy = 2900;
  run(w, 0.4);
  check('fast bouncy ball stays above the plank', b.y < 500, 'y=' + b.y.toFixed(1));
}

// 8. Big pile: stable + deterministic
console.log('\n8. Pile of 80 balls');
function pile() {
  const w = lab(); let s = 12345;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  w.add(new Block('wood', 500, 500, { length: 500, angle: 0.3 }));
  w.add(new Block('ice', 1100, 400, { length: 500, angle: -0.25 }));
  w.add(new Block('trampoline', 800, 800, { length: 160 }));
  const types = CL.SHELF.balls;
  for (let i = 0; i < 80; i++) w.add(new Ball(types[i % 6], 80 + rnd() * 1440, 40 + rnd() * 500));
  run(w, 12);
  return w;
}
{
  const t0 = Date.now(); const a = pile(); const ms = Date.now() - t0;
  const b = pile();
  const inside = a.balls.every(x => !bad(x) && x.x > 0 && x.x < W && x.y > 0 && x.y < F + 1);
  check('no explosions, all balls inside the lab', inside);
  check('same start = identical result (deterministic)',
    a.balls.every((x, i) => x.x === b.balls[i].x && x.y === b.balls[i].y));
  check('performance: 12 s of 80 balls', ms < 1500, ms + ' ms (' + (ms / 1440).toFixed(2) + ' ms per step)');
}

// 9. Presets load (through the layout format) and run
console.log('\n9. Presets');
for (const id of CL.PRESET_ORDER) {
  const w = lab(); const layout = CL.Layout.fromPreset(CL.PRESETS[id].build());
  for (const p of layout.parts) {
    if (CL.Layout.kindOf(p.type) === 'ball') w.add(new Ball(p.type, p.x, p.y));
    else w.add(new Block(p.type, p.x, p.y, { length: p.length, angle: p.angle }));
  }
  run(w, 8);
  check('preset "' + id + '" runs cleanly', w.balls.every(x => !bad(x) && x.y < F + 1));
  if (id === 'crash') {
    const beach = w.balls.find(x => x.type === 'beach');
    check('crash: bowling ball knocks the beach ball', beach.x > 1100 || Math.abs(beach.vx) > 0, 'beach x=' + beach.x.toFixed(0));
  }
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
