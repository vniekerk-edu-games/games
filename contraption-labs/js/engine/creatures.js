/* Contraption Labs — creatures.js
 * Simple, predictable critter brains (same situation = same choice, every time).
 *
 * MOUSE  1. A cat that is awake and close?  → run away (fast!)
 *        2. Cheese on the same level?       → run to it, eat it
 *        3. Otherwise                       → sit and sniff
 * CAT    Sleeps until a mouse comes close, or something bumps it.
 *        Awake: chases the nearest mouse on its level.
 *
 * Walking: a critter sets b.walk (px/s). Its feet push against whatever is
 * under it through friction (see world.js). So critters can't walk on ice,
 * get carried by conveyor belts, and can be knocked over by a bowling ball.
 */
(function (CL) {
  'use strict';
  const LEVEL = 100; // px: how far apart feet can be and still be "the same level"

  function feet(b) { return b.y + b.r; }
  function sameLevel(a, b, tol) { return Math.abs(feet(a) - feet(b)) < (tol || LEVEL); }
  function say(b, text, world) { b.say = text; b.sayT = world.time; }

  function nearest(world, from, test, maxDx, tol) {
    let best = null, bd = Infinity;
    for (const o of world.balls) {
      if (o === from || !test(o)) continue;
      const dx = Math.abs(o.x - from.x);
      if (dx > maxDx || !sameLevel(from, o, tol)) continue;
      if (dx < bd) { bd = dx; best = o; }
    }
    return best;
  }

  function update(world, dt) {
    if (dt <= 0) return;
    // a good bump wakes a cat
    for (const im of world.impacts) {
      if (im.speed < 60) continue;
      for (const o of [im.a, im.b]) {
        if (o && o.kind === 'ball' && o.def.creature === 'cat' && o.state === 'sleep') {
          o.state = 'idle'; say(o, 'Mrrow?!', world);
          world.events.push({ type: 'cat-wake', obj: o });
        }
      }
    }
    for (const b of world.balls) {
      if (b.def.creature === 'mouse') mouse(world, b);
      else if (b.def.creature === 'cat') cat(world, b);
      else if (b.def.creature === 'dragon') dragon(world, b);
    }
  }

  /* DRAGON  asleep/awake → (a fright!) → "Hic!" → breathes fire → catches its breath → awake
   * Frights: a bump, a balloon popping nearby, an awake cat coming close. */
  const SCARE_POP = 320, SCARE_CAT = 230;
  function frightened(world, d) {
    for (const im of world.impacts) if ((im.a === d || im.b === d) && im.speed >= 60) return 'bump';
    for (const e of world.effects) {
      if (e.type === 'pop' && world.time - e.t <= world.stepDt + 1e-9 && Math.hypot(e.x - d.x, e.y - d.y) < SCARE_POP) return 'pop';
    }
    if (nearest(world, d, o => o.def.creature === 'cat' && o.state !== 'sleep', SCARE_CAT)) return 'cat';
    return null;
  }

  function dragon(world, d) {
    const D = d.def, t = world.time;
    d.walk = 0;
    if (d.held) return;
    if (d.state === 'sleep' || d.state === 'idle') {
      const why = frightened(world, d);
      if (!why) return;
      d.state = 'startle'; d.until = t + D.startleTime;
      say(d, why === 'cat' ? 'Eep! A cat! Hic!' : 'Hic!', world);
      world.events.push({ type: 'dragon-startle', obj: d, why: why });
    } else if (d.state === 'startle' && t >= d.until) {
      d.state = 'breathe'; d.breathT = t; d.until = t + D.breathTime;
      say(d, 'RAWRRR!', world);
      world.events.push({ type: 'dragon-fire', obj: d });
    } else if (d.state === 'breathe' && t >= d.until) {
      d.state = 'rest'; d.until = t + D.restTime;
      say(d, 'Phew\u2026 *cough*', world);
    } else if (d.state === 'rest' && t >= d.until) {
      d.state = 'idle';
    }
  }

  function mouse(world, m) {
    const d = m.def;
    m.walk = 0;
    if (m.held) return;
    if (m.state === 'eat' && world.time < m.busyUntil) return;

    const cat = nearest(world, m, o => o.def.creature === 'cat' && o.state !== 'sleep', d.fear);
    if (cat) {
      if (m.state !== 'flee') say(m, 'Eek! A cat!', world);
      m.state = 'flee';
      const dir = Math.sign(m.x - cat.x) || 1;
      m.face = dir; m.walk = dir * d.fleeSpeed;
      return;
    }
    const food = nearest(world, m, o => o.def.food, d.smell);
    if (food) {
      if (Math.hypot(food.x - m.x, food.y - m.y) < m.r + food.r + 4) {
        world.remove(food);
        m.state = 'eat'; m.busyUntil = world.time + 1.2;
        say(m, 'Yum!', world);
        world.events.push({ type: 'eat', obj: m });
        return;
      }
      if (m.state !== 'seek') say(m, 'Cheese!', world);
      m.state = 'seek';
      const dir = Math.sign(food.x - m.x) || 1;
      m.face = dir; m.walk = dir * d.walkSpeed;
      return;
    }
    m.state = 'idle';
  }

  function cat(world, c) {
    const d = c.def;
    c.walk = 0;
    if (c.held) return;
    if (c.state === 'sleep') {
      if (nearest(world, c, o => o.def.creature === 'mouse', d.sight)) {
        c.state = 'idle'; say(c, 'Mrrow!', world);
        world.events.push({ type: 'cat-wake', obj: c });
      }
      return;
    }
    const prey = nearest(world, c, o => o.def.creature === 'mouse', d.chaseRange, 200);
    if (!prey) { c.state = 'idle'; return; }
    c.state = 'chase';
    const dir = Math.sign(prey.x - c.x) || c.face;
    c.face = dir; c.walk = dir * d.chaseSpeed;
  }

  CL.Creatures = { update };
})(window.CL = window.CL || {});
