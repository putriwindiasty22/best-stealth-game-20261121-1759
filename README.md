# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/putriwindiasty22/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/putriwindiasty22/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Night Shift at the Meridian Archive** — an original top-down 2D stealth game. You are Wren, an infiltrator in the city archive after dark. Lift every intel file, slip past the night watch, and leave through the green exit door — unseen.

Three hand-built wings (The Reading Room, The Vault Corridor, The Director's Wing), each with its own patrol routes to learn. Guards walk waypoints, pause to scan, and carry visible vision cones: yellow while calm, orange while suspicious, red while chasing. Crates block their sight — and yours. A detection meter fills when you are seen; break line of sight and the alarm fades, the guard searches your last seen spot, then returns to patrol. A thrown coin draws a nearby guard away to investigate. Sneak to move slower, quieter, and much harder to spot. Score comes from intel, time bonuses, and a ghost bonus for clearing a wing never spotted.

## How to play

- **Goal:** collect every glowing intel file in the wing, then reach the green EXIT door.
- **Guards:** stay out of their vision cones. Being seen fills the alert meter — at full, the guard chases you. If one touches you, you are caught and the wing restarts.
- **Cover:** walls and crates block a guard's line of sight. Wait behind a crate for a patrol to pass.
- **Coins:** you carry 5 coins. Click anywhere on the floor to toss one there; guards in earshot go to listen.
- **Sneak:** hold Shift to move slower and quieter — detection builds at less than half the rate.

## Controls

- **WASD / arrow keys** — move
- **Shift** — sneak
- **Click** — toss a coin to that spot (distracts nearby guards)
- **R** — restart the level
- **M** — mute / unmute sound
- **Esc** — pause
- **Enter** — start, continue, retry

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is plain static files under `game/` — no build step, no network requests, and all sound is synthesized with WebAudio oscillators.

## Files

- `game/index.html` + `game/src/` — the game (config, level maps, guard AI, player, renderer, input, audio, main loop)
- `main.ts` — the make.fun hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — real renders of the game running in a browser
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

---

<sub>Entered on [make.fun](https://make.fun/?ref=j9d1a2d9&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
