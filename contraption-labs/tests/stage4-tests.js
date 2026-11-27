/* Contraption Labs — Stage 4 tests: tipping boxes, ropes, pulleys, snip/pop/burn.
 *   node tests/stage4-tests.js */
'use strict';
const { CL, lab, fromLayout, run, check, done } = require('./load');
const F = CL.WORLD.floorY;

console.log('\n1. Dominoes, crates, buckets');
{
  const parts = [];
  for (let i = 0; i < 10; i++) parts.push({ id: i + 1, type: 'domino', x: 400 + i * 45, y: F - 30 });
  const w = fromLayout({ parts });
  run(w, 3);
  check('ten dominoes stand perfectly still', w.rigids.every(d => Math.abs(d.angle) < 0.001));
  const b = w.add(new CL.Ball('tennis', 330, F - 50)); b.vx = 250;
  let t = 0; for (let i = 0; i < 120 * 5 && !t; i++) { w.step(); if (Math.abs(w.rigids[9].angle) > 0.5) t = w.time; }
  check('a small push knocks down the whole line, one after another', t > 0, 'last one tips at ' + (t - 3).toFixed(1) + ' s');

  const tower = fromLayout({ parts: [0, 1, 2, 3, 4].map(i => ({ id: i + 1, type: 'crate', x: 1000, y: F - 26 - 52 * i - 0.5 })) });
  run(tower, 20);
  check('a tower of five crates stands for 20 seconds', tower.rigids.every(c => Math.abs(c.x - 1000) < 0.5));
  tower.add(new CL.Ball('bowling', 700, F - 20)).vx = 900;
  run(tower, 3);
  check('a bowling ball knocks the tower over', tower.rigids.some(c => Math.abs(c.angle) > 0.5 || Math.abs(c.x - 1000) > 50));

  const bk = fromLayout({ parts: [{ id: 1, type: 'bucket', x: 800, y: F - 28 }, { id: 2, type: 'basketball', x: 800, y: 500 }] });
  const ball = bk.balls[0], bucket = bk.rigids[0];
  let out = 0; for (let i = 0; i < 120 * 6; i++) { bk.step(); out = Math.max(out, Math.abs(ball.x - bucket.x)); }
  check('a ball dropped into a bucket bounces about but stays in it', out < 26 && Math.abs(bucket.angle) < 0.05);
}

console.log('\n2. Ropes');
{
  // pendulum: period ≈ 2π√(L/g)
  const L = 200;
  const w = fromLayout({ parts: [{ id: 1, type: 'hook', x: 800, y: 200 }, { id: 2, type: 'bowling', x: 800 + L, y: 200 }],
    links: [{ type: 'rope', a: 1, b: 2 }] });
  const b = w.balls[0]; let crossings = [], prev = b.x - 800;
  for (let i = 0; i < 120 * 9; i++) { w.step(); const x = b.x - 800; if (prev > 0 && x <= 0 || prev < 0 && x >= 0) crossings.push(w.time); prev = x; }
  const period = crossings[2] - crossings[0];
  const theory = 2 * Math.PI * Math.sqrt(L / 981) * 1.18;  // 90° swing is ~18% slower than the small-swing formula
  check('a ball on a rope swings like a pendulum', Math.abs(period - theory) / theory < 0.06, period.toFixed(2) + ' s per swing (theory ' + theory.toFixed(2) + ')');
  check('the rope never stretches', Math.abs(Math.hypot(b.x - 800, b.y - 200) - L) < 1.5);

  const fl = fromLayout({ parts: [{ id: 1, type: 'hook', x: 800, y: 700 }, { id: 2, type: 'balloon', x: 800, y: 500 }], links: [{ type: 'rope', a: 1, b: 2 }] });
  run(fl, 3);
  check('a balloon on a string floats and is held by the hook', Math.abs(fl.balls[0].y - 500) < 2);

  const slack = fromLayout({ parts: [{ id: 1, type: 'hook', x: 800, y: 300 }, { id: 2, type: 'basketball', x: 800, y: 500 }], links: [{ type: 'rope', a: 1, b: 2 }] });
  slack.balls[0].vy = -600; run(slack, 0.25);
  check('ropes only pull: thrown upward, the ball goes up and the rope goes floppy', slack.balls[0].y < 480 && slack.links[0].slack > 10);
}

console.log('\n3. Pulleys');
{
  const atwood = (left, right) => fromLayout({ parts: [
    { id: 1, type: 'pulley', x: 800, y: 200 },
    { id: 2, type: left, x: 782, y: 500 }, { id: 3, type: right, x: 818, y: 500 }],
    links: [{ type: 'rope', a: 2, b: 3, via: 1 }] });
  const w = atwood('bowling', 'basketball'); run(w, 0.6);
  const [L, R] = w.balls;
  check('heavy side goes down, light side goes up', L.y > 520 && R.y < 480, 'bowling ↓' + ((L.y - 500) / 100).toFixed(2) + ' m, basketball ↑' + ((500 - R.y) / 100).toFixed(2) + ' m');
  check('rope length stays the same on both sides', Math.abs((L.y - 500) - (500 - R.y)) < 3);
  check('the pulley wheel turns', w.blocks.find(k => k.type === 'pulley').phase !== 0);
  const eq = atwood('tennis', 'tennis'); run(eq, 2);
  check('equal weights balance', Math.abs(eq.balls[0].y - 500) < 2);

  // bucket lift: crate on one side, empty bucket on the other; drop balls in the bucket
  const lift = fromLayout({ parts: [
    { id: 1, type: 'pulley', x: 800, y: 150 },
    { id: 2, type: 'bucket', x: 760, y: 500 }, { id: 3, type: 'tennis', x: 841, y: 600 },
    { id: 4, type: 'wood', x: 840, y: 619, length: 60, angle: 0 },
    { id: 5, type: 'bowling', x: 760, y: 200 }],
    links: [{ type: 'rope', a: 2, b: 3, via: 1 }] });
  run(lift, 2);
  check('a bowling ball dropped in the bucket pulls the tennis ball up', lift.balls.find(b => b.type === 'tennis').y < 450);
}

console.log('\n4. Snip, pop and burn');
{
  const sc = fromLayout({ parts: [
    { id: 1, type: 'hook', x: 800, y: 200 }, { id: 2, type: 'crate', x: 800, y: 500 },
    { id: 3, type: 'scissors', x: 800 - 20, y: 350, angle: 0 },
    { id: 4, type: 'switch', x: 200, y: F - 15 }],
    links: [{ type: 'rope', a: 2, b: 1 }, { type: 'cord', a: 4, b: 3 }] });
  run(sc, 1);
  check('crate hangs from the rope', Math.abs(sc.rigids[0].y - 500) < 2);
  sc.blocks.find(k => k.type === 'switch').on = true;
  run(sc, 1);
  check('switch ON → scissors snip → the crate falls', !sc.links.some(l => l.type === 'rope') && sc.rigids[0].y > F - 30);

  const bump = fromLayout({ parts: [
    { id: 1, type: 'hook', x: 800, y: 200 }, { id: 2, type: 'tennis', x: 800, y: 500 },
    { id: 3, type: 'scissors', x: 780, y: 350, angle: 0 }, { id: 4, type: 'basketball', x: 770, y: 260 }],
    links: [{ type: 'rope', a: 2, b: 1 }] });
  run(bump, 1.5);
  check('a ball landing on the scissors makes them snip', !bump.links.length);

  const pin = fromLayout({ parts: [{ id: 1, type: 'balloon', x: 800, y: 600 }, { id: 2, type: 'pin', x: 800, y: 300, angle: Math.PI / 2 }] });
  let popped = 0; for (let i = 0; i < 120 * 4 && !popped; i++) { pin.step(); if (!pin.balls.length) popped = pin.time; }
  check('a balloon floats up into a pin: POP!', popped > 0, 'after ' + popped.toFixed(1) + ' s');
  const side = fromLayout({ parts: [{ id: 1, type: 'balloon', x: 800, y: 600 }, { id: 2, type: 'pin', x: 800, y: 300, angle: 0 }] });
  run(side, 4);
  check('...but only the sharp point pops it', side.balls.length === 1);

  const mk = lit => fromLayout({ parts: [
    { id: 1, type: 'hook', x: 800, y: 200 }, { id: 2, type: 'tennis', x: 800, y: 600 },
    { id: 3, type: 'candle', x: 800, y: 420, lit: lit }, { id: 4, type: 'wood', x: 800, y: 453, length: 60 }],
    links: [{ type: 'rope', a: 2, b: 1 }] });
  const cn = mk(true), out = mk(false);
  let burnt = 0;
  for (let i = 0; i < 120 * 3 && !burnt; i++) { cn.step(); if (!cn.links.length) burnt = cn.time; }
  run(out, 3);
  check('a lit candle next to the rope burns through it', burnt > 0.5 && burnt < 1.5, burnt.toFixed(2) + ' s');
  check('an unlit candle does nothing', out.links.length === 1);
}

console.log('\n5. Saving');
{
  const w = fromLayout({ parts: [{ id: 1, type: 'pulley', x: 800, y: 200 }, { id: 2, type: 'bucket', x: 760, y: 500 }, { id: 3, type: 'crate', x: 840, y: 500 }],
    links: [{ type: 'rope', a: 2, b: 3, via: 1 }] });
  const s = CL.Layout.fromWorld(w);
  check('ropes over pulleys are saved', s.links.length === 1 && s.links[0].via === 1);
  const w2 = fromLayout(s);
  check('...and come back exactly the same', JSON.stringify(CL.Layout.fromWorld(w2)) === JSON.stringify(s) && Math.abs(w2.links[0].L - w.links[0].L) < 1e-9);
  check('a rope between two hooks is refused', !!CL.Machines.canLink(w, 'rope', w.blocks.find(k => k.type === 'pulley'), w.blocks.find(k => k.type === 'pulley')));
}
done();
