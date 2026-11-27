/* Contraption Labs — ball physics tests.   node tests/run-tests.js */
'use strict';
const { CL, lab, run, check, done } = require('./load');
const { Ball, Block, WORLD } = CL;
const F = WORLD.floorY, W = WORLD.width;
const bad = (b) => !isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.av);

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
check('same numbers as Stage 1 (57% / 46% / 79% / 21% / 2%)',
  [['basketball', 57], ['tennis', 46], ['bouncy', 79], ['beach', 21], ['bowling', 2]].every(([t, p]) => Math.round(rebound[t] * 100) === p));

console.log('\n2. Air resistance');
{
  const w = lab();
  const bw = w.add(new Ball('bowling', 600, F - 700));
  const bb = w.add(new Ball('beach', 1000, F - 700 + 20 - 34));
  let tBow = 0, tBeach = 0, pBow = 0, pBeach = 0;
  for (let i = 1; i < 120 * 5 && (!tBow || !tBeach); i++) {
    w.step();
    if (!tBow && pBow > 50 && bw.vy <= 0) tBow = i / 120;
    if (!tBeach && pBeach > 50 && bb.vy <= 0) tBeach = i / 120;
    pBow = bw.vy; pBeach = bb.vy;
  }
  check('bowling ball lands before beach ball', tBow < tBeach, tBow.toFixed(2) + ' s vs ' + tBeach.toFixed(2) + ' s');
  const w2 = lab(); const bl = w2.add(new Ball('balloon', 800, 700)); run(w2, 4);
  check('balloon floats to the ceiling', bl.y < bl.r + 5, 'y=' + bl.y.toFixed(1));
}

console.log('\n3. Resting');
{
  const w = lab(); const bs = ['bowling', 'basketball', 'tennis', 'bouncy', 'beach']
    .map((t, i) => w.add(new Ball(t, 200 + i * 200, F - CL.BALLS[t].radius)));
  run(w, 5);
  const maxV = Math.max(...bs.map(b => Math.hypot(b.vx, b.vy)));
  check('balls sit still on the floor', maxV < 2, 'max speed ' + maxV.toFixed(3) + ' px/s');
}

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
  const muIce = Math.sqrt(0.6 * 0.001), slide = 981 * (Math.sin(th) - muIce * Math.cos(th)), roll = 981 * Math.sin(th) / 1.6;
  const spin = Math.abs(b.av * r) / v1;
  if (surf === 'wood') check('wood: rolls without slipping', spin > 0.95 && Math.abs(acc - roll) / roll < 0.1, 'accel ' + acc.toFixed(0));
  else check('ice: slides, little spin', spin < 0.3 && Math.abs(acc - slide) / slide < 0.1, 'accel ' + acc.toFixed(0));
}

console.log('\n5. Collisions, trampoline, tunnelling');
{
  const w = lab();
  const bw = w.add(new Ball('bowling', 300, F - 20)); bw.vx = 400; bw.av = 20;
  const bb = w.add(new Ball('beach', 700, F - 34));
  for (let i = 0; i < 240 && bb.vx < 1; i++) w.step(); run(w, 0.05);
  check('beach ball flies off faster than the bowling ball', bb.vx > 1.3 * bw.vx);
  const w2 = lab(); w2.add(new Block('trampoline', 800, F - 7, { length: 200 }));
  const b = w2.add(new Ball('bowling', 800, F - 14 - 20 - 400));
  let landed = false, peak = Infinity, prev = 0;
  for (let i = 0; i < 600; i++) { w2.step(); if (prev > 0 && b.vy <= 0) landed = true;
    if (landed) peak = Math.min(peak, b.y); if (landed && prev < 0 && b.vy >= 0) break; prev = b.vy; }
  check('bowling ball bounces high on a trampoline', (F - 34 - peak) / 400 > 0.6);
  const w3 = lab(); w3.add(new Block('wood', 800, 500, { length: 400 }));
  const f = w3.add(new Ball('bouncy', 800, 200)); f.vy = 2900; run(w3, 0.4);
  check('fast ball does not pass through a plank', f.y < 500);
}

console.log('\n6. Pile of 80 balls');
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
  const t0 = Date.now(); const a = pile(); const ms = Date.now() - t0; const b = pile();
  check('no explosions, all balls inside the lab', a.balls.every(x => !bad(x) && x.x > 0 && x.x < W && x.y < F + 1));
  check('same start = identical result', a.balls.every((x, i) => x.x === b.balls[i].x && x.y === b.balls[i].y));
  check('performance', ms < 1500, (ms / 1440).toFixed(2) + ' ms per step');
}
done();
