/* Contraption Labs — catalog.js
 * All part definitions live here as plain data. Tuning how a ball "feels"
 * means editing numbers in this file only.
 *
 * Units: 100 world pixels = 1 metre. Gravity = 981 px/s² (real Earth gravity).
 *
 * Ball properties
 *   radius            size in px
 *   mass              kg (affects who pushes whom in a collision)
 *   bounce            0..1 how much speed survives an impact (restitution)
 *   friction          grip against surfaces (0 = slippery, 1 = grippy)
 *   drag              air resistance; bigger = drifts and slows in the air
 *   gravityScale      1 = normal; negative = floats upward (helium)
 *   inertiaK          0.4 solid ball, 0.67 hollow shell (affects rolling)
 *   rollingResistance how quickly rolling dies away (rad/s²)
 */
(function (CL) {
  'use strict';

  CL.WORLD = { width: 1600, height: 900, floorY: 860, pxPerMetre: 100 };

  CL.BALLS = {
    bowling: {
      name: 'Bowling ball', radius: 20, mass: 6, bounce: 0.15, friction: 0.2,
      drag: 0.000005, gravityScale: 1, inertiaK: 0.4, rollingResistance: 0.4,
      trailColor: '#9aa6ff',
      stats: { weight: 5, bounce: 1, air: 1 },
      fact: 'Very heavy. When it lands, most of its energy becomes a big THUD, so it hardly bounces.',
      notice: 'Once it gets rolling it is hard to stop, and it shoves lighter balls out of the way.'
    },
    basketball: {
      name: 'Basketball', radius: 22, mass: 0.6, bounce: 0.78, friction: 0.7,
      drag: 0.00012, gravityScale: 1, inertiaK: 0.67, rollingResistance: 0.8,
      trailColor: '#ffa45c',
      stats: { weight: 3, bounce: 4, air: 2 },
      fact: 'Pumped full of air. The squashed air pushes back when it hits the ground, so it springs up again.',
      notice: 'Each bounce is a bit lower than the last. Where does the lost energy go? (Hint: listen!)'
    },
    tennis: {
      name: 'Tennis ball', radius: 11, mass: 0.06, bounce: 0.72, friction: 0.6,
      drag: 0.0002, gravityScale: 1, inertiaK: 0.6, rollingResistance: 1.5,
      trailColor: '#dcf25a',
      stats: { weight: 2, bounce: 4, air: 2 },
      fact: 'Light and fuzzy. Its rubber inside is springy, so it bounces well.',
      notice: 'On a ramp it rolls and spins. Try it on wood, then on ice.'
    },
    bouncy: {
      name: 'Super bouncy ball', radius: 9, mass: 0.03, bounce: 0.9, friction: 0.8,
      drag: 0.00005, gravityScale: 1, inertiaK: 0.4, rollingResistance: 1.0,
      trailColor: '#ff6fa3',
      stats: { weight: 1, bounce: 5, air: 1 },
      fact: 'Made of super-springy rubber. It gives back almost all of its energy, so it bounces nearly as high as it started!',
      notice: 'Turn on Trails and count how many bounces it makes before it stops.'
    },
    beach: {
      name: 'Beach ball', radius: 34, mass: 0.15, bounce: 0.6, friction: 0.5,
      drag: 0.0012, gravityScale: 1, inertiaK: 0.67, rollingResistance: 2.0,
      trailColor: '#5fd1ff',
      stats: { weight: 1, bounce: 3, air: 4 },
      fact: 'Big and very light. The air pushes against it as it moves, so it falls slowly and drifts.',
      notice: 'Drop it next to a bowling ball. Which lands first? Why?'
    },
    balloon: {
      name: 'Balloon', radius: 26, mass: 0.01, bounce: 0.45, friction: 0.4,
      drag: 0.004, gravityScale: -0.3, inertiaK: 0.67, rollingResistance: 3.0,
      trailColor: '#ff7b8a',
      stats: { weight: 1, bounce: 2, air: 5 },
      fact: 'Filled with helium, a gas lighter than air. The air around it pushes it UP, so it floats.',
      notice: 'Throw it down hard. Watch the air slow it down and send it back up.'
    }
  };

  /* Static surfaces the learner can place. bounce multiplies the ball's own
   * bounce; minBounce guarantees a spring (trampoline). */
  CL.SURFACES = {
    wood: {
      name: 'Wood plank', thickness: 16, bounce: 0.9, friction: 0.6,
      defaultLength: 260, minLength: 60, maxLength: 900,
      stats: { grip: 4, spring: 3 },
      fact: 'Wood is a bit rough, so balls grip it and ROLL instead of sliding.',
      notice: 'Tilt it to make a ramp. A steeper ramp makes balls speed up faster.'
    },
    ice: {
      name: 'Ice plank', thickness: 16, bounce: 0.95, friction: 0.001,
      defaultLength: 260, minLength: 60, maxLength: 900,
      stats: { grip: 1, spring: 3 },
      fact: 'Ice is super slippery (almost no friction), so balls SLIDE instead of rolling.',
      notice: 'Watch the ball pattern: on ice it hardly spins at all.'
    },
    trampoline: {
      name: 'Trampoline', thickness: 14, bounce: 1.25, minBounce: 0.88, friction: 0.6,
      defaultLength: 140, minLength: 60, maxLength: 260,
      stats: { grip: 3, spring: 5 },
      fact: 'A stretchy mat stores energy when it is pushed down, then flings things back up.',
      notice: 'Even a heavy bowling ball bounces here. Try tilting it to aim the bounce!'
    },
    /* Lab boundaries (not on the shelf) */
    floor: { name: 'Lab floor', thickness: 120, bounce: 1.0, friction: 0.6 },
    wall:  { name: 'Wall', thickness: 120, bounce: 0.85, friction: 0.6 }
  };

  CL.SHELF = {
    balls: ['bowling', 'basketball', 'tennis', 'bouncy', 'beach', 'balloon'],
    build: ['wood', 'ice', 'trampoline']
  };
})(window.CL = window.CL || {});
