// EMBERFALL — arena and lighting rendering.
// One job: the dark arena floor, its boundary, and the lantern light that
// holds the darkness back. Entities are drawn by their own modules.

import { ARENA_W, ARENA_H, COLORS, VIEW_W, VIEW_H } from './config.js';

// Simple camera: follows the keeper, clamped to the arena, in world units.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = VIEW_W;
    this.h = VIEW_H;
  }

  follow(px, py) {
    this.x = Math.max(0, Math.min(ARENA_W - this.w, px - this.w / 2));
    this.y = Math.max(0, Math.min(ARENA_H - this.h, py - this.h / 2));
  }

  toWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }
}

export function drawArena(G, ctx) {
  const cam = G.camera;
  // Floor: deep blue-black with a subtle checker of worn stone.
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(cam.x, cam.y, cam.w, cam.h);
  const tile = 110;
  const x0 = Math.floor(cam.x / tile) * tile;
  const y0 = Math.floor(cam.y / tile) * tile;
  for (let x = x0; x < cam.x + cam.w + tile; x += tile) {
    for (let y = y0; y < cam.y + cam.h + tile; y += tile) {
      const odd = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = odd ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Faint grid lines.
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0; x < cam.x + cam.w + tile; x += tile) {
    ctx.moveTo(x, cam.y);
    ctx.lineTo(x, cam.y + cam.h);
  }
  for (let y = y0; y < cam.y + cam.h + tile; y += tile) {
    ctx.moveTo(cam.x, y);
    ctx.lineTo(cam.x + cam.w, y);
  }
  ctx.stroke();

  // Scattered dead lantern posts: the arena's old lights, long cold.
  ctx.fillStyle = 'rgba(140, 120, 90, 0.25)';
  for (const post of G.posts) {
    if (post.x < cam.x - 20 || post.x > cam.x + cam.w + 20) continue;
    if (post.y < cam.y - 20 || post.y > cam.y + cam.h + 20) continue;
    ctx.fillRect(post.x - 2, post.y - 14, 4, 28);
    ctx.beginPath();
    ctx.arc(post.x, post.y - 16, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Arena boundary: a ring of cold standing stones.
  ctx.strokeStyle = 'rgba(150, 160, 220, 0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, ARENA_W - 12, ARENA_H - 12);
  ctx.fillStyle = 'rgba(150, 160, 220, 0.35)';
  for (let x = 40; x < ARENA_W; x += 160) {
    ctx.beginPath();
    ctx.arc(x, 10, 7, 0, Math.PI * 2);
    ctx.arc(x, ARENA_H - 10, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 40; y < ARENA_H; y += 160) {
    ctx.beginPath();
    ctx.arc(10, y, 7, 0, Math.PI * 2);
    ctx.arc(ARENA_W - 10, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Darkness that the lantern pushes back: a radial hole of light around the
// keeper, plus a soft vignette at the screen edges.
export function drawDarkness(G, ctx) {
  const p = G.player;
  const cx = p.x - G.camera.x;
  const cy = p.y - G.camera.y;
  const light = ctx.createRadialGradient(cx, cy, 60, cx, cy, 520);
  light.addColorStop(0, 'rgba(5, 6, 16, 0)');
  light.addColorStop(0.55, 'rgba(5, 6, 16, 0.20)');
  light.addColorStop(1, 'rgba(5, 6, 16, 0.55)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Hurt vignette: red edges while recently damaged.
  if (G.hurtVignette > 0.02) {
    const hurt = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75,
    );
    hurt.addColorStop(0, 'rgba(255, 40, 40, 0)');
    hurt.addColorStop(1, `rgba(255, 40, 40, ${0.38 * G.hurtVignette})`);
    ctx.fillStyle = hurt;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
