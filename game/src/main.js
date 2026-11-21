// main.js — game loop and state machine for "Night Shift at the Meridian
// Archive". Title screen -> playing -> level clear / caught -> next level ->
// game complete. Owns the HUD, the score and timer, intel pickup, the exit,
// coin pings, and the ?shot= URL hook used to stage screenshots.

import {
  GHOST_BONUS,
  INTEL_SCORE,
  LEVEL_CLEAR_BONUS,
  LEVELS,
  START_COINS,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { parseLevel } from './level.js';
import { alertGuardsToPing, createGuard, updateGuard } from './guards.js';
import { createPlayer, throwCoin, updatePlayer } from './player.js';
import { renderWorld } from './render.js';
import { bindInput, createInput } from './input.js';
import {
  ensureAudio,
  isMuted,
  playCaught,
  playCoin,
  playExitUnlocked,
  playGuardStep,
  playPickup,
  playPlayerStep,
  playSpotted,
  playWin,
  setMuted,
} from './audio.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const hud = {
  score: document.getElementById('hud-score'),
  time: document.getElementById('hud-time'),
  intel: document.getElementById('hud-intel'),
  coins: document.getElementById('hud-coins'),
  level: document.getElementById('hud-level'),
  alertFill: document.getElementById('hud-alert-fill'),
  alertLabel: document.getElementById('hud-alert-label'),
  message: document.getElementById('hud-message'),
};

const overlays = {
  title: document.getElementById('overlay-title'),
  caught: document.getElementById('overlay-caught'),
  clear: document.getElementById('overlay-clear'),
  win: document.getElementById('overlay-win'),
  pause: document.getElementById('overlay-pause'),
};

const state = {
  screen: 'title', // title | playing | paused | caught | levelClear | gameWin
  levelIndex: 0,
  level: null,
  guards: [],
  player: null,
  pings: [],
  score: 0,
  levelScore: 0,
  elapsed: 0,
  totalIntel: 0,
  intelTaken: 0,
  exitUnlocked: false,
  spottedThisLevel: false,
  messageTimer: 0,
};

const input = createInput();

function showOverlay(name) {
  for (const [key, el] of Object.entries(overlays)) {
    el.classList.toggle('hidden', key !== name);
  }
}

function showMessage(text, seconds = 3) {
  hud.message.textContent = text;
  hud.message.classList.remove('hidden');
  state.messageTimer = seconds;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startLevel(index) {
  const def = LEVELS[index];
  state.levelIndex = index;
  state.level = parseLevel(def);
  state.guards = def.guards.map((spec, i) => createGuard(spec, i));
  state.player = createPlayer(state.level.playerStart);
  state.player.coins = START_COINS;
  state.pings = [];
  state.elapsed = 0;
  state.levelScore = 0;
  state.totalIntel = state.level.intel.length;
  state.intelTaken = 0;
  state.exitUnlocked = false;
  state.spottedThisLevel = false;
  state.screen = 'playing';
  hud.level.textContent = def.name;
  showOverlay(null);
  showMessage(def.briefing, 6);
  ensureAudio();
}

// Restarting a level gives its points back: intel and bonuses earned in the
// attempt are removed, so farming one level by dying cannot inflate the score.
function restartLevel() {
  state.score -= state.levelScore;
  startLevel(state.levelIndex);
}

function startGame() {
  state.score = 0;
  startLevel(0);
}

function levelClear() {
  const def = LEVELS[state.levelIndex];
  const timeLeft = Math.max(0, def.parSeconds - state.elapsed);
  const timeBonus = Math.round(timeLeft * TIME_BONUS_PER_SECOND);
  const ghostBonus = state.spottedThisLevel ? 0 : GHOST_BONUS;
  const gained = LEVEL_CLEAR_BONUS + timeBonus + ghostBonus;
  state.levelScore += gained;
  state.score += gained;
  document.getElementById('clear-stats').textContent =
    `Files lifted: ${state.intelTaken}/${state.totalIntel}  ·  Time ${formatTime(state.elapsed)} (par ${formatTime(def.parSeconds)})  ·  Time bonus +${timeBonus}  ·  ${ghostBonus ? `Ghost bonus +${ghostBonus}` : 'Spotted — no ghost bonus'}  ·  Level bonus +${LEVEL_CLEAR_BONUS}`;
  document.getElementById('clear-score').textContent = `Score: ${state.score}`;
  document.getElementById('clear-button').textContent =
    state.levelIndex + 1 < LEVELS.length ? 'Next level — Enter' : 'Finish the night — Enter';
  state.screen = 'levelClear';
  showOverlay('clear');
  playWin();
}

function gameCaught(guard) {
  state.screen = 'caught';
  document.getElementById('caught-score').textContent = `Score: ${state.score}`;
  showOverlay('caught');
  playCaught();
}

function gameWin() {
  state.screen = 'gameWin';
  document.getElementById('win-score').textContent = `Final score: ${state.score}`;
  document.getElementById('win-stats').textContent =
    `All three wings cleared. ${state.score} points — the archive never knew you were there.`;
  showOverlay('win');
  playWin();
}

function advance() {
  if (state.screen === 'title') startGame();
  else if (state.screen === 'levelClear') {
    if (state.levelIndex + 1 < LEVELS.length) startLevel(state.levelIndex + 1);
    else gameWin();
  } else if (state.screen === 'caught') restartLevel();
  else if (state.screen === 'gameWin') startGame();
  else if (state.screen === 'paused') {
    state.screen = 'playing';
    showOverlay(null);
  }
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'spotted') {
      state.spottedThisLevel = true;
      showMessage('Spotted! Break line of sight — the guard will calm down.', 3);
      playSpotted();
    } else if (event.type === 'caught') {
      gameCaught(event.guard);
    } else if (event.type === 'playerStep') {
      playPlayerStep(event.sneaking);
    } else if (event.type === 'guardStep') {
      const d = Math.hypot(event.guard.x - state.player.x, event.guard.y - state.player.y);
      playGuardStep(d);
    }
  }
}

function updatePlaying(dt) {
  state.elapsed += dt;
  const events = [];
  updatePlayer(state.level, state.player, input, dt, events);

  // Coin ping: a click throws a coin to that floor point.
  if (input.click) {
    const { x, y } = input.click;
    input.click = null;
    const coin = throwCoin(state.player, x, y);
    if (coin) {
      state.pings.push(coin);
      alertGuardsToPing(state.guards, x, y);
      playCoin();
      showMessage('Coin tossed — a nearby guard goes to listen.', 2);
    } else {
      showMessage('Out of coins.', 2);
    }
  }

  for (const guard of state.guards) updateGuard(state.level, guard, state.player, dt, events);
  handleEvents(events);
  if (state.screen !== 'playing') return;

  // Pick up intel files.
  for (const item of state.level.intel) {
    if (item.taken) continue;
    const cx = (item.tx + 0.5) * 40;
    const cy = (item.ty + 0.5) * 40;
    if (Math.hypot(state.player.x - cx, state.player.y - cy) < 26) {
      item.taken = true;
      state.intelTaken += 1;
      state.levelScore += INTEL_SCORE;
      state.score += INTEL_SCORE;
      playPickup();
      showMessage(`Intel ${state.intelTaken}/${state.totalIntel} secured (+${INTEL_SCORE}).`, 2);
      if (state.intelTaken === state.totalIntel) {
        state.exitUnlocked = true;
        playExitUnlocked();
        showMessage('All files secured — the exit door is open. Get out unseen!', 4);
      }
    }
  }

  // Reach the exit once it is unlocked.
  if (state.exitUnlocked) {
    const d = Math.hypot(state.player.x - state.level.exit.x, state.player.y - state.level.exit.y);
    if (d < 26) levelClear();
  }

  // Expire old coin rings.
  state.pings = state.pings.filter((p) => performance.now() - p.born < 1200);
}

function updateHud() {
  hud.score.textContent = `Score ${state.score}`;
  hud.time.textContent = formatTime(state.elapsed);
  hud.intel.textContent = `Intel ${state.intelTaken}/${state.totalIntel}`;
  hud.coins.textContent = `Coins ${state.player ? state.player.coins : START_COINS}`;
  const maxAlert = state.guards.reduce((m, g) => Math.max(m, g.alert), 0);
  hud.alertFill.style.width = `${Math.round(maxAlert * 100)}%`;
  hud.alertFill.style.background = maxAlert >= 1 ? '#ef4444' : maxAlert >= 0.35 ? '#f59e0b' : '#facc15';
  hud.alertLabel.textContent =
    maxAlert >= 1 ? 'SPOTTED' : maxAlert >= 0.35 ? 'SUSPICIOUS' : maxAlert > 0.05 ? 'NOTICED' : 'UNSEEN';
  if (state.messageTimer > 0) {
    state.messageTimer -= 1 / 60;
    if (state.messageTimer <= 0) hud.message.classList.add('hidden');
  }
}

let lastTime = performance.now();
function frame(now) {
  // Schedule the next frame first, so one bad update can never kill the loop.
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (state.screen === 'playing') updatePlaying(dt);
  if (state.screen !== 'title') renderWorld(ctx, state, now);
  updateHud();
}

bindInput(input, canvas, (action) => {
  if (action === 'confirm') advance();
  if (action === 'restart' && state.screen === 'playing') restartLevel();
  if (action === 'pause' && state.screen === 'playing') {
    state.screen = 'paused';
    showOverlay('pause');
  } else if (action === 'pause' && state.screen === 'paused') advance();
  if (action === 'mute') {
    setMuted(!isMuted());
    showMessage(isMuted() ? 'Sound off (M to turn back on).' : 'Sound on.', 2);
  }
});

document.getElementById('start-button').addEventListener('click', () => {
  ensureAudio();
  startGame();
});
document.getElementById('clear-button').addEventListener('click', advance);
document.getElementById('caught-button').addEventListener('click', advance);
document.getElementById('win-button').addEventListener('click', advance);
document.getElementById('pause-button').addEventListener('click', advance);
document.getElementById('mute-button').addEventListener('click', () => {
  setMuted(!isMuted());
  document.getElementById('mute-button').textContent = isMuted() ? 'Sound: off' : 'Sound: on';
});

// Stage a deterministic scene for screenshots: ?shot=start shows the title,
// ?shot=play drops the player mid-level, ?shot=alert puts a guard on the
// verge of spotting the player in plain sight.
function applyShotParam() {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot === 'play' || shot === 'alert') {
    startLevel(0);
    // (10.5, 8.5) is open floor in the central hall, with a guard patrol,
    // crates and the exit all in frame.
    state.player.x = 10.5 * 40;
    state.player.y = 8.5 * 40;
    if (shot === 'alert') {
      const guard = state.guards[0];
      guard.x = 10.5 * 40;
      guard.y = 5.5 * 40;
      guard.facing = Math.PI / 2;
      guard.alert = 0.7;
      guard.state = 'suspicious';
      guard.lastSeen = { x: state.player.x, y: state.player.y };
      guard.pauseTimer = 2;
    }
  }
}

// Debug/testing hook: lets automated play-tests drive the game.
window.__game = {
  state,
  startGame,
  startLevel,
  advance,
  teleport(x, y) {
    state.player.x = x;
    state.player.y = y;
  },
  setAlert(value) {
    for (const g of state.guards) g.alert = value;
  },
};

applyShotParam();
if (state.screen === 'title') {
  // Draw a quiet backdrop behind the title screen.
  startLevel(0);
  state.screen = 'title';
  showOverlay('title');
}
requestAnimationFrame(frame);
