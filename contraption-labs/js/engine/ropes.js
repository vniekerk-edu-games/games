/* Contraption Labs — ropes.js
 * Ropes can only PULL. A rope's length is fixed by how you build it (it is
 * tight in build mode). While running it can go floppy (slack), and it pulls
 * when stretched back to its full length.
 *
 * rope = { type: 'rope', a, b, via, L }
 *   a, b  the two ends: a ball, a rigid (domino/crate/bucket) or a hook
 *   via   optional pulley: the rope runs from a, over the pulley, to b.
 *         Then  |a – pulley| + |b – pulley| = L  → one side down, other side up.
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;

  const isMover = o => o.kind === 'ball' || o.kind === 'rigid';

  /* Geometry of a rope right now */
  function geom(l) {
    const pa = l.a.ropePos(), pb = l.b.ropePos();
    if (!l.via) {
      const dx = pa.x - pb.x, dy = pa.y - pb.y, d = Math.hypot(dx, dy) || 1e-6;
      return { pa, pb, qa: pb, qb: pa, len: d, ua: [dx / d, dy / d], ub: [-dx / d, -dy / d], la: d, lb: 0 };
    }
    const P = l.via, r = P.r;
    const sa = (pa.x - P.x) >= 0 ? 1 : -1;
    let sb = (pb.x - P.x) >= 0 ? 1 : -1;
    if (sb === sa) sb = -sa;            // both on one side: wrap round the far side
    const qa = { x: P.x + sa * r, y: P.y }, qb = { x: P.x + sb * r, y: P.y };
    const ax = pa.x - qa.x, ay = pa.y - qa.y, la = Math.hypot(ax, ay) || 1e-6;
    const bx = pb.x - qb.x, by = pb.y - qb.y, lb = Math.hypot(bx, by) || 1e-6;
    return { pa, pb, qa, qb, len: la + lb, ua: [ax / la, ay / la], ub: [bx / lb, by / lb], la, lb };
  }

  function length(l) { return geom(l).len; }

  /* In build mode every rope is exactly as long as it is drawn */
  function resetLengths(world) {
    for (const l of world.links) if (l.type === 'rope') { l.L = length(l); l.burn = 0; l.slack = 0; }
  }

  function end(o, p, u) {
    if (!isMover(o) || o.held) return null;
    const rx = p.x - o.x, ry = p.y - o.y;
    const ru = rx * u[1] - ry * u[0];
    return { o, rx, ry, ux: u[0], uy: u[1], k: o.invMass + o.invI * ru * ru };
  }

  function preStep(world) {
    for (const l of world.links) {
      if (l.type !== 'rope') continue;
      const g = geom(l);
      l.g = g;
      l.acc = 0;
      l.ends = [end(l.a, g.pa, g.ua), end(l.b, g.pb, g.ub)].filter(Boolean);
      l.K = l.ends.reduce((s, e) => s + e.k, 0);
      l.taut = g.len >= l.L - 0.5 && l.K > 0;
    }
  }

  function pointVel(e) { const o = e.o; return (o.vx - o.av * e.ry) * e.ux + (o.vy + o.av * e.rx) * e.uy; }

  function pull(e, T) {          // tension impulse T pulls the end along -u
    const o = e.o, px = -e.ux * T, py = -e.uy * T;
    o.vx += px * o.invMass; o.vy += py * o.invMass;
    o.av += o.invI * (e.rx * py - e.ry * px);
  }

  function solveVelocity(world) {
    for (const l of world.links) {
      if (l.type !== 'rope' || !l.taut) continue;
      let cdot = 0;
      for (const e of l.ends) cdot += pointVel(e);       // > 0 means the rope is stretching
      const accNew = Math.max(l.acc + cdot / l.K, 0);
      const dT = accNew - l.acc;
      l.acc = accNew;
      if (dT) for (const e of l.ends) pull(e, dT);
    }
  }

  function solvePosition(world) {
    for (const l of world.links) {
      if (l.type !== 'rope' || !l.ends || !l.ends.length) continue;
      const g = geom(l);
      const C = g.len - l.L;
      if (C <= 0.3) continue;
      const T = (C - 0.3) * 0.8 / l.K;
      for (const e of l.ends) {
        const o = e.o;
        o.x -= e.ux * T * o.invMass; o.y -= e.uy * T * o.invMass;
        if (o.kind === 'rigid') { o.angle += o.invI * (e.rx * -e.uy - e.ry * -e.ux) * T; o.update(); }
      }
    }
  }

  /* after each step: spin pulley wheels, remember slack for drawing */
  function afterStep(world, dt) {
    for (const l of world.links) {
      if (l.type !== 'rope') continue;
      const g = geom(l);
      l.slack = Math.max(0, l.L - g.len);
      if (l.via) {
        if (l.prevLa != null) l.via.phase = (l.via.phase + (g.la - l.prevLa) / l.via.r) % TAU;
        l.prevLa = g.la;
      }
    }
  }

  /* segments of a rope (for cutting, burning and clicking) */
  function segments(l) {
    const g = geom(l);
    return l.via ? [[g.pa, g.qa], [g.qa, g.qb], [g.qb, g.pb]] : [[g.pa, g.pb]];
  }

  function distTo(l, x, y) {
    let best = Infinity;
    for (const [p, q] of segments(l)) {
      const vx = q.x - p.x, vy = q.y - p.y, L2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - p.x) * vx + (y - p.y) * vy) / L2));
      best = Math.min(best, Math.hypot(x - p.x - vx * t, y - p.y - vy * t));
    }
    return best;
  }

  function cut(world, l, how) {
    world.links = world.links.filter(x => x !== l);
    const p = l.via ? { x: l.via.x, y: l.via.y } : geom(l).pa;
    world.events.push({ type: how === 'burn' ? 'burn' : 'snip', obj: l });
    return p;
  }

  /* Ropes may join: a mover to a mover, a mover to a hook, mover–pulley–mover/hook */
  function canRope(world, a, b, via) {
    const R = CL.LINKS.rope;
    if (!a || !b || a === b) return 'Pick two different things.';
    if (!R.fits(a) || !R.fits(b) || (a.def && a.def.pulley) || (b.def && b.def.pulley)) return R.wrong;
    if (!isMover(a) && !isMover(b)) return 'At least one end of a rope has to be something that can move.';
    if (via && !via.def.pulley) return 'Only a pulley can go in the middle of a rope.';
    return null;
  }

  CL.Ropes = { geom, length, resetLengths, preStep, solveVelocity, solvePosition, afterStep, segments, distTo, cut, canRope, isMover };
})(window.CL = window.CL || {});
