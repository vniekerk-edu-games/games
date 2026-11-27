# Contraption Labs ⚙️

A physics playground for curious kids aged 7–12, inspired by classic
chain-reaction puzzle games.

* **Stage 1 – Physics:** balls that fall, bounce, roll and collide differently.
* **Stage 2 – Build & Run:** arrange parts while everything is frozen, press
  **▶ Start** to watch, press **■ Stop** to return to exactly what you built.

## Play it locally
Open `index.html` in Edge or Chrome. No install or build step needed.

## Put it on GitHub Pages
1. Create a repository and upload **everything in this folder** (keep the folder structure, including `.nojekyll`).
2. Repository **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. After a minute the game is live at `https://<username>.github.io/<repository>/`.

## How it plays
| Mode | What happens |
|---|---|
| 🛠 **Build** (blueprint grid, Bright Blue frame) | Nothing moves. Place, drag, turn, stretch and remove parts. Parts can't overlap (red outline + 🚫). Balls dropped on a plank settle on top. Every change can be undone and is autosaved in the browser. |
| ▶ **Run** (Play Orange frame) | Physics on. In the sandbox you can still throw balls and add things for fun — they vanish when you press Stop. |
| ■ **Stop** | Back to your build, exactly as it was. If Trails were on, the last run's paths stay faintly visible so you can compare your next try. |

## Controls
| Action | How |
|---|---|
| Start / Stop | **▶ Start** button or **Enter** (also **R** to stop) |
| Pause while running | **⏸** button or **Space** |
| Place a part | Pick it on the shelf, click in the lab (a see-through preview shows where it will go) |
| Move | Drag it |
| Throw a ball (while running) | Flick it and let go |
| Turn / stretch a plank | Drag its yellow handle (Shift = no snapping), mouse wheel, or **Q / E** |
| Undo / redo | **Ctrl+Z** / **Ctrl+Y** |
| Snap to grid | **🧲 Snap** or **G** (10 cm grid, 5° angles) |
| Save / open a build | **💾 Save** (Ctrl+S) downloads a `.json` file; **📂 Open** loads one |
| Slow motion / trails | **S** / **T** |
| Full screen | **F** or the button |
| Remove selected | **Delete** |

## Project structure
```
index.html            page + script order
css/style.css         layout and look (app colour scheme at the top)
js/theme.js           colour scheme for the canvas
js/engine/            PHYSICS + DATA (no drawing, no DOM — testable in Node)
  catalog.js          every ball & surface as tunable data  ← tune "feel" here
  bodies.js           Ball (moving circle) and Block (static plank)
  collide.js          collision detection
  world.js            fixed-step impulse solver (deterministic)
  layout.js           the saved-build format (also the future level format)
js/render/
  art.js              how each part is drawn
  renderer.js         lab, blueprint mode, trails, previews, selection
js/sandbox/
  presets.js          ready-made experiments
  sandbox.js          build/run modes, placement rules, undo, input
  ui.js               shelf, toolbar, info card, keys, save/open, full screen
js/main.js            start-up
tests/
  run-tests.js        physics checks:        node tests/run-tests.js
  smoke-ui.js         whole game, mock browser: node tests/smoke-ui.js
```

## Build file format (`.json`)
```json
{
  "format": "contraption-labs/layout",
  "version": 1,
  "parts": [
    { "type": "wood", "x": 800, "y": 500, "length": 260, "angle": 0, "locked": true },
    { "type": "tennis", "x": 800, "y": 481 }
  ]
}
```
Units: 100 px = 1 m; the lab is 1600 × 900 with the floor at y = 860; angles in radians.
`"locked": true` bolts a part down (can't be moved or removed) — used by levels.
The sandbox also supports a limited **parts bin** (`{ bin: { tennis: 2 } }`) ready for levels.

## Physics notes
* Scale: 100 px = 1 m, gravity 9.81 m/s². The ruler on the left is true to that scale.
* 120 steps per second × 4 substeps; the same build always gives the same result.
* Ball-to-surface bounce = ball bounce × surface bounce. Ball-to-ball uses the springier ball.
* Friction makes balls roll (and spin) on wood and slide on ice.
