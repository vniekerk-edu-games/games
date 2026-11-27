/* Contraption Labs — layout.js
 * A "layout" is the saved arrangement of parts: the thing you BUILD.
 * It is plain JSON, so it can be saved to a file, autosaved, undone,
 * and (in Stage 4) become the starting point of a level.
 *
 * {
 *   "format": "contraption-labs/layout", "version": 1,
 *   "parts": [
 *     { "type": "wood", "x": 400, "y": 500, "length": 260, "angle": 0.2, "locked": true },
 *     { "type": "tennis", "x": 380, "y": 450 }
 *   ]
 * }
 * Units: px (100 px = 1 m), angle in radians. "locked" = bolted down (can't move/remove).
 */
(function (CL) {
  'use strict';
  const FORMAT = 'contraption-labs/layout', VERSION = 1, MAX_PARTS = 400;
  const r1 = v => Math.round(v * 10) / 10;
  const r4 = v => Math.round(v * 10000) / 10000;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function kindOf(type) {
    if (CL.BALLS[type]) return 'ball';
    if (CL.SURFACES[type] && CL.SHELF.build.indexOf(type) >= 0) return 'block';
    return null;
  }

  function fromWorld(world) {
    const parts = [];
    for (const k of world.blocks) {
      if (k.fixed) continue;
      const p = { type: k.type, x: r1(k.x), y: r1(k.y), length: r1(k.length), angle: r4(k.angle) };
      if (k.locked) p.locked = true;
      parts.push(p);
    }
    for (const b of world.balls) {
      const p = { type: b.type, x: r1(b.x), y: r1(b.y) };
      if (b.locked) p.locked = true;
      parts.push(p);
    }
    return { format: FORMAT, version: VERSION, parts: parts };
  }

  /* Old preset shape { blocks, balls } → layout */
  function fromPreset(d) {
    return parse({ format: FORMAT, version: VERSION, parts: (d.blocks || []).concat(d.balls || []) });
  }

  /* Validate anything (object or JSON text) into a clean layout.
   * Unknown parts are skipped; numbers are clamped into the lab. */
  function parse(input) {
    let obj = input;
    if (typeof input === 'string') {
      try { obj = JSON.parse(input); } catch (e) { throw new Error('That file could not be read.'); }
    }
    if (!obj || !Array.isArray(obj.parts)) throw new Error('That is not a Contraption Labs file.');
    const W = CL.WORLD.width, F = CL.WORLD.floorY;
    const parts = []; let skipped = 0;
    for (const p of obj.parts.slice(0, MAX_PARTS)) {
      const kind = p && kindOf(p.type);
      if (!kind || !isFinite(p.x) || !isFinite(p.y)) { skipped++; continue; }
      const q = { type: p.type, x: r1(clamp(p.x, 0, W)), y: r1(clamp(p.y, 0, F)) };
      if (kind === 'block') {
        const d = CL.SURFACES[p.type];
        q.length = r1(clamp(num(p.length, d.defaultLength), d.minLength, d.maxLength));
        q.angle = r4(num(p.angle, 0));
      }
      if (p.locked) q.locked = true;
      parts.push(q);
    }
    skipped += Math.max(0, obj.parts.length - MAX_PARTS);
    return { format: FORMAT, version: VERSION, parts: parts, skipped: skipped };
  }

  CL.Layout = { FORMAT, VERSION, kindOf, fromWorld, fromPreset, parse };
})(window.CL = window.CL || {});
