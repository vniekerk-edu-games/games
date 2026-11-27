/* Contraption Labs — machine & critter tests.   node tests/machine-tests.js */
'use strict';
const { CL, fromLayout, run, check, done } = require('./load');
const F = CL.WORLD.floorY, TAU = Math.PI * 2;
const tps = k => Math.abs(k.omega) / TAU; // turns per second

console.log('\n1. Power: switch → cord → motor');
{
  const mk = on => fromLayout({ parts: [
    { id: 1, type: 'switch', x: 200, y: F - 15, on: on },
    { id: 2, type: 'motor', x: 400, y: 500 }], links: [{ type: 'cord', a: 1, b: 2 }] });
  const off = mk(false), on = mk(true);
  run(off, 0.1); run(on, 0.1);
  check('motor runs only when its switch is ON', !off.map.get(2).powered && on.map.get(2).powered && on.map.get(2).omega === 10);
  const w = mk(false); const sw = w.map.get(1);
  w.add(new CL.Ball('tennis', 200, F - 30 - 120));
  run(w, 1.5);
  check('a ball landing on the switch flips it ON', sw.on && w.map.get(2).powered);
}

console.log('\n2. Gears: speed and direction');
{
  // motor → belt → BIG gear, which meshes a SMALL gear, which meshes another BIG gear
  const w = fromLayout({ parts: [
    { id: 1, type: 'switch', x: 100, y: F - 15, on: true },
    { id: 2, type: 'motor', x: 200, y: 400 },
    { id: 3, type: 'gearLarge', x: 500, y: 400 },
    { id: 4, type: 'gearSmall', x: 590, y: 400 },
    { id: 5, type: 'gearLarge', x: 680, y: 400 }],
    links: [{ type: 'cord', a: 1, b: 2 }, { type: 'belt', a: 2, b: 3 }] });
  run(w, 0.5);
  const [m, g1, g2, g3] = [2, 3, 4, 5].map(i => w.map.get(i));
  check('belt: big gear turns the same way and speed as the motor', g1.omega === m.omega);
  check('big gear → small gear: twice as fast, opposite way', g2.omega === -2 * g1.omega,
    tps(g1).toFixed(2) + ' → ' + tps(g2).toFixed(2) + ' turns/s');
  check('small gear → big gear: half as fast, opposite way', g3.omega === -0.5 * g2.omega);
  // teeth stay meshed: check tooth/gap fractions add to 0.5 at contact
  const frac = v => v - Math.floor(v);
  const fp = frac((0 - g1.phase) / (TAU / 20)), fq = frac((Math.PI - g2.phase) / (TAU / 10));
  check('teeth stay interlocked while turning', Math.abs(frac(fp + fq) - 0.5) < 1e-6);
}

console.log('\n3. Jams');
{
  const tri = fromLayout({ parts: [
    { id: 1, type: 'switch', x: 100, y: F - 15, on: true },
    { id: 2, type: 'motor', x: 200, y: 300 },
    { id: 3, type: 'gearSmall', x: 500, y: 300 },
    { id: 4, type: 'gearSmall', x: 560, y: 300 },
    { id: 5, type: 'gearSmall', x: 530, y: 300 - 60 * Math.sin(Math.PI / 3) }],
    links: [{ type: 'cord', a: 1, b: 2 }, { type: 'belt', a: 2, b: 3 }] });
  run(tri, 0.2);
  check('three gears in a triangle jam (and nothing turns)', tri.map.get(3).jammed && tri.map.get(3).omega === 0 && tri.map.get(2).omega === 0);
  const fight = fromLayout({ parts: [
    { id: 1, type: 'switch', x: 100, y: F - 15, on: true },
    { id: 2, type: 'motor', x: 200, y: 300 }, { id: 3, type: 'motor', x: 400, y: 300, flip: true }],
    links: [{ type: 'cord', a: 1, b: 2 }, { type: 'cord', a: 1, b: 3 }, { type: 'belt', a: 2, b: 3 }] });
  run(fight, 0.2);
  check('two motors pulling opposite ways jam', fight.map.get(2).jammed);
}

console.log('\n4. Conveyor belt');
{
  const mk = speedUp => fromLayout({ parts: [
    { id: 1, type: 'switch', x: 100, y: F - 15, on: true },
    { id: 2, type: 'motor', x: 200, y: 700 },
    { id: 3, type: 'conveyor', x: 700, y: 500, length: 600, angle: 0 },
    { id: 4, type: 'cheese', x: 700, y: 500 - 12 - 12.5 },
    { id: 5, type: 'gearLarge', x: 300, y: 300 }, { id: 6, type: 'gearSmall', x: 390, y: 300 }],
    links: [{ type: 'cord', a: 1, b: 2 }, { type: 'belt', a: 2, b: 5 }, { type: 'belt', a: speedUp ? 6 : 5, b: 3 }] });
  const slow = mk(false), fast = mk(true);
  run(slow, 0.6); run(fast, 0.6);
  const c1 = slow.map.get(4), c2 = fast.map.get(4);
  check('conveyor carries cheese along', c1.vx > 150, (c1.vx / 100).toFixed(1) + ' m/s');
  check('geared up (big → small), the conveyor goes the other way and twice as fast',
    Math.abs(c2.vx + 2 * c1.vx) < 25, (c2.vx / 100).toFixed(1) + ' m/s');
  const still = fromLayout({ parts: [{ id: 1, type: 'conveyor', x: 700, y: 500, length: 600 }, { id: 2, type: 'cheese', x: 600, y: 475.5 }] });
  run(still, 1);
  check('a conveyor with nothing turning it stays still', Math.abs(still.map.get(2).vx) < 1);
}

console.log('\n5. Hamster wheel');
{
  const w = fromLayout({ parts: [
    { id: 1, type: 'hamster', x: 400, y: 600 }, { id: 2, type: 'gearLarge', x: 700, y: 600 },
    { id: 3, type: 'basketball', x: 400, y: 300 }], links: [{ type: 'belt', a: 1, b: 2 }] });
  run(w, 0.2);
  check('sleeping hamster: nothing turns', w.map.get(2).omega === 0);
  run(w, 1.5);
  check('a ball bumps the wheel → hamster runs → belt turns the gear', w.map.get(1).running && w.map.get(2).omega !== 0);
}

console.log('\n6. Fan');
{
  const w = fromLayout({ parts: [
    { id: 1, type: 'switch', x: 60, y: F - 15, on: true },
    { id: 2, type: 'fan', x: 150, y: F - 35, angle: 0 },
    { id: 3, type: 'beach', x: 260, y: F - 34 }, { id: 4, type: 'bowling', x: 250, y: F - 120 - 20 },
    { id: 5, type: 'wood', x: 250, y: F - 112, length: 100 }],
    links: [{ type: 'cord', a: 1, b: 2 }] });
  run(w, 1.5);
  check('fan blows the beach ball far away', w.map.get(3).x > 700, 'x=' + w.map.get(3).x.toFixed(0));
  check('fan barely moves the bowling ball (heavy!)', Math.abs(w.map.get(4).x - 250) < 5);
  const up = fromLayout({ parts: [
    { id: 1, type: 'switch', x: 60, y: F - 15, on: true },
    { id: 2, type: 'fan', x: 400, y: F - 20, angle: -Math.PI / 2 }, { id: 3, type: 'beach', x: 400, y: F - 40 - 34 - 1 }],
    links: [{ type: 'cord', a: 1, b: 2 }] });
  run(up, 1.5);
  check('a fan pointing up lifts a beach ball', up.map.get(3).y < F - 300, 'height ' + ((F - up.map.get(3).y) / 100).toFixed(1) + ' m');
}

console.log('\n7. See-saw');
{
  const w = fromLayout({ parts: [
    { id: 1, type: 'seesaw', x: 800, y: 780, length: 360 },
    { id: 2, type: 'tennis', x: 800 - 160, y: 780 - 7 - 11 - 1 },
    { id: 3, type: 'bowling', x: 800 + 160, y: 300 }] });
  let top = Infinity;
  for (let i = 0; i < 240; i++) { w.step(); top = Math.min(top, w.map.get(2).y); }
  const ss = w.map.get(1);
  check('heavy ball lands on one end → the light ball flies up', top < 780 - 200, 'up ' + ((780 - top) / 100).toFixed(1) + ' m');
  check('see-saw stops at its tilt limit', Math.abs(ss.angle) <= ss.tiltLimit + 1e-9);
}

console.log('\n8. Critters');
{
  const w = fromLayout({ parts: [{ id: 1, type: 'mouse', x: 300, y: F - 13 }, { id: 2, type: 'cheese', x: 800, y: F - 12 }] });
  run(w, 4);
  check('mouse smells cheese on its level, runs over and eats it', !w.balls.some(b => b.type === 'cheese'));
  const hi = fromLayout({ parts: [{ id: 1, type: 'mouse', x: 300, y: F - 13 },
    { id: 2, type: 'wood', x: 800, y: 500, length: 200 }, { id: 3, type: 'cheese', x: 800, y: 500 - 8 - 12 }] });
  run(hi, 2);
  check('cheese high up on a shelf: mouse can\u2019t tell, stays put', Math.abs(hi.map.get(1).x - 300) < 2);
  const ice = fromLayout({ parts: [{ id: 1, type: 'ice', x: 600, y: F - 8, length: 900 },
    { id: 2, type: 'mouse', x: 300, y: F - 16 - 13 }, { id: 3, type: 'cheese', x: 900, y: F - 16 - 12 }] });
  run(ice, 2);
  check('on ice the mouse\u2019s feet slip (less than a quarter of its normal distance)', ice.map.get(2).x - 300 < 0.25 * 230 * 2, 'moved ' + (ice.map.get(2).x - 300).toFixed(0) + ' px');
  const chase = fromLayout({ parts: [{ id: 1, type: 'mouse', x: 500, y: F - 13 }, { id: 2, type: 'cat', x: 900, y: F - 26 },
    { id: 3, type: 'cheese', x: 1200, y: F - 12 }] });
  const cat = chase.map.get(2), m = chase.map.get(1);
  let woke = 0, fled = 0;
  for (let i = 0; i < 120 * 4; i++) { chase.step(); if (!woke && cat.state !== 'sleep') woke = chase.time; if (!fled && m.state === 'flee') fled = chase.time; }
  check('mouse runs for the cheese, passes the cat, the cat wakes up', woke > 0, 'at ' + woke.toFixed(2) + ' s');
  check('...and the mouse runs away from the cat', fled > 0 && m.x < 500, 'mouse x=' + m.x.toFixed(0));
  const bump = fromLayout({ parts: [{ id: 1, type: 'cat', x: 900, y: F - 26 }, { id: 2, type: 'tennis', x: 900, y: 400 }] });
  run(bump, 1.5);
  check('a ball bouncing off the cat wakes it', bump.map.get(1).state !== 'sleep');
}

console.log('\n9. Save format');
{
  const w = fromLayout({ parts: [
    { id: 7, type: 'switch', x: 100, y: F - 15, on: true }, { id: 9, type: 'fan', x: 300, y: 500, flip: true, angle: 0.5 },
    { id: 3, type: 'cat', x: 600, y: F - 26, awake: true }], links: [{ type: 'cord', a: 7, b: 9 }, { type: 'belt', a: 7, b: 3 }] });
  const saved = CL.Layout.fromWorld(w);
  check('settings, angles and cords are saved', saved.parts[0].on === true && saved.parts[1].flip === true &&
    saved.parts[1].angle === 0.5 && saved.parts[2].awake === true && saved.links.length === 1);
  check('nonsense links (a belt to a switch) are dropped', w.links.length === 1);
  const v1 = CL.Layout.parse({ format: 'contraption-labs/layout', version: 1, parts: [{ type: 'wood', x: 1, y: 2, length: 100, angle: 0 }] });
  check('Stage 2 (version 1) files still open', v1.parts.length === 1 && v1.parts[0].id === 1);
}
done();
