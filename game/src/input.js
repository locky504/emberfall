// EMBERFALL — keyboard + mouse input.
// One job: turn DOM events into a plain state object the game reads each frame.
// Coordinates are always in the game's 1280x720 logical space, whatever the
// canvas CSS size is, so aiming never depends on the window size.

import { VIEW_W, VIEW_H } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last frame was consumed
    this.mouseX = VIEW_W / 2;
    this.mouseY = VIEW_H / 2 - 120;
    this.mouseDown = false;
    this.clicked = false; // a full click (down+up) waiting to be consumed
    this._downPos = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });

    const toLogical = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * VIEW_W,
        y: ((clientY - r.top) / r.height) * VIEW_H,
      };
    };
    canvas.addEventListener('mousemove', (e) => {
      const p = toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const p = toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseDown = true;
      this._downPos = p;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = false;
      if (this._downPos) {
        this.clicked = true;
        this.clickX = this.mouseX;
        this.clickY = this.mouseY;
        this._downPos = null;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once for the frame the key went down; call once per frame.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  // True once for a click; call once per frame.
  consumeClick() {
    if (!this.clicked) return null;
    this.clicked = false;
    return { x: this.clickX, y: this.clickY };
  }

  endFrame() {
    this.pressed.clear();
  }
}
