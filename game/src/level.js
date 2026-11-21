// level.js — turns a level's tile map into walls, crates, intel, the player
// start and the exit, and answers collision and line-of-sight questions.
// A tile blocks sight and movement when it is a wall ('#') or a crate ('C').

import { COLS, ROWS, TILE } from './config.js';

export function parseLevel(def) {
  const walls = new Set();
  const crates = new Set();
  const intel = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 13.5, y: TILE * 15.5 };

  def.map.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      const key = `${x},${y}`;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === 'I') intel.push({ tx: x, ty: y, taken: false });
      else if (ch === 'P') playerStart = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  });

  return { def, walls, crates, intel, playerStart, exit };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.walls.has(`${tx},${ty}`) ? '#' : level.crates.has(`${tx},${ty}`) ? 'C' : '.';
}

export function blocksMovement(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

export function blocksSight(level, px, py) {
  return blocksMovement(level, px, py);
}

// Circle-vs-tile collision: try the move on each axis separately so the
// player slides along walls instead of sticking to them.
export function moveCircle(level, pos, dx, dy, radius) {
  const nx = pos.x + dx;
  if (
    !blocksMovement(level, nx + Math.sign(dx) * radius, pos.y - radius * 0.7) &&
    !blocksMovement(level, nx + Math.sign(dx) * radius, pos.y + radius * 0.7) &&
    !blocksMovement(level, nx + Math.sign(dx) * radius, pos.y)
  ) {
    pos.x = nx;
  }
  const ny = pos.y + dy;
  if (
    !blocksMovement(level, pos.x - radius * 0.7, ny + Math.sign(dy) * radius) &&
    !blocksMovement(level, pos.x + radius * 0.7, ny + Math.sign(dy) * radius) &&
    !blocksMovement(level, pos.x, ny + Math.sign(dy) * radius)
  ) {
    pos.y = ny;
  }
  return pos;
}

// Does a straight line between two points cross a wall or a crate?
// Sampled finely enough that no thin wall is ever skipped.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (blocksSight(level, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// The cone of floor a guard can actually see: ray-cast in small angular
// steps and stop each ray at the first blocking tile. Used only for drawing.
export function visionPolygon(level, gx, gy, facing, halfAngle, range) {
  const points = [{ x: gx, y: gy }];
  const rays = 26;
  for (let i = 0; i <= rays; i += 1) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    let d = 8;
    while (d < range) {
      if (blocksSight(level, gx + Math.cos(a) * d, gy + Math.sin(a) * d)) break;
      d += 6;
    }
    points.push({ x: gx + Math.cos(a) * d, y: gy + Math.sin(a) * d });
  }
  return points;
}
