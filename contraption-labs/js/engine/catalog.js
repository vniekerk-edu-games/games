/* Contraption Labs — catalog.js
 * Every part is plain data here. Tuning how something "feels" means editing
 * numbers in this file only.
 *
 * Units: 100 world pixels = 1 metre. Gravity = 981 px/s² (real Earth gravity).
 *
 * CL.BALLS  — things that move freely (balls, critters, cheese). All use a
 *             circle for physics.
 *   radius, mass (kg), bounce 0..1, friction 0..1, drag (air), gravityScale
 *   (negative floats), inertiaK (0.4 solid, 0.67 hollow), rollingResistance
 *   noSpin     true = never rolls (critters, cheese)
 *   creature   'mouse' | 'cat'  (see engine/creatures.js)
 *   food       true = mice want it
 *
 * CL.SURFACES — things fixed in the lab (planks, machines). Box or circle.
 *   shape 'box' (length × thickness) or 'circle' (radius)
 *   rotatable / stretchable  — gets the yellow handle in build mode
 *   axle       has a wheel that belts can join (drive network, engine/machines.js)
 *   pivoted    swings on a pin (see-saw)
 *   machine    can't be moved while the machine runs
 *
 * stats: [label, 1..5, colour key]  colour keys: w (blue) b (orange) a (green)
 * options: settings the player picks in build mode (shown on the info card)
 */
(function (CL) {
  'use strict';

  CL.WORLD = { width: 1600, height: 900, floorY: 860, pxPerMetre: 100 };

  /* Drive network constants (see engine/machines.js) */
  CL.DRIVE = {
    motorSpeed: 10,      // rad/s when powered
    hamsterSpeed: 6,     // rad/s when the hamster runs
    pulleyR: 10,         // every axle has the same small pulley, so belts copy speed
    conveyorGain: 20,    // belt surface speed (px/s) per rad/s of the drive drum
    meshTolerance: 4,    // px: gears closer/further than this don't mesh
    windRange: 520,      // px a fan reaches
    windPressure: 0.062, // push per px² of ball area
    windMaxAccel: 2500   // px/s² cap (stops balloons going to space)
  };

  CL.BALLS = {
    bowling: {
      name: 'Bowling ball', radius: 20, mass: 6, bounce: 0.15, friction: 0.2,
      drag: 0.000005, gravityScale: 1, inertiaK: 0.4, rollingResistance: 0.4,
      trailColor: '#9aa6ff',
      stats: [['Weight', 5, 'w'], ['Bounce', 1, 'b'], ['Air push', 1, 'a']],
      fact: 'Very heavy. When it lands, most of its energy becomes a big THUD, so it hardly bounces.',
      notice: 'Once it gets rolling it is hard to stop, and it shoves lighter balls out of the way.'
    },
    basketball: {
      name: 'Basketball', radius: 22, mass: 0.6, bounce: 0.78, friction: 0.7,
      drag: 0.00012, gravityScale: 1, inertiaK: 0.67, rollingResistance: 0.8,
      trailColor: '#ffa45c',
      stats: [['Weight', 3, 'w'], ['Bounce', 4, 'b'], ['Air push', 2, 'a']],
      fact: 'Pumped full of air. The squashed air pushes back when it hits the ground, so it springs up again.',
      notice: 'Each bounce is a bit lower than the last. Where does the lost energy go? (Hint: listen!)'
    },
    tennis: {
      name: 'Tennis ball', radius: 11, mass: 0.06, bounce: 0.72, friction: 0.6,
      drag: 0.0002, gravityScale: 1, inertiaK: 0.6, rollingResistance: 1.5,
      trailColor: '#dcf25a',
      stats: [['Weight', 2, 'w'], ['Bounce', 4, 'b'], ['Air push', 2, 'a']],
      fact: 'Light and fuzzy. Its rubber inside is springy, so it bounces well.',
      notice: 'On a ramp it rolls and spins. Try it on wood, then on ice.'
    },
    bouncy: {
      name: 'Super bouncy ball', radius: 9, mass: 0.03, bounce: 0.9, friction: 0.8,
      drag: 0.00005, gravityScale: 1, inertiaK: 0.4, rollingResistance: 1.0,
      trailColor: '#ff6fa3',
      stats: [['Weight', 1, 'w'], ['Bounce', 5, 'b'], ['Air push', 1, 'a']],
      fact: 'Made of super-springy rubber. It gives back almost all of its energy, so it bounces nearly as high as it started!',
      notice: 'Turn on Trails and count how many bounces it makes before it stops.'
    },
    beach: {
      name: 'Beach ball', radius: 34, mass: 0.15, bounce: 0.6, friction: 0.5,
      drag: 0.0012, gravityScale: 1, inertiaK: 0.67, rollingResistance: 2.0,
      trailColor: '#5fd1ff',
      stats: [['Weight', 1, 'w'], ['Bounce', 3, 'b'], ['Air push', 4, 'a']],
      fact: 'Big and very light. The air pushes against it as it moves, so it falls slowly and drifts.',
      notice: 'Drop it next to a bowling ball. Which lands first? Why?'
    },
    balloon: {
      name: 'Balloon', radius: 26, pops: true, mass: 0.01, bounce: 0.45, friction: 0.4,
      drag: 0.004, gravityScale: -0.3, inertiaK: 0.67, rollingResistance: 3.0,
      trailColor: '#ff7b8a',
      stats: [['Weight', 1, 'w'], ['Bounce', 2, 'b'], ['Air push', 5, 'a']],
      fact: 'Filled with helium, a gas lighter than air. The air around it pushes it UP, so it floats.',
      notice: 'Throw it down hard. Watch the air slow it down and send it back up.'
    },

    /* ---- critters & food ---- */
    mouse: {
      name: 'Mouse', radius: 13, mass: 0.25, bounce: 0.2, friction: 0.9,
      drag: 0.0002, gravityScale: 1, inertiaK: 0.4, rollingResistance: 0, noSpin: true,
      creature: 'mouse', walkSpeed: 230, fleeSpeed: 300, smell: 700, fear: 320,
      trailColor: '#d7d7e6',
      stats: [['Weight', 1, 'w'], ['Speed', 5, 'b'], ['Nose', 5, 'a']],
      fact: 'Mice LOVE cheese. If there is cheese on the same level, the mouse runs to it. But mice are scared of cats!',
      notice: 'A mouse can\u2019t walk on ice: its feet need grip (friction) to push it along.'
    },
    cat: {
      name: 'Cat', radius: 26, mass: 4, bounce: 0.1, friction: 0.9,
      drag: 0.00005, gravityScale: 1, inertiaK: 0.4, rollingResistance: 0, noSpin: true,
      creature: 'cat', chaseSpeed: 210, sight: 250, chaseRange: 800,
      trailColor: '#ffb35c',
      stats: [['Weight', 4, 'w'], ['Speed', 3, 'b'], ['Sleepy', 4, 'a']],
      fact: 'The cat naps until it spots a mouse close by, or something bumps it. Then it chases!',
      notice: 'The cat is heavier than the mouse, but the mouse is faster. Who wins the race?',
      options: [{ key: 'awake', label: 'Cat starts', values: [[false, '😴 Asleep'], [true, '👀 Awake']] }]
    },
    cheese: {
      name: 'Cheese', radius: 12, mass: 0.15, bounce: 0.15, friction: 0.7,
      drag: 0.0002, gravityScale: 1, inertiaK: 0.4, rollingResistance: 0, noSpin: true,
      food: true, trailColor: '#ffd200',
      stats: [['Weight', 1, 'w'], ['Bounce', 1, 'b'], ['Smell', 5, 'a']],
      fact: 'A mouse can smell cheese from far away, as long as it is on the same level.',
      notice: 'Cheese doesn\u2019t roll: it slides. Send it along a conveyor belt!'
    }
  };

  /* CL.RIGIDS — solid things that move AND tip over (dominoes, crates, buckets).
   *   shapes: boxes in the body's own frame { x, y, hw, hh } (origin = balance point)
   *   ropePoint: where a rope ties on (body frame)
   */
  CL.RIGIDS = {
    domino: {
      name: 'Domino', mass: 0.25, bounce: 0.1, friction: 0.5, drag: 0.0001,
      shapes: [{ x: 0, y: 0, hw: 6, hh: 30 }], ropePoint: { x: 0, y: -30 },
      stats: [['Weight', 2, 'w'], ['Tippy', 5, 'b']],
      fact: 'A domino is tall and thin. A small push near the top tips it past its balance point, and gravity does the rest!',
      notice: 'Line up dominoes a bit less than their height apart. Knock the first one over and watch the chain reaction.'
    },
    crate: {
      name: 'Crate', mass: 3, bounce: 0.1, friction: 0.6, drag: 0.00002,
      shapes: [{ x: 0, y: 0, hw: 26, hh: 26 }], ropePoint: { x: 0, y: -26 },
      stats: [['Weight', 4, 'w'], ['Tippy', 1, 'b']],
      fact: 'A crate is wide and heavy, so it is very hard to tip over. It slides instead.',
      notice: 'Tie a rope to it and hang it from a pulley. Now it can lift things!'
    },
    bucket: {
      name: 'Bucket', mass: 1.2, bounce: 0.1, friction: 0.6, drag: 0.0001,
      shapes: [{ x: 0, y: 24, hw: 30, hh: 4 }, { x: -27, y: 0, hw: 3, hh: 26 }, { x: 27, y: 0, hw: 3, hh: 26 }],
      ropePoint: { x: 0, y: -40 },
      stats: [['Weight', 2, 'w'], ['Holds', 4, 'b']],
      fact: 'A bucket holds things. The more you put in, the heavier it gets.',
      notice: 'Hang a bucket on a pulley and drop balls into it. When it is heavier than the other side, down it goes!'
    }
  };

  CL.SURFACES = {
    wood: {
      name: 'Wood plank', shape: 'box', thickness: 16, bounce: 0.9, friction: 0.6,
      defaultLength: 260, minLength: 60, maxLength: 900, rotatable: true, stretchable: true,
      stats: [['Grip', 4, 'w'], ['Spring', 3, 'b']],
      fact: 'Wood is a bit rough, so balls grip it and ROLL instead of sliding.',
      notice: 'Tilt it to make a ramp. A steeper ramp makes balls speed up faster.'
    },
    ice: {
      name: 'Ice plank', shape: 'box', thickness: 16, bounce: 0.95, friction: 0.001,
      defaultLength: 260, minLength: 60, maxLength: 900, rotatable: true, stretchable: true,
      stats: [['Grip', 1, 'w'], ['Spring', 3, 'b']],
      fact: 'Ice is super slippery (almost no friction), so balls SLIDE instead of rolling.',
      notice: 'Watch the ball pattern: on ice it hardly spins at all.'
    },
    trampoline: {
      name: 'Trampoline', shape: 'box', thickness: 14, bounce: 1.25, minBounce: 0.88, friction: 0.6,
      defaultLength: 140, minLength: 60, maxLength: 260, rotatable: true, stretchable: true,
      stats: [['Grip', 3, 'w'], ['Spring', 5, 'b']],
      fact: 'A stretchy mat stores energy when it is pushed down, then flings things back up.',
      notice: 'Even a heavy bowling ball bounces here. Try tilting it to aim the bounce!'
    },
    seesaw: {
      name: 'See-saw', shape: 'box', thickness: 14, bounce: 0.5, friction: 0.7,
      defaultLength: 320, minLength: 160, maxLength: 520, stretchable: true,
      pivoted: true, plankMass: 2.5, tiltLimit: 25, standHeight: 80, machine: true,
      stats: [['Grip', 4, 'w'], ['Fling', 4, 'b']],
      fact: 'A see-saw is a LEVER. It turns on a pin in the middle. Push one end down and the other end goes up.',
      notice: 'Drop something heavy on one end. What happens to a light ball on the other end?'
    },
    gearSmall: {
      name: 'Small gear', shape: 'circle', radius: 30, teeth: 10, bounce: 0.5, friction: 0.6,
      axle: true, gear: true, machine: true,
      stats: [['Teeth', 2, 'w'], ['Speed', 4, 'b']],
      fact: 'Gears pass turning on to each other with their teeth. Touching gears always turn in OPPOSITE directions.',
      notice: 'When a big gear turns a small gear, the small one spins FASTER. Click a gear while it runs to see!'
    },
    gearLarge: {
      name: 'Big gear', shape: 'circle', radius: 60, teeth: 20, bounce: 0.5, friction: 0.6,
      axle: true, gear: true, machine: true,
      stats: [['Teeth', 4, 'w'], ['Speed', 2, 'b']],
      fact: 'This gear has 20 teeth, the small one has 10. So the small gear must turn TWICE for each turn of the big one.',
      notice: 'Put three gears in a triangle, all touching. Can they turn? Try it!'
    },
    hamster: {
      name: 'Hamster wheel', shape: 'circle', radius: 46, bounce: 0.4, friction: 0.6,
      axle: true, machine: true,
      stats: [['Power', 3, 'w'], ['Speed', 3, 'b']],
      fact: 'A sleepy hamster! Bump the wheel and it wakes up and runs. The wheel turns, and a belt can carry that turning to other machines.',
      notice: 'The hamster is a MOTOR made of muscles. Its energy comes from the food it ate.',
      options: [{ key: 'awake', label: 'Hamster starts', values: [[false, '😴 Asleep'], [true, '🏃 Running']] }]
    },
    motor: {
      name: 'Electric motor', shape: 'box', length: 70, thickness: 50, bounce: 0.3, friction: 0.6,
      axle: true, powered: true, machine: true,
      stats: [['Power', 4, 'w'], ['Speed', 4, 'b']],
      fact: 'A motor turns ELECTRICITY into turning. It needs a cord from a switch that is ON.',
      notice: 'Join it to other machines with a belt. A belt makes both wheels turn the same way.',
      options: [{ key: 'flip', label: 'Turns', values: [[false, '↻ Clockwise'], [true, '↺ Anticlockwise']] }]
    },
    conveyor: {
      name: 'Conveyor belt', shape: 'box', thickness: 24, bounce: 0.4, friction: 0.9,
      defaultLength: 320, minLength: 120, maxLength: 800, rotatable: true, stretchable: true,
      axle: true, conveyor: true, machine: true,
      stats: [['Grip', 5, 'w'], ['Speed', 3, 'b']],
      fact: 'A conveyor belt is a long loop of rubber. When its wheel turns, the top of the belt carries things along.',
      notice: 'It only moves if something turns it! Join its left wheel to a motor or gear with a belt.'
    },
    fan: {
      name: 'Fan', shape: 'box', length: 40, thickness: 70, bounce: 0.3, friction: 0.6,
      rotatable: true, powered: true, fan: true, machine: true,
      stats: [['Push', 4, 'w'], ['Reach', 3, 'b']],
      fact: 'A fan pushes AIR. Moving air pushes hardest on things that are big and light.',
      notice: 'Point it at a bowling ball, then a beach ball. Which one moves? Turn it to blow UP!',
      options: [{ key: 'flip', label: 'Blows', values: [[false, '→ Forward'], [true, '← Backward']] }]
    },
    switch: {
      name: 'Power switch', shape: 'box', length: 50, thickness: 30, bounce: 0.3, friction: 0.6,
      powerSource: true, machine: true,
      stats: [['Power', 5, 'w']],
      fact: 'A switch controls electricity. ON lets electricity flow along the cord. When something bumps it, it flips!',
      notice: 'One switch can power lots of machines. Join them with cords.',
      options: [{ key: 'on', label: 'Switch starts', values: [[false, '⭘ OFF'], [true, '⏽ ON']] }]
    },

    hook: {
      name: 'Hook', shape: 'circle', radius: 9, bounce: 0.3, friction: 0.6, ropeAnchor: true,
      stats: [['Strength', 5, 'w']],
      fact: 'A hook holds one end of a rope still, so whatever is on the other end can SWING.',
      notice: 'A ball on a rope is a PENDULUM. Does a longer rope swing faster or slower?'
    },
    pulley: {
      name: 'Pulley', shape: 'circle', radius: 30, bounce: 0.3, friction: 0.6, pulley: true,
      stats: [['Lift', 4, 'w']],
      fact: 'A rope goes over a pulley wheel. When one side goes DOWN, the other side goes UP.',
      notice: 'Rope tool: click a thing, then the pulley, then another thing. The heavier side wins!'
    },
    scissors: {
      name: 'Scissors', shape: 'box', length: 84, thickness: 30, bounce: 0.3, friction: 0.6,
      rotatable: true, powered: true, cutter: true, machine: true,
      stats: [['Sharp', 5, 'w']],
      fact: 'Scissors SNIP when something bumps them, or when a switch sends them power.',
      notice: 'Put a rope between the blades (the pointy end). Snip, and whatever was hanging falls!'
    },
    pin: {
      name: 'Pin', shape: 'box', length: 40, thickness: 8, bounce: 0.3, friction: 0.6,
      rotatable: true, popper: true,
      stats: [['Sharp', 5, 'w']],
      fact: 'A pin has a very sharp point. The stretched rubber of a balloon bursts when it touches the point. POP!',
      notice: 'Turn the pin so the point faces where the balloon will float.'
    },
    candle: {
      name: 'Candle', shape: 'box', length: 18, thickness: 50, bounce: 0.3, friction: 0.6,
      flame: true,
      stats: [['Heat', 4, 'w']],
      fact: 'A flame is very hot. It burns through a rope and pops a balloon.',
      notice: 'Burning a rope takes a moment. Count how long it takes!',
      options: [{ key: 'lit', label: 'Candle starts', values: [[true, '🔥 Lit'], [false, '🕯️ Out']] }]
    },

    /* Lab boundaries (not on the shelf) */
    floor: { name: 'Lab floor', shape: 'box', thickness: 120, bounce: 1.0, friction: 0.6, hidden: true },
    wall:  { name: 'Wall', shape: 'box', thickness: 120, bounce: 0.85, friction: 0.6, hidden: true }
  };

  /* Connectors drawn between two parts */
  CL.LINKS = {
    belt: {
      name: 'Belt', fact: 'A belt is a loop of rubber joining two wheels. Both wheels turn the SAME way at the SAME speed.',
      notice: 'Click a machine with a wheel, then click another one to join them.',
      wrong: 'Belts join machines with a wheel: gears, motors, hamster wheels and conveyor belts.',
      fits: o => !!(o.def && o.def.axle)
    },
    cord: {
      name: 'Power cord', fact: 'A cord carries electricity from a switch to a motor, a fan or a pair of scissors.',
      notice: 'Click a switch, then click a motor, fan or scissors (or the other way round).',
      wrong: 'Cords join a switch to a motor, a fan or scissors.',
      fits: o => !!(o.def && (o.def.powerSource || o.def.powered))
    }
  };

  CL.LINKS.rope = {
    name: 'Rope', fact: 'A rope can only PULL, never push. When it is tight it holds things up; when it goes floppy it does nothing.',
    notice: 'Click a ball, bucket, crate or domino, then a hook (or another thing). For a pulley: thing → pulley → thing.',
    wrong: 'Ropes tie onto balls, critters, dominoes, crates, buckets and hooks. Pulleys go in the middle.',
    fits: o => !!(o && (o.kind === 'ball' || o.kind === 'rigid' || (o.def && (o.def.ropeAnchor || o.def.pulley))))
  };

  CL.SHELF = {
    sections: [
      { title: 'Balls', icon: '⚽', items: ['bowling', 'basketball', 'tennis', 'bouncy', 'beach', 'balloon'] },
      { title: 'Build', icon: '🧱', items: ['wood', 'ice', 'trampoline', 'seesaw', 'domino', 'crate', 'bucket'] },
      { title: 'Ropes', icon: '🪢', items: ['rope', 'hook', 'pulley'] },
      { title: 'Machines', icon: '⚙️', items: ['gearSmall', 'gearLarge', 'belt', 'conveyor', 'hamster', 'motor'] },
      { title: 'Power', icon: '⚡', items: ['switch', 'cord', 'fan', 'scissors'] },
      { title: 'Pop & burn', icon: '🔥', items: ['pin', 'candle'] },
      { title: 'Critters', icon: '🐭', items: ['mouse', 'cat', 'cheese'] }
    ]
  };
  // kept for older code/tests
  CL.SHELF.balls = CL.SHELF.sections[0].items;
})(window.CL = window.CL || {});
