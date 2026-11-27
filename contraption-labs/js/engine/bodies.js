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
    /* Where cords attach */
    plugPos() {
      if (this.type === 'switch') return { x: this.x + this.hw - 8, y: this.y + this.hh - 6 };
      if (this.type === 'motor') return { x: this.x - this.hw + 8, y: this.y + this.hh - 6 };
      return { x: this.x - this.c * this.hw * 0.6 + this.s * this.hh * 0.6, y: this.y - this.s * this.hw * 0.6 + this.c * this.hh * 0.6 };
    }
  }

  CL.Ball = Ball;
  CL.Block = Block;
  CL.readOptions = readOptions;
})(window.CL = window.CL || {});
