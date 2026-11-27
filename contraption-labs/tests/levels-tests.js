/* Contraption Labs — puzzle tests: every level must be UNSOLVED as it starts,
 * and SOLVABLE with the parts in its bin.   node tests/levels-tests.js */
'use strict';
const { CL, lab, run, check, done } = require('./load');
require('../js/levels/levels.js');
const F = CL.WORLD.floorY;

/* Known solutions: extra parts/links added to the level (only bin parts allowed) */
const SOLUTIONS = {
  ramp: { parts: [{ type: 'wood', x: 420, y: 430, length: 400, angle: 25 * Math.PI / 180 }] },
  hot: { parts: [{ type: 'candle', x: 813, y: 700 }] },
  dominoes: { parts: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ type: 'domino', x: 380 + i * 42, y: F - 30 })) },
  mouse: { parts: [{ id: 'ball', type: 'tennis', x: 200, y: 600 }], links: [{ type: 'cord', a: 1, b: 2 }, { type: 'belt', a: 2, b: 3 }] },
  lift: { parts: [{ type: 'bowling', x: 766, y: 330 }], links: [{ type: 'rope', a: 2, b: 3, via: 1 }] },
  dragon: { parts: [{ type: 'tennis', x: 180, y: 600 }].concat(Array.from({ length: 10 }, (_, i) => ({ type: 'candle', x: 400 + i * 24, y: F - 25 }))) }
};

function play(level, sol, secs) {
  const parts = level.parts.map(p => Object.assign({}, p, { locked: true }));
  let id = 100;
  const links = (level.links || []).map(l => Object.assign({}, l, { locked: true }));
  if (sol) {
    sol.parts.forEach(p => parts.push(Object.assign({ id: id++ }, p, (level.forceOpts || {})[p.type])));
    (sol.links || []).forEach(l => links.push(l));
  }
  const used = {};
  if (sol) { sol.parts.forEach(p => (used[p.type] = (used[p.type] || 0) + 1)); (sol.links || []).forEach(l => (used[l.type] = (used[l.type] || 0) + 1)); }
  const w = lab();
  CL.Layout.build(w, CL.Layout.parse({ parts, links }));
  const goal = CL.Goals.create(level);
  let wonAt = 0;
  for (let i = 0; i < 120 * secs && !wonAt; i++) { w.step(); if (goal.update(w)) wonAt = w.time; }
  return { wonAt, used, w };
}

console.log('\nEvery puzzle starts unsolved, and can be solved with its own parts bin');
for (const lv of CL.LEVELS) {
  const a = play(lv, null, 20);
  check(lv.name + ': nothing happens by itself', !a.wonAt);
  const sol = SOLUTIONS[lv.id];
  if (!sol) { check(lv.name + ': has a test solution', false); continue; }
  const b = play(lv, sol, 20);
  const fits = Object.keys(b.used).every(t => (lv.bin[t] || 0) >= b.used[t]);
  check(lv.name + ': solution only uses parts from the bin', fits, JSON.stringify(b.used));
  check(lv.name + ': solved!', b.wonAt > 0, b.wonAt ? 'after ' + b.wonAt.toFixed(1) + ' s' : '');
  const c = play(lv, sol, 20);
  check(lv.name + ': solved the same way every time', c.wonAt === b.wonAt);
}
const ids = CL.LEVELS.map(l => l.id);
check('every level has a different id', new Set(ids).size === ids.length);
done();
