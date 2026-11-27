/* Contraption Labs — art-critters.js
 * Mouse, cat and cheese. Drawn upright and facing the way they walk.
 */
(function (CL) {
  'use strict';
  const TAU = Math.PI * 2;
  const A = CL.art;

  function zzz(ctx, x, y) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px Nunito, "Segoe UI", sans-serif'; ctx.fillText('z', x, y);
    ctx.font = 'bold 10px Nunito, sans-serif'; ctx.fillText('z', x + 8, y - 9);
  }
  const walking = b => b && Math.abs(b.walk || 0) > 0 && b.grounded;

  A.BALL_ART.mouse = (ctx, r, angle, b) => {
    const s = r / 13, t = A.time, step = walking(b) ? Math.sin(t * 28) * 3 : 0;
    ctx.save(); ctx.scale((b ? b.face : 1) * s, s);
    ctx.strokeStyle = '#d98aa0'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';           // tail
    ctx.beginPath(); ctx.moveTo(-13, 5); ctx.quadraticCurveTo(-24, 8, -26, -4 + step * 0.4); ctx.stroke();
    ctx.fillStyle = '#9ea2b3';                                                         // feet
    ctx.beginPath(); ctx.ellipse(-5 + step, 11.5, 3.5, 1.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 - step, 11.5, 3.5, 1.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8bccb';                                                         // body
    ctx.beginPath(); ctx.ellipse(-2, 3, 13.5, 8.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -1, 8, 6.5, -0.2, 0, TAU); ctx.fill();               // head
    ctx.beginPath(); ctx.arc(5, -8, 5.5, 0, TAU); ctx.fill();                           // ear
    ctx.fillStyle = '#f2b3c3'; ctx.beginPath(); ctx.arc(5, -8, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(11, -3, 1.6, 0, TAU); ctx.fill(); // eye
    ctx.fillStyle = '#f07b95'; ctx.beginPath(); ctx.arc(16.8, 0, 1.8, 0, TAU); ctx.fill(); // nose
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8;                       // whiskers
    ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(21, -1); ctx.moveTo(15, 2); ctx.lineTo(21, 3); ctx.stroke();
    ctx.restore();
  };

  A.BALL_ART.cat = (ctx, r, angle, b) => {
    const s = r / 26, t = A.time;
    const asleep = !b || b.state === 'sleep';
    ctx.save(); ctx.scale((b ? b.face : 1) * s, s);
    if (asleep) {
      ctx.fillStyle = '#f0943a';
      ctx.strokeStyle = '#f0943a'; ctx.lineWidth = 7; ctx.lineCap = 'round';           // tail wrapped round
      ctx.beginPath(); ctx.arc(0, 12, 22, 0.2, 2.6); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-2, 10, 25, 15, 0, 0, TAU); ctx.fill();               // curled body
      ctx.strokeStyle = '#c96a1c'; ctx.lineWidth = 3;
      [-14, -5, 4].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 3, 6); ctx.stroke(); });
      ctx.fillStyle = '#f0943a'; ctx.beginPath(); ctx.arc(15, 8, 11, 0, TAU); ctx.fill(); // head resting
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(9, -10); ctx.lineTo(14, -2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(17, -2); ctx.lineTo(23, -9); ctx.lineTo(24, 2); ctx.fill();
      ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.6;                                   // closed eyes
      ctx.beginPath(); ctx.arc(13, 8, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(20, 7, 2.4, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
      if (b) zzz(ctx, 8 * s, -12 * s);
      return;
    }
    const step = walking(b) ? Math.sin(t * 22) * 4 : 0;
    ctx.strokeStyle = '#f0943a'; ctx.lineWidth = 6; ctx.lineCap = 'round';                // tail up
    ctx.beginPath(); ctx.moveTo(-22, 2); ctx.quadraticCurveTo(-36, -4, -32, -24); ctx.stroke();
    ctx.fillStyle = '#d97a24';                                                            // legs
    [[-15, step], [-6, -step], [6, step], [14, -step]].forEach(([x, o]) => ctx.fillRect(x + o * 0.5 - 2.5, 12, 5, 14));
    ctx.fillStyle = '#f0943a';
    ctx.beginPath(); ctx.ellipse(-2, 6, 23, 12, 0, 0, TAU); ctx.fill();                   // body
    ctx.strokeStyle = '#c96a1c'; ctx.lineWidth = 3;
    [-14, -6, 2].forEach(x => { ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x + 2, 5); ctx.stroke(); });
    ctx.fillStyle = '#f0943a'; ctx.beginPath(); ctx.arc(18, -8, 11.5, 0, TAU); ctx.fill();  // head
    ctx.beginPath(); ctx.moveTo(9, -15); ctx.lineTo(10, -27); ctx.lineTo(17, -18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -19); ctx.lineTo(27, -27); ctx.lineTo(28, -13); ctx.fill();
    ctx.fillStyle = '#ffd9b0'; ctx.beginPath(); ctx.ellipse(22, -3, 6, 4.5, 0, 0, TAU); ctx.fill();
    const chase = b && b.state === 'chase';
    ctx.fillStyle = '#9fd651'; ctx.beginPath(); ctx.ellipse(16, -10, 2.6, chase ? 1.4 : 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24, -10, 2.6, chase ? 1.4 : 2.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a22'; ctx.fillRect(15.5, -12, 1, 4); ctx.fillRect(23.5, -12, 1, 4);
    ctx.fillStyle = '#e06a8a'; ctx.beginPath(); ctx.arc(24, -5, 1.8, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(26, -3); ctx.lineTo(34, -5); ctx.moveTo(26, -2); ctx.lineTo(34, 0); ctx.stroke();
    ctx.restore();
  };

  A.BALL_ART.cheese = (ctx, r) => {
    const s = r / 12;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#FFD200';
    ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(14, 11); ctx.lineTo(14, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4b400'; ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(14, -9); ctx.lineTo(10, -6); ctx.lineTo(10, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d99a00';
    [[4, 6, 2.6], [-4, 8, 1.8], [9, 0, 1.6]].forEach(h => { ctx.beginPath(); ctx.arc(h[0], h[1], h[2], 0, TAU); ctx.fill(); });
    ctx.strokeStyle = '#b07b00'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-14, 11); ctx.lineTo(14, 11); ctx.lineTo(14, -9); ctx.closePath(); ctx.stroke();
    ctx.restore();
  };

  /* Mini dragon: green, round and silly. Faces b.face (1 = right).
   * sleep: curled, eyes shut, zzz · idle: sitting, blinking · startle: eyes wide, wings up
   * breathe: mouth wide open (the flames are drawn by drawFire) · rest: smoke puffs */
  A.BALL_ART.dragon = (ctx, r, angle, b) => {
    const s = r / 24, t = A.time;
    const st = b ? b.state : 'idle';
    const GREEN = '#8CC63F', DARK = '#4f7a1d', BELLY = '#FFD200', SPIKE = '#FF8C00';
    ctx.save(); ctx.scale((b ? b.face : 1) * s, s);
    const jump = st === 'startle' ? -6 : 0;
    ctx.translate(0, jump);
    // tail
    ctx.strokeStyle = GREEN; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, 14); ctx.quadraticCurveTo(-34, 18, -36, st === 'sleep' ? 14 : 2); ctx.stroke();
    ctx.fillStyle = SPIKE; ctx.beginPath(); ctx.moveTo(-36, -4); ctx.lineTo(-43, 4); ctx.lineTo(-33, 6); ctx.closePath(); ctx.fill();
    // wing (flaps when startled / breathing)
    const flap = st === 'startle' ? -0.9 : st === 'breathe' ? -0.4 + Math.sin(t * 30) * 0.15 : st === 'sleep' ? 0.35 : 0;
    ctx.save(); ctx.translate(-6, -6); ctx.rotate(flap);
    ctx.fillStyle = '#6aa52a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -18); ctx.lineTo(-16, -4); ctx.lineTo(-24, -2); ctx.lineTo(-12, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    // feet
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.ellipse(-8, 21, 6, 3.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 21, 6, 3.5, 0, 0, TAU); ctx.fill();
    // body + belly
    ctx.fillStyle = GREEN; ctx.beginPath(); ctx.ellipse(-2, 6, 19, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = BELLY; ctx.beginPath(); ctx.ellipse(3, 10, 10, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(176,123,0,0.6)'; ctx.lineWidth = 1.2;
    [4, 9, 14].forEach(y => { ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(11, y); ctx.stroke(); });
    // back spikes
    ctx.fillStyle = SPIKE;
    [[-16, -4], [-9, -9], [-1, -11]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x, y - 5); ctx.lineTo(x + 4, y + 4); ctx.closePath(); ctx.fill(); });
    // head
    const hy = st === 'sleep' ? 2 : -10, hx = st === 'sleep' ? 12 : 13;
    ctx.fillStyle = GREEN; ctx.beginPath(); ctx.ellipse(hx, hy, 13, 11, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx + 10, hy + 3, 9, 7, 0, 0, TAU); ctx.fill();               // snout
    ctx.fillStyle = SPIKE;                                                                     // horns
    ctx.beginPath(); ctx.moveTo(hx - 6, hy - 8); ctx.lineTo(hx - 10, hy - 18); ctx.lineTo(hx - 1, hy - 10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 1, hy - 10); ctx.lineTo(hx + 1, hy - 20); ctx.lineTo(hx + 7, hy - 10); ctx.fill();
    ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(hx + 15, hy, 1.4, 0, TAU); ctx.fill();      // nostril
    // eyes
    if (st === 'sleep') {
      ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(hx + 2, hy - 2, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    } else {
      const wide = st === 'startle' || st === 'breathe';
      const blink = st === 'idle' && (t % 3.2) < 0.12;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(hx + 2, hy - 3, wide ? 5.5 : 4.5, blink ? 0.8 : (wide ? 6 : 4.5), 0, 0, TAU); ctx.fill();
      if (!blink) { ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.arc(hx + 3.5, hy - 3, wide ? 2 : 2.4, 0, TAU); ctx.fill(); }
    }
    // mouth
    if (st === 'breathe' || st === 'startle') {
      ctx.fillStyle = '#7a1f28';
      ctx.beginPath(); ctx.ellipse(hx + 15, hy + 7, st === 'breathe' ? 5 : 2.5, st === 'breathe' ? 4.5 : 2.5, 0, 0, TAU); ctx.fill();
    } else if (st !== 'sleep') {
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hx + 12, hy + 5, 4, 0.2, Math.PI * 0.7); ctx.stroke();
    }
    ctx.restore();
    if (!b) return;
    if (st === 'sleep') zzz(ctx, 6 * s, -20 * s);
    if (st === 'startle') {
      ctx.fillStyle = '#FFD200'; ctx.font = '900 18px Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', -b.face * 10 * s, -34 * s);
    }
    if (st === 'rest') {                                                                      // little smoke puffs
      const nx = b.face * 26 * s, ny = -8 * s;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.9 + i / 3) % 1);
        ctx.fillStyle = 'rgba(210,214,226,' + (0.6 * (1 - k)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(nx + b.face * k * 10, ny - k * 26, 3 + k * 5, 0, TAU); ctx.fill();
      }
    }
  };

  A.FLAT.mouse = A.FLAT.cat = A.FLAT.cheese = A.FLAT.dragon = true;
})(window.CL = window.CL || {});
