/* Contraption Labs — renderer.js
 * Draws the lab. The world is always 1600 × 900; it is scaled to fit any
 * screen size (including full screen) with letterboxing.
 */
(function (CL) {
  'use strict';
  const { width: W, height: H, floorY: F, pxPerMetre: M } = CL.WORLD;

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
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#06122b';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);

      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      this._background(ctx);
      for (const k of sb.world.blocks) CL.art.drawBlock(ctx, k);
      this._ruler(ctx);
      if (sb.trails) this._trails(ctx, sb);
      for (const b of sb.world.balls) CL.art.drawBall(ctx, b);
      if (sb.trails) this._apexes(ctx, sb);
      this._selection(ctx, sb);
      this._overlay(ctx, sb);
      ctx.restore();
    }

    _background(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, F);
      g.addColorStop(0, '#15428a'); g.addColorStop(1, '#0d2c63');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, F);
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 50) {
        ctx.strokeStyle = x % 100 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, F); ctx.stroke();
      }
      for (let y = F; y >= 0; y -= 50) {
        ctx.strokeStyle = (F - y) % 100 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    _ruler(ctx) {
      ctx.fillStyle = 'rgba(6,18,43,0.55)'; ctx.fillRect(0, 0, 46, F);
      ctx.strokeStyle = '#ffd23f'; ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 13px Nunito, "Segoe UI", sans-serif'; ctx.textBaseline = 'middle';
      for (let m = 0; m * M <= F; m++) {
        const y = F - m * M;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(46, y); ctx.stroke();
        if (m > 0) ctx.fillText(m + ' m', 4, y);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(38, y - M / 2); ctx.lineTo(46, y - M / 2); ctx.stroke();
      }
    }

    _trails(ctx, sb) {
      for (const b of sb.world.balls) {
        const t = sb.trailMap.get(b.id);
        if (!t || !t.length) continue;
        ctx.fillStyle = b.def.trailColor;
        for (let i = 0; i < t.length; i += 1) {
          ctx.globalAlpha = 0.15 + 0.6 * (i / t.length);
          ctx.beginPath(); ctx.arc(t[i][0], t[i][1], 2.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    _apexes(ctx, sb) {
      ctx.font = 'bold 14px Nunito, "Segoe UI", sans-serif'; ctx.textBaseline = 'bottom';
      for (const b of sb.world.balls) {
        const a = b.apex; if (!a) continue;
        const h = (F - (a.y + b.r)) / M;
        const top = a.y - b.r;
        ctx.strokeStyle = b.def.trailColor; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(a.x - 26, top); ctx.lineTo(a.x + 26, top); ctx.stroke();
        ctx.setLineDash([]);
        const label = h.toFixed(1) + ' m';
        const w = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(6,18,43,0.8)'; CL.art.rrect(ctx, a.x - w / 2, top - 22, w, 19, 6); ctx.fill();
        ctx.fillStyle = b.def.trailColor; ctx.textAlign = 'center'; ctx.fillText(label, a.x, top - 4);
        ctx.textAlign = 'left';
      }
    }

    _selection(ctx, sb) {
      const o = sb.selected; if (!o) return;
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      if (o.kind === 'ball') {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.angle);
        CL.art.rrect(ctx, -o.hw - 6, -o.hh - 6, o.hw * 2 + 12, o.hh * 2 + 12, 8); ctx.stroke();
        ctx.restore(); ctx.setLineDash([]);
        const h = sb.handlePos(o);
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#06122b'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(h.x, h.y, 7, -2.4, 1.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(h.x + 2.6, h.y + 6.5); ctx.lineTo(h.x + 7.5, h.y + 2); ctx.lineTo(h.x + 8.2, h.y + 8.6); ctx.stroke();
        // angle readout
        let deg = Math.round(-o.angle * 180 / Math.PI);       // up-slope positive
        deg = ((deg + 180) % 360 + 360) % 360 - 180;           // keep in -180..179
        ctx.font = 'bold 13px Nunito, "Segoe UI", sans-serif'; ctx.fillStyle = '#ffd23f';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(deg + '°', h.x, h.y + 18);
        ctx.textAlign = 'left';
      }
    }

    _overlay(ctx, sb) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!sb.world.balls.length && sb.world.blocks.every(k => k.fixed)) {
        ctx.font = 'bold 30px Nunito, "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('Pick something from the shelf, then click in the lab to drop it!', W / 2, H / 2 - 40);
        ctx.font = '20px Nunito, "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Or try an experiment from the shelf', W / 2, H / 2);
      }
      const tags = [];
      if (!sb.running) tags.push('⏸ PAUSED');
      if (sb.slowmo) tags.push('🐢 SLOW MOTION');
      if (tags.length) {
        ctx.font = 'bold 20px Nunito, "Segoe UI", sans-serif';
        const text = tags.join('   ');
        const w = ctx.measureText(text).width + 32;
        ctx.fillStyle = 'rgba(6,18,43,0.8)'; CL.art.rrect(ctx, W / 2 - w / 2, 14, w, 38, 19); ctx.fill();
        ctx.fillStyle = '#ffd23f'; ctx.fillText(text, W / 2, 34);
      }
      ctx.textAlign = 'left';
    }
  }

  CL.Renderer = Renderer;
})(window.CL = window.CL || {});
