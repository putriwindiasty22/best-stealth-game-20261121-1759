// guards.js — guard patrol AI: walk waypoints, pause and scan, notice the
// player inside the vision cone, chase when fully alerted, search the last
// seen spot, then calm down and return to patrol. Alert always decays when
// the guard cannot see the player, so a near miss can be recovered from.

import {
  CAUGHT_DISTANCE,
  CHASE_LOSE_SIGHT_SECONDS,
  DETECT_BASE_RATE,
  DETECT_DECAY_RATE,
  GUARD_CHASE_SPEED,
  GUARD_HEAR_RADIUS,
  GUARD_PATROL_SPEED,
  GUARD_SEARCH_SPEED,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  SEARCH_SECONDS,
  TILE,
} from './config.js';
import { hasLineOfSight, moveCircle } from './level.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  CHASE: 'chase',
  SEARCH: 'search',
};

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export function createGuard(spec, index) {
  const [sx, sy] = spec.waypoints[0];
  return {
    id: index,
    x: (sx + 0.5) * TILE,
    y: (sy + 0.5) * TILE,
    facing: Math.PI / 2,
    waypoints: spec.waypoints.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE })),
    waypointIndex: 1 % spec.waypoints.length,
    waypointDirection: 1,
    pause: spec.pause ?? 1.2,
    pauseTimer: 0,
    scanAngle: 0,
    state: GUARD_STATES.PATROL,
    alert: 0, // 0 calm .. 1 fully alerted
    lastSeen: null,
    loseSightTimer: 0,
    searchTimer: 0,
    stepTimer: 0,
    heardPing: null,
  };
}

// Can this guard see the player right now? Inside the cone, in range, with
// a clear line of sight, and not hidden behind a crate.
export function guardSeesPlayer(level, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return false;
  if (Math.abs(angleDiff(angleTo(guard.x, guard.y, player.x, player.y), guard.facing)) > GUARD_VIEW_HALF_ANGLE) {
    return false;
  }
  return hasLineOfSight(level, guard.x, guard.y, player.x, player.y);
}

// How fast suspicion grows while the player is visible: closer and louder
// is worse; sneaking cuts it by more than half.
export function detectionRate(guard, player, dist) {
  const closeness = 1 - dist / GUARD_VIEW_RANGE;
  let rate = DETECT_BASE_RATE * (0.35 + 0.65 * closeness);
  if (player.sneaking) rate *= 0.42;
  if (player.moving) rate *= 1.25;
  return rate;
}

export function updateGuard(level, guard, player, dt, events) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const sees = guardSeesPlayer(level, guard, player);

  if (sees) {
    guard.alert = Math.min(1, guard.alert + detectionRate(guard, player, dist) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseSightTimer = 0;
    if (guard.alert >= 1 && guard.state !== GUARD_STATES.CHASE) {
      guard.state = GUARD_STATES.CHASE;
      events.push({ type: 'spotted', guard });
    } else if (guard.alert >= 0.35 && guard.state === GUARD_STATES.PATROL) {
      guard.state = GUARD_STATES.SUSPICIOUS;
    }
  } else {
    guard.alert = Math.max(0, guard.alert - DETECT_DECAY_RATE * dt);
    if (guard.state === GUARD_STATES.SUSPICIOUS && guard.alert < 0.2) {
      guard.state = GUARD_STATES.PATROL;
    }
  }

  // A coin ping pulls a nearby guard to the noise.
  if (guard.heardPing) {
    const ping = guard.heardPing;
    guard.heardPing = null;
    if (guard.state !== GUARD_STATES.CHASE) {
      guard.state = GUARD_STATES.SEARCH;
      guard.lastSeen = { x: ping.x, y: ping.y };
      guard.searchTimer = SEARCH_SECONDS;
    }
  }

  switch (guard.state) {
    case GUARD_STATES.PATROL:
      updatePatrol(level, guard, dt);
      break;
    case GUARD_STATES.SUSPICIOUS: {
      // Turn and stare at where the player was glimpsed, creeping closer.
      const target = guard.lastSeen ?? { x: guard.x, y: guard.y };
      guard.facing = turnToward(guard.facing, angleTo(guard.x, guard.y, target.x, target.y), 2.4 * dt);
      stepToward(level, guard, target, GUARD_PATROL_SPEED * 0.55, dt, events);
      break;
    }
    case GUARD_STATES.CHASE: {
      if (sees) {
        guard.facing = turnToward(guard.facing, angleTo(guard.x, guard.y, player.x, player.y), 6 * dt);
        stepToward(level, guard, player, GUARD_CHASE_SPEED, dt, events);
        if (dist < CAUGHT_DISTANCE) events.push({ type: 'caught', guard });
      } else {
        guard.loseSightTimer += dt;
        if (guard.loseSightTimer >= CHASE_LOSE_SIGHT_SECONDS) {
          guard.state = GUARD_STATES.SEARCH;
          guard.searchTimer = SEARCH_SECONDS;
        } else if (guard.lastSeen) {
          stepToward(level, guard, guard.lastSeen, GUARD_CHASE_SPEED, dt, events);
        }
      }
      break;
    }
    case GUARD_STATES.SEARCH: {
      const target = guard.lastSeen ?? { x: guard.x, y: guard.y };
      const arrived = stepToward(level, guard, target, GUARD_SEARCH_SPEED, dt, events);
      if (arrived) {
        guard.searchTimer -= dt;
        guard.facing += Math.sin(performance.now() / 500 + guard.id) * 1.8 * dt;
        if (guard.searchTimer <= 0 && guard.alert < 0.35) {
          guard.state = GUARD_STATES.PATROL;
          guard.lastSeen = null;
        }
      }
      break;
    }
    default:
      break;
  }
}

function updatePatrol(level, guard, dt) {
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    // Scan left and right while standing at a waypoint.
    guard.scanAngle += dt * 1.6;
    guard.facing += Math.sin(guard.scanAngle) * 0.9 * dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = stepToward(level, guard, target, GUARD_PATROL_SPEED, dt, null);
  if (arrived) {
    guard.pauseTimer = guard.pause;
    guard.scanAngle = 0;
    guard.waypointIndex += guard.waypointDirection;
    if (guard.waypointIndex >= guard.waypoints.length || guard.waypointIndex < 0) {
      guard.waypointDirection *= -1;
      guard.waypointIndex += guard.waypointDirection * 2;
    }
  }
}

// Walk toward a point, facing the way we move. Returns true when arrived.
function stepToward(level, guard, target, speed, dt, events) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  guard.facing = turnToward(guard.facing, Math.atan2(dy, dx), 5 * dt);
  moveCircle(level, guard, nx, ny, 13);
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0) {
    guard.stepTimer = 0.42;
    if (events) events.push({ type: 'guardStep', guard });
  }
  return false;
}

// Every guard close enough to hear the coin turns to investigate it.
export function alertGuardsToPing(guards, x, y) {
  for (const guard of guards) {
    if (Math.hypot(guard.x - x, guard.y - y) <= GUARD_HEAR_RADIUS) {
      guard.heardPing = { x, y };
    }
  }
}
