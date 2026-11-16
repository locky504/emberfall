// EMBERFALL — the Lantern Keeper (the player).
// One job: the keeper's stats, movement, dash and lantern; firing lives in combat.js.

import { ARENA_W, ARENA_H, COLORS, clamp } from './config.js';

export function createPlayer() {
  return {
    x: ARENA_W / 2,
    y: ARENA_H / 2,
    r: 18,
    angle: -Math.PI / 2, // aim direction, toward the mouse
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    xpNeed: 8,
    speed: 265,
    damage: 13,
    fireRate: 4.2, // shots per second
    fireCd: 0,
    scatter: 1, // projectiles per shot
    orbitBlades: 0,
    orbitAngle: 0,
    novaLevel: 0,
    novaCd: 0,
    magnetR: 110,
    regen: 0,
    dashCd: 0,
    dashCdMax: 2.2,
    dashTime: 0, // >0 while dashing
    dashDirX: 1,
    dashDirY: 0,
    invuln: 0, // invulnerability timer (dash i-frames + brief spawn grace)
    hurtFlash: 0,
    walkPhase: 0,
    moving: false,
    alive: true,
  };
}

export function healPlayer(p, amount) {
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  if (!p.alive) return;

  p.fireCd -= dt;
  p.dashCd -= dt;
  p.invuln -= dt;
  p.hurtFlash -= dt;
  p.novaCd -= dt;
  if (p.regen > 0) healPlayer(p, p.regen * dt);

  // Aim at the mouse (mouse is in view space; convert through the camera).
  const worldMouse = G.camera.toWorld(input.mouseX, input.mouseY);
  p.angle = Math.atan2(worldMouse.y - p.y, worldMouse.x - p.x);

  // Movement: WASD or arrows, normalized so diagonals aren't faster.
  let mx = 0;
  let my = 0;
  if (input.down('w', 'ArrowUp')) my -= 1;
  if (input.down('s', 'ArrowDown')) my += 1;
  if (input.down('a', 'ArrowLeft')) mx -= 1;
  if (input.down('d', 'ArrowRight')) mx += 1;
  p.moving = mx !== 0 || my !== 0;
  if (p.moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.walkPhase += dt * 11;
  }

  // Dash: Space, a short burst in the current move (or aim) direction.
  if (input.wasPressed(' ') && p.dashCd <= 0 && p.dashTime <= 0) {
    let dx = mx;
    let dy = my;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(p.angle);
      dy = Math.sin(p.angle);
    }
    p.dashDirX = dx;
    p.dashDirY = dy;
    p.dashTime = 0.18;
    p.dashCd = p.dashCdMax;
    p.invuln = Math.max(p.invuln, 0.35);
    G.audio.dash();
    G.particles.burst(p.x, p.y, { count: 8, color: COLORS.emberCore, speed: 160, size: 2.5, life: 0.35 });
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashDirX * 920 * dt;
    p.y += p.dashDirY * 920 * dt;
  } else if (p.moving) {
    p.x += mx * p.speed * dt;
    p.y += my * p.speed * dt;
  }

  p.x = clamp(p.x, p.r + 8, ARENA_W - p.r - 8);
  p.y = clamp(p.y, p.r + 8, ARENA_H - p.r - 8);
  p.orbitAngle += dt * 3.4;
}

export function drawPlayer(G, ctx) {
  const p = G.player;
  if (!p.alive) return;
  const bob = p.moving ? Math.sin(p.walkPhase) * 2 : Math.sin(G.time * 2) * 1.2;

  // Lantern glow under the keeper.
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 90);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);

  // Cloak: a warm hooded triangle with a dark rim.
  ctx.fillStyle = '#3a2b1c';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(15, 12);
  ctx.lineTo(-15, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8a33d';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(12, 10);
  ctx.lineTo(-12, 10);
  ctx.closePath();
  ctx.fill();

  // Hooded head.
  ctx.fillStyle = '#2b1f14';
  ctx.beginPath();
  ctx.arc(0, -8, 8.5, 0, Math.PI * 2);
  ctx.fill();
  // Face: two ember eyes looking along the aim direction.
  const ex = Math.cos(p.angle) * 2.5;
  const ey = Math.sin(p.angle) * 2.5;
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(-3 + ex, -9 + ey, 1.8, 0, Math.PI * 2);
  ctx.arc(3 + ex, -9 + ey, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // The lantern, held out toward the aim direction.
  const lx = Math.cos(p.angle) * 20;
  const ly = Math.sin(p.angle) * 20;
  ctx.strokeStyle = '#7a5a2a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.angle) * 8, Math.sin(p.angle) * 8);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(lx, ly, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fill();

  // Hurt flash: a white overlay while recently hit.
  if (p.hurtFlash > 0) {
    ctx.globalAlpha = Math.min(0.7, p.hurtFlash * 3);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -4, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Dash i-frames: a faint ring.
  if (p.invuln > 0 && p.dashTime > 0) {
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -4, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
