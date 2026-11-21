// config.js — tuning constants and the three hand-built levels for
// "Night Shift at the Meridian Archive", an original top-down stealth game.
// Tile maps are plain strings: '#' wall, '.' floor, 'C' crate (cover that
// blocks sight and movement), 'I' intel, 'P' player start, 'E' exit door.
// Guard patrol routes are tile coordinates walked in order, then reversed.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_SPEED = 150; // px per second, walking
export const PLAYER_SNEAK_SPEED = 78; // px per second, sneaking
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_SEARCH_SPEED = 92;

export const GUARD_VIEW_RANGE = 215; // px, how far a guard can see
export const GUARD_VIEW_HALF_ANGLE = 0.62; // radians, ~35 degrees each side
export const GUARD_HEAR_RADIUS = 170; // px, coin-ping hearing distance
export const PLAYER_NOISE_RADIUS = 95; // px, walking is heard this far
export const PLAYER_SNEAK_NOISE_RADIUS = 34;

export const DETECT_BASE_RATE = 0.85; // suspicion per second, point blank
export const DETECT_DECAY_RATE = 0.32; // suspicion per second while unseen
export const CHASE_LOSE_SIGHT_SECONDS = 2.6; // before a chaser gives up
export const SEARCH_SECONDS = 2.4; // looking around the last seen spot
export const CAUGHT_DISTANCE = 26; // px, guard touches the player

export const START_COINS = 5;
export const INTEL_SCORE = 100;
export const LEVEL_CLEAR_BONUS = 250;
export const GHOST_BONUS = 150; // finishing a level never spotted
export const TIME_BONUS_PER_SECOND = 2; // of the level par time left

export const LEVELS = [
  {
    name: 'Level 1 — The Reading Room',
    parSeconds: 150,
    map: [
      '########################',
      '#P....#......#....I....#',
      '#.....#..C...#....#....#',
      '#..C..#......#....#....#',
      '#.....#..C...#....#....#',
      '#..####......#....#..###',
      '#......C.....#....#....#',
      '#.####.......#....#..C.#',
      '#.#....C.....#....#....#',
      '#.#....#.....#....#....#',
      '#.#....#.....#..C......#',
      '#.#.I..#.....#....#..###',
      '#.#....#.....#....#....#',
      '#...C..#.....#....#..I.#',
      '#......#.....E....#....#',
      '########################',
    ],
    guards: [
      { waypoints: [[10, 1], [10, 7], [10, 13]], pause: 1.1 },
      { waypoints: [[19, 1], [19, 7], [19, 13]], pause: 1.4 },
    ],
    briefing:
      'Slip past the night watch, lift the three archive files, and leave through the green door. Crates block a guard\u2019s view — stay behind them.',
  },
  {
    name: 'Level 2 — The Vault Corridor',
    parSeconds: 180,
    map: [
      '########################',
      '#..I...#.....#....#..I.#',
      '#......#..C..#....#....#',
      '#.##...#.....#..C.#....#',
      '#.#..........#....#..C.#',
      '#.#.C..#..####....#....#',
      '#.#....#..#..#.........#',
      '#.#....#..#..#..C.#....#',
      '#...C..#..#..#....#..###',
      '#.##...#.....#....#....#',
      '#.#.......C..#....#..C.#',
      '#.#.I..#..........#..I.#',
      '#.#....#..C..#....#....#',
      '#P.....#.....#....#....#',
      '#..C...#..C..E....#....#',
      '########################',
    ],
    guards: [
      { waypoints: [[9, 1], [9, 7], [9, 13]], pause: 1.0 },
      { waypoints: [[19, 1], [19, 6], [19, 12]], pause: 1.2 },
      { waypoints: [[5, 1], [5, 5], [5, 9]], pause: 1.5 },
    ],
    briefing:
      'Three guards now, and the vault wing is tighter. A thrown coin (click) draws a guard to the spot — spend your five coins wisely.',
  },
  {
    name: 'Level 3 — The Director\u2019s Wing',
    parSeconds: 210,
    map: [
      '########################',
      '#..I...#....I#....#..I.#',
      '#......#.....#.........#',
      '#.C.........C#....#....#',
      '#......#.....#..C.#....#',
      '#.####.#..........#....#',
      '#.#....#.....#..C.#....#',
      '#.#.C..#.....#....#..###',
      '#.#....#.....#.........#',
      '#.#.......C..#....#....#',
      '#...C..#.....#....#..C.#',
      '#.#....#..........#....#',
      '#.#.I..#.....#..I.#....#',
      '#P.....#.....#....#....#',
      '#..C...#.....E....#..I.#',
      '########################',
    ],
    guards: [
      { waypoints: [[11, 1], [11, 7], [11, 13]], pause: 0.9 },
      { waypoints: [[19, 1], [19, 7], [19, 13]], pause: 1.1 },
      { waypoints: [[6, 2], [6, 6], [6, 10]], pause: 1.3 },
      { waypoints: [[14, 2], [17, 2]], pause: 1.6 },
    ],
    briefing:
      'The director\u2019s wing: four guards, six files, and a patrol that crosses the hall. Hold Shift to sneak — slow, quiet, and much harder to spot.',
  },
];
