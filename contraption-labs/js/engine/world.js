/* Contraption Labs — world.js
 * Fixed-timestep impulse solver. Same input always gives the same result
 * (no randomness), which matters for puzzles: a solution that works once
 * works every time.
 *
 * Bodies
 *   balls   free circles (balls, critters, cheese)
 *   rigids  free boxes that can tip over (dominoes, crates, buckets)
 *   blocks  fixed parts; their SURFACE may still move (spinning gear,
 *           running conveyor) and a see-saw swings on its pin
 *   links   belts, cords and ropes
 *
 * One world.step() = 1/120 s:
 *   • machines (power, gears, belts, fans, scissors, flames) and critters think once
 *   • then 4 physics substeps:
 *       1. forces (gravity, buoyancy, air drag)
 *       2. find contacts
 *       3. solve velocities: contacts (bounce + friction) and ropes
 *       4. rolling resistance
 *       5. push overlapping shapes apart, pull stretched ropes back
 *       6. move
 */
(function (CL) {
  'use strict';

  const SLOP = 0.4;            // px of overlap we tolerate (prevents jitter)
  const PUSH = 0.8;            // fraction of overlap fixed per substep
  const REST_SPEED = 40;       // px/s below which impacts don't bounce
  const MAX_SPEED = 3000;      // px/s safety cap
  const MAX_SPIN = 60;         // rad/s safety cap for rigids

  class World {
    constructor(opts) {
      opts = opts || {};
      this.gravity = opts.gravity != null ? opts.gravity : 981;
      this.stepDt = 1 / 120;
      this.substeps = 4;
      this.iterations = 8;
      this.balls = [];
      this.rigids = [];
      this.blocks = [];
      this.links = [];     // belts, cords, ropes: { type, a, b, via? }
      this.time = 0;
      this.stepCount = 0;
      this.impacts = [];   // filled each step: {a, b, speed, x, y}
      this.events = [];    // things worth telling the player about (UI reads + clears)
      this.effects = [];   // short visual effects (pops, snips): { type, x, y, t }
      this._contacts = [];
      this._pool = [];
      this._warm = new Map();   // remembered pushes for box contacts (stable stacking)
    }

    add(o) {
      (o.kind === 'ball' ? this.balls : o.kind === 'rigid' ? this.rigids : this.blocks).push(o);
      return o;
    }

    remove(o) {
      const arr = o.kind === 'ball' ? this.balls : o.kind === 'rigid' ? this.rigids : this.blocks;
      const i = arr.indexOf(o);
      if (i >= 0) arr.splice(i, 1);
      this.links = this.links.filter(l => l.a !== o && l.b !== o && l.via !== o);
    }

    get movers() { return this.balls.concat(this.rigids); }

    step() {
      const dt = this.stepDt;
      // machines & critters react to last step's bumps, then act
      if (CL.Machines) CL.Machines.update(this, dt);
      if (CL.Creatures) CL.Creatures.update(this, dt);
      this.impacts.length = 0;
      for (const b of this.balls) b.grounded = false;
      const h = dt / this.substeps;
      for (let i = 0; i < this.substeps; i++) this._substep(h);
      if (CL.Ropes) CL.Ropes.afterStep(this, dt);
      this.time += dt;
      this.stepCount++;
    }

    _substep(h) {
      const balls = this.balls, rigids = this.rigids, blocks = this.blocks, g = this.gravity;

      // 1. forces
      for (const b of balls) {
        b.touching = false;
        if (b.held) continue;
        b.vy += g * b.gravityScale * h;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) {
          const f = 1 / (1 + b.drag * sp * h); // implicit quadratic drag (stable)
          b.vx *= f; b.vy *= f;
        }
        if (!b.noSpin) b.av /= (1 + b.angularDamping * h);
      }
      for (const r of rigids) {
        if (r.held) continue;
        r.vy += g * h;
        const sp = Math.hypot(r.vx, r.vy);
        if (sp > 0) { const f = 1 / (1 + r.drag * sp * h); r.vx *= f; r.vy *= f; }
        r.av /= (1 + 0.1 * h);
      }

      // 2. contacts
      this._contacts.length = 0;
      this._findContacts();
      const contacts = this._contacts;

      // pre-step: effective masses, moving surfaces and bounce targets
      const gain = CL.DRIVE ? CL.DRIVE.conveyorGain : 20;
      for (const c of contacts) {
        const a = c.a, b = c.b;
        c.imA = a.held ? 0 : a.invMass;
        c.iiA = a.held ? 0 : a.invI;
        if (b.kind === 'block') { c.imB = 0; c.iiB = b.invI; }
        else { c.imB = b.held ? 0 : b.invMass; c.iiB = b.held ? 0 : b.invI; }
        c.svx = 0; c.svy = 0;
        if (b.kind === 'block' && b.def.conveyor && b.omega) {
          const ly = -(c.px - b.x) * b.s + (c.py - b.y) * b.c;
          const sp = b.omega * gain * (ly < 0 ? 1 : -1);
          c.svx = b.c * sp; c.svy = b.s * sp;
        }
        // walking critters push with their feet on whatever is UNDER them
        c.foot = 0;
        if (a.walk && c.ny < -0.5) c.foot += a.walk;
        if (b.walk && c.ny > 0.5) c.foot += b.walk;
        const rnA = c.rax * c.ny - c.ray * c.nx, rnB = c.rbx * c.ny - c.rby * c.nx;
        const kSum = c.imA + c.imB + c.iiA * rnA * rnA + c.iiB * rnB * rnB;
        if (kSum === 0) { c.skip = true; continue; }
        c.mN = 1 / kSum;
        const rtA = c.rax * c.nx + c.ray * c.ny, rtB = c.rbx * c.nx + c.rby * c.ny; // r × t, t = (-ny, nx)
        c.mT = 1 / (c.imA + c.imB + c.iiA * rtA * rtA + c.iiB * rtB * rtB);
        const vn = this._relDot(c, c.nx, c.ny);
        if (vn < -REST_SPEED) {
          c.bias = -c.e * vn;
          this.impacts.push({ a: a, b: b, speed: -vn, x: c.px, y: c.py });
        } else c.bias = 0;
        a.touching = true;
        if (b.kind === 'ball') b.touching = true;
        if (c.ny < -0.5) a.grounded = true;               // something is under A
        if (b.kind === 'ball' && c.ny > 0.5) b.grounded = true;
      }
      // warm start: box contacts begin with last substep's push (keeps stacks steady)
      const warm = this._warm;
      for (const c of contacts) {
        if (c.skip || !c.key || c.bias) continue;
        const w = warm.get(c.key);
        if (!w) continue;
        c.jn = w.jn; c.jt = Math.max(-c.mu * c.jn, Math.min(c.mu * c.jn, w.jt));
        this._apply(c, c.nx * c.jn - c.ny * c.jt, c.ny * c.jn + c.nx * c.jt);
      }
      if (CL.Ropes) CL.Ropes.preStep(this);

      // 3. velocity solve
      for (let it = 0; it < this.iterations; it++) {
        for (const c of contacts) {
          if (c.skip) continue;
          // normal (bounce / no-overlap)
          const vn = this._relDot(c, c.nx, c.ny);
          let jNew = Math.max(c.jn + c.mN * (c.bias - vn), 0);
          let dj = jNew - c.jn;
          c.jn = jNew;
          this._apply(c, c.nx * dj, c.ny * dj);
          // friction (rolling, walking, belts carrying things)
          const tx = -c.ny, ty = c.nx;
          const vt = this._relDot(c, tx, ty);
          const maxF = c.mu * c.jn;
          jNew = Math.max(-maxF, Math.min(maxF, c.jt - c.mT * vt));
          dj = jNew - c.jt;
          c.jt = jNew;
          this._apply(c, tx * dj, ty * dj);
        }
        if (CL.Ropes) CL.Ropes.solveVelocity(this);
      }

      if (CL.Ropes) CL.Ropes.damp(this, h);
      warm.clear();
      for (const c of contacts) if (c.key && !c.skip) warm.set(c.key, { jn: c.jn, jt: c.jt });

      // 4. rolling resistance
      for (const b of balls) {
        if (!b.touching || b.held || b.noSpin) continue;
        const rr = b.rollRes * h;
        b.av = Math.abs(b.av) <= rr ? 0 : b.av - Math.sign(b.av) * rr;
      }

      // 5. positional correction (fixed parts, including see-saws, don't move here)
      for (const c of contacts) {
        if (c.skip) continue;
        const iiB = c.b.kind === 'block' ? 0 : c.iiB;
        const rnA = c.rax * c.ny - c.ray * c.nx, rnB = c.rbx * c.ny - c.rby * c.nx;
        const k = c.imA + c.imB + c.iiA * rnA * rnA + iiB * rnB * rnB;
        if (k === 0) continue;
        const corr = Math.max(c.pen - SLOP, 0) * PUSH * c.share / k;
        if (corr <= 0) continue;
        const a = c.a, b = c.b;
        a.x += c.nx * corr * c.imA; a.y += c.ny * corr * c.imA;
        if (a.kind === 'rigid') { a.angle += c.iiA * rnA * corr; a.update(); }
        if (b.kind !== 'block') {
          b.x -= c.nx * corr * c.imB; b.y -= c.ny * corr * c.imB;
          if (b.kind === 'rigid') { b.angle -= iiB * rnB * corr; b.update(); }
        }
      }
      if (CL.Ropes) CL.Ropes.solvePosition(this);

      // 6. integrate
      for (const b of balls) {
        if (b.held) continue;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (!b.noSpin) b.angle += b.av * h;
      }
      for (const r of rigids) {
        if (r.held) { r.update(); continue; }
        const sp = Math.hypot(r.vx, r.vy);
        if (sp > MAX_SPEED) { r.vx *= MAX_SPEED / sp; r.vy *= MAX_SPEED / sp; }
        if (Math.abs(r.av) > MAX_SPIN) r.av = Math.sign(r.av) * MAX_SPIN;
        r.x += r.vx * h; r.y += r.vy * h; r.angle += r.av * h;
        r.update();
      }
      for (const k of blocks) {
        if (!k.invI) continue;           // only pivoted parts swing
        k.av /= (1 + 0.6 * h);
        k.angle += k.av * h;
        if (k.angle > k.tiltLimit) { k.angle = k.tiltLimit; if (k.av > 0) k.av = -k.av * 0.15; }
        else if (k.angle < -k.tiltLimit) { k.angle = -k.tiltLimit; if (k.av < 0) k.av = -k.av * 0.15; }
        k.update();
      }
    }

    /* ---------- contact finding ---------- */
    _findContacts() {
      const balls = this.balls, rigids = this.rigids, blocks = this.blocks;
      const C = CL.collide;
      const nb = balls.length, nr = rigids.length;
      for (let i = 0; i < nb; i++) {
        const a = balls[i];
        for (const k of blocks) {
          const c = C.ballBlock(a, k);
          if (c) this._ballContact(a, k, c, Math.max(k.minBounce, Math.min(0.98, a.bounce * k.bounce)), Math.sqrt(a.friction * k.friction));
        }
        for (let j = i + 1; j < nb; j++) {
          const b = balls[j];
          const c = C.circleCircle(a, b);
          if (c) {
            const ct = this._ballContact(a, b, c, Math.max(a.bounce, b.bounce), Math.sqrt(a.friction * b.friction));
            ct.rbx = c.nx * b.r; ct.rby = c.ny * b.r;
          }
        }
        for (const r of rigids) {
          const dx = a.x - r.x, dy = a.y - r.y, reach = a.r + r.br;
          if (dx * dx + dy * dy > reach * reach) continue;
          for (const bx of r.boxes) {
            const c = C.circleBox(a, bx);
            if (c) this._ballContact(a, r, c, Math.max(a.bounce, r.bounce), Math.sqrt(a.friction * r.friction));
          }
        }
      }
      for (let i = 0; i < nr; i++) {
        const r = rigids[i];
        for (const k of blocks) {
          const dx = r.x - k.x, dy = r.y - k.y, reach = r.br + k.br;
          if (dx * dx + dy * dy > reach * reach) continue;
          const e = Math.max(k.minBounce, Math.min(0.98, r.bounce * k.bounce)), mu = Math.sqrt(r.friction * k.friction);
          r.boxes.forEach((bx, bi) => {
            if (k.shape === 'circle') {
              const c = C.circleBox(k, bx);   // normal pushes the circle; flip to push the box
              if (c) this._pointContact(r, k, -c.nx, -c.ny, c.pen, k.x - c.nx * k.r, k.y - c.ny * k.r, e, mu, 1, r.id + ':' + k.id + ':' + bi);
            } else {
              const cs = C.boxBox(bx, k);
              if (cs) for (const c of cs) this._pointContact(r, k, c.nx, c.ny, c.pen, c.px, c.py, e, mu, 1 / cs.length, r.id + ':' + k.id + ':' + bi + ':' + c.id);
            }
          });
        }
        for (let j = i + 1; j < nr; j++) {
          const q = rigids[j];
          const dx = r.x - q.x, dy = r.y - q.y, reach = r.br + q.br;
          if (dx * dx + dy * dy > reach * reach) continue;
          const e = Math.max(r.bounce, q.bounce), mu = Math.sqrt(r.friction * q.friction);
          r.boxes.forEach((ba, ia) => q.boxes.forEach((bb, ib) => {
            const cs = C.boxBox(ba, bb);
            if (cs) for (const c of cs) this._pointContact(r, q, c.nx, c.ny, c.pen, c.px, c.py, e, mu, 1 / cs.length, r.id + ':' + q.id + ':' + ia + ':' + ib + ':' + c.id);
          }));
        }
      }
    }

    _newContact() {
      const pool = this._pool, n = this._contacts.length;
      const c = pool[n] || (pool[n] = {});
      this._contacts.push(c);
      c.jn = 0; c.jt = 0; c.bias = 0; c.skip = false; c.share = 1; c.key = null;
      return c;
    }

    /* ball A against anything; contact point on the ball's surface */
    _ballContact(a, b, hit, e, mu) {
      const c = this._newContact();
      c.a = a; c.b = b; c.nx = hit.nx; c.ny = hit.ny; c.pen = hit.pen; c.e = e; c.mu = mu;
      c.rax = -hit.nx * a.r; c.ray = -hit.ny * a.r;
      c.px = a.x + c.rax; c.py = a.y + c.ray;
      c.rbx = c.px - b.x; c.rby = c.py - b.y;
      return c;
    }

    /* any body A against B at world point (px, py) */
    _pointContact(a, b, nx, ny, pen, px, py, e, mu, share, key) {
      const c = this._newContact();
      c.a = a; c.b = b; c.nx = nx; c.ny = ny; c.pen = pen; c.e = e; c.mu = mu; c.share = share; c.key = key || null;
      c.px = px; c.py = py;
      c.rax = px - a.x; c.ray = py - a.y;
      c.rbx = px - b.x; c.rby = py - b.y;
      return c;
    }

    // velocity of A's contact point relative to B's, projected on (dx, dy)
    _relDot(c, dx, dy) {
      const a = c.a, b = c.b;
      let vx = a.vx - a.av * c.ray, vy = a.vy + a.av * c.rax;
      vx -= (b.vx || 0) - b.av * c.rby + c.svx;
      vy -= (b.vy || 0) + b.av * c.rbx + c.svy;
      if (c.foot) { vx += c.foot * c.ny; vy -= c.foot * c.nx; } // feet move backwards along the ground
      return vx * dx + vy * dy;
    }

    _apply(c, px, py) {
      const a = c.a, b = c.b;
      a.vx += px * c.imA; a.vy += py * c.imA;
      a.av += c.iiA * (c.rax * py - c.ray * px);
      if (b.kind !== 'block') {
        b.vx -= px * c.imB; b.vy -= py * c.imB;
        b.av -= c.iiB * (c.rbx * py - c.rby * px);
      } else if (c.iiB) {
        b.av -= c.iiB * (c.rbx * py - c.rby * px);
        // the see-saw's end-stops
        if (b.angle >= b.tiltLimit - 1e-6 && b.av > 0) b.av = 0;
        else if (b.angle <= -b.tiltLimit + 1e-6 && b.av < 0) b.av = 0;
      }
    }
  }

  World.REST_SPEED = REST_SPEED;
  CL.World = World;
})(window.CL = window.CL || {});
