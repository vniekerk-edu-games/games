/* Contraption Labs — presets.js
 * Ready-made experiments. Each build() returns layout-style data:
 *   { trails, parts: [{ id, type, x, y, ...settings }], links: [{ type, a, b }] }
 * (ids only need to be unique inside one preset)
 */
(function (CL) {
  'use strict';
  const F = CL.WORLD.floorY;
  let n = 0;
  const id = () => ++n;

  // plank between two points
  function ramp(type, x1, y1, x2, y2) {
    return { id: id(), type: type, x: (x1 + x2) / 2, y: (y1 + y2) / 2,
      length: Math.hypot(x2 - x1, y2 - y1), angle: Math.atan2(y2 - y1, x2 - x1),
      _p1: [x1, y1], _p2: [x2, y2] };
  }
  // a ball sitting on top of a plank, t = 0..1 along it
  function onRamp(r, t, type) {
    const rad = CL.BALLS[type].radius;
    const hh = CL.SURFACES[r.type].thickness / 2;
    const px = r._p1[0] + (r._p2[0] - r._p1[0]) * t;
    const py = r._p1[1] + (r._p2[1] - r._p1[1]) * t;
    const nx = Math.sin(r.angle), ny = -Math.cos(r.angle); // upward normal
    return { id: id(), type: type, x: px + nx * (hh + rad + 1), y: py + ny * (hh + rad + 1) };
  }
  function onFloor(type, x, extra) {
    return Object.assign({ id: id(), type: type, x: x, y: F - CL.BALLS[type].radius - 0.5 }, extra);
  }
  function part(type, x, y, extra) { return Object.assign({ id: id(), type: type, x: x, y: y }, extra); }
  function floorPart(type, x, extra) {
    const d = CL.SURFACES[type];
    return part(type, x, F - d.thickness / 2, extra);
  }
  function link(type, a, b) { return { type: type, a: a.id, b: b.id }; }

  CL.PRESETS = {
    bounce: {
      name: 'Bounce test', icon: '📏',
      blurb: 'All six balls drop from the same height (6 m). Which bounces highest?',
      build() {
        return { trails: true, parts: CL.SHELF.balls.map((t, i) => part(t, 220 + i * 230, F - 600)) };
      }
    },
    ramps: {
      name: 'Ramp race', icon: '🏁',
      blurb: 'Same ball, same slope. One ramp is wood, one is ice. Watch which one spins!',
      build() {
        const a = ramp('wood', 100, 230, 900, 430);
        const b = ramp('ice', 100, 560, 900, 760);
        return { trails: true, parts: [a, b, onRamp(a, 0.03, 'tennis'), onRamp(b, 0.03, 'tennis')] };
      }
    },
    crash: {
      name: 'Crash test', icon: '💥',
      blurb: 'A heavy bowling ball rolls into a row of light balls. Who moves more?',
      build() {
        const r = ramp('wood', 80, 320, 800, 846);
        return { parts: [r, onRamp(r, 0.04, 'bowling'),
          onFloor('beach', 1040), onFloor('basketball', 1180), onFloor('tennis', 1300)] };
      }
    },
    chain: {
      name: 'Mouse power', icon: '🐹',
      blurb: 'A ball wakes the hamster. Its wheel turns the gears, the gears turn the conveyor, and the cheese goes flying. What happens next?',
      build() {
        const ham = part('hamster', 330, 600);
        const big = part('gearLarge', 560, 600);
        const small = part('gearSmall', 650, 600);
        const belt = part('conveyor', 960, 470, { length: 400, angle: 0 });
        const sw = floorPart('switch', 470);
        const fan = part('fan', 150, F - 20, { angle: -Math.PI / 2 });
        return { trails: false, parts: [
          ham, big, small, belt, sw, fan,
          part('tennis', 330, 260),
          part('cheese', 820, 470 - 12 - 12.5),
          onFloor('mouse', 1000),
          onFloor('cat', 1530),
          part('beach', 150, F - 40 - 34 - 1)
        ], links: [link('belt', ham, big), link('belt', small, belt), link('cord', sw, fan)] };
      }
    },
    gears: {
      name: 'Gear lab', icon: '⚙️',
      blurb: 'The motor turns a small gear, which turns a big gear, which turns a small gear. Click each gear while it runs: how fast is it turning?',
      build() {
        const sw = floorPart('switch', 160, { on: true });
        const m = part('motor', 300, 520);
        const g1 = part('gearSmall', 600, 520);
        const g2 = part('gearLarge', 690, 520);
        const g3 = part('gearSmall', 780, 520);
        const g4 = part('gearLarge', 870, 520);
        return { trails: false, parts: [sw, m, g1, g2, g3, g4],
          links: [link('cord', sw, m), link('belt', m, g1)] };
      }
    },
    wind: {
      name: 'Wind tunnel', icon: '🌬️',
      blurb: 'Four fans, four balls, one switch. Which balls fly, and which stay put?',
      build() {
        const sw = floorPart('switch', 60, { on: true });
        const parts = [sw], links = [];
        const lanes = [[300, 'beach'], [500, 'basketball'], [700, 'tennis'], [F + 8, 'bowling']];
        lanes.forEach(([shelfY, ball], i) => {
          const top = shelfY - 8;
          if (shelfY < F) parts.push(part('wood', 550, shelfY, { length: 900, angle: 0 }));
          const fan = part('fan', 140, top - 35, { angle: 0 });
          parts.push(fan, part(ball, 260, top - CL.BALLS[ball].radius - 0.5));
          links.push(link('cord', sw, fan));
        });
        return { trails: true, parts: parts, links: links };
      }
    },
    seesaw: {
      name: 'See-saw launch', icon: '🎢',
      blurb: 'A heavy bowling ball drops onto one end of the see-saw. Watch the tennis ball!',
      build() {
        return { trails: true, parts: [
          part('seesaw', 800, 780, { length: 360 }),
          part('tennis', 800 - 160, 780 - 7 - 11 - 1),
          part('bowling', 800 + 160, 300)] };
      }
    },
    empty: {
      name: 'Empty lab', icon: '🧹',
      blurb: 'A clean lab. Build anything you like!',
      build() { return { parts: [] }; }
    }
  };
  CL.PRESET_ORDER = ['chain', 'gears', 'wind', 'seesaw', 'bounce', 'ramps', 'crash', 'empty'];
})(window.CL = window.CL || {});
