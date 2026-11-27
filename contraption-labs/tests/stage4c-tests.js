/* Contraption Labs — Stage 4c tests: pendulums slow down, fire spreads, mini dragon.
 *   node tests/stage4c-tests.js */
'use strict';
const { CL, fromLayout, run, check, done } = require('./load');
const F = CL.WORLD.floorY;

function swings(type, secs) {
  const L = 300;
  const w = fromLayout({ parts: [{ id: 1, type: 'hook', x: 800, y: 150 }, { id: 2, type: type, x: 800 + L * 0.7, y: 150 + L * 0.714 }],
    links: [{ type: 'rope', a: 1, b: 2 }] });
  const b = w.balls[0], amp = []; let mx = 0, prev = b.x - 800, lastT = 0;
  for (let i = 0; i < 120 * secs; i++) {
    w.step(); const x = b.x - 800; mx = Math.max(mx, Math.abs(x));
    if ((prev < 0) !== (x < 0)) { amp.push({ t: w.time, a: mx }); mx = 0; } prev = x;
  }
  const at = s => { const r = amp.filter(q => q.t <= s); return r.length ? r[r.length - 1].a : L * 0.7; };
  return { amp, at, still: Math.hypot(b.vx, b.vy) };
}

console.log('\n1. Pendulums slow down');
{
  const bw = swings('bowling', 70), tn = swings('tennis', 70);
  const a = bw.amp.map(q => q.a);
  check('every swing of the bowling ball is a bit smaller than the one before', a.slice(1, 20).every((v, i) => v < a[i]));
  check('heavy bowling ball keeps swinging for a long time', bw.at(10) > 0.4 * 210, Math.round(bw.at(10) / 2.1) + '% of its swing left at 10 s');
  check('...but does come to rest', bw.at(70) < 0.05 * 210, Math.round(bw.at(70) / 2.1) + '% left at 70 s');
  check('a light tennis ball stops much sooner', tn.at(20) < 0.05 * 210 && bw.at(20) > 0.2 * 210,
    'at 20 s: tennis ' + Math.round(tn.at(20) / 2.1) + '%, bowling ' + Math.round(bw.at(20) / 2.1) + '%');
  const atw = fromLayout({ parts: [{ id: 1, type: 'pulley', x: 800, y: 200 }, { id: 2, type: 'bowling', x: 770, y: 500 }, { id: 3, type: 'basketball', x: 830, y: 500 }],
    links: [{ type: 'rope', a: 2, b: 3, via: 1 }] });
  run(atw, 0.6);
  check('pulleys still work the same (heavy side down)', atw.balls[0].y > 520 && atw.balls[1].y < 480);
}

console.log('\n2. Candles light each other');
{
  const row = gap => {
    const parts = [{ id: 1, type: 'wood', x: 800, y: 600, length: 400 }];
    for (let i = 0; i < 5; i++) parts.push({ id: i + 2, type: 'candle', x: 700 + i * gap, y: 600 - 8 - 25, lit: i === 0 });
    return fromLayout({ parts });
  };
  const near = row(20); const litAt = [];
  for (let i = 0; i < 120 * 4; i++) { near.step(); near.blocks.filter(k => k.type === 'candle').forEach((c, j) => { if (c.lit && litAt[j] == null) litAt[j] = near.time; }); }
  check('candles standing side by side light one after another', litAt.length === 5 && litAt.every((t, i) => !i || t > litAt[i - 1]),
    litAt.map(t => t.toFixed(2)).join(' → ') + ' s');
  const far = row(60); run(far, 4);
  check('candles too far apart don\u2019t light', far.blocks.filter(k => k.type === 'candle' && k.lit).length === 1);
}

console.log('\n3. Mini dragon');
const dragonLab = (extra, links) => fromLayout({ parts: [{ id: 1, type: 'dragon', x: 400, y: F - 30 }].concat(extra || []), links: links || [] });
{
  const calm = dragonLab([{ id: 2, type: 'candle', x: 520, y: F - 25, lit: false }]);
  run(calm, 3);
  check('a sleeping dragon stays asleep (and breathes no fire)', calm.balls[0].state === 'sleep' && !calm.blocks.find(k => k.type === 'candle').lit);

  const w = dragonLab([{ id: 2, type: 'candle', x: 520, y: F - 25, lit: false }, { id: 3, type: 'candle', x: 280, y: F - 25, lit: false },
    { id: 4, type: 'tennis', x: 400, y: 500 }]);
  const d = w.balls[0]; const seen = [];
  for (let i = 0; i < 120 * 8; i++) { w.step(); if (seen[seen.length - 1] !== d.state) seen.push(d.state); }
  check('a ball lands on it: Hic! → breathes fire → catches its breath → awake', seen.join(' > ') === 'sleep > startle > breathe > rest > idle', seen.join(' > '));
  const [front, behind] = w.blocks.filter(k => k.type === 'candle');
  check('its fire lights a candle in front of it', front.lit);
  check('...but not one behind it', !behind.lit);

  const left = dragonLab([{ id: 2, type: 'candle', x: 280, y: F - 25, lit: false }, { id: 3, type: 'tennis', x: 400, y: 500 }]);
  left.balls[0].face = -1; left.balls[0].opts.faceLeft = true;
  run(left, 3);
  check('turned to face left, it breathes fire to the left', left.blocks[left.blocks.length - 1].lit);

  const cat = dragonLab([{ id: 2, type: 'cat', x: 700, y: F - 26, awake: true }, { id: 3, type: 'mouse', x: 330, y: F - 13 }]);
  let why = null; for (let i = 0; i < 120 * 4 && !why; i++) { cat.step(); const e = cat.events.find(v => v.type === 'dragon-startle'); if (e) why = e.why; cat.events.length = 0; }
  check('an awake cat coming close gives it a fright', why === 'cat');

  const pop = dragonLab([{ id: 2, type: 'balloon', x: 560, y: 700 }, { id: 3, type: 'pin', x: 560, y: 520, angle: Math.PI / 2 }]);
  why = null; for (let i = 0; i < 120 * 4 && !why; i++) { pop.step(); const e = pop.events.find(v => v.type === 'dragon-startle'); if (e) why = e.why; pop.events.length = 0; }
  check('a balloon popping nearby gives it a fright', why === 'pop');

  const burn = mkBurn => {
    const w2 = dragonLab([{ id: 2, type: 'hook', x: 520, y: 600 }, { id: 3, type: 'bowling', x: 520, y: 800 }, { id: 4, type: 'tennis', x: 400, y: 600 }],
      [{ type: 'rope', a: 2, b: 3 }]);
    let cut = 0, fire = 0;
    for (let i = 0; i < 120 * 5 && !cut; i++) { w2.step(); if (!fire && w2.balls[0].state === 'breathe') fire = w2.time; if (!w2.links.length) cut = w2.time; }
    return cut - fire;
  };
  const tBurn = burn();
  check('dragon fire burns through a rope faster than a candle (0.6 s)', tBurn > 0 && tBurn < 0.6, tBurn.toFixed(2) + ' s');

  const bal = dragonLab([{ id: 2, type: 'hook', x: 540, y: F - 10 }, { id: 3, type: 'balloon', x: 540, y: F - 60 }, { id: 4, type: 'tennis', x: 400, y: 600 }],
    [{ type: 'rope', a: 2, b: 3 }]);
  run(bal, 3);
  check('it pops a balloon in front of it', !bal.balls.some(b => b.type === 'balloon'));

  const ham = dragonLab([{ id: 2, type: 'hamster', x: 560, y: F - 64 }, { id: 3, type: 'tennis', x: 400, y: 600 }]);
  run(ham, 3);
  check('a hot surprise wakes the hamster', ham.blocks.find(k => k.type === 'hamster').running);

  const twice = dragonLab([{ id: 4, type: 'tennis', x: 400, y: 600 }]);
  run(twice, 7); const st1 = twice.balls[0].state;
  twice.add(new CL.Ball('basketball', 400, 600)); let again = false;
  for (let i = 0; i < 120 * 3; i++) { twice.step(); if (twice.balls[0].state === 'breathe') again = true; }
  check('after resting, another fright makes it breathe fire again', st1 === 'idle' && again);
}

console.log('\n4. Saving and same result every time');
{
  const w = dragonLab([{ id: 2, type: 'candle', x: 520, y: F - 25, lit: false }]);
  w.balls[0].opts.faceLeft = true; w.balls[0].opts.awake = true;
  const s = CL.Layout.fromWorld(w);
  const d = s.parts.find(p => p.type === 'dragon');
  check('dragon direction and start setting are saved', d.faceLeft === true && d.awake === true && s.parts.find(p => p.type === 'candle').lit === false);
  const w2 = fromLayout(s);
  check('...and come back the same', w2.balls[0].face === -1 && w2.balls[0].state === 'idle');
  const sim = () => { const x = fromLayout(CL.Layout.fromPreset(CL.PRESETS.dragon.build())); run(x, 8); return JSON.stringify(x.balls.map(b => [b.x, b.y])) + x.links.length + x.blocks.filter(k => k.lit).length; };
  check('the dragon experiment ends the same way every time', sim() === sim());
}
done();
