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
    if (dt > 0) wind(world, dt);
  }

  function say(o, text, world) { o.say = text; o.sayT = world.time; }

  /* ---------- bumps flip switches and wake hamsters ---------- */
  function triggers(world) {
    for (const im of world.impacts) {
      if (im.speed < BUMP) continue;
      for (const o of [im.a, im.b]) {
        if (!o || o.kind !== 'block') continue;
        if (o.type === 'switch' && world.time >= o.coolUntil) {
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
  function canLink(world, type, a, b) {
    const L = CL.LINKS[type];
    if (!L) return 'Unknown connector.';
    if (!a || !b || a === b) return 'Pick two different parts.';
    if (a.kind !== 'block' || b.kind !== 'block') return type === 'belt'
      ? 'Belts join machines with a wheel: gears, motors, hamster wheels and conveyor belts.'
      : 'Cords join a switch to a motor or a fan.';
    if (type === 'belt') {
      if (!a.def.axle || !b.def.axle) return 'Belts join machines with a wheel: gears, motors, hamster wheels and conveyor belts.';
    } else {
      const src = a.def.powerSource ? a : b.def.powerSource ? b : null;
      const dev = src === a ? b : a;
      if (!src || !dev.def.powered) return 'A cord goes from a switch to a motor or a fan.';
      if (world.links.some(l => l.type === 'cord' && (l.a === dev || l.b === dev))) return 'That machine already has a cord.';
    }
    if (world.links.some(l => l.type === type && ((l.a === a && l.b === b) || (l.a === b && l.b === a)))) return 'Those are already joined.';
    return null;
  }

  CL.Machines = { update, canLink, meshes, fanFrame, sourceSpeed };
})(window.CL = window.CL || {});
