/* Loads the engine (no browser needed). Used by the test files. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global; // game files attach themselves to window.CL
['js/theme.js', 'js/engine/catalog.js', 'js/engine/bodies.js', 'js/engine/collide.js',
 'js/engine/world.js', 'js/engine/ropes.js', 'js/engine/machines.js', 'js/engine/creatures.js', 'js/engine/layout.js',
 'js/sandbox/presets.js'].forEach(f => require(path.join(ROOT, f)));
const CL = global.CL;
const { WORLD } = CL;

function lab() {
  const W = WORLD.width, H = WORLD.height, F = WORLD.floorY, B = CL.Block;
  const w = new CL.World();
  w.add(new B('floor', W / 2, F + 60, { length: W + 400, thickness: 120, fixed: true }));
  w.add(new B('wall', -60, H / 2, { length: 120, thickness: 2000, fixed: true }));
  w.add(new B('wall', W + 60, H / 2, { length: 120, thickness: 2000, fixed: true }));
  w.add(new B('wall', W / 2, -60, { length: W + 400, thickness: 120, fixed: true }));
  return w;
}
function fromLayout(obj) { const w = lab(); const map = CL.Layout.build(w, CL.Layout.parse(obj)); w.map = map; return w; }
const run = (w, s) => { for (let i = 0; i < Math.round(s * 120); i++) w.step(); };
let pass = 0, fail = 0;
function check(name, ok, info) {
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (info ? '  — ' + info : ''));
  ok ? pass++ : fail++;
}
function done() { console.log('\n' + pass + ' passed, ' + fail + ' failed\n'); process.exit(fail ? 1 : 0); }
module.exports = { CL, lab, fromLayout, run, check, done };
