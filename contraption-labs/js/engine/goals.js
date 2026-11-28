/* Contraption Labs — goals.js
 * Checks whether a puzzle's goals have been met while the machine runs.
 * A level is solved when EVERY goal in its list is true at the same moment.
 *
 * Goal types (used in js/levels/levels.js):
 *   { type: 'zone', what: 'bowling', x, y, w, h, label, hold }
 *        a part of that type has its centre inside the box for `hold` seconds
 *        (default 0.5; hold: 0 = just passing through counts, e.g. a hoop)
 *        (what may also be a tag, e.g. what: 'tag:prize')
 *   { type: 'topple', tag: 'pin' }  every domino/crate with this tag has been
 *        knocked over (tipped past 50°) or knocked off its shelf
 *   { type: 'pop',   count: 1 }      balloons popped
 *   { type: 'eat',   count: 1 }      cheese eaten by a mouse
 *   { type: 'lit',   tag: 'cake' }   every candle with this tag is alight
 *   { type: 'switch', tag: 'main' }  the switch with this tag is ON
 *
 * Same physics + same build = same result, so a solved puzzle always stays solved.
 */
(function (CL) {
  'use strict';
  const HOLD = 0.5; // seconds a thing must stay in a zone

  function bodies(world) { return world.balls.concat(world.rigids || []); }
  function matches(o, what) { return what.indexOf('tag:') === 0 ? o.tag === what.slice(4) : o.type === what; }
  function inside(o, g) { return o.x >= g.x && o.x <= g.x + g.w && o.y >= g.y && o.y <= g.y + g.h; }

  function create(level) {
    const goals = level.goals || [];
    const state = goals.map(() => ({ ok: false, since: null, n: 0 }));
    const checker = {
      seen: 0,          // how many world.events have been read (sandbox resets this when it clears them)
      met: false,
      goals: goals,
      state: state,
      update(world) {
        const ev = world.events;
        for (let i = this.seen; i < ev.length; i++) {
          goals.forEach((g, j) => { if (ev[i].type === g.type) state[j].n++; });
        }
        this.seen = ev.length;
        goals.forEach((g, j) => {
          const s = state[j];
          if (g.type === 'zone') {
            const here = bodies(world).some(o => matches(o, g.what) && inside(o, g));
            if (!here) { s.since = null; s.ok = false; }
            else { if (s.since === null) s.since = world.time; s.ok = s.ok || world.time - s.since >= (g.hold != null ? g.hold : HOLD); }
            s.inside = here;
            if (g.hold === 0 && s.hit) s.ok = true;          // a hoop: once through is enough
            if (here) s.hit = true;
          } else if (g.type === 'pop' || g.type === 'eat') {
            s.ok = s.n >= (g.count || 1);
          } else if (g.type === 'topple') {
            if (!s.start) s.start = new Map((world.rigids || []).filter(r => r.tag === g.tag).map(r => [r, r.y]));
            const all = Array.from(s.start.keys());
            s.ok = all.length > 0 && all.every(r => Math.abs(Math.sin(r.angle)) > 0.77 || r.y - s.start.get(r) > 40 || (world.rigids || []).indexOf(r) < 0);
          } else if (g.type === 'lit') {
            const c = world.blocks.filter(k => k.tag === g.tag);
            s.ok = c.length > 0 && c.every(k => k.lit);
          } else if (g.type === 'switch') {
            const c = world.blocks.find(k => k.tag === g.tag);
            s.ok = !!(c && c.on);
          }
        });
        if (!this.met && state.every(s => s.ok)) this.met = true;
        return this.met;
      }
    };
    return checker;
  }

  /* A short line describing a goal, for the shelf card and banner */
  function describe(level) { return level.goalText || ''; }

  CL.Goals = { create, describe, HOLD };
})(window.CL = window.CL || {});
