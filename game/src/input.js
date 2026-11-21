// input.js — keyboard and mouse state. WASD or arrows move, Shift sneaks,
// M mutes, and a click on the canvas throws a coin to that floor point.
// Keys are tracked by code so layouts do not matter.

export function createInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    click: null, // { x, y } in canvas pixels, consumed by the game loop
  };
}

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
};

export function bindInput(input, canvas, onAction) {
  window.addEventListener('keydown', (event) => {
    const field = KEYMAP[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Enter' || event.code === 'Space') onAction('confirm');
    if (event.code === 'KeyM') onAction('mute');
    if (event.code === 'KeyR') onAction('restart');
    if (event.code === 'Escape') onAction('pause');
  });
  window.addEventListener('keyup', (event) => {
    const field = KEYMAP[event.code];
    if (field) input[field] = false;
  });
  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.sneak = false;
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}
