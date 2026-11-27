# Contraption Labs ⚙️

A physics playground for curious kids aged 7–12, inspired by classic
chain-reaction puzzle games.

* **Stage 1 – Physics:** balls that fall, bounce, roll and collide differently.
* **Stage 2 – Build & Run:** build while everything is frozen, press **▶ Start**, press **■ Stop** to get your build back.
* **Stage 3 – Machines & critters:** gears, belts, conveyor belts, a hamster wheel, motors,
  switches, cords, fans, a see-saw, and a mouse, a cat and some cheese.
* **Stage 4 – Things that tip, hang, snip and pop:** dominoes, crates, buckets, ropes, hooks,
  pulleys, scissors, pins and candles.

## Play it locally
Open `index.html` in Edge or Chrome. No install or build step needed.

## Put it on GitHub Pages
1. Create a repository and upload **everything in this folder** (keep the folder structure, including `.nojekyll`).
2. Repository **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. After a minute the game is live at `https://<username>.github.io/<repository>/`.

## The parts
| Part | What it does |
|---|---|
| Small / big gear | Gears that touch **mesh** (they click together when placed close). Touching gears turn opposite ways; big → small turns faster (teeth 20 : 10). Three gears in a triangle **jam**. |
| Belt (tool) | Click one wheel, then another. Both turn the same way at the same speed. Click the same pair again to remove it. |
| Conveyor belt | Its left wheel (blue ring) takes a belt. The top carries things along; faster wheel = faster belt. |
| Hamster wheel | Asleep until something bumps it, then the hamster runs and the wheel turns. Can start running (setting). |
| Electric motor | Turns when powered by a switch that is ON. Clockwise or anticlockwise (setting). |
| Power switch | Flips ON/OFF when bumped (or clicked while running). Starts ON or OFF (setting). |
| Power cord (tool) | Joins a switch to motors and fans. Glows orange when live. |
| Fan | Blows air: big, light things fly; heavy things barely move. Turn it to blow up. Direction setting. |
| See-saw | A lever on a pin. Drop something heavy on one end! Stretchable. |
| Mouse | Smells cheese on its own level and runs to it. Runs away from awake cats. Can't walk on ice. |
| Cat | Sleeps until a mouse comes close or something bumps it, then chases mice. |
| Cheese | Mice love it. It slides rather than rolls. |

| Domino / crate / bucket | Solid things that slide, **tip over** and stack. Tall + thin tips easily (domino); wide + heavy hardly tips (crate). Buckets hold things. **Q / E** tilts them in build mode. |
| Rope (tool) | Click a thing, then a hook or another thing. For a pulley: thing → pulley → thing. Ropes only pull; they are exactly as long as you draw them. Click a rope and press Delete to remove it. |
| Hook | Holds one end of a rope still (pendulums!). |
| Pulley | One side goes down, the other goes up. The heavier side wins. |
| Scissors | Snip ropes at their pointy end when bumped or when a switch powers them (cord). |
| Pin | Pops balloons that touch its point. Turn it to aim. |
| Candle | Burns through ropes (about 0.6 s) and pops balloons. Can start lit or out. |

Machines stay put while the machine runs (balls, planks and critters can still be thrown and moved in the sandbox).

## Controls
| Action | How |
|---|---|
| Start / Stop | **▶ Start** button or **Enter** (also **R** to stop) |
| Pause while running | **⏸** button or **Space** |
| Find a part | Tap a shelf category to fold it open (one opens at a time) |
| Place a part | Pick it on the shelf, click in the lab. What you're holding shows under the ✋ button |
| Put it down / back to Move | **✋ Move** button (top of the shelf), **right-click**, or **Esc** |
| Settings (switch, fan, motor, hamster, cat) | Select the part in build mode; buttons appear on the info card |
| Turn / stretch | Drag the yellow handle (Shift = no snapping), mouse wheel, or **Q / E** |
| Undo / redo | **Ctrl+Z** / **Ctrl+Y** |
| Snap to grid | **🧲 Snap** or **G** |
| Save / open a build | **💾 Save** (Ctrl+S) / **📂 Open** |
| Slow motion / trails | **S** / **T** |
| Full screen | **F** or the button |
| Remove selected | **Delete** |

## Project structure
```
index.html              page + script order
css/style.css           layout and look (app colour scheme at the top)
js/theme.js             colour scheme for the canvas
js/engine/              PHYSICS + DATA (no drawing — testable in Node)
  catalog.js            every part as tunable data   ← tune "feel" here
  bodies.js             Ball (moves freely) and Block (fixed; may turn or swing)
  collide.js            collision detection
  world.js              fixed-step impulse solver (deterministic)
  ropes.js              ropes and pulleys (pull-only constraints)
  machines.js           drive network (gears, belts), power, switches, fans, snip/pop/burn
  creatures.js          mouse & cat brains
  layout.js             the saved-build format (also the future level format)
js/render/
  art.js                balls, planks, icons
  art-machines.js       machines, belts, cords, wind
  art-critters.js       mouse, cat, cheese
  art-ropes.js          dominoes, crates, buckets, ropes, pulleys, scissors, pins, candles
  renderer.js           lab, trails, bubbles, selection
js/sandbox/
  presets.js            ready-made experiments
  sandbox.js            build/run modes, placement, belts/cords, undo, input
  ui.js                 shelf, toolbar, info card, keys, save/open, full screen
js/main.js              start-up
tests/
  run-tests.js          ball physics            node tests/run-tests.js
  machine-tests.js      machines and critters   node tests/machine-tests.js
  stage4-tests.js       boxes, ropes, pulleys    node tests/stage4-tests.js
  smoke-ui.js           whole game, mock browser node tests/smoke-ui.js
tools/bundle.js         one-file source bundle (pack / unpack)
```

## One-file source bundle
`contraption-labs-source.txt` holds every project file in one plain-text file (useful where
zip files can't be uploaded). Rebuild the folder with `node tools/bundle.js unpack contraption-labs-source.txt my-folder`,
or make a fresh bundle with `node tools/bundle.js pack`.

## Build file format (`.json`, version 2)
```json
{
  "format": "contraption-labs/layout", "version": 2,
  "parts": [
    { "id": 1, "type": "switch", "x": 160, "y": 845, "on": true },
    { "id": 2, "type": "motor", "x": 300, "y": 520, "flip": false },
    { "id": 3, "type": "gearLarge", "x": 600, "y": 520, "locked": true }
  ],
  "links": [ { "type": "cord", "a": 1, "b": 2 }, { "type": "belt", "a": 2, "b": 3 } ]
}
```
Units: 100 px = 1 m; the lab is 1600 × 900 with the floor at y = 860; angles in radians.
`"locked": true` bolts a part down (used by levels). Stage 2 files (version 1) still open.
