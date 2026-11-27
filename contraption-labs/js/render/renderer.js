/* Contraption Labs — renderer.js
 * Draws the lab. The world is always 1600 × 900; it is scaled to fit any
 * screen size (including full screen) with letterboxing.
 * BUILD mode looks like a blueprint (Bright Blue grid + frame);
 * RUN mode is the calm JEM Blue lab.
 */
(function (CL) {
  'use strict';
  const { width: W, height: H, floorY: F, pxPerMetre: M } = CL.WORLD;
  const T = CL.THEME;
  const FONT = 'Nunito, "Segoe UI", sans-serif';

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
      const build = sb.building;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = T.jemDeep;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      this._background(ctx, build);
      if (build && sb.ghostTrails.length) this._paths(ctx, sb.ghostTrails, 0.28, 2);
      for (const k of sb.world.blocks) CL.art.drawBlock(ctx, k);
      this._ruler(ctx);
      if (!build && sb.trails) this._paths(ctx, sb.trailMap.values(), 0.75, 2.6);
      for (const b of sb.world.balls) CL.art.drawBall(ctx, b);
      if (!build && sb.trails) this._apexes(ctx, sb);
      this._ghost(ctx, sb);
      this._selection(ctx, sb);
      this._frameAndBanner(ctx, sb);
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

    _ruler(ctx) {
      ctx.fillStyle = 'rgba(5,21,58,0.6)'; ctx.fillRect(0, 0, 46, F);
      ctx.strokeStyle = T.yellow; ctx.fillStyle = T.yellow;
      ctx.font = 'bold 13px ' + FONT; ctx.textBaseline = 'middle';
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
          ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], size, 0, Math.PI * 2); ctx.fill();
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

    _ghost(ctx, sb) {
      const g = sb.ghost; if (!g || sb.drag) return;
      ctx.globalAlpha = 0.45;
      if (g.obj.kind === 'ball') CL.art.drawBall(ctx, g.obj); else CL.art.drawBlock(ctx, g.obj);
      ctx.globalAlpha = 1;
      this._outline(ctx, g.obj, g.valid ? 'rgba(255,255,255,0.7)' : T.invalid);
    }

    _outline(ctx, o, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      if (o.kind === 'ball') {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 6, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle);
        CL.art.rrect(ctx, -o.hw - 6, -o.hh - 6, o.hw * 2 + 12, o.hh * 2 + 12, 8); ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);
    }

    _selection(ctx, sb) {
      const o = sb.selected; if (!o) return;
      const d = sb.drag;
      const invalid = sb.building && d && d.valid === false;
      this._outline(ctx, o, invalid ? T.invalid : T.yellow);
      if (invalid) {
        ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = T.invalid;
        const top = o.kind === 'ball' ? o.y - o.r - 10 : o.y - Math.max(o.hh, Math.abs(o.s * o.hw)) - 12;
        ctx.fillText('🚫', o.x, top);
        ctx.textAlign = 'left';
      }
      if (o.kind !== 'block' || o.locked || (!sb.building && !sb.freePlay)) return;
      const h = sb.handlePos(o);
      ctx.fillStyle = T.yellow; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = T.jem; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 7, -2.4, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h.x + 2.6, h.y + 6.5); ctx.lineTo(h.x + 7.5, h.y + 2); ctx.lineTo(h.x + 8.2, h.y + 8.6); ctx.stroke();
      let deg = Math.round(-o.angle * 180 / Math.PI);       // up-slope positive
      deg = ((deg + 180) % 360 + 360) % 360 - 180;           // keep in -180..179
      const len = (o.hw * 2 / M).toFixed(1);
      ctx.font = 'bold 13px ' + FONT; ctx.fillStyle = T.yellow;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(deg + '°  ·  ' + len + ' m', h.x, h.y + 18);
      ctx.textAlign = 'left';
    }

    _pill(ctx, text, x, y, bg, fg) {
      ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(text).width + 34;
      ctx.fillStyle = bg; CL.art.rrect(ctx, x - w / 2, y - 19, w, 38, 19); ctx.fill();
      ctx.fillStyle = fg; ctx.fillText(text, x, y + 1);
      ctx.textAlign = 'left';
    }

    _frameAndBanner(ctx, sb) {
      const build = sb.building;
      // mode frame
      ctx.strokeStyle = build ? T.bright : T.orange;
      ctx.lineWidth = 6;
      if (build) ctx.setLineDash([18, 10]);
      ctx.strokeRect(3, 3, W - 6, H - 6);
      ctx.setLineDash([]);

      const empty = !sb.world.balls.length && sb.world.blocks.every(k => k.fixed);
      if (empty && build) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 30px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('Pick a part from the shelf, then click in the lab to place it!', W / 2, H / 2 - 40);
        ctx.font = '20px ' + FONT; ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('Or open an experiment from the shelf', W / 2, H / 2);
        ctx.textAlign = 'left';
      }

      if (build) {
        this._pill(ctx, '🛠  BUILD MODE  ·  arrange your parts, then press ▶ Start', W / 2, 36, T.bright, T.jem);
      } else {
        const tags = ['▶ RUNNING'];
        if (!sb.running) tags[0] = '⏸ PAUSED';
        if (sb.slowmo) tags.push('🐢 SLOW MOTION');
        this._pill(ctx, tags.join('   '), W / 2, 36, sb.running ? T.orange : T.yellow, T.jem);
      }
    }
  }

  CL.Renderer = Renderer;
})(window.CL = window.CL || {});
