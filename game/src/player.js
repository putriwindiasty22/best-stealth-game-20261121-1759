// player.js — the infiltrator: WASD / arrow movement, Shift to sneak, and
// the coin ping. Sneaking is slower and quieter, and much harder to spot.

import { PLAYER_NOISE_RADIUS, PLAYER_SNEAK_NOISE_RADIUS, PLAYER_SNEAK_SPEED, PLAYER_SPEED } from './config.js';
import { moveCircle } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: 13,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    coins: 5,
    stepTimer: 0,
  };
}

export function updatePlayer(level, player, input, dt, events) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;

  player.moving = mx !== 0 || my !== 0;
  player.sneaking = Boolean(input.sneak);
  if (!player.moving) return;

  const len = Math.hypot(mx, my);
  const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
  const dx = (mx / len) * speed * dt;
  const dy = (my / len) * speed * dt;
  player.facing = Math.atan2(dy, dx);
  moveCircle(level, player, dx, dy, player.radius);

  player.stepTimer -= dt;
  if (player.stepTimer <= 0) {
    player.stepTimer = player.sneaking ? 0.55 : 0.34;
    events.push({ type: 'playerStep', sneaking: player.sneaking });
  }
}

export function noiseRadius(player) {
  return player.sneaking ? PLAYER_SNEAK_NOISE_RADIUS : PLAYER_NOISE_RADIUS;
}

// A thrown coin lands at the clicked floor point and rings out. Guards in
// earshot leave their patrol to investigate the noise.
export function throwCoin(player, x, y) {
  if (player.coins <= 0) return null;
  player.coins -= 1;
  return { x, y, born: performance.now(), radius: 0 };
}
