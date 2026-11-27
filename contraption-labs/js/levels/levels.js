/* Contraption Labs — levels.js
 * Every puzzle is plain data. To add a puzzle, copy one of these objects,
 * change it, and add it to the list. Nothing else needs to change.
 *
 *   id        short unique name (used to remember progress)
 *   name, icon
 *   goalText  one sentence shown on the banner: what has to happen
 *   intro     a friendly sentence for the start card
 *   hint      shown when the player taps 💡 Hint
 *   why       the science, shown when the puzzle is solved
 *   parts     the lab as it starts (layout format, see engine/layout.js).
 *             All of these are bolted down: the player can't move them.
 *   links     belts / cords / ropes that are already fitted (also fixed)
 *   bin       the parts the player may add, e.g. { wood: 1, rope: 1 }
 *   forceOpts settings for parts from the bin, e.g. { candle: { lit: false } }
 *   goals     what must be true to win (see engine/goals.js)
 *
 * Coordinates: 100 px = 1 m. The lab is 1600 × 900; the floor is at y = 860.
 */
(function (CL) {
  'use strict';
  const F = CL.WORLD.floorY;

  CL.LEVELS = [
    {
      id: 'ramp', name: 'Roll it home', icon: '🎳',
      goalText: 'Get the bowling ball onto the green target.',
      intro: 'The bowling ball will drop straight down. Can you send it all the way across the lab?',
      hint: 'Put the plank under the ball and tilt it downhill to the right. A ramp turns falling into rolling!',
      why: 'Gravity pulls the ball DOWN. The ramp pushes back on it at an angle, so some of that falling turns into rolling sideways. A heavy ball keeps rolling for a long way.',
      parts: [
        { id: 1, type: 'bowling', x: 300, y: 200 }
      ],
      bin: { wood: 1 },
      goals: [{ type: 'zone', what: 'bowling', x: 1380, y: F - 60, w: 220, h: 60, label: 'Target' }]
    },
    {
      id: 'hot', name: 'Hot stuff', icon: '🎈',
      goalText: 'Pop the balloon.',
      intro: 'The balloon is tied down, and there is a pin waiting up high. How can you set it free?',
      hint: 'Fire burns rope! Put the candle right next to the string.',
      why: 'The flame heats the string until it burns through. Then nothing holds the balloon down, and the helium makes it float UP into the pin. POP!',
      parts: [
        { id: 1, type: 'hook', x: 800, y: F - 9 },
        { id: 2, type: 'balloon', x: 800, y: 520 },
        { id: 3, type: 'pin', x: 800, y: 120, angle: Math.PI / 2 }
      ],
      links: [{ type: 'rope', a: 1, b: 2 }],
      bin: { candle: 1 },
      goals: [{ type: 'pop', count: 1 }]
    },
    {
      id: 'dominoes', name: 'Domino dash', icon: '🁢',
      goalText: 'Blow the beach ball onto the green target.',
      intro: 'When the pendulum swings, it can\u2019t reach the switch on its own. The fan needs power!',
      hint: 'Stand dominoes in a row from the bottom of the swing to the switch. Keep them a little closer together than they are tall.',
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
      goals: [{ type: 'zone', what: 'beach', x: 1380, y: F - 110, w: 220, h: 110, label: 'Target' }]
    },
    {
      id: 'mouse', name: 'Feed the mouse', icon: '🧀',
      goalText: 'Feed the cheese to the mouse.',
      intro: 'The cheese is up on the conveyor belt, too high for the mouse to smell. Get the machine going!',
      hint: 'Power goes: switch → cord → motor. Turning goes: motor → belt → conveyor wheel. And something has to flip that switch\u2026',
      why: 'Electricity made the motor turn. The belt passed the turning on to the conveyor, which carried the cheese off the end. Once the cheese landed on the floor, the mouse could smell it!',
      parts: [
        { id: 1, type: 'switch', x: 200, y: F - 15 },
        { id: 2, type: 'motor', x: 420, y: 560 },
        { id: 3, type: 'conveyor', x: 900, y: 470, length: 480, angle: 0 },
        { id: 4, type: 'cheese', x: 800, y: 470 - 12 - 12.5 },
        { id: 5, type: 'mouse', x: 1380, y: F - 13.5 }
      ],
      bin: { cord: 1, belt: 1, tennis: 1 },
      goals: [{ type: 'eat', count: 1 }]
    },
    {
      id: 'lift', name: 'Heavy lifting', icon: '🏗️',
      goalText: 'Lift the crate up to the green target.',
      intro: 'The crate is far too heavy to throw. But a pulley can lift it\u2026',
      hint: 'Rope tool: tap the bucket, then the pulley, then the crate. Then drop something HEAVY into the bucket.',
      why: 'A pulley changes the direction of a pull. The heavy bowling ball in the bucket pulls DOWN on one side, so the rope pulls the crate UP on the other side.',
      parts: [
        { id: 1, type: 'pulley', x: 800, y: 160 },
        { id: 2, type: 'bucket', x: 766, y: 520 },
        { id: 3, type: 'crate', x: 834, y: F - 26.5 }
      ],
      bin: { rope: 1, bowling: 1 },
      goals: [{ type: 'zone', what: 'crate', x: 774, y: 300, w: 120, h: 280, label: 'Lift it here' }]
    },
    {
      id: 'dragon', name: 'Birthday surprise', icon: '🎂',
      goalText: 'Light all three birthday candles.',
      intro: 'The dragon\u2019s fire can\u2019t reach the birthday candles. Build it a path of fire!',
      hint: 'Wake the dragon with a ball. Then put a row of candles, about two small squares apart, from its flame to the cake.',
      why: 'Heat moves from hot things to cooler things. Each flame heats the next wick until it catches fire, so the fire travels along the row like dominoes.',
      parts: [
        { id: 1, type: 'dragon', x: 180, y: F - 30.5 },
        { id: 3, type: 'candle', x: 640, y: F - 25, lit: false, tag: 'cake' },
        { id: 4, type: 'candle', x: 664, y: F - 25, lit: false, tag: 'cake' },
        { id: 5, type: 'candle', x: 688, y: F - 25, lit: false, tag: 'cake' }
      ],
      bin: { tennis: 1, candle: 12 },
      forceOpts: { candle: { lit: false } },
      goals: [{ type: 'lit', tag: 'cake' }]
    }
  ];
})(window.CL = window.CL || {});
