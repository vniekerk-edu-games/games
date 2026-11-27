# Contraption Labs ⚙️

A physics playground for curious kids aged 7–12, inspired by classic
chain-reaction puzzle games. **Stage 1: the Sandbox** — a free-play lab for
feeling how different balls fall, bounce, roll and collide.

## Play it locally
Open `index.html` in Edge or Chrome. No install or build step needed.

## Put it on GitHub Pages
1. Create a repository and upload **everything in this folder** (keep the folder structure).
2. Repository **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`.
3. After a minute the game is live at `https://<username>.github.io/<repository>/`.

## Controls
| Action | How |
|---|---|
| Place a part | Pick it on the shelf, click in the lab |
| Move | Drag it |
| Throw a ball | Flick it and let go |
| Turn / stretch a plank | Drag its yellow handle (hold Shift for no snapping), mouse wheel, or **Q / E** |
| Pause / play | **Space** |
| Reset experiment | **R** |
| Slow motion | **S** |
| Trails + bounce heights | **T** |
| Full screen | **F** or the button |
| Remove selected | **Delete** |

## Project structure
```
index.html            page + script order
css/style.css         layout and look
js/engine/            PHYSICS (no drawing, no DOM — testable in Node)
  catalog.js          every ball & surface as tunable data  ← tune "feel" here
  bodies.js           Ball (moving circle) and Block (static plank)
  collide.js          collision detection
  world.js            fixed-step impulse solver (deterministic)
js/render/
  art.js              how each part is drawn
  renderer.js         lab background, ruler, trails, selection
js/sandbox/
  presets.js          ready-made experiments (same data shape future levels will use)
  sandbox.js          game loop and mouse/touch interaction
  ui.js               shelf, info card, toolbar, keys, full screen
js/main.js            start-up
tests/
  run-tests.js        physics checks:  node tests/run-tests.js
  smoke-ui.js         whole game in a mock browser:  node tests/smoke-ui.js
```

## Physics notes
* Scale: 100 px = 1 m, gravity 9.81 m/s². The ruler on the left is true to that scale.
* 120 steps per second × 4 substeps; identical start = identical result.
* Ball-to-surface bounce = ball bounce × surface bounce. Ball-to-ball uses the springier ball.
* Friction makes balls roll (and spin) on wood and slide on ice.
