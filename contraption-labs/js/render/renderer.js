/* Contraption Labs — renderer.js
 * Draws the lab. The world is always 1600 × 900; it is scaled to fit any
 * screen size (including full screen) with letterboxing.
 * BUILD mode shows a blueprint grid; RUN mode is the calm JEM Blue lab.
 */
(function (CL) {
  'use strict';
  const { width: W, height: H, floorY: F, pxPerMetre: M } = CL.WORLD;
  const T = CL.THEME;
  const FONT = 'Nunito, "Segoe UI", sans-serif';
  const TAU = Math.PI * 2;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scale = 1; this.ox = 0; this.oy = 0;
      this.resize();
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight;
      this.canvas.width = Math.max(1, Math.round(cw * dpr));
      this.canvas.height = Math.max(1, Math.round(ch * dpr));
      this.dpr = dpr;
      this.scale = Math.min(cw / W, ch / H);
      this.ox = (cw - W * this.scale) / 2;
      this.oy = (ch - H * this.scale) / 2;
    }

    toWorld(px, py) { return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale }; }

    draw(sb) {
      const ctx = this.ctx, s = this.scale * this.dpr;
      const build = sb.building, world = sb.world;
      CL.art.time = world.time;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = T.jemDeep;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      this._background(ctx, build);
      this._goals(ctx, sb);
      if (build && sb.ghostTrails.length) this._paths(ctx, sb.ghostTrails, 0.28, 2);
      for (const k of world.blocks) CL.art.drawBlockBack(ctx, k);
      for (const k of world.blocks) CL.art.drawBlock(ctx, k);
      for (const l of world.links) if (l.type !== 'rope') CL.machineArt.drawLink(ctx, l, sb.selected === l ? T.yellow : null);
      if (!build) CL.machineArt.drawWind(ctx, world);
      for (const r of world.rigids) CL.art.drawRigid(ctx, r);
      for (const l of world.links) if (l.type === 'rope') CL.machineArt.drawLink(ctx, l, sb.selected === l ? T.yellow : null);
      this._ruler(ctx);
      if (!build && sb.trails) this._paths(ctx, sb.trailMap.values(), 0.75, 2.6);
      for (const b of world.balls) CL.art.drawBall(ctx, b);
      if (!build && sb.trails) this._apexes(ctx, sb);
      CL.ropeArt.drawFire(ctx, world);
      CL.ropeArt.drawEffects(ctx, world);
      this._jams(ctx, world);
      if (!build) this._bubbles(ctx, world);
      this._linkTool(ctx, sb);
      this._ghost(ctx, sb);
      this._selection(ctx, sb);
      this._banner(ctx, sb);
      ctx.restore();
    }

    _background(ctx, build) {
      const g = ctx.createLinearGradient(0, 0, 0, F);
      g.addColorStop(0, build ? T.jemLight : T.jem);
      g.addColorStop(1, build ? T.jem : '#082359');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, F);
      const major = build ? 'rgba(0,174,239,0.22)' : 'rgba(255,255,255,0.08)';
      const minor = build ? 'rgba(0,174,239,0.09)' : 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 50) {
        ctx.strokeStyle = x % 100 ? minor : major;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, F); ctx.stroke();
      }
      for (let y = F; y >= 0; y -= 50) {
        ctx.strokeStyle = (F - y) % 100 ? minor : major;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    /* puzzle targets: a soft green box with a flag */
    _goals(ctx, sb) {
      if (!sb.level) return;
      const st = sb.goal ? sb.goal.state : null;
      sb.level.goals.forEach((g, i) => {
        if (g.type !== 'zone') return;
        const hot = st && st[i].inside, done = st && st[i].ok;
        ctx.fillStyle = done ? 'rgba(140,198,63,0.6)' : hot ? 'rgba(140,198,63,0.45)' : 'rgba(140,198,63,0.3)';
        CL.art.rrect(ctx, g.x, g.y, g.w, g.h, 12); ctx.fill();
        ctx.strokeStyle = T.green; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
        CL.art.rrect(ctx, g.x, g.y, g.w, g.h, 12); ctx.stroke(); ctx.setLineDash([]);
        // flag
        const fx = g.x + 14, fy = g.y - 4;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 40); ctx.stroke();
        ctx.fillStyle = T.green; ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx + 26, fy - 32); ctx.lineTo(fx, fy - 24); ctx.closePath(); ctx.fill();
        ctx.font = 'bold 16px ' + FONT; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText((done ? '✓ ' : '') + (g.label || 'Target'), fx + 32, fy - 30);
      });
    }

    _ruler(ctx) {
      ctx.fillStyle = 'rgba(5,21,58,0.6)'; ctx.fillRect(0, 0, 46, F);
      ctx.strokeStyle = T.yellow; ctx.fillStyle = T.yellow;
      ctx.font = 'bold 13px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      for (let m = 0; m * M <= F; m++) {
        const y = F - m * M;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(46, y); ctx.stroke();
        if (m > 0) ctx.fillText(m + ' m', 4, y);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(38, y - M / 2); ctx.lineTo(46, y - M / 2); ctx.stroke();
      }
    }

    /* trails: iterable of { color, pts } */
    _paths(ctx, trails, alpha, size) {
      for (const t of trails) {
        const pts = t.pts; if (!pts.length) continue;
        ctx.fillStyle = t.color;
        for (let i = 0; i < pts.length; i++) {
          ctx.globalAlpha = alpha * (0.2 + 0.8 * (i / pts.length));
          ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], size, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    _apexes(ctx, sb) {
      ctx.font = 'bold 14px ' + FONT; ctx.textBaseline = 'bottom';
      for (const b of sb.world.balls) {
        const a = b.apex; if (!a) continue;
        const h = (F - (a.y + b.r)) / M;
        const top = a.y - b.r;
        ctx.strokeStyle = b.def.trailColor; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(a.x - 26, top); ctx.lineTo(a.x + 26, top); ctx.stroke();
        ctx.setLineDash([]);
        const label = h.toFixed(1) + ' m';
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(5,21,58,0.85)'; CL.art.rrect(ctx, a.x - w / 2, top - 22, w, 19, 6); ctx.fill();
        ctx.fillStyle = b.def.trailColor; ctx.textAlign = 'center'; ctx.fillText(label, a.x, top - 4);
        ctx.textAlign = 'left';
      }
    }

    _jams(ctx, world) {
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const k of world.blocks) {
        if (!k.jammed || !k.def.gear) continue;
        ctx.fillStyle = T.invalid; ctx.beginPath(); ctx.arc(k.x, k.y - k.r - 14, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText('!', k.x, k.y - k.r - 13);
      }
      ctx.textAlign = 'left';
    }

    _bubbles(ctx, world) {
      ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const all = world.balls.concat(world.rigids, world.blocks);
      for (const o of all) {
        if (!o.say || world.time - o.sayT > 1.6) continue;
        const w = ctx.measureText(o.say).width + 18, h = 26;
        const x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, o.x));
        const y = Math.max(h, o.y - (o.r || o.hh) - 26);
        ctx.fillStyle = '#ffffff';
        CL.art.rrect(ctx, x - w / 2, y - h / 2, w, h, 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(o.x - 5, y + h / 2 - 1); ctx.lineTo(o.x + 5, y + h / 2 - 1); ctx.lineTo(o.x, y + h / 2 + 7); ctx.fill();
        ctx.fillStyle = T.jem; ctx.fillText(o.say, x, y + 1);
      }
      ctx.textAlign = 'left';
    }

    _linkTool(ctx, sb) {
      const L = CL.LINKS[sb.tool];
      if (!L || !sb.building) return;
      const rope = sb.tool === 'rope';
      const endPos = k => sb.tool === 'belt' ? k.axlePos() : rope ? (k.def.pulley ? { x: k.x, y: k.y } : k.ropePos()) : k.plugPos();
      const cands = rope ? sb.world.blocks.concat(sb.world.rigids, sb.world.balls) : sb.world.blocks;
      ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      for (const k of cands) {
        if (k.fixed || !L.fits(k)) continue;
        const on = k === sb.linkFrom || k === sb.linkVia;
        ctx.strokeStyle = on ? T.yellow : 'rgba(0,174,239,0.8)';
        const p = endPos(k);
        const r = k.def.pulley ? k.r + 6 : (k.kind === 'ball' ? Math.min(k.r + 5, 18) : 15);
        ctx.beginPath(); ctx.arc(p.x, p.y, on ? r + 3 : r, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
      const a = sb.linkFrom, c = sb.cursor;
      if (a && c) {
        const pts = [endPos(a)];
        if (sb.linkVia) pts.push({ x: sb.linkVia.x, y: sb.linkVia.y - sb.linkVia.r });
        pts.push(c);
        ctx.strokeStyle = T.yellow; ctx.lineWidth = 4; ctx.setLineDash([10, 6]);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(q => ctx.lineTo(q.x, q.y)); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    _ghost(ctx, sb) {
      const g = sb.ghost; if (!g || sb.drag) return;
      ctx.globalAlpha = 0.45;
      if (g.obj.kind === 'ball') CL.art.drawBall(ctx, g.obj);
      else if (g.obj.kind === 'rigid') CL.art.drawRigid(ctx, g.obj);
      else { CL.art.drawBlockBack(ctx, g.obj); CL.art.drawBlock(ctx, g.obj); }
      ctx.globalAlpha = 1;
      this._outline(ctx, g.obj, g.valid ? 'rgba(255,255,255,0.7)' : T.invalid);
    }

    _outline(ctx, o, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      if (o.kind === 'rigid') {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle);
        const b = o.outline;
        CL.art.rrect(ctx, b.x0 - 6, b.y0 - 6, b.x1 - b.x0 + 12, b.y1 - b.y0 + 12, 8); ctx.stroke();
        ctx.restore();
      } else if (o.kind === 'ball' || o.shape === 'circle') {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 6, 0, TAU); ctx.stroke();
      } else {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle);
        CL.art.rrect(ctx, -o.hw - 6, -o.hh - 6, o.hw * 2 + 12, o.hh * 2 + 12, 8); ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);
    }

    _selection(ctx, sb) {
      const o = sb.selected; if (!o || o.kind === 'link') return;
      const d = sb.drag;
      const invalid = sb.building && d && d.valid === false;
      this._outline(ctx, o, invalid ? T.invalid : T.yellow);
      if (invalid) {
        ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = T.invalid;
        const top = o.kind === 'rigid' ? o.y - o.br - 10 : (o.kind === 'ball' || o.shape === 'circle') ? o.y - o.r - 10 : o.y - Math.max(o.hh, Math.abs(o.s * o.hw)) - 12;
        ctx.fillText('🚫', o.x, top);
        ctx.textAlign = 'left';
      }
      if (!sb.hasHandle(o)) return;
      const h = sb.handlePos(o);
      ctx.fillStyle = T.yellow; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, TAU); ctx.fill();
      ctx.strokeStyle = T.jem; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 7, -2.4, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h.x + 2.6, h.y + 6.5); ctx.lineTo(h.x + 7.5, h.y + 2); ctx.lineTo(h.x + 8.2, h.y + 8.6); ctx.stroke();
      const parts = [];
      if (o.def.rotatable) {
        let deg = Math.round(-o.angle * 180 / Math.PI);       // up-slope positive
        deg = ((deg + 180) % 360 + 360) % 360 - 180;           // keep in -180..179
        parts.push(deg + '°');
      }
      if (o.def.stretchable) parts.push((o.hw * 2 / M).toFixed(1) + ' m');
      ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = T.yellow;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(parts.join('  ·  '), h.x, h.y + 18);
      ctx.textAlign = 'left';
    }

    _pill(ctx, text, x, y, bg, fg) {
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(text).width + 34;
      ctx.fillStyle = bg; CL.art.rrect(ctx, x - w / 2, y - 19, w, 38, 19); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(text, x, y + 1);
      ctx.textAlign = 'left';
    }

    _banner(ctx, sb) {
      const build = sb.building;
      const empty = !sb.world.balls.length && !sb.world.rigids.length && sb.world.blocks.every(k => k.fixed);
      if (empty && build) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 30px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('Pick a part from the shelf, then click in the lab to place it!', W / 2, H / 2 - 40);
        ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('Or open an experiment from the shelf', W / 2, H / 2);
        ctx.textAlign = 'left';
      }
      if (CL.LINKS[sb.tool] && build) {
        const msg = sb.linkFrom ? (sb.tool === 'rope' ? (sb.linkVia ? 'Now click the thing on the other side of the pulley' : 'Now click a hook or thing to tie it to (or a pulley first)') : 'Now click the part to join it to') :
          (sb.tool === 'belt' ? 'Click a part with a wheel to start the belt' : sb.tool === 'rope' ? 'Click a ball, box, bucket or hook to tie the rope on' : 'Click a switch, motor, fan or scissors to start the cord');
        this._pill(ctx, '🔗  ' + msg, W / 2, 36, T.yellow, T.jem);
      } else if (build && sb.level) {
        this._pill(ctx, '🎯  ' + sb.level.goalText, W / 2, 36, T.green, T.jem);
      } else if (build) {
        this._pill(ctx, '🛠  BUILD MODE  ·  arrange your parts, then press ▶ Start', W / 2, 36, T.bright, T.jem);
      } else if (sb.won) {
        this._pill(ctx, '🎉  SOLVED!', W / 2, 36, T.green, T.jem);
      } else {
        const tags = [sb.running ? '▶ RUNNING' : '⏸ PAUSED'];
        if (sb.slowmo) tags.push('🐢 SLOW MOTION');
        this._pill(ctx, tags.join('   '), W / 2, 36, sb.running ? T.orange : T.yellow, T.jem);
      }
    }
  }

  CL.Renderer = Renderer;
})(window.CL = window.CL || {});
