// audio.js — tiny WebAudio synth: no sound files, everything is an
// oscillator. Footsteps tick, coins ring, the alert sting rises, and a soft
// pickup chime plays. Created lazily on the first user gesture.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function blip(freq, duration, type, gainValue, when = 0) {
  if (muted) return;
  const ac = ensureAudio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(gainValue, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function playPlayerStep(sneaking) {
  blip(sneaking ? 190 : 150, 0.06, 'triangle', sneaking ? 0.02 : 0.035);
}

// A guard's boot is heavier and lower; volume fades with distance.
export function playGuardStep(distance) {
  const volume = Math.max(0.008, 0.09 * (1 - distance / 420));
  blip(95, 0.09, 'sine', volume);
}

export function playCoin() {
  blip(1320, 0.12, 'sine', 0.06);
  blip(1760, 0.18, 'sine', 0.05, 0.07);
}

export function playPickup() {
  blip(660, 0.1, 'sine', 0.06);
  blip(880, 0.14, 'sine', 0.06, 0.08);
  blip(1320, 0.2, 'sine', 0.05, 0.16);
}

export function playSpotted() {
  blip(220, 0.16, 'sawtooth', 0.09);
  blip(330, 0.16, 'sawtooth', 0.09, 0.12);
  blip(440, 0.3, 'sawtooth', 0.09, 0.24);
}

export function playCaught() {
  blip(196, 0.25, 'sawtooth', 0.1);
  blip(147, 0.4, 'sawtooth', 0.1, 0.2);
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'sine', 0.06, i * 0.11));
}

export function playExitUnlocked() {
  blip(784, 0.12, 'sine', 0.05);
  blip(1047, 0.2, 'sine', 0.05, 0.1);
}
