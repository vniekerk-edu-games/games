/* Contraption Labs — art-machines.js
 * Gears, hamster wheel, motor, conveyor, fan, switch, see-saw, belts and cords.
 * Turning parts read k.phase (set by the drive network in machines.js).
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;
  const A = CL.art, rrect = A.rrect;
  const METAL = '#c9d3e6', METAL_DARK = '#4a5878';

  function zzz(ctx, x, y) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 13px Nunito, "Segoe UI", sans-serif';
    ctx.fillText('z', x, y); ctx.font = 'bold 10px Nunito, sans-serif'; ctx.fillText('z', x + 8, y - 9);
  }

  function pulley(ctx, x, y, phase, r) {
    r = r || CL.DRIVE.pulleyR;
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = METAL_DARK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(phase) * r, y + Math.sin(phase) * r); ctx.stroke();
    ctx.fillStyle = METAL_DARK; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
  }

  /* ---------- gears ---------- */
  function gear(ctx, k, fill, dark) {
    const N = k.def.teeth, R = k.r, ri = R - 7, pitch = TAU / N;
    ctx.translate(k.x, k.y); ctx.rotate(k.phase);
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const a = i * pitch;
      const pts = [[ri, a - pitch * 0.32], [R, a - pitch * 0.2], [R, a + pitch * 0.2], [ri, a + pitch * 0.32]];
      pts.forEach((p, j) => {
        const x = Math.cos(p[1]) * p[0], y = Math.sin(p[1]) * p[0];
        if (i === 0 && j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.arc(0, 0, ri, a + pitch * 0.32, a + pitch * 0.68);
    }
    ctx.closePath();
    ctx.fillStyle = k.jammed ? '#ff8a8a' : fill; ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, ri - 5, 0, TAU); ctx.stroke();
    const holes = N >= 20 ? 5 : 3, hr = N >= 20 ? 8 : 4.5, hd = N >= 20 ? R * 0.5 : R * 0.46;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = 0; i < holes; i++) {
      const a = i * TAU / holes;
      ctx.beginPath(); ctx.arc(Math.cos(a) * hd, Math.sin(a) * hd, hr, 0, TAU); ctx.fill();
    }
    ctx.rotate(-k.phase);
    pulley(ctx, 0, 0, k.phase);
  }
  A.WORLD_ART.gearSmall = (ctx, k) => gear(ctx, k, '#FFD200', '#a88a00');
  A.WORLD_ART.gearLarge = (ctx, k) => gear(ctx, k, '#FF8C00', '#a35700');

  /* ---------- hamster wheel ---------- */
  A.BACK_ART.hamster = (ctx, k) => {
    const legY = k.y + k.r + 18;
    ctx.strokeStyle = '#8b94a8'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - 28, legY); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + 28, legY); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(k.x - 38, legY); ctx.lineTo(k.x + 38, legY); ctx.stroke();
  };
  A.WORLD_ART.hamster = (ctx, k) => {
    const R = k.r, t = A.time;
    ctx.translate(k.x, k.y);
    ctx.fillStyle = 'rgba(0,174,239,0.12)'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = METAL; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R - 9, 0, TAU); ctx.stroke();
    ctx.save(); ctx.rotate(k.phase);
    ctx.strokeStyle = 'rgba(201,211,230,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const a = i * TAU / 18;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)); ctx.lineTo(Math.cos(a) * (R - 2), Math.sin(a) * (R - 2)); ctx.stroke();
    }
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)); ctx.stroke();
    }
    ctx.restore();
    // the hamster (runs facing left)
    const run = k.running && !k.jammed;
    const bob = run ? Math.sin(t * 32) * 1.6 : 0;
    ctx.save(); ctx.translate(0, R - 21 + bob);
    ctx.fillStyle = '#e7a54b';
    ctx.beginPath(); ctx.ellipse(2, 0, run ? 15 : 13, run ? 9 : 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fbe3bd'; ctx.beginPath(); ctx.ellipse(1, 4, 9, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e7a54b'; ctx.beginPath(); ctx.arc(-11, -3, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2a9b8'; ctx.beginPath(); ctx.arc(-8, -10, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10';
    if (run || k.jammed) { ctx.beginPath(); ctx.arc(-13, -4, 1.6, 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(-13, -4, 2, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.fillStyle = '#f07b95'; ctx.beginPath(); ctx.arc(-18.5, -2, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c98635';
    const lp = run ? Math.sin(t * 32) * 4 : 0;
    ctx.fillRect(-7 + lp, 7, 4, 4); ctx.fillRect(6 - lp, 7, 4, 4);
    ctx.restore();
    if (!k.running) zzz(ctx, 6, R - 36);
    pulley(ctx, 0, 0, k.phase);
  };

  /* ---------- motor ---------- */
  A.WORLD_ART.motor = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2;
    ctx.translate(k.x, k.y);
    ctx.fillStyle = '#3a4660'; ctx.fillRect(-w / 2 + 6, h / 2 - 4, 12, 6); ctx.fillRect(w / 2 - 18, h / 2 - 4, 12, 6);
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#8796b5'); g.addColorStop(1, '#55627f');
    ctx.fillStyle = g; rrect(ctx, -w / 2, -h / 2, w, h - 3, 8); ctx.fill();
    ctx.strokeStyle = '#2d3850'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    for (let x = -w / 2 + 12; x < -6; x += 6) { ctx.beginPath(); ctx.moveTo(x, -h / 2 + 8); ctx.lineTo(x, h / 2 - 11); ctx.stroke(); }
    ctx.fillStyle = k.powered ? '#8CC63F' : '#2a3448';
    ctx.beginPath(); ctx.arc(w / 2 - 9, -h / 2 + 9, 4, 0, TAU); ctx.fill();
    if (k.powered) { ctx.strokeStyle = 'rgba(140,198,63,0.5)'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = '#FFD200'; ctx.font = 'bold 13px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚡', w / 2 - 10, h / 2 - 13);
    pulley(ctx, 0, 0, k.phase, CL.DRIVE.pulleyR + 2);
    ctx.fillStyle = '#1b1f2a'; ctx.fillRect(-w / 2 + 3, h / 2 - 12, 9, 7); // socket
  };

  /* ---------- conveyor ---------- */
  A.WORLD_ART.conveyor = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2, dr = k.hh - 3, ex = k.hw - k.hh;
    const shift = ((k.phase * CL.DRIVE.conveyorGain) % 18 + 18) % 18;
    ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    ctx.fillStyle = '#1f2330'; rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#3b4257'; ctx.fillRect(-ex, -h / 2 + 5, ex * 2, h - 10);
    ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.clip();
    ctx.strokeStyle = '#59627e'; ctx.lineWidth = 2;
    for (let x = -w / 2 - 18 + shift; x < w / 2 + 18; x += 18) {
      ctx.beginPath(); ctx.moveTo(x, -h / 2 + 1); ctx.lineTo(x - 5, -h / 2 + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-x, h / 2 - 1); ctx.lineTo(-x + 5, h / 2 - 4); ctx.stroke();
    }
    ctx.restore();
    [-ex, ex].forEach((x, i) => {
      ctx.fillStyle = '#8b94a8'; ctx.beginPath(); ctx.arc(x, 0, dr, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2d3850'; ctx.lineWidth = 2; ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const a = k.phase + j * TAU / 3;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.cos(a) * dr, Math.sin(a) * dr); ctx.stroke();
      }
      if (i === 0) { ctx.strokeStyle = '#00AEEF'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, 0, dr + 1, 0, TAU); ctx.stroke(); }
    });
    ctx.strokeStyle = '#11141c'; ctx.lineWidth = 2; rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.stroke();
  };

  /* ---------- fan ---------- */
  A.WORLD_ART.fan = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2;
    ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    if (k.opts.flip) ctx.scale(-1, 1);
    ctx.fillStyle = '#3a4660'; rrect(ctx, -w / 2, -h / 2 + 6, 12, h - 12, 4); ctx.fill();        // motor at the back
    ctx.fillStyle = k.powered ? '#8CC63F' : '#20283a'; ctx.beginPath(); ctx.arc(-w / 2 + 6, -h / 2 + 14, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#56627e'; ctx.fillRect(-w / 2 + 10, -3, 12, 6);                          // shaft
    for (let i = 0; i < 3; i++) {                                                               // blades seen side-on
      const a = k.phase + i * TAU / 3, y = Math.sin(a) * (h / 2 - 8), d = Math.cos(a);
      ctx.strokeStyle = d > 0 ? '#00AEEF' : '#0083b4'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(4 + d * 3, y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.strokeStyle = METAL; ctx.lineWidth = 3;                                                 // guard
    rrect(ctx, -w / 2 + 12, -h / 2, w - 12, h, 10); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (let y = -h / 2 + 10; y < h / 2 - 4; y += 10) { ctx.beginPath(); ctx.moveTo(w / 2 - 2, y); ctx.lineTo(w / 2 + 1, y + 2); ctx.stroke(); }
    ctx.fillStyle = '#FFD200'; ctx.beginPath();                                                 // direction arrow
    ctx.moveTo(w / 2 + 10, 0); ctx.lineTo(w / 2 + 4, -5); ctx.lineTo(w / 2 + 4, 5); ctx.closePath(); ctx.fill();
  };

  /* ---------- switch ---------- */
  A.WORLD_ART.switch = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2;
    ctx.translate(k.x, k.y);
    const lever = (k.on ? 1 : -1) * 0.6;
    ctx.save(); ctx.translate(0, -h / 2 + 4); ctx.rotate(lever);
    ctx.strokeStyle = '#c9d3e6'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
    ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(0, -21, 6, 0, TAU); ctx.fill();
    ctx.restore(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#39445e'; rrect(ctx, -w / 2, -h / 2 + 2, w, h - 2, 6); ctx.fill();
    ctx.strokeStyle = '#1f2638'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = k.on ? '#8CC63F' : '#5a1f28'; ctx.beginPath(); ctx.arc(-w / 2 + 10, 3, 5, 0, TAU); ctx.fill();
    if (k.on) { ctx.strokeStyle = 'rgba(140,198,63,0.5)'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = k.on ? '#8CC63F' : '#9aa6c2';
    ctx.font = 'bold 10px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(k.on ? 'ON' : 'OFF', 4, 4);
    ctx.fillStyle = '#11141c'; ctx.fillRect(w / 2 - 12, h / 2 - 10, 8, 6);                    // socket
  };

  /* ---------- see-saw ---------- */
  A.BACK_ART.seesaw = (ctx, k) => {
    const sh = k.def.standHeight;
    ctx.fillStyle = '#6c7a96';
    ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - 26, k.y + sh); ctx.lineTo(k.x + 26, k.y + sh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2d3850'; ctx.lineWidth = 2; ctx.stroke();
  };
  A.WORLD_ART.seesaw = (ctx, k) => {
    const w = k.hw * 2, h = k.hh * 2;
    ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    ctx.fillStyle = '#8CC63F'; rrect(ctx, -w / 2, -h / 2, w, h, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 2, w - 8, 3);
    ctx.fillStyle = '#FFD200'; ctx.fillRect(-w / 2 + 2, -h / 2, 10, h); ctx.fillRect(w / 2 - 12, -h / 2, 10, h);
    ctx.strokeStyle = '#4c6e1c'; ctx.lineWidth = 2; rrect(ctx, -w / 2, -h / 2, w, h, 5); ctx.stroke();
    ctx.rotate(-k.angle);
    ctx.fillStyle = METAL; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
    ctx.strokeStyle = METAL_DARK; ctx.stroke();
  };

  /* ---------- belts & cords ---------- */
  function cordPath(l) {
    const src = l.a.def.powerSource ? l.a : l.b, dev = src === l.a ? l.b : l.a;
    const p = src.plugPos(), q = dev.plugPos();
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    const cx = (p.x + q.x) / 2, cy = Math.min(Math.max(p.y, q.y) + 25 + d * 0.12, CL.WORLD.floorY - 3); // lies on the floor, never under it
    return { src, dev, p, q, cx, cy };
  }

  function drawLink(ctx, l, highlight) {
    if (l.type === 'belt') {
      const p = l.a.axlePos(), q = l.b.axlePos();
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d * CL.DRIVE.pulleyR, ny = dx / d * CL.DRIVE.pulleyR;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(p.x + nx, p.y + ny); ctx.lineTo(q.x + nx, q.y + ny);
        ctx.moveTo(p.x - nx, p.y - ny); ctx.lineTo(q.x - nx, q.y - ny);
      };
      if (highlight) { ctx.strokeStyle = highlight; ctx.lineWidth = 10; path(); ctx.stroke(); }
      ctx.strokeStyle = '#15161c'; ctx.lineWidth = 4.5; path(); ctx.stroke();
      ctx.strokeStyle = '#4b4f63'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -l.a.phase * CL.DRIVE.pulleyR; path(); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      pulley(ctx, p.x, p.y, l.a.phase); pulley(ctx, q.x, q.y, l.b.phase);
    } else {
      const c = cordPath(l);
      const path = () => { ctx.beginPath(); ctx.moveTo(c.p.x, c.p.y); ctx.quadraticCurveTo(c.cx, c.cy, c.q.x, c.q.y); };
      ctx.lineCap = 'round';
      if (highlight) { ctx.strokeStyle = highlight; ctx.lineWidth = 10; path(); ctx.stroke(); }
      ctx.strokeStyle = '#0d0f15'; ctx.lineWidth = 5; path(); ctx.stroke();
      ctx.strokeStyle = c.src.on ? '#FF8C00' : '#3a4256'; ctx.lineWidth = 2.5; path(); ctx.stroke();
      ctx.lineCap = 'butt';
      [c.p, c.q].forEach(pt => { ctx.fillStyle = '#FF8C00'; ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6); });
    }
  }

  /* distance from a point to a link (for clicking on it) */
  function linkDistance(l, x, y) {
    const segs = [];
    if (l.type === 'belt') { const p = l.a.axlePos(), q = l.b.axlePos(); segs.push([p.x, p.y, q.x, q.y]); }
    else {
      const c = cordPath(l); let px = c.p.x, py = c.p.y;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        const qx = u * u * c.p.x + 2 * u * t * c.cx + t * t * c.q.x, qy = u * u * c.p.y + 2 * u * t * c.cy + t * t * c.q.y;
        segs.push([px, py, qx, qy]); px = qx; py = qy;
      }
    }
    let best = Infinity;
    for (const s of segs) {
      const vx = s[2] - s[0], vy = s[3] - s[1], L2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - s[0]) * vx + (y - s[1]) * vy) / L2));
      best = Math.min(best, Math.hypot(x - s[0] - vx * t, y - s[1] - vy * t));
    }
    return best;
  }

  /* moving air in front of powered fans */
  function drawWind(ctx, world) {
    const R = CL.DRIVE.windRange, t = world.time;
    ctx.lineCap = 'round';
    for (const f of world.blocks) {
      if (!f.def.fan || !f.powered) continue;
      const w = CL.Machines.fanFrame(f);
      for (let i = 0; i < 14; i++) {
        const along = (t * 420 + i * 137) % R;
        const across = ((i * 53) % (w.half * 2 - 8)) - w.half + 4;
        const len = 34 * (1 - along / R);
        const x = w.ox + w.dx * along + w.px * across, y = w.oy + w.dy * along + w.py * across;
        ctx.strokeStyle = 'rgba(200,240,255,' + (0.45 * (1 - along / R)).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w.dx * len, y + w.dy * len); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }

  /* shelf icons for the connector tools */
  A.LINK_ICON.belt = ctx => {
    ctx.strokeStyle = '#15161c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-13, -11); ctx.lineTo(13, -9); ctx.moveTo(-13, 11); ctx.lineTo(13, 9); ctx.stroke();
    ctx.beginPath(); ctx.arc(-13, 0, 11, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(13, 0, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    pulley(ctx, -13, 0, 0.8, 9); pulley(ctx, 13, 0, 2, 7);
  };
  A.LINK_ICON.cord = ctx => {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0d0f15'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-16, -8); ctx.quadraticCurveTo(-4, 26, 14, -2); ctx.stroke();
    ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#c9d3e6'; ctx.fillRect(10, -12, 10, 10);
    ctx.fillStyle = '#4a5878'; ctx.fillRect(12, -17, 2, 6); ctx.fillRect(16, -17, 2, 6);
    ctx.fillStyle = '#FF8C00'; ctx.beginPath(); ctx.arc(-16, -8, 3.5, 0, TAU); ctx.fill();
    ctx.lineCap = 'butt';
  };

  CL.machineArt = { drawLink, linkDistance, drawWind, pulley };
})(window.CL = window.CL || {});
