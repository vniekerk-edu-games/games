/* Contraption Labs — layout.js
 * A "layout" is the saved arrangement of parts: the thing you BUILD.
 * Plain JSON, so it can be saved to a file, autosaved, undone, and become
 * the starting point of a level.
 *
 * {
 *   "format": "contraption-labs/layout", "version": 2,
 *   "parts": [
 *     { "id": 1, "type": "motor", "x": 300, "y": 600, "flip": false },
 *     { "id": 2, "type": "gearLarge", "x": 500, "y": 600, "locked": true },
 *     { "id": 3, "type": "wood", "x": 400, "y": 500, "length": 260, "angle": 0.2 },
 *     { "id": 4, "type": "tennis", "x": 380, "y": 450 }
 *   ],
 *   "links": [ { "type": "belt", "a": 1, "b": 2 } ]
 * }
 * Units: px (100 px = 1 m), angle in radians. "locked" = bolted down.
 * Part settings (e.g. "on", "flip", "awake") are listed in catalog.js → options.
 * Version 1 files (no ids, no links) still open.
 */
(function (CL) {
  'use strict';
  const FORMAT = 'contraption-labs/layout', VERSION = 2, MAX_PARTS = 400, MAX_LINKS = 200;
  const r1 = v => Math.round(v * 10) / 10;
  const r4 = v => Math.round(v * 10000) / 10000;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function kindOf(type) {
    if (CL.BALLS[type]) return 'ball';
    if (CL.RIGIDS && CL.RIGIDS[type]) return 'rigid';
    if (CL.SURFACES[type] && !CL.SURFACES[type].hidden) return 'block';
    return null;
  }
  function defOf(type) { return CL.BALLS[type] || (CL.RIGIDS && CL.RIGIDS[type]) || CL.SURFACES[type]; }

  function writeOptions(p, o) {
    (o.def.options || []).forEach(op => { p[op.key] = o.opts[op.key]; });
  }

  function fromWorld(world) {
    const parts = [], ids = new Map();
    let id = 1;
    for (const k of world.blocks) {
      if (k.fixed) continue;
      const p = { id: id, type: k.type, x: r1(k.x), y: r1(k.y) };
      if (k.def.stretchable) p.length = r1(k.length);
      if (k.def.rotatable) p.angle = r4(k.angle);
      writeOptions(p, k);
      if (k.locked) p.locked = true;
      ids.set(k, id++); parts.push(p);
    }
    for (const r of world.rigids || []) {
      const p = { id: id, type: r.type, x: r1(r.x), y: r1(r.y) };
      if (r.angle) p.angle = r4(r.angle);
      writeOptions(p, r);
      if (r.locked) p.locked = true;
      ids.set(r, id++); parts.push(p);
    }
    for (const b of world.balls) {
      const p = { id: id, type: b.type, x: r1(b.x), y: r1(b.y) };
      writeOptions(p, b);
      if (b.locked) p.locked = true;
      ids.set(b, id++); parts.push(p);
    }
    const links = [];
    for (const l of world.links) {
      if (!ids.has(l.a) || !ids.has(l.b)) continue;
      const q = { type: l.type, a: ids.get(l.a), b: ids.get(l.b) };
      if (l.via && ids.has(l.via)) q.via = ids.get(l.via);
      links.push(q);
    }
    return { format: FORMAT, version: VERSION, parts: parts, links: links };
  }

  /* Preset shape { blocks, balls, links? } → layout */
  function fromPreset(d) {
    return parse({ format: FORMAT, version: VERSION,
      parts: (d.parts || []).concat(d.blocks || [], d.balls || []), links: d.links || [] });
  }

  /* Validate anything (object or JSON text) into a clean layout.
   * Unknown parts/links are skipped; numbers are clamped into the lab. */
  function parse(input) {
    let obj = input;
    if (typeof input === 'string') {
      try { obj = JSON.parse(input); } catch (e) { throw new Error('That file could not be read.'); }
    }
    if (!obj || !Array.isArray(obj.parts)) throw new Error('That is not a Contraption Labs file.');
    const W = CL.WORLD.width, F = CL.WORLD.floorY;
    const parts = [], used = new Set();
    let skipped = 0, nextId = 1;
    obj.parts.forEach(p => { if (p && Number.isInteger(p.id)) nextId = Math.max(nextId, p.id + 1); });

    for (const p of obj.parts.slice(0, MAX_PARTS)) {
      const kind = p && kindOf(p.type);
      if (!kind || !isFinite(p.x) || !isFinite(p.y)) { skipped++; continue; }
      const d = defOf(p.type);
      let id = Number.isInteger(p.id) && !used.has(p.id) ? p.id : nextId++;
      used.add(id);
      const q = { id: id, type: p.type, x: r1(clamp(p.x, 0, W)), y: r1(clamp(p.y, 0, F)) };
      if (kind === 'block') {
        if (d.stretchable) q.length = r1(clamp(num(p.length, d.defaultLength), d.minLength, d.maxLength));
        if (d.rotatable) q.angle = r4(num(p.angle, 0));
      } else if (kind === 'rigid' && num(p.angle, 0)) q.angle = r4(p.angle);
      (d.options || []).forEach(op => {
        const ok = op.values.some(v => v[0] === p[op.key]);
        q[op.key] = ok ? p[op.key] : op.values[0][0];
      });
      if (p.locked) q.locked = true;
      parts.push(q);
    }
    skipped += Math.max(0, obj.parts.length - MAX_PARTS);

    const links = [];
    for (const l of (Array.isArray(obj.links) ? obj.links : []).slice(0, MAX_LINKS)) {
      if (l && CL.LINKS[l.type] && used.has(l.a) && used.has(l.b) && l.a !== l.b) {
        const q = { type: l.type, a: l.a, b: l.b };
        if (l.type === 'rope' && used.has(l.via)) q.via = l.via;
        links.push(q);
      } else skipped++;
    }
    return { format: FORMAT, version: VERSION, parts: parts, links: links, skipped: skipped };
  }

  /* Pull a part's option values out of a layout entry */
  function optionsOf(p) {
    const o = {};
    (defOf(p.type).options || []).forEach(op => { o[op.key] = p[op.key]; });
    return o;
  }

  /* Create the parts and links of a (parsed) layout inside a world.
   * Links that don't make sense (e.g. a belt to a ball) are dropped. */
  function build(world, layout) {
    const map = new Map();
    for (const p of layout.parts) {
      const kind = kindOf(p.type);
      const o = kind === 'ball' ? new CL.Ball(p.type, p.x, p.y, optionsOf(p))
        : kind === 'rigid' ? new CL.Rigid(p.type, p.x, p.y, { angle: p.angle, opts: optionsOf(p) })
        : new CL.Block(p.type, p.x, p.y, { length: p.length, angle: p.angle, opts: optionsOf(p) });
      o.locked = !!p.locked;
      world.add(o);
      map.set(p.id, o);
    }
    for (const l of layout.links || []) {
      const a = map.get(l.a), b = map.get(l.b), via = l.via ? map.get(l.via) : null;
      if (a && b && !CL.Machines.canLink(world, l.type, a, b, via)) {
        const link = { type: l.type, a: a, b: b, kind: 'link' };
        if (via) link.via = via;
        world.links.push(link);
      }
    }
    if (CL.Ropes) CL.Ropes.resetLengths(world);
    if (CL.Machines) CL.Machines.update(world, 0); // line up gear teeth, work out power
    return map;
  }

  CL.Layout = { FORMAT, VERSION, kindOf, defOf, fromWorld, fromPreset, parse, optionsOf, build };
})(window.CL = window.CL || {});
