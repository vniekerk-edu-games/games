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

  /* Box against box (both {x, y, c, s, hw, hh}). Returns up to two contact
   * points [{ nx, ny, pen, px, py }] with the normal pushing A away from B.
   * Separating axes, then the touching edge is clipped to the other face. */
  function boxBox(A, B) {
    const dx = B.x - A.x, dy = B.y - A.y;
    const axes = [[A.c, A.s, A.hw, A, B], [-A.s, A.c, A.hh, A, B], [B.c, B.s, B.hw, B, A], [-B.s, B.c, B.hh, B, A]];
    let best = null, bestSep = -Infinity;
    for (let i = 0; i < 4; i++) {
      const [ax, ay, h, ref, inc] = axes[i];
      const rInc = inc.hw * Math.abs(ax * inc.c + ay * inc.s) + inc.hh * Math.abs(-ax * inc.s + ay * inc.c);
      const sep = Math.abs(dx * ax + dy * ay) - h - rInc;
      if (sep > 0) return null;
      // prefer A's faces a little, so results don't flicker between equal choices
      const score = i < 2 ? sep : sep - 0.05;
      if (score > bestSep) { bestSep = score; best = i; }
    }
    const [ax, ay, h, ref, inc] = axes[best];
    // normal from reference box toward incident box
    const toInc = (inc.x - ref.x) * ax + (inc.y - ref.y) * ay;
    const nx = toInc >= 0 ? ax : -ax, ny = toInc >= 0 ? ay : -ay;
    // incident edge: face of the incident box that faces most against n
    const faces = [[inc.c, inc.s, inc.hw, inc.hh], [-inc.c, -inc.s, inc.hw, inc.hh], [-inc.s, inc.c, inc.hh, inc.hw], [inc.s, -inc.c, inc.hh, inc.hw]];
    let fi = 0, fd = Infinity;
    for (let i = 0; i < 4; i++) { const d = faces[i][0] * nx + faces[i][1] * ny; if (d < fd) { fd = d; fi = i; } }
    const [fx, fy, fh, fe] = faces[fi];
    const cx = inc.x + fx * fh, cy = inc.y + fy * fh, tx = -fy, ty = fx;
    let v1x = cx + tx * fe, v1y = cy + ty * fe, v2x = cx - tx * fe, v2y = cy - ty * fe;
    // clip against the reference face's side planes
    const sx = -ny, sy = nx;
    const ext = (best % 2 === 0) ? ref.hh : ref.hw;
    const clip = (sign) => {
      const d1 = sign * ((v1x - ref.x) * sx + (v1y - ref.y) * sy) - ext;
      const d2 = sign * ((v2x - ref.x) * sx + (v2y - ref.y) * sy) - ext;
      if (d1 > 0 && d2 > 0) return false;
      if (d1 > 0) { const t = d1 / (d1 - d2); v1x += (v2x - v1x) * t; v1y += (v2y - v1y) * t; }
      else if (d2 > 0) { const t = d2 / (d2 - d1); v2x += (v1x - v2x) * t; v2y += (v1y - v2y) * t; }
      return true;
    };
    if (!clip(1) || !clip(-1)) return null;
    const out = [];
    const flip = ref === A ? -1 : 1;  // push A away from B
    const feature = best * 4 + fi;   // which faces touch (lets the solver remember last step's push)
    [[v1x, v1y], [v2x, v2y]].forEach(([vx, vy], i) => {
      const sep = (vx - ref.x) * nx + (vy - ref.y) * ny - h;
      if (sep <= 0) out.push({ nx: nx * flip, ny: ny * flip, pen: -sep, px: vx - nx * sep * 0.5, py: vy - ny * sep * 0.5, id: feature * 2 + i });
    });
    return out.length ? out : null;
  }

  CL.collide = { circleCircle, circleBox, ballBlock, boxBox };
})(window.CL = window.CL || {});
