/* Contraption Labs — collide.js
 * Narrow-phase tests. Each returns null or { nx, ny, pen } where the normal
 * points from the second shape toward the first (i.e. the way to push the ball).
 */
(function (CL) {
  'use strict';

  function circleCircle(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    const rs = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rs * rs) return null;
    const d = Math.sqrt(d2);
    if (d < 1e-9) return { nx: 0, ny: -1, pen: rs };
    return { nx: dx / d, ny: dy / d, pen: rs - d };
  }

  function circleBox(ball, k) {
    const dx = ball.x - k.x, dy = ball.y - k.y;
    const reach = k.br + ball.r;
    if (dx * dx + dy * dy > reach * reach) return null;
    // into box-local coordinates
    const lx = dx * k.c + dy * k.s;
    const ly = -dx * k.s + dy * k.c;
    const qx = Math.max(-k.hw, Math.min(k.hw, lx));
    const qy = Math.max(-k.hh, Math.min(k.hh, ly));
    let nlx, nly, pen;
    if (qx !== lx || qy !== ly) {
      // centre outside the box: use closest point
      const ex = lx - qx, ey = ly - qy;
      const d2 = ex * ex + ey * ey;
      if (d2 >= ball.r * ball.r) return null;
      const d = Math.sqrt(d2);
      nlx = ex / d; nly = ey / d;
      pen = ball.r - d;
    } else {
      // centre inside the box: push out along the shallowest axis
      const px = k.hw - Math.abs(lx), py = k.hh - Math.abs(ly);
      if (px < py) { nlx = lx >= 0 ? 1 : -1; nly = 0; pen = ball.r + px; }
      else { nlx = 0; nly = ly >= 0 ? 1 : -1; pen = ball.r + py; }
    }
    return {
      nx: nlx * k.c - nly * k.s,
      ny: nlx * k.s + nly * k.c,
      pen: pen
    };
  }

  /* ball against any fixed part */
  function ballBlock(ball, k) {
    return k.shape === 'circle' ? circleCircle(ball, k) : circleBox(ball, k);
  }

  CL.collide = { circleCircle, circleBox, ballBlock };
})(window.CL = window.CL || {});
