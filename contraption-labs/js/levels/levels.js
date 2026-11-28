/* Contraption Labs — levels.js
 * Every puzzle is plain data. To add a puzzle, copy one of these objects,
 * change it, and add it to the list. Nothing else needs to change.
 *
 * CHAPTERS group puzzles. Each chapter usually starts with a 🎓 mini-tutorial
 * (a level with "steps"), then practice puzzles that get harder.
 *
 *   id        short unique name (used to remember progress)
 *   chapter   id of a chapter in CL.CHAPTERS
 *   name, icon
 *   level     difficulty 1 = Easy, 2 = Tricky, 3 = Brain-buster
 *   goalText  one sentence shown on the banner: what has to happen
 *   intro     a friendly sentence for the start card
 *   steps     (tutorials only) a checklist that ticks itself off:
 *               { text, check: 'pick:TYPE' | 'place:TYPE' | 'turn:TYPE' | 'link:TYPE' | 'start' }
 *   hints     [nudge, clue] — the first two 💡 hints. The third hint, "Show me",
 *             draws the solution parts as see-through ghosts, one at a time.
 *   why       the science, shown when the puzzle is solved
 *   parts     the lab as it starts (layout format, see engine/layout.js). All bolted down.
 *   links     belts / cords / ropes that are already fitted (also fixed)
 *   bin       the parts the player may add, e.g. { wood: 1, rope: 1 }
 *   forceOpts settings for parts from the bin, e.g. { candle: { lit: false } }
 *   goals     what must be true to win (see engine/goals.js)
 *   solution  a known answer: { parts: [...], links: [...] } using only bin parts.
 *             Used by "Show me" AND by tests/levels-tests.js, which proves every
 *             puzzle can be solved. Solution parts that links point at need an id ≥ 100.
 *
 * Coordinates: 100 px = 1 m. The lab is 1600 × 900; the floor is at y = 860.
 */
(function (CL) {
  'use strict';
  const F = CL.WORLD.floorY;
  const D = Math.PI / 180;

  CL.CHAPTERS = [
    { id: 'basics', name: 'Lab basics', icon: '🎓', blurb: 'Learn how to build, test and try again.' },
    { id: 'roll', name: 'Roll & bounce', icon: '🎳', blurb: 'Ramps, trampolines and see-saws. Make things fly!' },
    { id: 'ropes', name: 'Ropes & pulleys', icon: '🪢', blurb: 'Swing, lift and snip.' },
    { id: 'power', name: 'Power & machines', icon: '⚡', blurb: 'Switches, motors, belts and gears.' },
    { id: 'fire', name: 'Fire & critters', icon: '🔥', blurb: 'Candles, a jumpy dragon, a cat and a hungry mouse.' },
    { id: 'big', name: 'Big contraptions', icon: '🏆', blurb: 'Put it all together. These are tough!' }
  ];
  CL.DIFFICULTY = { 1: 'Easy', 2: 'Tricky', 3: 'Brain-buster' };

  CL.LEVELS = [
    /* ---------------- Lab basics ---------------- */
    {
      id: 'drop', chapter: 'basics', level: 1, name: 'Drop it in', icon: '🪣',
      goalText: 'Get the bowling ball into the bucket.',
      intro: 'Welcome to the lab! In every puzzle you add parts, press Start, and watch what happens.',
      steps: [
        { text: 'Tap the <b>Bowling ball</b> on your shelf.', check: 'pick:bowling' },
        { text: 'Tap in the lab, high up above the bucket, to put it there.', check: 'place:bowling' },
        { text: 'Press <b>▶ Start</b> and watch!', check: 'start' }
      ],
      hints: ['Things fall straight down. Where should the ball start?', 'Put the ball right above the bucket.'],
      why: 'Gravity pulls everything straight DOWN. A heavy bowling ball hardly bounces, so it stays in the bucket.',
      parts: [{ id: 1, type: 'bucket', x: 1100, y: F - 28.5 }],
      bin: { bowling: 1 },
      goals: [{ type: 'zone', what: 'bowling', x: 1072, y: F - 58, w: 56, h: 58, label: 'In here' }],
      solution: { parts: [{ type: 'bowling', x: 1100, y: 300 }] }
    },
    {
      id: 'ramp', chapter: 'basics', level: 1, name: 'Roll it home', icon: '🎳',
      goalText: 'Get the bowling ball onto the green target.',
      intro: 'The bowling ball will drop straight down. Can you send it all the way across the lab?',
      steps: [
        { text: 'Tap the <b>Wood plank</b> on your shelf.', check: 'pick:wood' },
        { text: 'Tap in the lab just under the ball to put the plank there.', check: 'place:wood' },
        { text: 'Drag the plank\u2019s <b>yellow handle</b> to tilt it downhill to the right.', check: 'turn:wood' },
        { text: 'Press <b>▶ Start</b>. Not quite? Press <b>■ Stop</b>, change it, try again!', check: 'start' }
      ],
      hints: ['How could the ball roll sideways instead of only falling?', 'Put the plank under the ball and tilt it downhill to the right.'],
      why: 'Gravity pulls the ball DOWN. The ramp pushes back on it at an angle, so some of that falling turns into rolling sideways. A heavy ball keeps rolling for a long way.',
      parts: [{ id: 1, type: 'bowling', x: 300, y: 200 }],
      bin: { wood: 1 },
      goals: [{ type: 'zone', what: 'bowling', x: 1380, y: F - 60, w: 220, h: 60, label: 'Target' }],
      solution: { parts: [{ type: 'wood', x: 420, y: 430, length: 400, angle: 25 * D }] }
    },

    /* ---------------- Roll & bounce ---------------- */
    {
      id: 'boing', chapter: 'roll', level: 1, name: 'Boing!', icon: '🤸',
      goalText: 'Get the basketball over the wall.',
      intro: 'A wall is in the way. A trampoline can bounce things, and a tilted one bounces them sideways!',
      steps: [
        { text: 'Put the <b>Trampoline</b> under the basketball.', check: 'place:trampoline' },
        { text: 'Tilt it with the <b>yellow handle</b> so it faces the wall.', check: 'turn:trampoline' },
        { text: 'Press <b>▶ Start</b>. Try different tilts!', check: 'start' }
      ],
      hints: ['A ball bounces off a tilted surface in a new direction. Which way should it face?', 'Tilt the trampoline so its right end is a little lower than its left end.'],
      why: 'A ball bounces off a surface like a mirror reflects light: it comes off at the same angle it hit. Tilt the trampoline, and the bounce goes sideways.',
      parts: [
        { id: 1, type: 'basketball', x: 300, y: 150 },
        { id: 2, type: 'wood', x: 700, y: F - 150, length: 300, angle: 90 * D }
      ],
      bin: { trampoline: 1 },
      goals: [{ type: 'zone', what: 'basketball', x: 760, y: F - 90, w: 840, h: 90, label: 'Land here' }],
      solution: { parts: [{ type: 'trampoline', x: 300, y: 700, length: 140, angle: 15 * D }] }
    },
    {
      id: 'strike', chapter: 'roll', level: 2, name: 'Strike!', icon: '🎯',
      goalText: 'Knock over all three pins on the shelf.',
      intro: 'The pins are up on a high shelf. Send the bowling ball crashing into them!',
      hints: ['The ball needs to arrive at the shelf rolling, at the same height as the shelf.', 'Make one long ramp that starts under the ball and ends at the left edge of the shelf.'],
      why: 'The heavy ball carries lots of MOMENTUM (moving weight). When it hits the light pins, it pushes them over and keeps going.',
      parts: [
        { id: 1, type: 'bowling', x: 250, y: 100 },
        { id: 2, type: 'wood', x: 1200, y: 520, length: 400, angle: 0 },
        { id: 3, type: 'domino', x: 1100, y: 482, tag: 'pin' },
        { id: 4, type: 'domino', x: 1140, y: 482, tag: 'pin' },
        { id: 5, type: 'domino', x: 1180, y: 482, tag: 'pin' }
      ],
      bin: { wood: 1 },
      goals: [{ type: 'topple', tag: 'pin' }],
      solution: { parts: [{ type: 'wood', x: 600, y: 380, length: 860, angle: 16 * D }] }
    },
    {
      id: 'hoop', chapter: 'roll', level: 2, name: 'Slam dunk', icon: '🏀',
      goalText: 'Launch the tennis ball through the hoop.',
      intro: 'The tennis ball sits on one end of a see-saw. What happens if something heavy lands on the other end?',
      hints: ['A see-saw is a lever: push one end down HARD and the other end flies up.', 'Drop the bowling ball from high up, onto the right end of the see-saw.'],
      why: 'A see-saw is a LEVER. The heavy ball pushes one end down, so the other end shoots up and flings the light tennis ball into the air.',
      parts: [
        { id: 1, type: 'seesaw', x: 500, y: 780, length: 360 },
        { id: 2, type: 'tennis', x: 340, y: 761 }
      ],
      bin: { bowling: 1 },
      goals: [{ type: 'zone', what: 'tennis', x: 290, y: 220, w: 160, h: 200, hold: 0, label: 'Hoop' }],
      solution: { parts: [{ type: 'bowling', x: 640, y: 300 }] }
    },

    /* ---------------- Ropes & pulleys ---------------- */
    {
      id: 'swing', chapter: 'ropes', level: 1, name: 'Wrecking ball', icon: '🪢',
      goalText: 'Knock the beach ball onto the green target.',
      intro: 'Without help, the bowling ball just drops. Tie it to the hook, and it will SWING instead.',
      steps: [
        { text: 'Tap the <b>Rope</b> on your shelf.', check: 'pick:rope' },
        { text: 'Tap the <b>bowling ball</b>, then tap the <b>hook</b>.', check: 'link:rope' },
        { text: 'Press <b>▶ Start</b> and watch it swing!', check: 'start' }
      ],
      hints: ['A ball on a rope swings in a curve, like a playground swing.', 'Rope tool: tap the bowling ball, then the hook.'],
      why: 'The rope holds the ball at the same distance from the hook, so instead of falling straight down it swings in a curve. That is a PENDULUM.',
      parts: [
        { id: 1, type: 'hook', x: 500, y: 400 },
        { id: 2, type: 'bowling', x: 200, y: 400 },
        { id: 3, type: 'wood', x: 640, y: 742, length: 160, angle: 0 },
        { id: 4, type: 'beach', x: 600, y: 699.5 }
      ],
      bin: { rope: 1 },
      goals: [{ type: 'zone', what: 'beach', x: 1300, y: F - 100, w: 300, h: 100, label: 'Target' }],
      solution: { parts: [], links: [{ type: 'rope', a: 2, b: 1 }] }
    },
    {
      id: 'lift', chapter: 'ropes', level: 2, name: 'Heavy lifting', icon: '🏗️',
      goalText: 'Lift the crate up to the green target.',
      intro: 'The crate is far too heavy to throw. But a pulley can lift it\u2026',
      hints: ['A pulley: when one side goes DOWN, the other side goes UP.', 'Rope tool: tap the bucket, then the pulley, then the crate. Then drop the bowling ball into the bucket.'],
      why: 'A pulley changes the direction of a pull. The heavy bowling ball in the bucket pulls DOWN on one side, so the rope pulls the crate UP on the other side.',
      parts: [
        { id: 1, type: 'pulley', x: 800, y: 160 },
        { id: 2, type: 'bucket', x: 766, y: 520 },
        { id: 3, type: 'crate', x: 834, y: F - 26.5 }
      ],
      bin: { rope: 1, bowling: 1 },
      goals: [{ type: 'zone', what: 'crate', x: 774, y: 300, w: 120, h: 280, label: 'Lift it here' }],
      solution: { parts: [{ type: 'bowling', x: 766, y: 330 }], links: [{ type: 'rope', a: 2, b: 3, via: 1 }] }
    },
    {
      id: 'snip', chapter: 'ropes', level: 2, name: 'Special delivery', icon: '✂️',
      goalText: 'Get the crate down onto the landing pad.',
      intro: 'The crate is hanging from a rope. A tennis ball is about to land on a switch\u2026',
      hints: ['Scissors snip when a switch gives them power.', 'Put the scissors\u2019 pointy end on the rope, then join the switch to the scissors with a cord.'],
      why: 'The switch sent electricity down the cord, the scissors snipped, and with nothing holding it up, gravity pulled the crate down.',
      parts: [
        { id: 1, type: 'hook', x: 1100, y: 150 },
        { id: 2, type: 'crate', x: 1100, y: 450 },
        { id: 3, type: 'switch', x: 300, y: F - 15 },
        { id: 4, type: 'tennis', x: 300, y: 400 }
      ],
      links: [{ type: 'rope', a: 2, b: 1 }],
      bin: { scissors: 1, cord: 1 },
      goals: [{ type: 'zone', what: 'crate', x: 1030, y: F - 70, w: 140, h: 70, label: 'Landing pad' }],
      solution: { parts: [{ id: 100, type: 'scissors', x: 1070, y: 300, angle: 0 }], links: [{ type: 'cord', a: 3, b: 100 }] }
    },

    /* ---------------- Power & machines ---------------- */
    {
      id: 'power', chapter: 'power', level: 1, name: 'Power up', icon: '🔌',
      goalText: 'Blow the beach ball onto the green target.',
      intro: 'The ball will flip the switch ON. But the fan isn\u2019t plugged in!',
      steps: [
        { text: 'Tap the <b>Power cord</b> on your shelf.', check: 'pick:cord' },
        { text: 'Tap the <b>switch</b>, then tap the <b>fan</b>.', check: 'link:cord' },
        { text: 'Press <b>▶ Start</b>.', check: 'start' }
      ],
      hints: ['Electricity needs a path from the switch to the fan.', 'Cord tool: tap the switch, then the fan.'],
      why: 'When the ball flipped the switch ON, electricity flowed along the cord to the fan. The fan pushed air, and the big, light beach ball was blown away.',
      parts: [
        { id: 1, type: 'switch', x: 200, y: F - 15 },
        { id: 2, type: 'tennis', x: 200, y: 500 },
        { id: 3, type: 'fan', x: 420, y: F - 35, angle: 0 },
        { id: 4, type: 'beach', x: 530, y: F - 34.5 }
      ],
      bin: { cord: 1 },
      goals: [{ type: 'zone', what: 'beach', x: 1300, y: F - 100, w: 300, h: 100, label: 'Target' }],
      solution: { parts: [], links: [{ type: 'cord', a: 1, b: 3 }] }
    },
    {
      id: 'mouse', chapter: 'power', level: 2, name: 'Feed the mouse', icon: '🧀',
      goalText: 'Feed the cheese to the mouse.',
      intro: 'The cheese is up on the conveyor belt, too high for the mouse to smell. Get the machine going!',
      hints: ['Power goes: switch → cord → motor. Turning goes: motor → belt → conveyor wheel.', 'Join switch to motor with the cord, motor to the conveyor\u2019s blue wheel with the belt, then drop the tennis ball on the switch.'],
      why: 'Electricity made the motor turn. The belt passed the turning on to the conveyor, which carried the cheese off the end. Once the cheese landed on the floor, the mouse could smell it!',
      parts: [
        { id: 1, type: 'switch', x: 200, y: F - 15 },
        { id: 2, type: 'motor', x: 420, y: 560 },
        { id: 3, type: 'conveyor', x: 900, y: 470, length: 480, angle: 0 },
        { id: 4, type: 'cheese', x: 800, y: 470 - 12 - 12.5 },
        { id: 5, type: 'mouse', x: 1380, y: F - 13.5 }
      ],
      bin: { cord: 1, belt: 1, tennis: 1 },
      goals: [{ type: 'eat', count: 1 }],
      solution: { parts: [{ type: 'tennis', x: 200, y: 600 }], links: [{ type: 'cord', a: 1, b: 2 }, { type: 'belt', a: 2, b: 3 }] }
    },
    {
      id: 'wrongway', chapter: 'power', level: 3, name: 'Wrong way!', icon: '↩️',
      goalText: 'Feed the cheese to the mouse.',
      intro: 'The motor is running, but it turns the wrong way for the mouse. And the wall is in the way\u2026',
      hints: ['Touching gears turn in OPPOSITE directions. And a big gear turning a small gear makes it spin FASTER.', 'Belt the motor to the BIG gear. Put the small gear touching it. Belt the small gear to the conveyor\u2019s blue wheel.'],
      why: 'Meshed gears turn opposite ways, so the conveyor ran backwards. The big gear also made the small gear spin twice as fast, so the cheese flew over the wall!',
      parts: [
        { id: 1, type: 'switch', x: 120, y: F - 15, on: true },
        { id: 2, type: 'motor', x: 1300, y: 620 },
        { id: 3, type: 'conveyor', x: 900, y: 470, length: 480, angle: 0 },
        { id: 4, type: 'cheese', x: 1000, y: 470 - 12 - 12.5 },
        { id: 5, type: 'mouse', x: 200, y: F - 13.5 },
        { id: 6, type: 'wood', x: 560, y: F - 120, length: 240, angle: 90 * D }
      ],
      links: [{ type: 'cord', a: 1, b: 2 }],
      bin: { gearLarge: 1, gearSmall: 1, belt: 2 },
      goals: [{ type: 'eat', count: 1 }],
      solution: {
        parts: [{ id: 100, type: 'gearLarge', x: 1300, y: 300 }, { id: 101, type: 'gearSmall', x: 1390, y: 300 }],
        links: [{ type: 'belt', a: 2, b: 100 }, { type: 'belt', a: 101, b: 3 }]
      }
    },

    /* ---------------- Fire & critters ---------------- */
    {
      id: 'hot', chapter: 'fire', level: 1, name: 'Hot stuff', icon: '🎈',
      goalText: 'Pop the balloon.',
      intro: 'The balloon is tied down, and there is a pin waiting up high. How can you set it free?',
      steps: [
        { text: 'Pick up the <b>Candle</b> from your shelf.', check: 'pick:candle' },
        { text: 'Put it right next to the string, so the flame touches it.', check: 'place:candle' },
        { text: 'Press <b>▶ Start</b>.', check: 'start' }
      ],
      hints: ['What could break the string?', 'Fire burns rope! Put the candle so its flame touches the string.'],
      why: 'The flame heats the string until it burns through. Then nothing holds the balloon down, and the helium makes it float UP into the pin. POP!',
      parts: [
        { id: 1, type: 'hook', x: 800, y: F - 9 },
        { id: 2, type: 'balloon', x: 800, y: 520 },
        { id: 3, type: 'pin', x: 800, y: 120, angle: 90 * D }
      ],
      links: [{ type: 'rope', a: 1, b: 2 }],
      bin: { candle: 1 },
      goals: [{ type: 'pop', count: 1 }],
      solution: { parts: [{ type: 'candle', x: 815, y: F - 25 }] }
    },
    {
      id: 'scaredy', chapter: 'fire', level: 2, name: 'Scaredy mouse', icon: '🐭',
      goalText: 'Get the mouse into its hole on the right.',
      intro: 'The mouse won\u2019t move. The cat is fast asleep\u2026 for now.',
      hints: ['Mice run AWAY from cats that are awake.', 'Drop the tennis ball on the sleeping cat to wake it up.'],
      why: 'The bump woke the cat. The mouse saw an awake cat and ran the other way, as fast as it could, straight into its hole!',
      parts: [
        { id: 1, type: 'cat', x: 300, y: F - 26.5 },
        { id: 2, type: 'mouse', x: 700, y: F - 13.5 }
      ],
      bin: { tennis: 1 },
      goals: [{ type: 'zone', what: 'mouse', x: 1350, y: F - 60, w: 250, h: 60, label: 'Mouse hole' }],
      solution: { parts: [{ type: 'tennis', x: 300, y: 500 }] }
    },
    {
      id: 'dragon', chapter: 'fire', level: 2, name: 'Birthday surprise', icon: '🎂',
      goalText: 'Light all three birthday candles.',
      intro: 'The dragon\u2019s fire can\u2019t reach the birthday candles. Build it a path of fire! You only have 6 candles, so space them out.',
      hints: ['A flame can light a wick that is close to it. How far apart can two candles be and still pass the fire on?', 'Wake the dragon with the ball. Then stand candles about 4 small grid squares apart, from the end of its flame to the cake.'],
      why: 'Heat moves from hot things to cooler things. Each flame heats the next wick until it catches fire, so the fire travels along the row like dominoes.',
      parts: [
        { id: 1, type: 'dragon', x: 180, y: F - 30.5 },
        { id: 3, type: 'candle', x: 620, y: F - 25, lit: false, tag: 'cake' },
        { id: 4, type: 'candle', x: 644, y: F - 25, lit: false, tag: 'cake' },
        { id: 5, type: 'candle', x: 668, y: F - 25, lit: false, tag: 'cake' }
      ],
      bin: { tennis: 1, candle: 6 },
      forceOpts: { candle: { lit: false } },
      goals: [{ type: 'lit', tag: 'cake' }],
      solution: { parts: [{ type: 'tennis', x: 180, y: 600 }].concat([0, 1, 2, 3, 4].map(i => ({ type: 'candle', x: 395 + i * 45, y: F - 25 }))) }
    },
    {
      id: 'topple', chapter: 'fire', level: 2, name: 'Knock-on flame', icon: '🕯️',
      goalText: 'Pop the balloon.',
      intro: 'A candle is already burning, but it is too far from the balloon\u2019s string. Candles are tall and thin\u2026 they tip over!',
      hints: ['What happens to a candle\u2019s flame if the candle falls over towards the string?', 'Make a ramp so a ball rolls into the candle. A light tennis ball just bounces off: try the heavier basketball!'],
      why: 'The heavy basketball had enough MOMENTUM to push the tall, thin candle past its balance point. It fell over, its flame landed on the string, and the helium balloon floated up into the pin!',
      parts: [
        { id: 1, type: 'candle', x: 500, y: F - 25, lit: true },
        { id: 2, type: 'hook', x: 575, y: F - 9 },
        { id: 3, type: 'balloon', x: 575, y: 560 },
        { id: 4, type: 'pin', x: 575, y: 120, angle: 90 * D }
      ],
      links: [{ type: 'rope', a: 2, b: 3 }],
      bin: { wood: 1, tennis: 1, basketball: 1 },
      goals: [{ type: 'pop', count: 1 }],
      solution: { parts: [{ type: 'basketball', x: 250, y: 600 }, { type: 'wood', x: 320, y: 760, length: 280, angle: 0.62 }] }
    },

    /* ---------------- Big contraptions ---------------- */
    {
      id: 'dominoes', chapter: 'big', level: 2, name: 'Domino dash', icon: '🁢',
      goalText: 'Blow the beach ball onto the green target.',
      intro: 'When the pendulum swings, it can\u2019t reach the switch on its own. The fan needs power!',
      hints: ['Something has to carry the push from the swinging ball all the way to the switch.', 'Stand dominoes in a row from the bottom of the swing to the switch. Keep them a little closer together than they are tall.'],
      why: 'Each falling domino pushes the next one past its balance point. The energy travels along the row, all the way to the switch!',
      parts: [
        { id: 1, type: 'hook', x: 350, y: 520 },
        { id: 2, type: 'basketball', x: 80, y: 520 },
        { id: 3, type: 'switch', x: 720, y: F - 15, tag: 'main' },
        { id: 4, type: 'fan', x: 900, y: F - 35, angle: 0 },
        { id: 5, type: 'beach', x: 1000, y: F - 34.5 }
      ],
      links: [{ type: 'rope', a: 2, b: 1 }, { type: 'cord', a: 3, b: 4 }],
      bin: { domino: 10 },
      goals: [{ type: 'zone', what: 'beach', x: 1380, y: F - 110, w: 220, h: 110, label: 'Target' }],
      solution: { parts: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ type: 'domino', x: 380 + i * 42, y: F - 30 })) }
    },
    {
      id: 'chain', chapter: 'big', level: 3, name: 'Chain reaction', icon: '🏆',
      goalText: 'Pop the balloon.',
      intro: 'The ball rolls down the ramp\u2026 and then what? Build a chain of events that ends with a POP.',
      hints: ['Work backwards: what can set the balloon free? What could make that happen? And what could start THAT?', 'Dominoes carry the push from the ramp to the switch. The switch can power scissors that snip the balloon\u2019s string.'],
      why: 'One thing caused the next: rolling ball → dominoes → switch → electricity → scissors → snip → helium balloon floats up → POP! That is a chain reaction.',
      parts: [
        { id: 1, type: 'wood', x: 205, y: 723, length: Math.hypot(250, 246), angle: Math.atan2(246, 250) },
        { id: 2, type: 'tennis', x: 107, y: 597 },
        { id: 3, type: 'switch', x: 760, y: F - 15 },
        { id: 4, type: 'hook', x: 1250, y: F - 9 },
        { id: 5, type: 'balloon', x: 1250, y: 600 },
        { id: 6, type: 'pin', x: 1250, y: 120, angle: 90 * D }
      ],
      links: [{ type: 'rope', a: 4, b: 5 }],
      bin: { domino: 10, scissors: 1, cord: 1 },
      goals: [{ type: 'pop', count: 1 }],
      solution: {
        parts: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ type: 'domino', x: 400 + i * 44, y: F - 30 }))
          .concat([{ id: 100, type: 'scissors', x: 1220, y: 720, angle: 0 }]),
        links: [{ type: 'cord', a: 3, b: 100 }]
      }
    }
  ];
})(window.CL = window.CL || {});
