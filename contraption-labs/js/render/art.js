/* Contraption Labs — art.js
 * How each part looks. Balls have patterns that rotate with them, so
 * learners can SEE spinning vs sliding.
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;

  function circle(ctx, r) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // light from top-left (does not rotate with the ball)
  function shine(ctx, r) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.05, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g; circle(ctx, r); ctx.fill();
  }
  function outline(ctx, r) {
    ctx.lineWidth = Math.max(1.2, r * 0.06);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; circle(ctx, r); ctx.stroke();
  }

  const BALL_ART = {
    bowling(ctx, r, a) {
      ctx.fillStyle = '#2b3290'; circle(ctx, r); ctx.fill();
      ctx.save(); ctx.rotate(a);
      ctx.strokeStyle = 'rgba(140,150,255,0.35)'; ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.arc(r * 0.2, r * 0.3, r * 0.5, 0.5, 2.6); ctx.stroke();
      ctx.fillStyle = '#0a0c2a';
      [[-0.28, -0.45, 0.12], [0.08, -0.55, 0.12], [-0.05, -0.12, 0.15]].forEach(h => {
        ctx.beginPath(); ctx.arc(h[0] * r, h[1] * r, h[2] * r, 0, TAU); ctx.fill();
      });
      ctx.restore();
    },
    basketball(ctx, r, a) {
      ctx.fillStyle = '#e8772e'; circle(ctx, r); ctx.fill();
      ctx.save(); circle(ctx, r); ctx.clip(); ctx.rotate(a);
      ctx.strokeStyle = '#3b1d0c'; ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r * 1.3, 0, r * 1.0, -0.8, 0.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.3, 0, r * 1.0, Math.PI - 0.8, Math.PI + 0.8); ctx.stroke();
      ctx.restore();
    },
    tennis(ctx, r, a) {
      ctx.fillStyle = '#d4ea3c'; circle(ctx, r); ctx.fill();
      ctx.save(); circle(ctx, r); ctx.clip(); ctx.rotate(a);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.16;
      ctx.beginPath(); ctx.arc(-r * 1.05, 0, r * 0.75, -1.3, 1.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 1.05, 0, r * 0.75, Math.PI - 1.3, Math.PI + 1.3); ctx.stroke();
      ctx.restore();
    },
    bouncy(ctx, r, a) {
      ctx.fillStyle = '#ff3d7f'; circle(ctx, r); ctx.fill();
      ctx.save(); circle(ctx, r); ctx.clip(); ctx.rotate(a);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-r, -r * 0.22, r * 2, r * 0.44);
      ctx.fillStyle = '#4fd1ff'; ctx.fillRect(-r * 0.22, -r, r * 0.44, r * 0.6);
      ctx.restore();
    },
    beach(ctx, r, a) {
      const cols = ['#ff4d4d', '#ffffff', '#ffd23f', '#ffffff', '#3aa0ff', '#ffffff'];
      ctx.save(); ctx.rotate(a);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * TAU / 6, (i + 1) * TAU / 6); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    },
    balloon(ctx, r, a, b) {
      // string sways with movement; balloon stays upright
      const sway = b && b.vx ? Math.max(-r, Math.min(r, -b.vx * 0.06)) : 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, r * 1.05);
      ctx.bezierCurveTo(r * 0.4 + sway * 0.3, r * 1.6, -r * 0.4 + sway * 0.7, r * 2.1, sway, r * 2.6);
      ctx.stroke();
      ctx.fillStyle = '#c4172f';
      ctx.beginPath(); ctx.moveTo(0, r * 0.95); ctx.lineTo(-r * 0.14, r * 1.15); ctx.lineTo(r * 0.14, r * 1.15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8344a';
      ctx.beginPath(); ctx.ellipse(0, -r * 0.03, r * 0.94, r, 0, 0, TAU); ctx.fill();
    }
  };

  function drawBallShape(ctx, type, r, angle, b) {
    BALL_ART[type](ctx, r, angle, b);
    if (type === 'balloon') {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, -r * 0.03, r * 0.94, r, 0, 0, TAU); ctx.clip();
      shine(ctx, r); ctx.restore();
    } else { shine(ctx, r); outline(ctx, r); }
  }

  function drawBall(ctx, b) {
    ctx.save(); ctx.translate(b.x, b.y);
    drawBallShape(ctx, b.type, b.r, b.angle, b);
    ctx.restore();
  }

  const BLOCK_ART = {
    wood(ctx, w, h) {
      ctx.fillStyle = '#c98a4b'; rrect(ctx, -w / 2, -h / 2, w, h, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(110,60,20,0.45)'; ctx.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(-w / 2 + 6, i * h * 0.22);
        for (let x = -w / 2 + 6; x < w / 2 - 6; x += 24) ctx.lineTo(x + 12, i * h * 0.22 + ((x / 24) % 2 ? 1.2 : -1.2));
        ctx.stroke();
      }
      ctx.strokeStyle = '#7a4a1f'; ctx.lineWidth = 2; rrect(ctx, -w / 2, -h / 2, w, h, 4); ctx.stroke();
    },
    ice(ctx, w, h) {
      const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#f2fbff'); g.addColorStop(1, '#9fd8f2');
      ctx.fillStyle = g; rrect(ctx, -w / 2, -h / 2, w, h, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2;
      for (let x = -w / 2 + 14; x < w / 2 - 20; x += 46) {
        ctx.beginPath(); ctx.moveTo(x, h * 0.2); ctx.lineTo(x + 14, -h * 0.2); ctx.stroke();
      }
      ctx.strokeStyle = '#4fa8d4'; ctx.lineWidth = 2; rrect(ctx, -w / 2, -h / 2, w, h, 4); ctx.stroke();
    },
    trampoline(ctx, w, h) {
      ctx.fillStyle = '#2f7de1'; rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
      ctx.fillStyle = '#1b1b25'; rrect(ctx, -w / 2 + 6, -h / 2, w - 12, h * 0.42, 3); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let x = -w / 2 + 8; x <= w / 2 - 8; x += 8) ctx.lineTo(x, (Math.round(x / 8) % 2 ? 0.5 : 4.5) - 1);
      ctx.stroke();
      ctx.strokeStyle = '#174f99'; ctx.lineWidth = 2; rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.stroke();
    },
    floor(ctx, w, h) {
      ctx.fillStyle = '#1b2c52'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#5d7bb8'; ctx.fillRect(-w / 2, -h / 2, w, 4);
    },
    wall(ctx, w, h) { ctx.fillStyle = '#1b2c52'; ctx.fillRect(-w / 2, -h / 2, w, h); }
  };

  function drawBlock(ctx, k) {
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.angle);
    BLOCK_ART[k.type](ctx, k.hw * 2, k.hh * 2);
    ctx.restore();
  }

  /* Small icon for the shelf */
  function drawIcon(canvas, kind, type) {
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth || 48;
    canvas.width = size * dpr; canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(size / 2, size / 2);
    if (kind === 'ball') {
      const r = size * 0.36;
      if (type === 'balloon') { ctx.translate(0, -r * 0.45); drawBallShape(ctx, type, r * 0.72, 0, null); }
      else drawBallShape(ctx, type, r, -0.4, null);
    } else {
      ctx.rotate(-0.35);
      BLOCK_ART[type](ctx, size * 0.85, type === 'trampoline' ? 12 : 11);
    }
  }

  CL.art = { drawBall, drawBlock, drawIcon, rrect };
})(window.CL = window.CL || {});
