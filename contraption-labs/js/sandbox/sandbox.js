/* Contraption Labs — sandbox.js
 * Lab controller with two modes:
 *
 *   BUILD  Nothing moves. Place, drag, turn, stretch and delete parts.
 *          Join machines with belts and cords. Parts can't overlap; balls
 *          dropped on a plank settle on top; gears click into mesh.
 *          Every change can be undone and is autosaved.
 *   RUN    Physics on. Press Stop to return to EXACTLY what you built.
 *          In the sandbox (freePlay) you can still throw balls, move planks
 *          and flick switches while it runs — those changes vanish on Stop.
 *          Machines stay put while running. Levels will switch freePlay off.
 *
 * Options: { freePlay = true, bin = null ({type: count} limits parts), autosave = true }
 */
(function (CL) {
  'use strict';
  const { width: W, height: H, floorY: F } = CL.WORLD;
  const MAX_BALLS = 150, MAX_THROW = 1800, MAX_UNDO = 100;
  const DEG = Math.PI / 180, GRID = 10, GEAR_SNAP = 16;
  const SAVE_KEY = 'contraption-labs.sandbox.v1';

  class Sandbox {
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas;
      this.renderer = new CL.Renderer(canvas);
      this.world = new CL.World();
      this.mode = 'build';
      this.running = true;          // pause state inside run mode
      this.slowmo = false;
      this.trails = false;
      this.snap = true;
      this.freePlay = opts.freePlay !== false;
      this.bin = opts.bin || null;
      this.autosave = opts.autosave !== false;
      this.tool = 'basketball';
      this.selected = null;
      this.drag = null;
      this.ghost = null;            // preview of the part under the cursor
      this.linkFrom = null;         // first part picked with the belt/cord tool
      this.cursor = null;
      this.trailMap = new Map();    // ball id → { color, pts }
      this.ghostTrails = [];        // last run's paths, shown faintly while building
      this.snapshot = null;         // the layout that Start ran from
      this.past = []; this.future = []; this._saved = null;
      this.preset = null;
      this._ghosts = {};
      this._listeners = [];
      this._acc = 0; this._last = 0; this._frameNo = 0; this._tempWarned = false;
      this._buildBounds();
      this._bindInput();
      requestAnimationFrame(t => this._frame(t));
    }

    get building() { return this.mode === 'build'; }

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
      if (this.world.balls.length + this.world.rigids.length >= MAX_BALLS) {
        this.emit('toast', 'Wow, that\u2019s a LOT of things! Clear some first.');
        return null;
      }
      if (CL.RIGIDS[type]) {
        const r = new CL.Rigid(type, x, y);
        r.x = clamp(x, r.br, W - r.br); r.y = clamp(y, r.br, F - r.br); r.update();
        return this.world.add(r);
      }
      const r = CL.BALLS[type].radius;
      return this.world.add(new CL.Ball(type, clamp(x, r, W - r), clamp(y, r, F - r)));
    }

    addBlock(type, x, y, length, angle) {
      const def = CL.SURFACES[type];
      const len = def.stretchable ? clamp(length || def.defaultLength, def.minLength, def.maxLength) : undefined;
      return this.world.add(new CL.Block(type, clamp(x, 0, W), clamp(y, 0, F), { length: len, angle: angle || 0 }));
    }

    remove(o) {
      if (!o || o.fixed) return;
      if (o.kind === 'link') {
        if (!this.building) { this.emit('toast', 'Stop the machine first to change belts and cords.'); return; }
        this.world.links = this.world.links.filter(l => l !== o);
      } else {
        if (o.locked && this.building) { this.emit('toast', '🔩 That part is bolted down. It can\u2019t be removed.'); return; }
        if (!this.building && o.kind === 'block' && o.def.machine) { this.emit('toast', 'Machines stay put while it runs. Press ■ Stop first.'); return; }
        this.world.remove(o);
        this.trailMap.delete(o.id);
      }
      if (this.selected === o) this.select(null);
      if (this.linkFrom === o) this.linkFrom = null;
      if (this.building) this.commit();
      this.emit('change');
    }

    clearBalls() {
      this.world.balls.filter(b => !(this.building && b.locked)).forEach(b => this.world.remove(b));
      this.trailMap.clear();
      if (this.selected && this.selected.kind === 'ball' && this.world.balls.indexOf(this.selected) < 0) this.select(null);
      if (this.selected && this.selected.kind === 'link' && this.world.links.indexOf(this.selected) < 0) this.select(null);
      if (this.building) this.commit();
      this.emit('change');
    }

    clearAll() {
      this.world.balls.length = 0;
      this.world.rigids.length = 0;
      this.world.blocks = this.world.blocks.filter(k => k.fixed);
      this.world.effects.length = 0;
      this.world.links.length = 0;
      this.trailMap.clear();
      this.selected = null;
      this.linkFrom = null;
    }

    /* ---------- layouts, undo, autosave ---------- */
    serialize() { return CL.Layout.fromWorld(this.world); }

    restore(layout) {
      this.clearAll();
      this.world.time = 0;
      CL.Layout.build(this.world, layout);
    }

    _refreshMachines() {
      CL.Machines.update(this.world, 0);
      if (this.building) CL.Ropes.resetLengths(this.world);   // ropes are as long as they are drawn
    }

    /* Record the current build as an undo step (build mode only). */
    commit() {
      if (!this.building) return;
      this._refreshMachines();
      const s = JSON.stringify(this.serialize());
      if (s === this._saved) return;
      if (this._saved != null) {
        this.past.push(this._saved);
        if (this.past.length > MAX_UNDO) this.past.shift();
      }
      this.future.length = 0;
      this._saved = s;
      this._store(s);
      this.emit('change');
    }

    undo() {
      if (!this.building || this.drag || !this.past.length) return;
      this.future.push(this._saved);
      this._saved = this.past.pop();
      this._restoreSaved();
    }

    redo() {
      if (!this.building || this.drag || !this.future.length) return;
      this.past.push(this._saved);
      this._saved = this.future.pop();
      this._restoreSaved();
    }

    _restoreSaved() {
      this.restore(CL.Layout.parse(this._saved));
      this._store(this._saved);
      this.select(null);
      this.emit('change');
    }

    _store(s) {
      if (!this.autosave) return;
      try { localStorage.setItem(SAVE_KEY, s); } catch (e) { /* private mode etc. */ }
    }

    loadSaved() {
      if (!this.autosave) return false;
      try {
        const s = localStorage.getItem(SAVE_KEY);
        if (!s) return false;
        this.restore(CL.Layout.parse(s));
        this._saved = JSON.stringify(this.serialize());
        this.emit('change');
        return true;
      } catch (e) { return false; }
    }

    loadLayout(layout) {
      this.stop();
      this.restore(layout);
      this.ghostTrails = [];
      this.select(null);
      this.commit(); // undoable: Undo brings back what you had before
      this.emit('change');
    }

    loadPreset(id) {
      const p = CL.PRESETS[id]; if (!p) return;
      const d = p.build();
      this.trails = !!d.trails;
      this.loadLayout(CL.Layout.fromPreset(d));
      this.preset = id;
      if (id !== 'empty') this.emit('toast', p.icon + ' ' + p.blurb + ' Press ▶ Start!');
    }

    exportLayout() {
      return JSON.stringify(this.building ? this.serialize() : this.snapshot, null, 2);
    }

    importLayout(text) {
      const layout = CL.Layout.parse(text); // throws a friendly Error if invalid
      this.loadLayout(layout);
      let msg = '📂 Opened! ' + layout.parts.length + ' part' + (layout.parts.length === 1 ? '' : 's') + '.';
      if (layout.skipped) msg += ' (' + layout.skipped + ' unknown item' + (layout.skipped === 1 ? ' was' : 's were') + ' skipped.)';
      this.emit('toast', msg);
      return layout;
    }

    /* ---------- build / run ---------- */
    start() {
      if (!this.building) return;
      this._cancelDrag();
      this.snapshot = this.serialize();
      this.restore(this.snapshot);  // run from the saved numbers: same build = same result
      this.mode = 'run';
      this.running = true;
      this._acc = 0;
      this.trailMap.clear();
      this.ghostTrails = [];
      this.ghost = null;
      this.linkFrom = null;
      this.select(null);
      this.emit('mode');
      this.emit('change');
    }

    stop() {
      if (this.building) return;
      this._cancelDrag();
      this.ghostTrails = this.trails ? Array.from(this.trailMap.values()).filter(t => t.pts.length > 1) : [];
      this.trailMap.clear();
      this.restore(this.snapshot);
      this.mode = 'build';
      this.select(null);
      this.emit('mode');
      this.emit('change');
    }

    toggleRun() {
      if (this.building) this.start();
      else { this.running = !this.running; this.emit('change'); }
    }
    togglePause() { if (!this.building) { this.running = !this.running; this.emit('change'); } }
    toggleStartStop() { this.building ? this.start() : this.stop(); }

    /* ---------- toggles ---------- */
    setTool(t) { this.tool = t; this.linkFrom = null; this.linkVia = null; this.select(null); this.ghost = null; this.emit('change'); }
    toggleSlow() { this.slowmo = !this.slowmo; this.emit('change'); }
    toggleSnap() { this.snap = !this.snap; this.emit('change'); }
    toggleTrails() {
      this.trails = !this.trails;
      if (!this.trails) {
        this.trailMap.clear(); this.ghostTrails = [];
        this.world.balls.forEach(b => (b.apex = null));
      }
      this.emit('change');
    }
    select(o) { this.selected = o; this.emit('select', o); }
    cancel() { this.linkFrom = null; this.linkVia = null; this.select(null); }
    /* Put down whatever you're holding and go back to the Move hand (right-click, Esc, ✋ button) */
    toHand() { this._cancelDrag(); this.setTool('hand'); }

    /* Part settings (switch ON/OFF, fan direction ...) — build mode only */
    setOption(o, key, value) {
      if (!this.building || !o || !o.opts || o.locked) return;
      o.opts[key] = value;
      if (o.kind === 'block') { o.on = !!o.opts.on; o.running = !!o.opts.awake; o.lit = o.opts.lit !== false; }
      else if (o.def.creature === 'cat') o.state = o.opts.awake ? 'idle' : 'sleep';
      this.commit();
      this.emit('change');
    }

    canEdit(o) {
      if (!o || o.locked) return false;
      if (this.building) return true;
      if (!this.freePlay) return false;
      return !(o.kind === 'block' && o.def.machine);
    }

    hasHandle(o) {
      return !!(o && o.kind === 'block' && (o.def.rotatable || o.def.stretchable) && this.canEdit(o));
    }

    rotateSelected(deg) {
      const k = this.selected;
      if (!k || this.drag || !this.canEdit(k)) return;
      if (k.kind === 'rigid' ? !this.building : (k.kind !== 'block' || !k.def.rotatable)) return;
      const old = k.angle;
      k.angle = normAngle(Math.round((k.angle / DEG + deg) / 5) * 5 * DEG);
      k.update();
      if (this.building) {
        const ok = k.kind === 'rigid' ? this._rigidClear(k) : this._blockClear(k);
        if (!ok) { k.angle = old; k.update(); this.emit('toast', 'It would bump into something. Move it first!'); }
        else this.commit();
      }
      this.emit('change');
    }

    handlePos(k) { return { x: k.x + k.c * k.hw, y: k.y + k.s * k.hw }; }

    /* ---------- parts bin (used by levels; sandbox = unlimited) ---------- */
    remaining(type) {
      if (!this.bin) return Infinity;
      let used = 0;
      for (const o of this.world.balls) if (o.type === type && !o.locked) used++;
      for (const o of this.world.rigids) if (o.type === type && !o.locked) used++;
      for (const o of this.world.blocks) if (o.type === type && !o.locked) used++;
      for (const l of this.world.links) if (l.type === type) used++;
      return (this.bin[type] || 0) - used;
    }
    canPlace(type) { return this.remaining(type) > 0; }

    /* ---------- placement rules (build mode) ---------- */
    _ballClear(b) {
      if (b.kind === 'rigid') return this._rigidClear(b);
      for (const r of this.world.rigids) for (const bx of r.boxes) {
        const c = CL.collide.circleBox(b, bx);
        if (c && c.pen > 0.5) return false;
      }
      for (const o of this.world.balls) {
        if (o === b) continue;
        const c = CL.collide.circleCircle(b, o);
        if (c && c.pen > 0.5) return false;
      }
      for (const k of this.world.blocks) {
        const c = CL.collide.ballBlock(b, k);
        if (c && c.pen > 0.5) return false;
      }
      return true;
    }

    /* deepest overlap between a rigid's boxes and something else (0 = clear) */
    _rigidPen(r, other) {
      let worst = 0;
      for (const bx of r.boxes) {
        if (other.kind === 'ball') { const c = CL.collide.circleBox(other, bx); if (c) worst = Math.max(worst, c.pen); }
        else if (other.kind === 'rigid') {
          for (const ob of other.boxes) { const cs = CL.collide.boxBox(bx, ob); if (cs) cs.forEach(c => (worst = Math.max(worst, c.pen))); }
        } else if (other.shape === 'circle') { const c = CL.collide.circleBox(other, bx); if (c) worst = Math.max(worst, c.pen); }
        else { const cs = CL.collide.boxBox(bx, other); if (cs) cs.forEach(c => (worst = Math.max(worst, c.pen))); }
      }
      return worst;
    }

    _rigidClear(r) {
      const w = this.world;
      for (const o of w.balls) if (this._rigidPen(r, o) > 0.5) return false;
      for (const o of w.rigids) if (o !== r && this._rigidPen(r, o) > 0.5) return false;
      for (const k of w.blocks) if (this._rigidPen(r, k) > 0.5) return false;
      return true;
    }

    _blockClear(k) {
      for (const b of this.world.balls) {
        const c = CL.collide.ballBlock(b, k);
        if (c && c.pen > 0.5) return false;
      }
      for (const r of this.world.rigids) if (this._rigidPen(r, k) > 0.5) return false;
      if (k.shape === 'circle') {               // wheels can't sit inside each other
        for (const o of this.world.blocks) {
          if (o === k || o.shape !== 'circle') continue;
          if (Math.hypot(o.x - k.x, o.y - k.y) < o.r + k.r - 8) return false;
        }
      }
      return true;
    }

    /* Nudge a ball out of any part it overlaps, so it sits on top. */
    _settle(b) {
      if (b.kind === 'rigid') return this._settleRigid(b);
      for (let i = 0; i < 4; i++) {
        let moved = false;
        for (const k of this.world.blocks) {
          const c = CL.collide.ballBlock(b, k);
          if (!c || c.pen <= 0.01) continue;
          moved = true;
          if (k.shape === 'box' && !k.fixed) {
            const dx = b.x - k.x, dy = b.y - k.y;
            const lx = dx * k.c + dy * k.s, ly = -dx * k.s + dy * k.c;
            if (Math.abs(lx) <= k.hw && Math.abs(ly) <= k.hh) {
              const side = k.c >= 0 ? -1 : 1;              // local side that faces up
              const ty = side * (k.hh + b.r + 0.2);
              b.x = k.x + lx * k.c - ty * k.s;
              b.y = k.y + lx * k.s + ty * k.c;
              continue;
            }
          }
          b.x += c.nx * (c.pen + 0.2); b.y += c.ny * (c.pen + 0.2);
        }
        b.x = clamp(b.x, b.r, W - b.r); b.y = clamp(b.y, b.r, F - b.r);
        if (!moved) break;
      }
    }

    /* Lift a box out of whatever plank/floor it was dropped into, so it sits on top */
    _settleRigid(r) {
      for (let i = 0; i < 6; i++) {
        let moved = false;
        for (const k of this.world.blocks) {
          for (const bx of r.boxes) {
            let push = null;
            if (k.shape === 'circle') { const c = CL.collide.circleBox(k, bx); if (c) push = { nx: -c.nx, ny: -c.ny, pen: c.pen }; }
            else { const cs = CL.collide.boxBox(bx, k); if (cs) cs.forEach(c => { if (!push || c.pen > push.pen) push = c; }); }
            if (!push || push.pen <= 0.01 || push.pen > r.br + k.hh + 2) continue;
            r.x += push.nx * (push.pen + 0.2); r.y += push.ny * (push.pen + 0.2); r.update();
            moved = true;
          }
        }
        r.x = clamp(r.x, 0, W); r.y = clamp(r.y, 0, F); r.update();
        if (!moved) break;
      }
    }

    /* Gears click into mesh with the nearest gear */
    _snapGear(k) {
      if (!k.def.gear) return;
      let best = null, bd = GEAR_SNAP;
      for (const o of this.world.blocks) {
        if (o === k || !o.def.gear) continue;
        const d = Math.hypot(k.x - o.x, k.y - o.y), gap = Math.abs(d - (k.r + o.r));
        if (gap < bd) { bd = gap; best = o; }
      }
      if (!best) return;
      const d = Math.hypot(k.x - best.x, k.y - best.y) || 1, want = k.r + best.r;
      k.x = best.x + (k.x - best.x) / d * want;
      k.y = best.y + (k.y - best.y) / d * want;
      k.update();
    }

    _sn(v) { return this.snap && this.building ? Math.round(v / GRID) * GRID : v; }

    _reject(o, d) {
      if (d.isNew) {
        this.world.remove(o);
        this.select(null);
        this.emit('toast', '🚫 No room there! Parts can\u2019t overlap.');
      } else if (d.mode === 'handle') {
        o.angle = d.start.angle; o.hw = d.start.hw; o.update();
        this.emit('toast', 'It would bump into something. Move that first!');
      } else {
        o.x = d.start.x; o.y = d.start.y;
        if (o.update) o.update();
        this.emit('toast', '🚫 That spot is taken. It went back where it was.');
      }
      this._refreshMachines();
    }

    _cancelDrag() {
      const d = this.drag;
      if (d && d.ball) { d.ball.held = false; if (this.building) { d.ball.vx = 0; d.ball.vy = 0; } }
      this.drag = null;
    }

    /* ---------- main loop ---------- */
    _frame(t) {
      const now = t / 1000;
      const dt = this._last ? Math.min(now - this._last, 0.1) : 0;
      this._last = now;
      if (!this.building && this.running) {
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
      if (this.world.events.length) { this.emit('events', this.world.events.slice()); this.world.events.length = 0; }
      if (++this._frameNo % 6 === 0) this.emit('tick');
      requestAnimationFrame(tt => this._frame(tt));
    }

    _afterStep() {
      const w = this.world;
      const sample = this.trails && w.stepCount % 2 === 0;
      for (let i = w.balls.length - 1; i >= 0; i--) {
        const b = w.balls[i];
        if (b.x < -300 || b.x > W + 300 || b.y < -300 || b.y > H + 300) { this.remove(b); continue; }
        if (b.gravityScale > 0 && !b.held) {
          if (b.vy < -60) b._rising = true;
          else if (b._rising && b.vy >= 0) { b._rising = false; b.apex = { x: b.x, y: b.y }; }
        }
        if (sample && !b.held) {
          let tr = this.trailMap.get(b.id);
          if (!tr) this.trailMap.set(b.id, (tr = { color: b.def.trailColor, pts: [] }));
          const last = tr.pts[tr.pts.length - 1];
          if (!last || Math.abs(last[0] - b.x) + Math.abs(last[1] - b.y) > 1.5) {
            tr.pts.push([b.x, b.y]);
            if (tr.pts.length > 260) tr.pts.shift();
          }
        }
      }
      for (let i = w.rigids.length - 1; i >= 0; i--) {
        const r = w.rigids[i];
        if (r.x < -300 || r.x > W + 300 || r.y < -300 || r.y > H + 300) this.remove(r);
      }
      const s = this.selected;
      if (s && ((s.kind === 'ball' && w.balls.indexOf(s) < 0) || (s.kind === 'rigid' && w.rigids.indexOf(s) < 0) ||
          (s.kind === 'link' && w.links.indexOf(s) < 0))) this.select(null);
    }

    /* ---------- input ---------- */
    _bindInput() {
      const c = this.canvas;
      c.addEventListener('pointerdown', e => this._down(e));
      c.addEventListener('pointermove', e => this._move(e));
      c.addEventListener('pointerup', e => this._up(e));
      c.addEventListener('pointercancel', e => this._up(e));
      c.addEventListener('pointerleave', () => { if (!this.drag) { this.ghost = null; this.cursor = null; } });
      c.addEventListener('wheel', e => {
        if (this.selected && this.selected.kind === 'block' && this.selected.def.rotatable) {
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
      const rs = this.world.rigids;
      for (let i = rs.length - 1; i >= 0; i--) {       // the whole outline counts (so the inside of a bucket too)
        const r = rs[i], o = r.outline, dx = p.x - r.x, dy = p.y - r.y;
        const lx = dx * r.c + dy * r.s, ly = -dx * r.s + dy * r.c;
        if (lx >= o.x0 - tol - 2 && lx <= o.x1 + tol + 2 && ly >= o.y0 - tol && ly <= o.y1 + tol) return r;
      }
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
        if (k.shape === 'circle') { if (Math.hypot(p.x - k.x, p.y - k.y) <= k.r + tol) return k; continue; }
        const dx = p.x - k.x, dy = p.y - k.y;
        const lx = dx * k.c + dy * k.s, ly = -dx * k.s + dy * k.c;
        if (Math.abs(lx) <= k.hw + tol && Math.abs(ly) <= k.hh + tol + 4) return k;
      }
      return null;
    }

    _hitLink(p, tol) {
      for (let i = this.world.links.length - 1; i >= 0; i--) {
        const l = this.world.links[i];
        const d = l.type === 'rope' ? CL.Ropes.distTo(l, p.x, p.y) : CL.machineArt.linkDistance(l, p.x, p.y);
        if (d <= 5 + tol) return l;
      }
      return null;
    }

    _onHandle(p, tol) {
      const s = this.selected;
      if (!this.hasHandle(s)) return false;
      const h = this.handlePos(s);
      return Math.hypot(p.x - h.x, p.y - h.y) <= 16 + tol;
    }

    /* belt / cord tool */
    _linkClick(p, tol) {
      const type = this.tool;
      if (!this.building) { this.emit('toast', 'Belts, cords and ropes are fitted in build mode. Press ■ Stop first.'); return; }
      const L = CL.LINKS[type];
      const rope = type === 'rope';
      const k = rope ? (this._hitBall(p, tol) || this._hitBlock(p, tol)) : this._hitBlock(p, tol);
      if (!this.linkFrom) {
        if (!k) { this.select(null); return; }
        if (!L.fits(k)) { this.emit('toast', '🚫 ' + L.wrong); return; }
        if (rope && k.def.pulley) { this.emit('toast', 'Start the rope at a thing or a hook, then click the pulley.'); return; }
        this.linkFrom = k; this.linkVia = null; this.select(k);
        return;
      }
      const a = this.linkFrom;
      if (rope && k && k.def && k.def.pulley && !this.linkVia) {   // rope goes over this pulley
        this.linkVia = k; this.select(k); this.emit('change');
        return;
      }
      const via = this.linkVia || null;
      this.linkFrom = null; this.linkVia = null;
      if (!k || k === a) { this.select(null); this.emit('change'); return; }
      const existing = this.world.links.find(l => l.type === type && (l.via || null) === via &&
        ((l.a === a && l.b === k) || (l.a === k && l.b === a)));
      if (existing) {
        this.world.links = this.world.links.filter(l => l !== existing);
        this.emit('toast', '✂️ ' + L.name + ' removed.');
        this.select(null); this.commit(); return;
      }
      if (!this.canPlace(type)) { this.emit('toast', 'No ' + L.name.toLowerCase() + 's left!'); this.select(null); return; }
      const err = CL.Machines.canLink(this.world, type, a, k, via);
      if (err) { this.emit('toast', '🚫 ' + err); this.select(null); this.emit('change'); return; }
      const link = { type: type, a: a, b: k, kind: 'link' };
      if (via) link.via = via;
      this.world.links.push(link);
      this.select(link);
      this.commit();
    }

    _down(e) {
      if (e.button === 2) { this.toHand(); return; }
      const p = this._pt(e);
      const tol = e.pointerType === 'touch' ? 14 : 5;
      const build = this.building;
      const canAdd = build || this.freePlay;
      this.canvas.setPointerCapture(e.pointerId);
      this.ghost = null;

      if (CL.LINKS[this.tool] && build) { this._linkClick(p, tol); return; }

      if (this._onHandle(p, tol)) {
        const k = this.selected;
        this.drag = { mode: 'handle', block: k, start: { angle: k.angle, hw: k.hw }, valid: true };
        return;
      }
      const ball = this._hitBall(p, tol);
      if (ball) {
        if (!this.canEdit(ball)) { this.select(ball); return; }
        this._grabBall(ball, p, false);
        return;
      }
      const blk = this._hitBlock(p, tol);
      const lnk = this._hitLink(p, 0);
      if (lnk && (!blk || blk.shape === 'box')) {
        const endOf = o => lnk.type === 'belt' ? o.axlePos() : lnk.type === 'rope' ? o.ropePos() : o.plugPos();
        const ends = [endOf(lnk.a), endOf(lnk.b)];
        if (!blk || ends.every(q => Math.hypot(q.x - p.x, q.y - p.y) > 14)) { this.select(lnk); return; }
      }
      if (blk) {
        this.select(blk);
        if (!build && blk.type === 'switch' && this.freePlay) {   // flick a switch while it runs
          blk.on = !blk.on; blk.coolUntil = this.world.time + 0.5;
          this.emit('change'); return;
        }
        if (this.canEdit(blk)) {
          this.drag = { mode: 'block', block: blk, ox: blk.x - p.x, oy: blk.y - p.y,
            start: { x: blk.x, y: blk.y }, valid: true };
        }
        return;
      }
      const isPart = CL.BALLS[this.tool] || CL.RIGIDS[this.tool] || CL.SURFACES[this.tool];   // (link tools act like Move while running)
      if (!canAdd || !isPart) { this.select(null); return; }
      if (!build && CL.SURFACES[this.tool] && CL.SURFACES[this.tool].machine) {
        this.emit('toast', 'Machines are built in build mode. Press ■ Stop first.'); return;
      }
      if (!this.canPlace(this.tool)) { this.emit('toast', 'None left! Every ' + this._name(this.tool) + ' is already in the lab.'); return; }
      if (!build && !this._tempWarned) {
        this._tempWarned = true;
        this.emit('toast', '⏳ Things you add while it runs are just for fun. They vanish when you press Stop.');
      }

      if (CL.BALLS[this.tool] || CL.RIGIDS[this.tool]) {
        const b = this.addBall(this.tool, this._sn(p.x), this._sn(p.y));
        if (!b) return;
        this._grabBall(b, { x: b.x, y: b.y }, true);
        if (build) { this._settle(b); this.drag.valid = this._ballClear(b); }
        this.emit('change');
        return;
      }
      const k = this.addBlock(this.tool, this._sn(p.x), this._sn(p.y));
      if (build) this._snapGear(k);
      this.select(k);
      this.drag = { mode: 'block', block: k, ox: k.x - p.x, oy: k.y - p.y,
        start: { x: k.x, y: k.y }, isNew: true, valid: !build || this._blockClear(k) };
      if (build) this._refreshMachines();
      this.emit('change');
    }

    _grabBall(b, p, isNew) {
      this.select(b);
      b.held = true; b.vx = 0; b.vy = 0; b._rising = false; b.apex = null;
      if (!b.noSpin) b.av = 0;
      this.trailMap.delete(b.id);
      this.drag = { mode: 'ball', ball: b, ox: b.x - p.x, oy: b.y - p.y, isNew: isNew,
        start: { x: b.x, y: b.y }, valid: true,
        samples: [{ t: performance.now(), x: b.x, y: b.y }] };
      this.canvas.style.cursor = 'grabbing';
    }

    _move(e) {
      const p = this._pt(e);
      this.cursor = p;
      const d = this.drag;
      const build = this.building;
      if (!d) { this._hover(p, e.pointerType === 'touch' ? 14 : 5); return; }

      if (d.mode === 'ball') {
        const b = d.ball, rr = b.kind === 'rigid' ? 0 : b.r;
        b.x = clamp(this._sn(p.x + d.ox), rr, W - rr);
        b.y = clamp(this._sn(p.y + d.oy), rr, F - rr);
        if (b.kind === 'rigid') b.update();
        if (build) { this._settle(b); d.valid = this._ballClear(b); this._refreshMachines(); return; }
        const now = performance.now();
        d.samples.push({ t: now, x: b.x, y: b.y });
        while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
        const v = throwVel(d.samples);
        // while held, the ball shoves others with the hand's velocity
        b.vx = this.running ? v.x : 0; b.vy = this.running ? v.y : 0;
      } else if (d.mode === 'block') {
        const k = d.block;
        k.x = clamp(this._sn(p.x + d.ox), 0, W); k.y = clamp(this._sn(p.y + d.oy), 0, F);
        k.update();
        if (build) { this._snapGear(k); d.valid = this._blockClear(k); this._refreshMachines(); }
      } else if (d.mode === 'handle') {
        const k = d.block, def = k.def;
        let hw;
        if (def.rotatable) {
          let ang = Math.atan2(p.y - k.y, p.x - k.x);
          if (!e.shiftKey) ang = Math.round(ang / (5 * DEG)) * 5 * DEG; // snap to 5°
          k.angle = normAngle(ang);
          hw = Math.hypot(p.x - k.x, p.y - k.y);
        } else {
          hw = Math.abs((p.x - k.x) * k.c + (p.y - k.y) * k.s);
        }
        if (def.stretchable) {
          if (build && this.snap) hw = Math.round(hw / (GRID / 2)) * (GRID / 2);
          k.hw = clamp(hw, def.minLength / 2, def.maxLength / 2);
        }
        k.update();
        if (build) { d.valid = this._blockClear(k); this._refreshMachines(); }
      }
    }

    _hover(p, tol) {
      if (CL.LINKS[this.tool] && this.building) {
        const k = (this.tool === 'rope' && this._hitBall(p, tol)) || this._hitBlock(p, tol);
        this.canvas.style.cursor = k && CL.LINKS[this.tool].fits(k) ? 'pointer' : 'crosshair';
        this.ghost = null;
        return;
      }
      const canAdd = this.building || this.freePlay;
      let cur = canAdd ? 'crosshair' : 'default';
      if (this._onHandle(p, tol)) cur = 'alias';
      else {
        const o = this._hitBall(p, tol) || this._hitBlock(p, tol);
        if (o) cur = this.canEdit(o) ? 'grab' : 'pointer';
        else if (this._hitLink(p, 0)) cur = 'pointer';
        else if (this.tool === 'hand') cur = 'default';
      }
      this.canvas.style.cursor = cur;

      this.ghost = null;
      if (!canAdd || cur !== 'crosshair') return;
      const t = this.tool;
      if (CL.BALLS[t]) {
        const g = this._ghosts[t] || (this._ghosts[t] = new CL.Ball(t, 0, 0));
        g.x = clamp(this._sn(p.x), g.r, W - g.r); g.y = clamp(this._sn(p.y), g.r, F - g.r);
        if (this.building) this._settle(g);
        this.ghost = { obj: g, valid: this.canPlace(t) && (!this.building || this._ballClear(g)) };
      } else if (CL.RIGIDS[t]) {
        const g = this._ghosts[t] || (this._ghosts[t] = new CL.Rigid(t, 0, 0));
        g.x = clamp(this._sn(p.x), 0, W); g.y = clamp(this._sn(p.y), 0, F); g.update();
        if (this.building) this._settle(g);
        this.ghost = { obj: g, valid: this.canPlace(t) && (!this.building || this._rigidClear(g)) };
      } else if (CL.SURFACES[t]) {
        if (!this.building && CL.SURFACES[t].machine) return;
        const g = this._ghosts[t] || (this._ghosts[t] = new CL.Block(t, 0, 0));
        g.x = clamp(this._sn(p.x), 0, W); g.y = clamp(this._sn(p.y), 0, F); g.update();
        if (this.building) this._snapGear(g);
        this.ghost = { obj: g, valid: this.canPlace(t) && (!this.building || this._blockClear(g)) };
      }
    }

    _up(e) {
      const d = this.drag; if (!d) return;
      this.drag = null;
      const build = this.building;
      if (d.mode === 'ball') {
        const b = d.ball;
        b.held = false;
        if (build) {
          b.vx = 0; b.vy = 0;
          if (!d.valid) { this._reject(b, d); if (b.update) b.update(); } else this.commit();
        } else {
          const last = d.samples[d.samples.length - 1];
          const fresh = performance.now() - last.t < 60;
          const v = fresh ? throwVel(d.samples) : { x: 0, y: 0 };
          const sp = Math.hypot(v.x, v.y);
          const k = sp > MAX_THROW ? MAX_THROW / sp : 1;
          b.vx = v.x * k; b.vy = v.y * k;
        }
      } else if (build) {
        if (!d.valid) this._reject(d.block, d); else this.commit();
      }
      this.canvas.style.cursor = 'crosshair';
      this.emit('change');
    }

    _name(t) { return ((CL.BALLS[t] || CL.RIGIDS[t] || CL.SURFACES[t] || CL.LINKS[t]).name).toLowerCase(); }
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
