/* Contraption Labs — world.js
 * Fixed-timestep impulse solver. Same input always gives the same result
 * (no randomness), which matters for puzzles: a solution that works once
 * works every time.
 *
 * One world.step() = 1/120 s:
 *   • machines (power, gears, belts, fans) and critters think once
 *   • then 4 physics substeps:
 *       1. forces (gravity, buoyancy, air drag)
 *       2. find contacts
 *       3. solve velocities (bounce + friction, sequential impulses)
 *       4. rolling resistance
 *       5. push overlapping shapes apart
 *       6. move
 *
 * Fixed parts can still move their SURFACE: a spinning gear or a running
 * conveyor drags things along through friction, and a see-saw swings on its pin.
 */
(function (CL) {
  'use strict';

  const SLOP = 0.4;            // px of overlap we tolerate (prevents jitter)
  const PUSH = 0.8;            // fraction of overlap fixed per substep
  const REST_SPEED = 40;       // px/s below which impacts don't bounce
  const MAX_SPEED = 3000;      // px/s safety cap

  class World {
    constructor(opts) {
      opts = opts || {};
      this.gravity = opts.gravity != null ? opts.gravity : 981;
      this.stepDt = 1 / 120;
      this.substeps = 4;
      this.iterations = 8;
      this.balls = [];
      this.blocks = [];
      this.links = [];     // belts and cords: { type, a, b }
      this.time = 0;
      this.stepCount = 0;
      this.impacts = [];   // filled each step: {a, b, speed, x, y}
      this.events = [];    // things worth telling the player about (UI reads + clears)
      this._contacts = [];
      this._pool = [];
    }

    add(o) { (o.kind === 'ball' ? this.balls : this.blocks).push(o); return o; }

    remove(o) {
      const arr = o.kind === 'ball' ? this.balls : this.blocks;
      const i = arr.indexOf(o);
      if (i >= 0) arr.splice(i, 1);
      if (o.kind === 'block') this.links = this.links.filter(l => l.a !== o && l.b !== o);
    }

    step() {
      const dt = this.stepDt;
      // machines & critters react to last step's bumps, then act
      if (CL.Machines) CL.Machines.update(this, dt);
      if (CL.Creatures) CL.Creatures.update(this, dt);
      this.impacts.length = 0;
      for (const b of this.balls) b.grounded = false;
      const h = dt / this.substeps;
      for (let i = 0; i < this.substeps; i++) this._substep(h);
      this.time += dt;
      this.stepCount++;
    }

    _substep(h) {
      const balls = this.balls, blocks = this.blocks, g = this.gravity;

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

      // 2. contacts
      const contacts = this._contacts;
      contacts.length = 0;
      const n = balls.length;
      for (let i = 0; i < n; i++) {
        const a = balls[i];
        for (const k of blocks) {
          const c = CL.collide.ballBlock(a, k);
          if (c) {
            const e = Math.max(k.minBounce, Math.min(0.98, a.bounce * k.bounce));
            contacts.push(this._makeContact(a, null, c, e, Math.sqrt(a.friction * k.friction), k));
          }
        }
        for (let j = i + 1; j < n; j++) {
          const b = balls[j];
          const c = CL.collide.circleCircle(a, b);
          if (c) {
            contacts.push(this._makeContact(a, b, c,
              Math.max(a.bounce, b.bounce), Math.sqrt(a.friction * b.friction), null));
          }
        }
      }

      // pre-step: effective masses, moving surfaces and bounce targets
      const gain = CL.DRIVE ? CL.DRIVE.conveyorGain : 20;
      for (const c of contacts) {
        const a = c.a, b = c.b, k = c.k;
        c.imA = a.held ? 0 : a.invMass;
        c.iiA = a.held ? 0 : a.invI;
        c.imB = (!b || b.held) ? 0 : b.invMass;
        c.iiB = (!b || b.held) ? 0 : b.invI;
        c.iiK = 0; c.rkx = 0; c.rky = 0; c.svx = 0; c.svy = 0;
        // walking critters push with their feet on whatever is UNDER them
        c.foot = 0;
        if (a.walk && c.ny < -0.5) c.foot += a.walk;
        if (b && b.walk && c.ny > 0.5) c.foot += b.walk;
        if (k) {
          c.iiK = k.invI;
          c.rkx = (a.x - c.nx * c.ra) - k.x;
          c.rky = (a.y - c.ny * c.ra) - k.y;
          if (k.def.conveyor && k.omega) {
            const ly = -(a.x - k.x) * k.s + (a.y - k.y) * k.c;
            const sp = k.omega * gain * (ly < 0 ? 1 : -1);
            c.svx = k.c * sp; c.svy = k.s * sp;
          }
        }
        const kn = c.rkx * c.ny - c.rky * c.nx;
        const kSum = c.imA + c.imB + c.iiK * kn * kn;
        if (kSum === 0) { c.skip = true; continue; }
        c.mN = 1 / kSum;
        const kt = c.rkx * c.nx + c.rky * c.ny; // r × t with t = (-ny, nx)
        c.mT = 1 / (c.imA + c.imB + c.ra * c.ra * c.iiA + c.rb * c.rb * c.iiB + c.iiK * kt * kt);
        const vn = this._relNormal(c);
        if (vn < -REST_SPEED) {
          c.bias = -c.e * vn;
          this.impacts.push({ a: a, b: b || k, speed: -vn,
            x: a.x - c.nx * c.ra, y: a.y - c.ny * c.ra });
        } else c.bias = 0;
        a.touching = true;
        if (b) b.touching = true;
        if (c.ny < -0.5) a.grounded = true;          // something is under A
        if (b && c.ny > 0.5) b.grounded = true;      // A is under B
      }

      // 3. velocity solve
      for (let it = 0; it < this.iterations; it++) {
        for (const c of contacts) {
          if (c.skip) continue;
          // normal (bounce / no-overlap)
          let vn = this._relNormal(c);
          let jNew = Math.max(c.jn + c.mN * (c.bias - vn), 0);
          let dj = jNew - c.jn;
          c.jn = jNew;
          this._apply(c, c.nx * dj, c.ny * dj);
          // friction (makes balls roll and spin, lets critters walk, lets belts carry)
          const tx = -c.ny, ty = c.nx;
          const vt = this._relTangent(c, tx, ty);
          const maxF = c.mu * c.jn;
          jNew = Math.max(-maxF, Math.min(maxF, c.jt - c.mT * vt));
          dj = jNew - c.jt;
          c.jt = jNew;
          this._apply(c, tx * dj, ty * dj);
        }
      }

      // 4. rolling resistance
      for (const b of balls) {
        if (!b.touching || b.held || b.noSpin) continue;
        const rr = b.rollRes * h;
        b.av = Math.abs(b.av) <= rr ? 0 : b.av - Math.sign(b.av) * rr;
      }

      // 5. positional correction (pivoted parts are treated as solid here)
      for (const c of contacts) {
        if (c.skip) continue;
        const corr = Math.max(c.pen - SLOP, 0) * PUSH / (c.imA + c.imB || 1);
        if (corr <= 0 || c.imA + c.imB === 0) continue;
        c.a.x += c.nx * corr * c.imA; c.a.y += c.ny * corr * c.imA;
        if (c.b) { c.b.x -= c.nx * corr * c.imB; c.b.y -= c.ny * corr * c.imB; }
      }

      // 6. integrate
      for (const b of balls) {
        if (b.held) continue;
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (!b.noSpin) b.angle += b.av * h;
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

    _makeContact(a, b, hit, e, mu, k) {
      const pool = this._pool;
      const c = pool[this._contacts.length] || (pool[this._contacts.length] = {});
      c.a = a; c.b = b; c.k = k || null; c.nx = hit.nx; c.ny = hit.ny; c.pen = hit.pen;
      c.e = e; c.mu = mu; c.ra = a.r; c.rb = b ? b.r : 0;
      c.jn = 0; c.jt = 0; c.bias = 0; c.skip = false;
      return c;
    }

    // velocity of A's contact point relative to the other thing, projected on (dx, dy)
    _relDot(c, dx, dy) {
      const a = c.a, b = c.b, k = c.k;
      const rAx = -c.nx * c.ra, rAy = -c.ny * c.ra;
      let vx = a.vx - a.av * rAy, vy = a.vy + a.av * rAx;
      if (b) {
        const rBx = c.nx * c.rb, rBy = c.ny * c.rb;
        vx -= b.vx - b.av * rBy;
        vy -= b.vy + b.av * rBx;
      } else if (k) {
        vx -= -k.av * c.rky + c.svx;
        vy -= k.av * c.rkx + c.svy;
      }
      if (c.foot) { vx += c.foot * c.ny; vy -= c.foot * c.nx; } // feet move backwards along the ground
      return vx * dx + vy * dy;
    }
    _relNormal(c) { return this._relDot(c, c.nx, c.ny); }
    _relTangent(c, tx, ty) { return this._relDot(c, tx, ty); }

    _apply(c, px, py) {
      const a = c.a, b = c.b;
      const rAx = -c.nx * c.ra, rAy = -c.ny * c.ra;
      a.vx += px * c.imA; a.vy += py * c.imA;
      a.av += c.iiA * (rAx * py - rAy * px);
      if (b) {
        const rBx = c.nx * c.rb, rBy = c.ny * c.rb;
        b.vx -= px * c.imB; b.vy -= py * c.imB;
        b.av -= c.iiB * (rBx * py - rBy * px);
      } else if (c.iiK) {
        const k = c.k;
        k.av -= c.iiK * (c.rkx * py - c.rky * px);
        // the see-saw's end-stops
        if (k.angle >= k.tiltLimit - 1e-6 && k.av > 0) k.av = 0;
        else if (k.angle <= -k.tiltLimit + 1e-6 && k.av < 0) k.av = 0;
      }
    }
  }

  World.REST_SPEED = REST_SPEED;
  CL.World = World;
})(window.CL = window.CL || {});
