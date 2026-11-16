// EMBERFALL — enemies and the Night Herald boss.
// One job: enemy definitions, spawning, movement AI and procedural drawing.
// Behaviour per type: emberling swarms fast, shade chases, brute tanks,
// spitter keeps range and shoots, the boss mixes radial bursts and summons.

import { ARENA_W, ARENA_H, COLORS, clamp } from './config.js';

export const ENEMY_TYPES = {
  emberling: {
    name: 'Emberling', hp: 16, speed: 185, r: 12, damage: 8, xp: 1, score: 10,
    color: '#ff9a3d', core: '#ffe9a8',
  },
  shade: {
    name: 'Shade', hp: 34, speed: 128, r: 16, damage: 12, xp: 2, score: 20,
    color: '#8b7ff0', core: '#d9d2ff',
  },
  spitter: {
    name: 'Spitter', hp: 26, speed: 105, r: 15, damage: 10, xp: 2, score: 25,
    color: '#7fd08b', core: '#d8ffd9',
  },
  brute: {
    name: 'Brute', hp: 120, speed: 62, r: 26, damage: 20, xp: 4, score: 40,
    color: '#c96f4a', core: '#ffd9b0',
  },
  boss: {
    name: 'Night Herald', hp: 950, speed: 58, r: 46, damage: 26, xp: 30, score: 500,
    color: '#e5484d', core: '#ffd166',
  },
};

let nextId = 1;

export function spawnEnemy(G, type, x, y) {
  const def = ENEMY_TYPES[type];
  const waveScale = 1 + (G.wave - 1) * 0.16;
  const e = {
    id: nextId++,
    type,
    name: def.name,
    x, y,
    r: def.r,
    hp: Math.round(def.hp * waveScale),
    maxHp: Math.round(def.hp * waveScale),
    speed: def.speed * (0.95 + G.rng() * 0.1),
    damage: def.damage,
    xp: def.xp,
    score: def.score,
    color: def.color,
    core: def.core,
    flash: 0, // white hit-flash timer
    attackCd: 0,
    shootCd: 1.5 + G.rng(),
    bladeCd: 0,
    novaCd: 0,
    phase: G.rng() * Math.PI * 2,
    burstCd: 3.5,
    summoned66: false,
    summoned33: false,
    dead: false,
  };
  G.enemies.push(e);
  return e;
}

// Spawn just outside the camera view, on a random arena edge.
export function spawnAtEdge(G, type) {
  const cam = G.camera;
  const margin = 60;
  const side = Math.floor(G.rng() * 4);
  let x;
  let y;
  if (side === 0) { x = cam.x - margin + G.rng() * 40; y = cam.y + G.rng() * cam.h; }
  else if (side === 1) { x = cam.x + cam.w + margin - G.rng() * 40; y = cam.y + G.rng() * cam.h; }
  else if (side === 2) { x = cam.x + G.rng() * cam.w; y = cam.y - margin + G.rng() * 40; }
  else { x = cam.x + G.rng() * cam.w; y = cam.y + cam.h + margin - G.rng() * 40; }
  x = clamp(x, 30, ARENA_W - 30);
  y = clamp(y, 30, ARENA_H - 30);
  return spawnEnemy(G, type, x, y);
}

export function spawnBoss(G) {
  const boss = spawnAtEdge(G, 'boss');
  boss.hp = Math.round(boss.hp * (1 + (G.wave - 5) * 0.25));
  boss.maxHp = boss.hp;
  G.boss = boss;
  G.audio.bossRoar();
  G.particles.ring(boss.x, boss.y, 160, COLORS.boss, 6);
  return boss;
}

function moveToward(e, tx, ty, dt, speed) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * speed * dt;
  e.y += (dy / d) * speed * dt;
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    e.flash -= dt;
    e.attackCd -= dt;
    e.bladeCd -= dt;
    e.novaCd -= dt;
    const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;

    if (e.type === 'spitter') {
      // Keep a shooting distance; fire a glob when in range.
      if (d > 420) moveToward(e, p.x, p.y, dt, e.speed);
      else if (d < 280) moveToward(e, e.x * 2 - p.x, e.y * 2 - p.y, dt, e.speed * 0.8);
      else { e.x += Math.cos(e.phase + G.time) * 30 * dt; e.y += Math.sin(e.phase + G.time) * 30 * dt; }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 560 && p.alive) {
        e.shootCd = 2.3;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        G.enemyBullets.push({
          x: e.x, y: e.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
          r: 7, damage: e.damage, life: 3, color: '#9be89b',
        });
        G.particles.burst(e.x, e.y, { count: 4, color: '#7fd08b', speed: 90, size: 2, life: 0.3 });
      }
    } else if (e.type === 'boss') {
      moveToward(e, p.x, p.y, dt, e.speed);
      e.burstCd -= dt;
      if (e.burstCd <= 0 && p.alive) {
        e.burstCd = 4.2;
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + G.time;
          G.enemyBullets.push({
            x: e.x, y: e.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
            r: 8, damage: 14, life: 4, color: '#ff8a8a',
          });
        }
        G.particles.ring(e.x, e.y, 120, COLORS.boss, 4);
        G.audio.bossRoar();
      }
      // Summon shades as its health falls.
      const frac = e.hp / e.maxHp;
      if (!e.summoned66 && frac < 0.66) {
        e.summoned66 = true;
        for (let i = 0; i < 3; i++) spawnEnemy(G, 'shade', e.x + (G.rng() * 160 - 80), e.y + (G.rng() * 160 - 80));
        G.particles.floatText(e.x, e.y - 60, 'The Herald calls!', '#ff8a8a', 20);
      }
      if (!e.summoned33 && frac < 0.33) {
        e.summoned33 = true;
        for (let i = 0; i < 4; i++) spawnEnemy(G, 'emberling', e.x + (G.rng() * 200 - 100), e.y + (G.rng() * 200 - 100));
        G.particles.floatText(e.x, e.y - 60, 'The Herald calls!', '#ff8a8a', 20);
      }
    } else {
      // Emberling, shade, brute: chase the keeper, with a slight wobble.
      const wobble = e.type === 'emberling' ? 0.5 : 0.15;
      const wx = p.x + Math.cos(G.time * 2 + e.phase) * 40 * wobble;
      const wy = p.y + Math.sin(G.time * 2 + e.phase) * 40 * wobble;
      moveToward(e, wx, wy, dt, e.speed);
    }

    e.x = clamp(e.x, e.r, ARENA_W - e.r);
    e.y = clamp(e.y, e.r, ARENA_H - e.r);
  }

  // Gentle separation so swarms don't stack into one blob.
  const list = G.enemies;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r - 2;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

function drawEyes(ctx, e, spread, yOff, r) {
  ctx.fillStyle = e.core;
  ctx.beginPath();
  ctx.arc(-spread, yOff, r, 0, Math.PI * 2);
  ctx.arc(spread, yOff, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawEnemy(G, ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const wob = Math.sin(G.time * 3 + e.phase) * 0.08;
  ctx.scale(1 + wob, 1 - wob);

  if (e.type === 'emberling') {
    // A small flame wisp with a hot core.
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -e.r - 4);
    ctx.quadraticCurveTo(e.r, -2, e.r * 0.7, e.r * 0.7);
    ctx.quadraticCurveTo(0, e.r + 3, -e.r * 0.7, e.r * 0.7);
    ctx.quadraticCurveTo(-e.r, -2, 0, -e.r - 4);
    ctx.fill();
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(ctx, e, 4, -3, 1.6);
  } else if (e.type === 'shade') {
    // A smoky purple blob with glowing eyes and a ragged hem.
    ctx.fillStyle = 'rgba(60, 48, 130, 0.9)';
    ctx.beginPath();
    ctx.arc(0, -2, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(-e.r, 2);
    ctx.quadraticCurveTo(-e.r * 0.5, e.r + 6, 0, e.r + 2);
    ctx.quadraticCurveTo(e.r * 0.5, e.r + 6, e.r, 2);
    ctx.closePath();
    ctx.fill();
    drawEyes(ctx, e, 5.5, -4, 2.4);
  } else if (e.type === 'spitter') {
    // A bulbous green maw that glows before it fires.
    ctx.fillStyle = '#2e5a34';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(0, 0, e.r - 4, 0, Math.PI * 2);
    ctx.fill();
    const charging = e.shootCd < 0.6;
    ctx.fillStyle = charging ? '#ffffff' : '#12351a';
    ctx.beginPath();
    ctx.arc(0, 2, charging ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(ctx, e, 6, -6, 2.2);
  } else if (e.type === 'brute') {
    // A hulking rock beast: cracked shell, heavy brow, ember cracks.
    ctx.fillStyle = '#5a3a28';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(0, -2, e.r - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.emberCore;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-9, 6);
    ctx.moveTo(10, -10);
    ctx.lineTo(4, 2);
    ctx.lineTo(11, 10);
    ctx.stroke();
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(-7, -8, 2.6, 0, Math.PI * 2);
    ctx.arc(7, -8, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'boss') {
    // The Night Herald: a crowned shadow with a burning core and horns.
    const pulse = 1 + Math.sin(G.time * 2.4) * 0.03;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(40, 8, 16, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.boss;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, e.r - 2, 0, Math.PI * 2);
    ctx.stroke();
    // Horns.
    ctx.fillStyle = '#3d0f18';
    ctx.beginPath();
    ctx.moveTo(-e.r + 8, -e.r + 12);
    ctx.lineTo(-e.r - 12, -e.r - 16);
    ctx.lineTo(-e.r + 22, -e.r + 2);
    ctx.closePath();
    ctx.moveTo(e.r - 8, -e.r + 12);
    ctx.lineTo(e.r + 12, -e.r - 16);
    ctx.lineTo(e.r - 22, -e.r + 2);
    ctx.closePath();
    ctx.fill();
    // Burning core.
    ctx.fillStyle = e.core;
    ctx.beginPath();
    ctx.arc(0, 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath();
    ctx.arc(0, 4, 7, 0, Math.PI * 2);
    ctx.fill();
    drawEyes(ctx, e, 12, -14, 3.4);
  }

  // White hit-flash overlay, capped so sustained fire never whites the sprite out.
  if (e.flash > 0) {
    ctx.globalAlpha = Math.min(0.45, e.flash * 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Small HP bar for wounded non-boss enemies.
  if (e.type !== 'boss' && e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(-e.r, -e.r - 10, e.r * 2, 4);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-e.r, -e.r - 10, (e.r * 2 * e.hp) / e.maxHp, 4);
  }
  ctx.restore();
}
