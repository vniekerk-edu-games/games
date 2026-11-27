/* Contraption Labs — presets.js
 * Ready-made experiments. Each returns plain data:
 *   { blocks: [{type, x, y, length, angle}], balls: [{type, x, y}], trails }
 * Converted to a layout (see engine/layout.js) when loaded.
 */
(function (CL) {
  'use strict';
  const F = CL.WORLD.floorY;

  // plank between two points
  function ramp(type, x1, y1, x2, y2) {
    return { type: type, x: (x1 + x2) / 2, y: (y1 + y2) / 2,
      length: Math.hypot(x2 - x1, y2 - y1), angle: Math.atan2(y2 - y1, x2 - x1),
      _p1: [x1, y1], _p2: [x2, y2] };
  }
  // a ball sitting on top of a plank, t = 0..1 along it
  function onRamp(r, t, ballType) {
    const rad = CL.BALLS[ballType].radius;
    const hh = CL.SURFACES[r.type].thickness / 2;
    const px = r._p1[0] + (r._p2[0] - r._p1[0]) * t;
    const py = r._p1[1] + (r._p2[1] - r._p1[1]) * t;
    const nx = Math.sin(r.angle), ny = -Math.cos(r.angle); // upward normal
    return { type: ballType, x: px + nx * (hh + rad + 1), y: py + ny * (hh + rad + 1) };
  }
  function onFloor(type, x) { return { type: type, x: x, y: F - CL.BALLS[type].radius - 0.5 }; }

  CL.PRESETS = {
    bounce: {
      name: 'Bounce test', icon: '📏',
      blurb: 'All six balls drop from the same height (6 m). Which bounces highest?',
      build() {
        const types = CL.SHELF.balls;
        const y = F - 600;
        return { trails: true, blocks: [],
          balls: types.map((t, i) => ({ type: t, x: 220 + i * 230, y: y })) };
      }
    },
    ramps: {
      name: 'Ramp race', icon: '🏁',
      blurb: 'Same ball, same slope. One ramp is wood, one is ice. Watch which one spins!',
      build() {
        const a = ramp('wood', 100, 230, 900, 430);
        const b = ramp('ice', 100, 560, 900, 760);
        return { trails: true, blocks: [a, b],
          balls: [onRamp(a, 0.03, 'tennis'), onRamp(b, 0.03, 'tennis')] };
      }
    },
    crash: {
      name: 'Crash test', icon: '💥',
      blurb: 'A heavy bowling ball rolls into a row of light balls. Who moves more?',
      build() {
        const r = ramp('wood', 80, 320, 800, 846);
        return { trails: false, blocks: [r],
          balls: [onRamp(r, 0.04, 'bowling'),
            onFloor('beach', 1040), onFloor('basketball', 1180), onFloor('tennis', 1300)] };
      }
    },
    empty: {
      name: 'Empty lab', icon: '🧹',
      blurb: 'A clean lab. Build anything you like!',
      build() { return { trails: false, blocks: [], balls: [] }; }
    }
  };
  CL.PRESET_ORDER = ['bounce', 'ramps', 'crash', 'empty'];
})(window.CL = window.CL || {});
