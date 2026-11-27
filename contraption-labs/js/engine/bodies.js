/* Contraption Labs — bodies.js
 * Ball  : free-moving circle (balls, critters, cheese)
 * Block : fixed part (box or circle). It may still turn: gears are spun by
 *         the drive network, see-saws swing on their pin.
 */
(function (CL) {
  'use strict';
  let nextId = 1;

  function readOptions(def, given) {
    const o = {};
    (def.options || []).forEach(op => {
      const v = given && given[op.key];
      o[op.key] = v === undefined ? op.values[0][0] : v;
    });
    return o;
  }

  class Ball {
    constructor(type, x, y, opts) {
      const d = CL.BALLS[type];
      if (!d) throw new Error('Unknown ball type: ' + type);
      this.id = nextId++;
      this.kind = 'ball';
      this.type = type;
      this.def = d;
      this.r = d.radius;
      this.mass = d.mass;
      this.invMass = 1 / d.mass;
      this.inertia = d.inertiaK * d.mass * d.radius * d.radius;
      this.invI = d.noSpin ? 0 : 1 / this.inertia;
      this.noSpin = !!d.noSpin;
      this.bounce = d.bounce;
      this.friction = d.friction;
      this.drag = d.drag;
      this.gravityScale = d.gravityScale;
      this.rollRes = d.rollingResistance;
      this.angularDamping = 0.05;
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.angle = 0; this.av = 0;
      this.held = false;     // being dragged by the player
      this.locked = false;   // bolted down by a level
      this.touching = false; // in contact with something this substep
      this.grounded = false; // standing on something this step
      this.opts = readOptions(d, opts);
      this.face = 1;         // critters: 1 = facing right
      this.walk = 0;         // critters: walking speed (px/s), set by creatures.js
      this.state = null;     // critters: see creatures.js
      this.say = null; this.sayT = -9;
      if (d.creature === 'cat') this.state = this.opts.awake ? 'idle' : 'sleep';
    }
    ropePos() { return { x: this.x, y: this.y }; }
  }

  class Block {
    constructor(type, x, y, opts) {
      const s = CL.SURFACES[type];
      if (!s) throw new Error('Unknown surface type: ' + type);
      opts = opts || {};
      this.id = nextId++;
      this.kind = 'block';
      this.type = type;
      this.def = s;
      this.shape = s.shape || 'box';
      this.x = x; this.y = y;
      if (this.shape === 'circle') {
        this.r = s.radius; this.hw = s.radius; this.hh = s.radius;
      } else {
        const len = opts.length != null ? opts.length : (s.length || s.defaultLength || 200);
        this.hw = len / 2;
        this.hh = (opts.thickness != null ? opts.thickness : s.thickness) / 2;
      }
      this.angle = opts.angle || 0;
      this.fixed = !!opts.fixed; // lab boundaries cannot be selected
      this.locked = false;       // bolted down by a level
      this.bounce = s.bounce;
      this.minBounce = s.minBounce || 0;
      this.friction = s.friction;
      this.av = 0;               // turning speed (gears: set by drive network; see-saw: physics)
      this.invI = 0;
      if (s.pivoted) {
        const L = this.hw * 2;
        this.invI = 1 / (s.plankMass * (L * L + 4 * this.hh * this.hh) / 12);
        this.tiltLimit = s.tiltLimit * Math.PI / 180;
      }
      this.opts = readOptions(s, opts.opts);
      this.omega = 0;            // drive network speed (rad/s)
      this.phase = 0;            // drawing angle for wheels, belts, fan blades
      this.jammed = false;
      this.powered = false;
      this.on = !!this.opts.on;          // switches
      this.running = !!this.opts.awake;  // hamster
      this.lit = this.opts.lit !== false; // candle
      this.snipT = -9;                   // scissors: when they last snipped
      this.coolUntil = 0;
      this.update();
    }
    get length() { return this.hw * 2; }
    /* Call after changing x, y, angle, hw or hh */
    update() {
      if (this.shape === 'circle') { this.c = 1; this.s = 0; this.br = this.r; return; }
      this.c = Math.cos(this.angle);
      this.s = Math.sin(this.angle);
      this.br = Math.hypot(this.hw, this.hh); // bounding radius
    }
    /* Where belts attach */
    axlePos() {
      if (this.def.conveyor) {
        const d = this.hw - this.hh;
        return { x: this.x - this.c * d, y: this.y - this.s * d };
      }
      return { x: this.x, y: this.y };
    }
    ropePos() { return { x: this.x, y: this.y }; }
    /* Where cords attach */
    plugPos() {
      if (this.type === 'switch') return { x: this.x + this.hw - 8, y: this.y + this.hh - 6 };
      if (this.type === 'motor') return { x: this.x - this.hw + 8, y: this.y + this.hh - 6 };
      if (this.type === 'scissors') return { x: this.x - this.c * (this.hw - 8), y: this.y - this.s * (this.hw - 8) };
      return { x: this.x - this.c * this.hw * 0.6 + this.s * this.hh * 0.6, y: this.y - this.s * this.hw * 0.6 + this.c * this.hh * 0.6 };
    }
  }

  /* Rigid: a solid that moves, spins and tips over. Made of one or more boxes
   * fixed together (a bucket is three). */
  class Rigid {
    constructor(type, x, y, opts) {
      const d = CL.RIGIDS[type];
      if (!d) throw new Error('Unknown rigid type: ' + type);
      opts = opts || {};
      this.id = nextId++;
      this.kind = 'rigid';
      this.type = type;
      this.def = d;
      this.x = x; this.y = y;
      this.angle = opts.angle || 0;
      this.vx = 0; this.vy = 0; this.av = 0;
      this.mass = d.mass; this.invMass = 1 / d.mass;
      // inertia: mass shared out by area
      let area = 0; d.shapes.forEach(b => (area += b.hw * b.hh));
      let I = 0;
      d.shapes.forEach(b => {
        const m = d.mass * (b.hw * b.hh) / area;
        I += m * ((4 * b.hw * b.hw + 4 * b.hh * b.hh) / 12 + b.x * b.x + b.y * b.y);
      });
      this.inertia = I; this.invI = 1 / I;
      this.bounce = d.bounce; this.friction = d.friction; this.drag = d.drag;
      this.gravityScale = 1;
      this.held = false; this.locked = false;
      this.opts = readOptions(d, opts.opts);
      this.boxes = d.shapes.map(b => ({ lx: b.x, ly: b.y, hw: b.hw, hh: b.hh, x: 0, y: 0, c: 1, s: 0, br: Math.hypot(b.hw, b.hh) }));
      this.br = 0;
      d.shapes.forEach(b => (this.br = Math.max(this.br, Math.hypot(Math.abs(b.x) + b.hw, Math.abs(b.y) + b.hh))));
      this.outline = {                 // box round all the parts, in the body's own frame
        x0: Math.min(...d.shapes.map(b => b.x - b.hw)), x1: Math.max(...d.shapes.map(b => b.x + b.hw)),
        y0: Math.min(...d.shapes.map(b => b.y - b.hh)), y1: Math.max(...d.shapes.map(b => b.y + b.hh))
      };
      this.update();
    }
    /* Call after changing x, y or angle */
    update() {
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      this.c = c; this.s = s;
      for (const b of this.boxes) {
        b.x = this.x + b.lx * c - b.ly * s;
        b.y = this.y + b.lx * s + b.ly * c;
        b.c = c; b.s = s;
      }
    }
    toWorld(lx, ly) { return { x: this.x + lx * this.c - ly * this.s, y: this.y + lx * this.s + ly * this.c }; }
    ropePos() { const p = this.def.ropePoint; return this.toWorld(p.x, p.y); }
  }

  CL.Ball = Ball;
  CL.Rigid = Rigid;
  CL.Block = Block;
  CL.readOptions = readOptions;
})(window.CL = window.CL || {});
