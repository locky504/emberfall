// EMBERFALL — combat: firing, bullets, pickups, damage and death.
// One job: everything that hurts, heals or pays out once entities exist.

import { COLORS, WIN_WAVE, dist2 } from './config.js';
import { rollUpgradeChoices } from './upgrades.js';

// Fire the keeper's lantern gun toward the aim direction.
export function fireWeapon(G) {
  const p = G.player;
  if (p.fireCd > 0 || !p.alive) return;
  p.fireCd = 1 / p.fireRate;
  const spread = 0.09;
  const n = p.scatter;
  for (let i = 0; i < n; i++) {
    const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
    const a = p.angle + off;
    G.bullets.push({
      x: p.x + Math.cos(a) * 24,
      y: p.y + Math.sin(a) * 24,
      vx: Math.cos(a) * 780,
      vy: Math.sin(a) * 780,
      r: 5,
      damage: p.damage,
      life: 0.9,
    });
  }
  G.audio.shoot();
  G.particles.burst(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, {
    count: 2, color: COLORS.emberCore, speed: 60, size: 2, life: 0.15,
  });
}

export function damageEnemy(G, e, amount) {
  e.hp -= amount;
  e.flash = 0.07;
  G.particles.damageNumber(e.x, e.y - e.r - 4, amount);
  G.audio.hit();
  if (e.hp > 0) return;
  killEnemy(G, e);
}

export function killEnemy(G, e) {
  e.dead = true;
  G.kills += 1;
  G.waveKills += 1;
  G.score += e.score;
  G.shake = Math.min(10, G.shake + (e.type === 'boss' ? 10 : e.type === 'brute' ? 5 : 2));
  G.particles.burst(e.x, e.y, {
    count: e.type === 'boss' ? 60 : e.type === 'brute' ? 26 : 12,
    color: e.color, speed: 260, size: 3.5, life: 0.6,
  });
  G.particles.embers(e.x, e.y, e.type === 'boss' ? 10 : 4);
  G.particles.ring(e.x, e.y, e.r + 26, e.color, 3);
  G.audio.enemyDie();

  // Drop embers (experience). Boss drops a shower.
  const drops = e.type === 'boss' ? 12 : e.xp;
  for (let i = 0; i < drops; i++) {
    const a = G.rng() * Math.PI * 2;
    const d = G.rng() * 26;
    G.embers.push({
      x: e.x + Math.cos(a) * d,
      y: e.y + Math.sin(a) * d,
      vx: Math.cos(a) * 90,
      vy: Math.sin(a) * 90,
      value: e.type === 'boss' ? 3 : 1,
      bob: G.rng() * Math.PI * 2,
      life: 25,
    });
  }

  if (e.type === 'boss') {
    G.boss = null;
    G.particles.floatText(e.x, e.y - 60, 'NIGHT HERALD FALLEN  +500', COLORS.gold, 22);
    if (G.wave >= WIN_WAVE) {
      winGame(G);
    }
  }
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (!p.alive || p.invuln > 0) return;
  p.hp -= amount;
  p.hurtFlash = 0.35;
  p.invuln = 0.5; // brief grace so one swarm hit isn't several
  G.shake = Math.min(14, G.shake + 7);
  G.hurtVignette = 0.9;
  G.audio.hurt();
  G.particles.burst(p.x, p.y, { count: 10, color: '#ff5a5a', speed: 200, size: 3, life: 0.4 });
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    G.particles.burst(p.x, p.y, { count: 50, color: COLORS.ember, speed: 320, size: 4, life: 0.9 });
    G.particles.ring(p.x, p.y, 180, COLORS.ember, 5);
    G.audio.defeat();
    G.state = 'gameover';
  }
}

export function gainXp(G, amount) {
  const p = G.player;
  p.xp += amount;
  while (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.level += 1;
    p.xpNeed = 8 + (p.level - 1) * 6;
    G.pendingLevels += 1;
  }
  if (G.pendingLevels > 0 && G.state === 'playing') {
    openLevelUp(G);
  }
}

export function openLevelUp(G) {
  G.pendingLevels -= 1;
  G.state = 'levelup';
  G.levelChoices = rollUpgradeChoices(G);
}

function winGame(G) {
  G.state = 'victory';
  G.audio.victory();
  G.particles.ring(G.player.x, G.player.y, 260, COLORS.gold, 6);
}

export function updateBullets(G, dt) {
  // Keeper bullets vs enemies.
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let spent = b.life <= 0;
    if (!spent) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (dist2(b.x, b.y, e.x, e.y) < (b.r + e.r) * (b.r + e.r)) {
          damageEnemy(G, e, b.damage);
          spent = true;
          break;
        }
      }
    }
    if (spent) G.bullets.splice(i, 1);
  }

  // Enemy globs vs the keeper.
  const p = G.player;
  for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
    const b = G.enemyBullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let spent = b.life <= 0;
    if (!spent && p.alive && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
      damagePlayer(G, b.damage);
      spent = true;
    }
    if (spent) G.enemyBullets.splice(i, 1);
  }

  // Orbiting blades: circle the keeper and slice what they touch.
  if (p.orbitBlades > 0 && p.alive) {
    for (let k = 0; k < p.orbitBlades; k++) {
      const a = p.orbitAngle + (k / p.orbitBlades) * Math.PI * 2;
      const bx = p.x + Math.cos(a) * 92;
      const by = p.y + Math.sin(a) * 92;
      for (const e of G.enemies) {
        if (e.dead || e.bladeCd > 0) continue;
        if (dist2(bx, by, e.x, e.y) < (14 + e.r) * (14 + e.r)) {
          e.bladeCd = 0.45;
          damageEnemy(G, e, 12 + p.damage * 0.5);
        }
      }
    }
  }

  // Nova: a periodic shockwave around the keeper.
  if (p.novaLevel > 0 && p.novaCd <= 0 && p.alive) {
    p.novaCd = 6;
    const radius = 200 + p.novaLevel * 45;
    const dmg = 22 + p.novaLevel * 12;
    G.particles.ring(p.x, p.y, radius, COLORS.emberCore, 6);
    G.audio.nova();
    G.shake = Math.min(10, G.shake + 4);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(p.x, p.y, e.x, e.y) < radius * radius) {
        damageEnemy(G, e, dmg);
        const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
        e.x += ((e.x - p.x) / d) * 60;
        e.y += ((e.y - p.y) / d) * 60;
      }
    }
  }

  // Contact damage: an enemy touching the keeper hurts on a per-enemy cooldown.
  if (p.alive) {
    for (const e of G.enemies) {
      if (e.dead || e.attackCd > 0) continue;
      if (dist2(p.x, p.y, e.x, e.y) < (p.r + e.r - 2) * (p.r + e.r - 2)) {
        e.attackCd = 0.85;
        damagePlayer(G, e.damage);
      }
    }
  }

  // Remove the dead (marked during bullet loops above).
  if (G.enemies.some((e) => e.dead)) {
    G.enemies = G.enemies.filter((e) => !e.dead);
  }
}

export function updateEmbers(G, dt) {
  const p = G.player;
  for (let i = G.embers.length - 1; i >= 0; i--) {
    const em = G.embers[i];
    em.life -= dt;
    em.bob += dt * 5;
    em.x += em.vx * dt;
    em.y += em.vy * dt;
    em.vx *= 0.9;
    em.vy *= 0.9;
    if (em.life <= 0) { G.embers.splice(i, 1); continue; }
    if (!p.alive) continue;
    const d2 = dist2(em.x, em.y, p.x, p.y);
    const magnet = p.magnetR;
    if (d2 < magnet * magnet) {
      const d = Math.sqrt(d2) || 1;
      const pull = 620 * (1 - d / (magnet * 1.6));
      em.x += ((p.x - em.x) / d) * pull * dt;
      em.y += ((p.y - em.y) / d) * pull * dt;
    }
    if (d2 < (p.r + 12) * (p.r + 12)) {
      G.embers.splice(i, 1);
      G.score += 2;
      G.audio.pickup();
      G.particles.burst(em.x, em.y, { count: 3, color: COLORS.emberCore, speed: 70, size: 2, life: 0.25 });
      gainXp(G, em.value);
    }
  }
}

export function drawCombat(G, ctx) {
  // Ember pickups: small glowing diamonds.
  for (const em of G.embers) {
    const bobY = Math.sin(em.bob) * 2;
    const blink = 0.75 + Math.sin(em.bob * 2) * 0.25;
    ctx.globalAlpha = blink;
    ctx.fillStyle = em.value >= 3 ? COLORS.gold : COLORS.ember;
    ctx.save();
    ctx.translate(em.x, em.y + bobY);
    ctx.rotate(Math.PI / 4);
    const s = em.value >= 3 ? 7 : 5;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Keeper bullets: hot cores with a warm halo.
  for (const b of G.bullets) {
    ctx.fillStyle = 'rgba(255, 180, 80, 0.35)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.emberCore;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy globs: sickly green / red orbs.
  for (const b of G.enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(b.x - 2, b.y - 2, b.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orbiting blades.
  const p = G.player;
  if (p.orbitBlades > 0 && p.alive) {
    for (let k = 0; k < p.orbitBlades; k++) {
      const a = p.orbitAngle + (k / p.orbitBlades) * Math.PI * 2;
      const bx = p.x + Math.cos(a) * 92;
      const by = p.y + Math.sin(a) * 92;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#dfe6ff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

// Keep the arena's ambient embers drifting for atmosphere.
export function updateAmbient(G, dt) {
  G.ambientT -= dt;
  if (G.ambientT <= 0) {
    G.ambientT = 0.12;
    const cam = G.camera;
    const x = cam.x + G.rng() * cam.w;
    const y = cam.y + cam.h + 10;
    G.particles.list.push({
      x, y, vx: (G.rng() - 0.5) * 12, vy: -18 - G.rng() * 22,
      life: 3 + G.rng() * 2, maxLife: 5, size: 1.5 + G.rng() * 1.5,
      color: G.rng() < 0.7 ? COLORS.ember : COLORS.emberCore, drag: 1, grav: -4,
    });
  }
}
