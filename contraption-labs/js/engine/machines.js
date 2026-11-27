/* Contraption Labs — machines.js
 * Everything that turns or is powered, worked out once per step.
 *
 * DRIVE NETWORK
 *   Every part with an axle (gears, conveyor, motor, hamster wheel) is a node.
 *   • Gears MESH when their rims touch: they turn the opposite way, and speed
 *     changes by the teeth ratio (big → small = faster).
 *   • A BELT joins two axles: same direction, same speed.
 *   Speeds come from SOURCES: a powered motor, a running hamster.
 *   If two sources disagree, or gears are locked in a loop (three gears in a
 *   triangle), the whole group is JAMMED and nothing turns. That's real!
 *
 * POWER
 *   A switch that is ON powers every motor/fan joined to it by a cord.
 *   Switches flip when something bumps them. Hamsters wake when bumped.
 *
 * WIND
 *   A powered fan pushes balls in front of it. The push depends on the ball's
 *   size (area), and the speed change on its mass: big + light = blown away.
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;
  const BUMP = 40; // px/s impact that counts as a bump

  function update(world, dt) {
    if (dt > 0) triggers(world);
    power(world);
    drive(world, dt);
    if (dt > 0) { wind(world, dt); hazards(world, dt); }
  }

  function say(o, text, world) { o.say = text; o.sayT = world.time; }

  /* ---------- bumps flip switches and wake hamsters ---------- */
  function triggers(world) {
    for (const im of world.impacts) {
      if (im.speed < BUMP) continue;
      for (const o of [im.a, im.b]) {
        if (!o || o.kind !== 'block') continue;
        if (o.type === 'scissors' && world.time - o.snipT > 0.5) snip(world, o);
        else if (o.type === 'switch' && world.time >= o.coolUntil) {
          o.on = !o.on; o.coolUntil = world.time + 0.5;
          world.events.push({ type: 'switch', obj: o, on: o.on });
        } else if (o.type === 'hamster' && !o.running) {
          o.running = true; say(o, 'Eek! Run!', world);
          world.events.push({ type: 'hamster', obj: o });
        }
      }
    }
  }

  /* ---------- electricity ---------- */
  function power(world) {
    for (const k of world.blocks) if (k.def.powered) k.powered = false;
    for (const l of world.links) {
      if (l.type !== 'cord') continue;
      const src = l.a.def.powerSource ? l.a : l.b.def.powerSource ? l.b : null;
      const dev = src === l.a ? l.b : l.a;
      if (src && src.on && dev.def.powered) dev.powered = true;
    }
    for (const k of world.blocks) {
      if (k.type !== 'scissors') continue;
      if (k.powered && !k._wasPowered && world.time > 0) snip(world, k);
      k._wasPowered = k.powered;
    }
  }

  /* ---------- snip, pop, burn ---------- */
  function effect(world, type, x, y) { world.effects.push({ type, x, y, t: world.time }); }

  function pop(world, b) {
    world.remove(b);
    effect(world, 'pop', b.x, b.y);
    world.events.push({ type: 'pop', obj: b });
  }

  function bladePoint(k) { return { x: k.x + k.c * (k.hw - 12), y: k.y + k.s * (k.hw - 12) }; }
  function pinTip(k) { return { x: k.x + k.c * k.hw, y: k.y + k.s * k.hw }; }
  function flamePoint(k) { return { x: k.x, y: k.y - k.hh - 13 }; }

  function snip(world, k) {
    k.snipT = world.time;
    const p = bladePoint(k);
    for (const l of world.links.slice()) {
      if (l.type === 'rope' && CL.Ropes.distTo(l, p.x, p.y) < 18) { CL.Ropes.cut(world, l, 'snip'); effect(world, 'snip', p.x, p.y); }
    }
    for (const b of world.balls.slice()) if (b.def.pops && Math.hypot(b.x - p.x, b.y - p.y) < b.r + 14) pop(world, b);
  }

  /* ---------- FIRE ----------
   * Every flame is a "fire source": a lit candle (a small hot spot) or a
   * dragon breathing fire (a cone in front of its mouth). One set of rules
   * for all of them:
   *   • balloons pop        • rope burns through (dragon fire is hotter: faster)
   *   • unlit candles catch light when a flame touches the wick
   *   • hamsters and sleeping cats get a hot surprise
   */
  const CANDLE_HEAT = 14;      // px radius of a candle's hot spot
  const ROPE_BURN = 0.6;       // seconds of candle heat to burn through a rope
  const CATCH_LIGHT = 0.25;    // seconds of heat on a wick to light a candle

  function mouth(d) { return { x: d.x + d.face * d.r * 0.95, y: d.y - d.r * 0.25 }; }

  /* reach of a breathing dragon's flame right now (it whooshes out, then holds) */
  function flameReach(d, time) {
    return d.def.flameRange * Math.min(1, (time - d.breathT) / 0.25);
  }

  function fireSources(world) {
    const out = [];
    for (const k of world.blocks) if (k.def.flame && k.lit) out.push({ kind: 'spot', obj: k, p: flamePoint(k), heat: 1 });
    for (const d of world.balls) {
      if (d.def.creature !== 'dragon' || d.state !== 'breathe') continue;
      out.push({ kind: 'cone', obj: d, p: mouth(d), dir: d.face, reach: flameReach(d, world.time), spread: d.def.flameSpread, heat: 2 });
    }
    return out;
  }

  /* how hot is point (x, y), including things of radius pad touching it? */
  function heatAt(src, x, y, pad, skip) {
    let h = 0;
    for (const f of src) {
      if (f.obj === skip) continue;
      if (f.kind === 'spot') {
        if (Math.hypot(x - f.p.x, y - f.p.y) < CANDLE_HEAT + pad) h = Math.max(h, f.heat);
      } else {
        const along = (x - f.p.x) * f.dir, across = Math.abs(y - f.p.y);
        if (along < -pad || along > f.reach + pad) continue;
        if (across <= 8 + Math.max(0, along) * f.spread + pad) h = Math.max(h, f.heat);
      }
    }
    return h;
  }

  /* hottest point along a rope (sampled every 8 px) */
  function ropeHeat(src, l) {
    let h = 0;
    for (const [p, q] of CL.Ropes.segments(l)) {
      const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 8));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        h = Math.max(h, heatAt(src, p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 0));
        if (h >= 2) return h;
      }
    }
    return h;
  }

  function hazards(world, dt) {
    for (const k of world.blocks) {
      if (!k.def.popper) continue;
      const t = pinTip(k);
      for (const b of world.balls.slice()) if (b.def.pops && Math.hypot(b.x - t.x, b.y - t.y) < b.r + 3) pop(world, b);
    }
    const src = fireSources(world);
    if (!src.length) return;
    for (const b of world.balls.slice()) {
      if (b.def.pops && heatAt(src, b.x, b.y, b.r - 2)) pop(world, b);
      else if (b.def.creature === 'cat' && b.state === 'sleep' && heatAt(src, b.x, b.y, b.r)) {
        b.state = 'idle'; say(b, 'MROWW! Hot!', world); world.events.push({ type: 'cat-wake', obj: b });
      }
    }
    for (const l of world.links.slice()) {
      if (l.type !== 'rope') continue;
      const h = ropeHeat(src, l);
      if (!h) continue;
      l.burn = (l.burn || 0) + dt * h;
      if (l.burn > ROPE_BURN) {
        const g = CL.Ropes.geom(l);
        CL.Ropes.cut(world, l, 'burn');
        effect(world, 'burn', (g.pa.x + g.pb.x) / 2, (g.pa.y + g.pb.y) / 2);
      }
    }
    for (const k of world.blocks) {
      if (k.def.flame && !k.lit) {
        const w = flamePoint(k);
        if (heatAt(src, w.x, w.y, 12, k)) {              // a flame within ~26 px of the wick
          k.heat += dt;
          if (k.heat >= CATCH_LIGHT) {
            k.lit = true; k.heat = 0;
            effect(world, 'ignite', w.x, w.y);
            world.events.push({ type: 'ignite', obj: k });
          }
        } else k.heat = 0;
      } else if (k.type === 'hamster' && !k.running && heatAt(src, k.x, k.y, k.r)) {
        k.running = true; say(k, 'Yikes! HOT!', world);
        world.events.push({ type: 'hamster', obj: k });
      }
    }
  }

  /* ---------- drive network ---------- */
  function meshes(a, b) {
    if (!a.def.gear || !b.def.gear) return false;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    return Math.abs(d - (a.r + b.r)) <= CL.DRIVE.meshTolerance;
  }

  function buildGraph(world) {
    const nodes = world.blocks.filter(k => k.def.axle);
    const adj = new Map(nodes.map(n => [n, []]));
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (meshes(a, b)) {
          adj.get(a).push({ to: b, ratio: -a.def.teeth / b.def.teeth, mesh: true });
          adj.get(b).push({ to: a, ratio: -b.def.teeth / a.def.teeth, mesh: true });
        }
      }
    }
    for (const l of world.links) {
      if (l.type !== 'belt' || !adj.has(l.a) || !adj.has(l.b)) continue;
      adj.get(l.a).push({ to: l.b, ratio: 1, mesh: false });
      adj.get(l.b).push({ to: l.a, ratio: 1, mesh: false });
    }
    return { nodes, adj };
  }

  function sourceSpeed(n) {
    if (n.type === 'motor' && n.powered) return (n.opts.flip ? -1 : 1) * CL.DRIVE.motorSpeed;
    if (n.type === 'hamster' && n.running) return -CL.DRIVE.hamsterSpeed; // runs left → wheel turns anticlockwise
    return null;
  }

  function drive(world, dt) {
    const { nodes, adj } = buildGraph(world);
    const seen = new Set();
    for (const root of nodes) {
      if (seen.has(root)) continue;
      // breadth-first: work out each node's speed as a multiple (k) of the root's
      const k = new Map([[root, 1]]), order = [root], parent = new Map();
      seen.add(root);
      let jam = false;
      for (let i = 0; i < order.length; i++) {
        const n = order[i];
        for (const e of adj.get(n)) {
          const want = k.get(n) * e.ratio;
          if (!k.has(e.to)) {
            k.set(e.to, want); order.push(e.to); seen.add(e.to);
            parent.set(e.to, { from: n, mesh: e.mesh });
          } else if (Math.abs(k.get(e.to) - want) > 1e-6) jam = true;   // locked loop
        }
      }
      let rootW = null;
      for (const n of order) {
        const s = sourceSpeed(n);
        if (s === null) continue;
        const w = s / k.get(n);
        if (rootW === null) rootW = w;
        else if (Math.abs(w - rootW) > 1e-6) jam = true;                 // sources fight
      }
      for (const n of order) {
        n.jammed = jam;
        n.omega = jam || rootW === null ? 0 : k.get(n) * rootW;
        n.av = n.def.gear ? n.omega : 0;     // spinning gears drag balls along
      }
      // turning angles (for drawing); meshed gears are kept tooth-in-gap
      for (const n of order) {
        const p = parent.get(n);
        if (p && p.mesh) n.phase = meshPhase(p.from, n);
        else if (dt > 0) n.phase = (n.phase + n.omega * dt) % TAU;
      }
    }
  }

  function meshPhase(p, q) {
    const th = Math.atan2(q.y - p.y, q.x - p.x);
    const pp = TAU / p.def.teeth, pq = TAU / q.def.teeth;
    const fp = frac((th - p.phase) / pp);
    const fq = frac(0.5 - fp);
    return th + Math.PI - fq * pq;
  }
  function frac(v) { return v - Math.floor(v); }

  /* ---------- fans ---------- */
  function fanFrame(f) {
    const dir = f.opts.flip ? -1 : 1;
    const dx = f.c * dir, dy = f.s * dir;
    return { dx, dy, px: -dy, py: dx, ox: f.x + dx * f.hw, oy: f.y + dy * f.hw, half: f.hh };
  }

  function wind(world, dt) {
    const D = CL.DRIVE;
    for (const f of world.blocks) {
      if (!f.def.fan) continue;
      if (!f.powered) continue;
      f.phase = (f.phase + 30 * dt) % TAU;
      const w = fanFrame(f);
      for (const b of world.balls) {
        if (b.held) continue;
        const rx = b.x - w.ox, ry = b.y - w.oy;
        const along = rx * w.dx + ry * w.dy;
        if (along < -b.r || along > D.windRange) continue;
        if (Math.abs(rx * w.px + ry * w.py) > w.half + b.r) continue;
        const fall = Math.max(0, 1 - Math.max(0, along) / D.windRange);
        const a = Math.min(D.windMaxAccel, D.windPressure * Math.PI * b.r * b.r / b.mass * fall);
        b.vx += w.dx * a * dt; b.vy += w.dy * a * dt;
      }
    }
  }

  /* ---------- connecting parts ---------- */
  /* Returns null if OK, or a friendly reason why not. */
  function canLink(world, type, a, b, via) {
    const L = CL.LINKS[type];
    if (!L) return 'Unknown connector.';
    if (type === 'rope') return CL.Ropes.canRope(world, a, b, via);
    if (!a || !b || a === b) return 'Pick two different parts.';
    if (a.kind !== 'block' || b.kind !== 'block') return type === 'belt'
      ? 'Belts join machines with a wheel: gears, motors, hamster wheels and conveyor belts.'
      : 'Cords join a switch to a motor, a fan or scissors.';
    if (type === 'belt') {
      if (!a.def.axle || !b.def.axle) return 'Belts join machines with a wheel: gears, motors, hamster wheels and conveyor belts.';
    } else {
      const src = a.def.powerSource ? a : b.def.powerSource ? b : null;
      const dev = src === a ? b : a;
      if (!src || !dev.def.powered) return 'A cord goes from a switch to a motor, a fan or scissors.';
      if (world.links.some(l => l.type === 'cord' && (l.a === dev || l.b === dev))) return 'That machine already has a cord.';
    }
    if (world.links.some(l => l.type === type && ((l.a === a && l.b === b) || (l.a === b && l.b === a)))) return 'Those are already joined.';
    return null;
  }

  CL.Machines = { update, canLink, meshes, fanFrame, sourceSpeed, bladePoint, pinTip, flamePoint, snip,
    mouth, flameReach, fireSources, heatAt };
})(window.CL = window.CL || {});
