// render.js — draws the whole night archive on one canvas: checkerboard
// floor, walls and crates, intel files, the exit door, each guard with its
// vision cone, and the player. Cones are yellow when calm, orange when the
// guard is suspicious, red when it is chasing.

import { GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE, TILE, VIEW_H, VIEW_W } from './config.js';
import { GUARD_STATES } from './guards.js';
import { visionPolygon } from './level.js';

function coneColor(guard) {
  if (guard.state === GUARD_STATES.CHASE) return 'rgba(235, 64, 52, 0.34)';
  if (guard.alert >= 0.35) return 'rgba(235, 140, 40, 0.30)';
  return 'rgba(240, 214, 90, 0.20)';
}

function drawFloor(ctx, level) {
  for (let y = 0; y < level.def.map.length; y += 1) {
    for (let x = 0; x < level.def.map[y].length; x += 1) {
      const ch = level.def.map[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#232a3d';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = '#2e3850';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#3a3230' : '#362f2d';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
  }
}

function drawCrates(ctx, level) {
  for (const key of level.crates) {
    const [x, y] = key.split(',').map(Number);
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.strokeStyle = '#8a6234';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 5);
    ctx.lineTo(px + TILE - 5, py + TILE - 5);
    ctx.moveTo(px + TILE - 5, py + 5);
    ctx.lineTo(px + 5, py + TILE - 5);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawIntel(ctx, level, time) {
  for (const item of level.intel) {
    if (item.taken) continue;
    const cx = (item.tx + 0.5) * TILE;
    const cy = (item.ty + 0.5) * TILE + Math.sin(time / 350 + item.tx) * 2;
    const pulse = 0.55 + 0.45 * Math.sin(time / 300);
    ctx.save();
    ctx.shadowColor = '#7fe7ff';
    ctx.shadowBlur = 12 + pulse * 8;
    ctx.fillStyle = '#bfefff';
    ctx.fillRect(cx - 9, cy - 12, 18, 24);
    ctx.fillStyle = '#1d4b63';
    ctx.fillRect(cx - 6, cy - 8, 12, 2);
    ctx.fillRect(cx - 6, cy - 3, 12, 2);
    ctx.fillRect(cx - 6, cy + 2, 8, 2);
    ctx.restore();
  }
}

function drawExit(ctx, level, unlocked, time) {
  const { x, y } = level.exit;
  const pulse = unlocked ? 0.6 + 0.4 * Math.sin(time / 260) : 0.25;
  ctx.save();
  ctx.fillStyle = unlocked ? `rgba(80, 220, 120, ${0.25 + pulse * 0.3})` : 'rgba(120, 120, 120, 0.25)';
  ctx.fillRect(x - TILE / 2, y - TILE / 2, TILE, TILE);
  ctx.strokeStyle = unlocked ? '#4ade80' : '#888888';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - TILE / 2 + 3, y - TILE / 2 + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = unlocked ? '#bbf7d0' : '#cccccc';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unlocked ? 'EXIT' : 'LOCKED', x, y);
  ctx.restore();
}

function drawVisionCone(ctx, level, guard) {
  const poly = visionPolygon(level, guard.x, guard.y, guard.facing, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_RANGE);
  ctx.save();
  ctx.fillStyle = coneColor(guard);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  // Body: a night-watch guard in a navy uniform, facing its patrol direction.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.facing);
  ctx.fillStyle = '#1f3a93';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9a441';
  ctx.beginPath();
  ctx.arc(8, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5d76e';
  ctx.fillRect(10, -3, 8, 6);
  ctx.restore();

  // Alert mark above the head: "?" while suspicious, "!" while chasing.
  if (guard.alert >= 0.35 || guard.state === GUARD_STATES.CHASE) {
    const mark = guard.state === GUARD_STATES.CHASE ? '!' : '?';
    const bob = Math.sin(time / 180) * 2;
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = guard.state === GUARD_STATES.CHASE ? '#ff5252' : '#ffb020';
    ctx.fillText(mark, guard.x, guard.y - 26 + bob);
    ctx.restore();
  }

  // Thin suspicion arc around the guard while it is noticing the player.
  if (guard.alert > 0.05 && guard.alert < 1) {
    ctx.save();
    ctx.strokeStyle = guard.alert >= 0.35 ? '#ffb020' : '#f0d65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + guard.alert * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.facing);
  // Wren the infiltrator: a hooded figure in dark teal, crouched when sneaking.
  const r = player.sneaking ? 11 : 13;
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14b8a6';
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ccfbf1';
  ctx.fillRect(8, -2.5, 7, 5);
  ctx.restore();

  if (player.sneaking) {
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#99f6e4';
    ctx.fillText('SNEAKING', player.x, player.y - 22);
    ctx.restore();
  }
  void time;
}

function drawCoinPing(ctx, ping) {
  const age = (performance.now() - ping.born) / 1000;
  if (age > 1.2) return;
  const radius = 8 + age * 90;
  ctx.save();
  ctx.strokeStyle = `rgba(245, 215, 110, ${1 - age / 1.2})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f5d76e';
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderWorld(ctx, state, time) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, state.level);
  drawExit(ctx, state.level, state.exitUnlocked, time);
  drawIntel(ctx, state.level, time);
  drawCrates(ctx, state.level);
  for (const guard of state.guards) drawVisionCone(ctx, state.level, guard);
  for (const ping of state.pings) drawCoinPing(ctx, ping);
  for (const guard of state.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, state.player, time);

  // Night vignette: the archive is dark, and the light pools where it is safe.
  const gradient = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.35,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.85,
  );
  gradient.addColorStop(0, 'rgba(6, 8, 20, 0)');
  gradient.addColorStop(1, 'rgba(6, 8, 20, 0.28)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}
