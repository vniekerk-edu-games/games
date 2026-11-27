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

  A.FLAT.mouse = A.FLAT.cat = A.FLAT.cheese = true;
})(window.CL = window.CL || {});
