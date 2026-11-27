/* Contraption Labs — sandbox.js
 * Game loop + interaction for the free-play lab.
 *   • Pick a part on the shelf, click in the lab to place it
 *   • Drag anything to move it; flick a ball to throw it
 *   • Drag a plank's yellow handle to turn / stretch it (Q / E also turn)
 */
(function (CL) {
  'use strict';
  const { width: W, height: H, floorY: F } = CL.WORLD;
  const MAX_BALLS = 150;
  const MAX_THROW = 1800;
  const DEG = Math.PI / 180;

  class Sandbox {
    constructor(canvas) {
      this.canvas = canvas;
      this.renderer = new CL.Renderer(canvas);
      this.world = new CL.World();
      this.running = true;
      this.slowmo = false;
      this.trails = false;
      this.tool = 'basketball';
      this.selected = null;
      this.drag = null;
      this.trailMap = new Map();
      this.preset = 'empty';
      this._listeners = [];
      this._acc = 0; this._last = 0; this._frameNo = 0;
      this._buildBounds();
      this._bindInput();
      requestAnimationFrame(t => this._frame(t));
    }

    /* ---------- events for the UI ---------- */
    on(fn) { this._listeners.push(fn); }
    emit(type, data) { for (const fn of this._listeners) fn(type, data); }

    /* ---------- world setup ---------- */
    _buildBounds() {
      const B = CL.Block, w = this.world;
      w.add(new B('floor', W / 2, F + 60, { length: W + 400, thickness: 120, fixed: true }));
      w.add(new B('wall', -60, H / 2, { length: 120, thickness: 2000, fixed: true }));
      w.add(new B('wall', W + 60, H / 2, { length: 120, thickness: 2000, fixed: true }));
      w.add(new B('wall', W / 2, -60, { length: W + 400, thickness: 120, fixed: true }));
    }

    addBall(type, x, y) {
      if (this.world.balls.length >= MAX_BALLS) {
        this.emit('toast', 'Wow, that\u2019s a LOT of balls! Clear some first.');
        return null;
      }
      const r = CL.BALLS[type].radius;
      return this.world.add(new CL.Ball(type, clamp(x, r, W - r), clamp(y, r, F - r)));
    }

    addBlock(type, x, y, length, angle) {
      const def = CL.SURFACES[type];
      const len = clamp(length || def.defaultLength, def.minLength, def.maxLength);
      return this.world.add(new CL.Block(type, clamp(x, 0, W), clamp(y, 0, F), { length: len, angle: angle || 0 }));
    }

    remove(o) {
      if (!o || o.fixed) return;
      this.world.remove(o);
      this.trailMap.delete(o.id);
      if (this.selected === o) this.select(null);
      this.emit('change');
    }

    clearBalls() {
      this.world.balls.slice().forEach(b => this.world.remove(b));
      this.trailMap.clear();
      if (this.selected && this.selected.kind === 'ball') this.select(null);
      this.emit('change');
    }

    clearAll() {
      this.world.balls.length = 0;
      this.world.blocks = this.world.blocks.filter(k => k.fixed);
      this.trailMap.clear();
      this.select(null);
    }

    loadPreset(id) {
      const p = CL.PRESETS[id]; if (!p) return;
      const d = p.build();
      this.clearAll();
      d.blocks.forEach(k => this.addBlock(k.type, k.x, k.y, k.length, k.angle));
      d.balls.forEach(b => this.addBall(b.type, b.x, b.y));
      this.preset = id;
      this.trails = !!d.trails;
      this.running = true;
      this._acc = 0;
      this.emit('change');
      if (id !== 'empty') this.emit('toast', p.icon + ' ' + p.blurb);
    }

    reset() { this.loadPreset(this.preset); }

    /* ---------- toggles ---------- */
    setTool(t) { this.tool = t; this.select(null); this.emit('change'); }
    toggleRun() { this.running = !this.running; this.emit('change'); }
    toggleSlow() { this.slowmo = !this.slowmo; this.emit('change'); }
    toggleTrails() {
      this.trails = !this.trails;
      if (!this.trails) { this.trailMap.clear(); this.world.balls.forEach(b => (b.apex = null)); }
      this.emit('change');
    }
    select(o) { this.selected = o; this.emit('select', o); }

    rotateSelected(deg) {
      const k = this.selected;
      if (!k || k.kind !== 'block') return;
      k.angle = normAngle(Math.round((k.angle / DEG + deg) / 5) * 5 * DEG);
      k.update(); this.emit('change');
    }

    handlePos(k) { return { x: k.x + k.c * k.hw, y: k.y + k.s * k.hw }; }

    /* ---------- main loop ---------- */
    _frame(t) {
      const now = t / 1000;
      const dt = this._last ? Math.min(now - this._last, 0.1) : 0;
      this._last = now;
      if (this.running) {
        this._acc += dt * (this.slowmo ? 0.25 : 1);
        let n = 0;
        while (this._acc >= this.world.stepDt && n < 12) {
          this.world.step();
          this._afterStep();
          this._acc -= this.world.stepDt; n++;
        }
        if (n === 12) this._acc = 0; // device too slow: drop time rather than spiral
      }
      this.renderer.draw(this);
      if (++this._frameNo % 6 === 0) this.emit('tick');
      requestAnimationFrame(tt => this._frame(tt));
    }

    _afterStep() {
      const w = this.world;
      const sample = this.trails && w.stepCount % 2 === 0;
      for (let i = w.balls.length - 1; i >= 0; i--) {
        const b = w.balls[i];
        // escaped the lab? remove it
        if (b.x < -300 || b.x > W + 300 || b.y < -300 || b.y > H + 300) { this.remove(b); continue; }
        // highest point of each bounce
        if (b.gravityScale > 0 && !b.held) {
          if (b.vy < -60) b._rising = true;
          else if (b._rising && b.vy >= 0) { b._rising = false; b.apex = { x: b.x, y: b.y }; }
        }
        if (sample && !b.held) {
          let tr = this.trailMap.get(b.id);
          if (!tr) this.trailMap.set(b.id, (tr = []));
          const last = tr[tr.length - 1];
          if (!last || Math.abs(last[0] - b.x) + Math.abs(last[1] - b.y) > 1.5) {
            tr.push([b.x, b.y]);
            if (tr.length > 260) tr.shift();
          }
        }
      }
    }

    /* ---------- input ---------- */
    _bindInput() {
      const c = this.canvas;
      c.addEventListener('pointerdown', e => this._down(e));
      c.addEventListener('pointermove', e => this._move(e));
      c.addEventListener('pointerup', e => this._up(e));
      c.addEventListener('pointercancel', e => this._up(e));
      c.addEventListener('wheel', e => {
        if (this.selected && this.selected.kind === 'block') {
          e.preventDefault();
          this.rotateSelected(e.deltaY > 0 ? 5 : -5);
        }
      }, { passive: false });
      c.addEventListener('contextmenu', e => e.preventDefault());
    }

    _pt(e) {
      const r = this.canvas.getBoundingClientRect();
      return this.renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
    }

    _hitBall(p, tol) {
      const balls = this.world.balls;
      for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + tol) return b;
      }
      return null;
    }

    _hitBlock(p, tol) {
      const bl = this.world.blocks;
      for (let i = bl.length - 1; i >= 0; i--) {
        const k = bl[i]; if (k.fixed) continue;
        const dx = p.x - k.x, dy = p.y - k.y;
        const lx = dx * k.c + dy * k.s, ly = -dx * k.s + dy * k.c;
        if (Math.abs(lx) <= k.hw + tol && Math.abs(ly) <= k.hh + tol + 4) return k;
      }
      return null;
    }

    _down(e) {
      if (e.button === 2) return;
      const p = this._pt(e);
      const tol = e.pointerType === 'touch' ? 14 : 5;
      this.canvas.setPointerCapture(e.pointerId);
      const sel = this.selected;

      if (sel && sel.kind === 'block') {
        const h = this.handlePos(sel);
        if (Math.hypot(p.x - h.x, p.y - h.y) <= 16 + tol) { this.drag = { mode: 'handle', block: sel }; return; }
      }
      const ball = this._hitBall(p, tol);
      if (ball) { this._grabBall(ball, p); return; }
      const blk = this._hitBlock(p, tol);
      if (blk) {
        this.select(blk);
        this.drag = { mode: 'block', block: blk, ox: blk.x - p.x, oy: blk.y - p.y };
        return;
      }
      if (CL.BALLS[this.tool]) {
        const b = this.addBall(this.tool, p.x, p.y);
        if (b) { this._grabBall(b, { x: b.x, y: b.y }); this.emit('change'); }
        return;
      }
      if (CL.SURFACES[this.tool]) {
        const k = this.addBlock(this.tool, p.x, p.y);
        this.select(k);
        this.drag = { mode: 'block', block: k, ox: k.x - p.x, oy: k.y - p.y };
        this.emit('change');
        return;
      }
      this.select(null);
    }

    _grabBall(b, p) {
      this.select(b);
      b.held = true; b.vx = 0; b.vy = 0; b.av = 0; b._rising = false; b.apex = null;
      this.trailMap.delete(b.id);
      this.drag = { mode: 'ball', ball: b, ox: b.x - p.x, oy: b.y - p.y,
        samples: [{ t: performance.now(), x: b.x, y: b.y }] };
      this.canvas.style.cursor = 'grabbing';
    }

    _move(e) {
      const p = this._pt(e);
      const d = this.drag;
      if (!d) { this._hover(p, e.pointerType === 'touch' ? 14 : 5); return; }

      if (d.mode === 'ball') {
        const b = d.ball;
        b.x = clamp(p.x + d.ox, b.r, W - b.r);
        b.y = clamp(p.y + d.oy, b.r, F - b.r);
        const now = performance.now();
        d.samples.push({ t: now, x: b.x, y: b.y });
        while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
        const v = throwVel(d.samples);
        // while held, the ball shoves others with the hand's velocity
        b.vx = this.running ? v.x : 0; b.vy = this.running ? v.y : 0;
      } else if (d.mode === 'block') {
        const k = d.block;
        k.x = clamp(p.x + d.ox, 0, W); k.y = clamp(p.y + d.oy, 0, F);
        k.update();
      } else if (d.mode === 'handle') {
        const k = d.block, def = k.def;
        let ang = Math.atan2(p.y - k.y, p.x - k.x);
        if (!e.shiftKey) ang = Math.round(ang / (5 * DEG)) * 5 * DEG; // snap to 5°
        k.angle = normAngle(ang);
        k.hw = clamp(Math.hypot(p.x - k.x, p.y - k.y), def.minLength / 2, def.maxLength / 2);
        k.update();
      }
    }

    _hover(p, tol) {
      let cur = 'crosshair';
      const sel = this.selected;
      if (sel && sel.kind === 'block') {
        const h = this.handlePos(sel);
        if (Math.hypot(p.x - h.x, p.y - h.y) <= 16 + tol) cur = 'alias';
      }
      if (cur === 'crosshair' && (this._hitBall(p, tol) || this._hitBlock(p, tol))) cur = 'grab';
      if (cur === 'crosshair' && this.tool === 'hand') cur = 'default';
      this.canvas.style.cursor = cur;
    }

    _up(e) {
      const d = this.drag; if (!d) return;
      if (d.mode === 'ball') {
        const b = d.ball;
        const last = d.samples[d.samples.length - 1];
        const fresh = performance.now() - last.t < 60;
        const v = fresh ? throwVel(d.samples) : { x: 0, y: 0 };
        const sp = Math.hypot(v.x, v.y);
        const k = sp > MAX_THROW ? MAX_THROW / sp : 1;
        b.vx = v.x * k; b.vy = v.y * k;
        b.held = false;
      }
      this.drag = null;
      this.canvas.style.cursor = 'crosshair';
      this.emit('change');
    }
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function normAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; }
  function throwVel(s) {
    if (s.length < 2) return { x: 0, y: 0 };
    const a = s[0], b = s[s.length - 1], dt = (b.t - a.t) / 1000;
    return dt > 0.005 ? { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt } : { x: 0, y: 0 };
  }

  CL.Sandbox = Sandbox;
})(window.CL = window.CL || {});
