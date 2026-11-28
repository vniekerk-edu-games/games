/* Contraption Labs — puzzle tests.   node tests/levels-tests.js
 * For EVERY puzzle:
 *   • it does NOT solve itself (nothing added)
 *   • its built-in solution (also used by the "Show me" hint) only uses parts from its bin
 *   • that solution solves it, the same way every time
 *   • it has a chapter, a difficulty, two hints, and (tutorials) steps that make sense
 */
'use strict';
const { CL, lab, check, done } = require('./load');
require('../js/levels/levels.js');

function play(level, sol, secs) {
  const parts = level.parts.map(p => Object.assign({}, p, { locked: true }));
  const links = (level.links || []).map(l => Object.assign({}, l, { locked: true }));
  let id = 200;
  if (sol) {
    sol.parts.forEach(p => parts.push(Object.assign({ id: p.id || id++ }, p, (level.forceOpts || {})[p.type])));
    (sol.links || []).forEach(l => links.push(l));
  }
  const w = lab();
  CL.Layout.build(w, CL.Layout.parse({ parts, links }));
  const goal = CL.Goals.create(level);
  let wonAt = 0;
  for (let i = 0; i < 120 * secs && !wonAt; i++) { w.step(); if (goal.update(w)) wonAt = w.time; }
  return { wonAt, w };
}

const STEP = /^(pick|place|turn|link):[a-zA-Z]+$|^start$/;
console.log('\nEvery puzzle: unsolved at the start, solvable with its own parts');
for (const lv of CL.LEVELS) {
  const a = play(lv, null, 20);
  check(lv.name + ': nothing happens by itself', !a.wonAt);
  const sol = lv.solution;
  if (!sol) { check(lv.name + ': has a solution', false); continue; }
  const used = {};
  sol.parts.forEach(p => (used[p.type] = (used[p.type] || 0) + 1));
  (sol.links || []).forEach(l => (used[l.type] = (used[l.type] || 0) + 1));
  check(lv.name + ': solution only uses parts from the bin', Object.keys(used).every(t => (lv.bin[t] || 0) >= used[t]), JSON.stringify(used));
  const b = play(lv, sol, 20);
  check(lv.name + ': solved!', b.wonAt > 0, b.wonAt ? 'after ' + b.wonAt.toFixed(1) + ' s' : '');
  check(lv.name + ': solved the same way every time', play(lv, sol, 20).wonAt === b.wonAt);
}

console.log('\nPuzzle data');
const ids = CL.LEVELS.map(l => l.id);
check('every puzzle has a different id', new Set(ids).size === ids.length);
check('every puzzle belongs to a chapter', CL.LEVELS.every(l => CL.CHAPTERS.some(c => c.id === l.chapter)));
check('every chapter has puzzles, in chapter order', CL.CHAPTERS.every(c => CL.LEVELS.some(l => l.chapter === c.id)) &&
  CL.LEVELS.every((l, i) => !i || CL.CHAPTERS.findIndex(c => c.id === l.chapter) >= CL.CHAPTERS.findIndex(c => c.id === CL.LEVELS[i - 1].chapter)));
check('every puzzle has a difficulty and two hints', CL.LEVELS.every(l => CL.DIFFICULTY[l.level] && Array.isArray(l.hints) && l.hints.length === 2));
const tuts = CL.LEVELS.filter(l => l.steps);
check('tutorial steps use known checks and end with Start', tuts.length >= 5 && tuts.every(l => l.steps.every(s => STEP.test(s.check)) && l.steps[l.steps.length - 1].check === 'start'));
check('tutorial steps only ask for parts the puzzle gives you', tuts.every(l => l.steps.every(s => s.check === 'start' || l.bin[s.check.split(':')[1]] > 0)));
const perChap = CL.CHAPTERS.map(c => CL.LEVELS.filter(l => l.chapter === c.id).map(l => l.level));
check('difficulty never drops within a chapter', perChap.every(a => a.every((v, i) => !i || v >= a[i - 1])));
console.log('     ' + CL.CHAPTERS.map((c, i) => c.name + ': ' + perChap[i].map(v => '●'.repeat(v)).join(' ')).join('\n     '));
done();
