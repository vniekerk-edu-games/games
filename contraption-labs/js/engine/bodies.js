/* Contraption Labs — bodies.js
 * Ball  : dynamic circle (moves, spins, bounces)
 * Block : static oriented rectangle (planks, trampolines, floor, walls)
 */
(function (CL) {
  'use strict';
  let nextId = 1;

  class Ball {
    constructor(type, x, y) {
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
      this.invI = 1 / this.inertia;
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
      this.locked = false;   // bolted down by a level (can't be moved by the player)
      this.touching = false; // in contact with something this substep
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
      this.x = x; this.y = y;
      this.hw = (opts.length != null ? opts.length : (s.defaultLength || 200)) / 2;
      this.hh = (opts.thickness != null ? opts.thickness : s.thickness) / 2;
      this.angle = opts.angle || 0;
      this.fixed = !!opts.fixed; // lab boundaries cannot be selected
      this.locked = false;       // bolted down by a level
      this.bounce = s.bounce;
      this.minBounce = s.minBounce || 0;
      this.friction = s.friction;
      this.update();
    }
    get length() { return this.hw * 2; }
    /* Call after changing x, y, angle, hw or hh */
    update() {
      this.c = Math.cos(this.angle);
      this.s = Math.sin(this.angle);
      this.br = Math.hypot(this.hw, this.hh); // bounding radius
    }
  }

  CL.Ball = Ball;
  CL.Block = Block;
})(window.CL = window.CL || {});
