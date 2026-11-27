/* Contraption Labs — art-ropes.js
 * Dominoes, crates, buckets, hooks, pulleys, scissors, pins, candles,
 * ropes, and the little POP / SNIP effects.
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;
  const A = CL.art, rrect = A.rrect;
  const METAL = '#c9d3e6', METAL_DARK = '#4a5878';
  const FONT = 'Nunito, "Segoe UI", sans-serif';

  /* ---------- rigids (drawn in their own turning frame) ---------- */
  const RIGID_ART = {
    domino(ctx, r) {
      const b = r.boxes[0], w = b.hw * 2, h = b.hh * 2;
      ctx.fillStyle = '#fbf6e9'; rrect(ctx, -w / 2, -h / 2, w, h, 3); ctx.fill();
      ctx.strokeStyle = '#1b1f2a'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, 0); ctx.lineTo(w / 2 - 2, 0); ctx.stroke();
      ctx.fillStyle = '#1b1f2a';
      [[0, -h / 4], [0, h / 4 - 6], [0, h / 4 + 6]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill(); });
    },
    crate(ctx, r) {
      const b = r.boxes[0], w = b.hw * 2, h = b.hh * 2;
      ctx.fillStyle = '#c98a4b'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = 'rgba(110,60,20,0.55)'; ctx.lineWidth = 1.2;
      for (let y = -h / 2 + h / 4; y < h / 2; y += h / 4) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
      ctx.strokeStyle = '#8a5526'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 4, h / 2 - 4); ctx.lineTo(w / 2 - 4, -h / 2 + 4); ctx.stroke();
      ctx.lineWidth = 4; ctx.strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      ctx.strokeStyle = '#5c3614'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
    },
    bucket(ctx, r) {
      const rp = r.def.ropePoint;
      ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2.5;                      // handle
      ctx.beginPath(); ctx.moveTo(-27, -22); ctx.quadraticCurveTo(-24, rp.y, 0, rp.y); ctx.quadraticCurveTo(24, rp.y, 27, -22); ctx.stroke();
      ctx.fillStyle = 'rgba(5,21,58,0.55)'; ctx.fillRect(-24, -24, 48, 46);   // inside
      const g = ctx.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, '#7f8aa3'); g.addColorStop(0.5, '#d5dceb'); g.addColorStop(1, '#7f8aa3');
      ctx.fillStyle = g;
      r.boxes.forEach(b => ctx.fillRect(b.lx - b.hw, b.ly - b.hh, b.hw * 2, b.hh * 2));
      ctx.fillStyle = '#00AEEF'; ctx.fillRect(-30, -26, 6, 4); ctx.fillRect(24, -26, 6, 4); // rim
      ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1.2;
      r.boxes.forEach(b => ctx.strokeRect(b.lx - b.hw, b.ly - b.hh, b.hw * 2, b.hh * 2));
    }
  };

  function drawRigid(ctx, r) {
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.angle);
    RIGID_ART[r.type](ctx, r);   // (locked boxes still tip and slide, so no bolt is drawn on them)
    ctx.restore();
  }

  /* ---------- fixed parts ---------- */
  A.WORLD_ART.hook = (ctx, k) => {
    ctx.fillStyle = '#56627e'; rrect(ctx, k.x - 9, k.y - 16, 18, 7, 2); ctx.fill();    // little plate
    ctx.strokeStyle = METAL; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(k.x, k.y - 9); ctx.lineTo(k.x, k.y - 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(k.x, k.y + 3, 6, -Math.PI / 2 - 0.1, Math.PI * 1.15); ctx.stroke();
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1; ctx.stroke();
  };

  A.BACK_ART.pulley = (ctx, k) => {
    ctx.strokeStyle = '#6c7a96'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x, k.y - k.r - 16); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#56627e'; rrect(ctx, k.x - 12, k.y - k.r - 22, 24, 7, 2); ctx.fill();
  };
  A.WORLD_ART.pulley = (ctx, k) => {
    ctx.translate(k.x, k.y);
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(0, 0, k.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#8b94a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, k.r - 4, 0, TAU); ctx.stroke();
    ctx.rotate(k.phase);
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(k.r - 6, 0); ctx.stroke(); }
    ctx.fillStyle = '#FF8C00'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
  };

  A.WORLD_ART.scissors = (ctx, k) => {
    const shut = A.time - k.snipT < 0.18;
    const open = shut ? 0.02 : 0.32;
    ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    const px = 2;                                                    // pivot
    [[1, '#e9eef7'], [-1, '#c9d3e6']].forEach(([sgn, col]) => {
      ctx.save(); ctx.translate(px, 0); ctx.rotate(sgn * open);
      ctx.fillStyle = col; ctx.strokeStyle = '#2d3850'; ctx.lineWidth = 2;   // blade (points +x)
      ctx.beginPath(); ctx.moveTo(-2, -5 * sgn); ctx.quadraticCurveTo(k.hw * 0.6, -6 * sgn, k.hw - 2, 0); ctx.lineTo(-2, 3 * sgn); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 6;                         // handle loop (points -x)
      ctx.beginPath(); ctx.ellipse(-k.hw * 0.55, sgn * 9, 12, 8, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-k.hw * 0.55 + 10, sgn * 5); ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = '#2d3850'; ctx.beginPath(); ctx.arc(px, 0, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(px, 0, 1.8, 0, TAU); ctx.fill();
    if (k.powered) { ctx.fillStyle = '#8CC63F'; ctx.beginPath(); ctx.arc(-k.hw + 8, 0, 3, 0, TAU); ctx.fill(); }
  };

  A.WORLD_ART.pin = (ctx, k) => {
    ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    ctx.fillStyle = '#c9d3e6'; ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-k.hw + 8, -1.8); ctx.lineTo(k.hw - 6, -1.2); ctx.lineTo(k.hw, 0); ctx.lineTo(k.hw - 6, 1.2); ctx.lineTo(-k.hw + 8, 1.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(-k.hw + 6, 0, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-k.hw + 4, -2, 2, 0, TAU); ctx.fill();
  };

  A.WORLD_ART.candle = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2;
    ctx.translate(k.x, k.y);
    ctx.fillStyle = '#9aa6c2'; rrect(ctx, -w / 2 - 6, h / 2 - 5, w + 12, 5, 2); ctx.fill();      // holder
    ctx.fillStyle = '#fbf6e9'; rrect(ctx, -w / 2, -h / 2, w, h - 4, 3); ctx.fill();               // wax
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(w / 2 - 5, -h / 2 + 2, 4, h - 8);
    ctx.fillStyle = '#fbf6e9'; ctx.beginPath(); ctx.ellipse(-3, -h / 2 + 6, 3, 6, 0, 0, TAU); ctx.fill(); // drip
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(0, -h / 2 - 5); ctx.stroke();
    if (!k.lit) return;
    const t = A.time, fl = 1 + Math.sin(t * 23) * 0.08 + Math.sin(t * 37) * 0.05;
    const fy = -h / 2 - 13;
    const glow = ctx.createRadialGradient(0, fy, 1, 0, fy, 26);
    glow.addColorStop(0, 'rgba(255,210,0,0.35)'); glow.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, fy, 26, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(0, fy + 7); ctx.scale(1, fl);
    ctx.fillStyle = '#FF8C00'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(9, -4, 0, 2); ctx.quadraticCurveTo(-9, -4, 0, -20); ctx.fill();
    ctx.fillStyle = '#FFD200'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.quadraticCurveTo(5, -2, 0, 1); ctx.quadraticCurveTo(-5, -2, 0, -12); ctx.fill();
    ctx.restore();
  };

  /* ---------- ropes ---------- */
  function drawRope(ctx, l, highlight) {
    const g = CL.Ropes.geom(l);
    const sag = Math.min(80, (l.slack || 0) * 0.7);
    const path = () => {
      ctx.beginPath();
      if (!l.via) {
        ctx.moveTo(g.pa.x, g.pa.y);
        if (sag > 1) ctx.quadraticCurveTo((g.pa.x + g.pb.x) / 2, (g.pa.y + g.pb.y) / 2 + sag * 2, g.pb.x, g.pb.y);
        else ctx.lineTo(g.pb.x, g.pb.y);
        return;
      }
      const P = l.via;
      ctx.moveTo(g.pa.x, g.pa.y); ctx.lineTo(g.qa.x, g.qa.y);
      const a1 = Math.atan2(g.qa.y - P.y, g.qa.x - P.x), a2 = Math.atan2(g.qb.y - P.y, g.qb.x - P.x);
      ctx.arc(P.x, P.y, P.r, a1, a2, g.qa.x > g.qb.x);   // over the top of the wheel
      ctx.lineTo(g.pb.x, g.pb.y);
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (highlight) { ctx.strokeStyle = highlight; ctx.lineWidth = 9; path(); ctx.stroke(); }
    ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 4.5; path(); ctx.stroke();
    ctx.strokeStyle = l.burn > 0 ? '#3a2a1a' : '#d9b27c'; ctx.lineWidth = 2.5; path(); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    [g.pa, g.pb].forEach(p => { ctx.fillStyle = '#6b4a22'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); });
  }

  /* ---------- dragon fire (a flickering tongue of flame, clipped at the floor) ---------- */
  function flameShape(ctx, m, dir, reach, spread, t, scale, seed) {
    const N = 14, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N, along = k * reach;
      const half = (6 + along * spread) * scale * Math.sin(Math.PI * Math.min(1, k * 1.15 + 0.08));
      const wob = Math.sin(k * 9 + t * 21 + seed) * 4 * k + Math.sin(k * 15 - t * 33 + seed) * 2.5 * k;
      const lift = -along * along * 0.0009;                 // hot air rises: the tip curls up a little
      top.push([m.x + dir * along, m.y + lift - half + wob]);
      bot.push([m.x + dir * along, m.y + lift + half + wob * 0.6]);
    }
    ctx.beginPath(); ctx.moveTo(m.x, m.y);
    top.forEach(p => ctx.lineTo(p[0], p[1]));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
  }

  function drawFire(ctx, world) {
    const t = world.time, F = CL.WORLD.floorY;
    for (const d of world.balls) {
      if (d.def.creature !== 'dragon' || d.state !== 'breathe') continue;
      const m = CL.Machines.mouth(d), reach = CL.Machines.flameReach(d, t), sp = d.def.flameSpread, dir = d.face;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, CL.WORLD.width, F); ctx.clip();
      const glow = ctx.createRadialGradient(m.x + dir * reach * 0.45, m.y, 4, m.x + dir * reach * 0.45, m.y, reach * 0.75);
      glow.addColorStop(0, 'rgba(255,210,0,0.28)'); glow.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(m.x + dir * reach * 0.45, m.y, reach * 0.75, 0, TAU); ctx.fill();
      const lg = (a, b) => { const g = ctx.createLinearGradient(m.x, m.y, m.x + dir * reach, m.y); a.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
      ctx.fillStyle = lg([[0, '#FFD200'], [0.55, '#FF8C00'], [1, 'rgba(255,90,40,0.15)']]);
      flameShape(ctx, m, dir, reach * 1.12, sp, t, 1, 0); ctx.fill();   // the tip tapers, so draw a little past the hot zone
      ctx.fillStyle = lg([[0, '#FFFBE0'], [0.5, '#FFD200'], [1, 'rgba(255,210,0,0)']]);
      flameShape(ctx, m, dir, reach * 0.8, sp, t, 0.5, 2); ctx.fill();
      for (let i = 0; i < 8; i++) {                           // embers drifting up
        const k = (t * 1.8 + i * 0.173) % 1, along = (0.3 + 0.7 * ((i * 0.37) % 1)) * reach;
        ctx.globalAlpha = 0.9 * (1 - k);
        ctx.fillStyle = i % 2 ? '#FFD200' : '#FF8C00';
        ctx.beginPath(); ctx.arc(m.x + dir * along + Math.sin(i + t * 5) * 4, m.y - k * 46 - along * sp * 0.4, 2.2, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  /* ---------- effects ---------- */
  function drawEffects(ctx, world) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    world.effects = world.effects.filter(e => world.time - e.t < 0.6);
    for (const e of world.effects) {
      const t = (world.time - e.t) / 0.6;
      ctx.globalAlpha = 1 - t;
      if (e.type === 'pop') {
        ctx.strokeStyle = '#FFD200'; ctx.lineWidth = 3;
        for (let i = 0; i < 10; i++) {
          const a = i * TAU / 10, r1 = 10 + t * 30, r2 = 18 + t * 46;
          ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1); ctx.lineTo(e.x + Math.cos(a) * r2, e.y + Math.sin(a) * r2); ctx.stroke();
        }
        ctx.font = '900 26px ' + FONT; ctx.fillStyle = '#ffffff'; ctx.fillText('POP!', e.x, e.y - 10 - t * 20);
      } else if (e.type === 'ignite') {
        ctx.strokeStyle = '#FFD200'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.45, r1 = 6 + t * 8, r2 = 12 + t * 22;
          ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1); ctx.lineTo(e.x + Math.cos(a) * r2, e.y + Math.sin(a) * r2); ctx.stroke();
        }
      } else if (e.type === 'snip') {
        ctx.font = '900 20px ' + FONT; ctx.fillStyle = '#FFD200'; ctx.fillText('SNIP!', e.x, e.y - 22 - t * 16);
      } else {
        ctx.fillStyle = 'rgba(200,200,210,0.8)';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(e.x + Math.sin(i * 2 + t * 6) * 6, e.y - t * 50 - i * 9, 5 + t * 6, 0, TAU); ctx.fill(); }
      }
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  /* ---------- icons ---------- */
  A.LINK_ICON.rope = ctx => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-16, -14); ctx.bezierCurveTo(10, -14, -12, 14, 16, 14); ctx.stroke();
    ctx.strokeStyle = '#d9b27c'; ctx.lineWidth = 3; ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = METAL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(-16, -9, 5, -Math.PI / 2, Math.PI * 1.1); ctx.stroke();
  };
  A.ICON_LENGTH.pin = 40;

  CL.art.drawRigid = drawRigid;
  CL.art.RIGID_ART = RIGID_ART;
  CL.ropeArt = { drawRope, drawEffects, drawFire };
})(window.CL = window.CL || {});
