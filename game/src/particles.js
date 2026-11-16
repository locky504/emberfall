// EMBERFALL — particles, floating damage numbers and shockwave rings.
// One job: every bit of juice that is not an entity: sparks, embers, text pops.

import { COLORS } from './config.js';

export class Particles {
  // rng is the game's seeded RNG, so screenshot scenes replay exactly.
  constructor(rng = Math.random) {
    this.rng = rng;
    this.list = []; // {x,y,vx,vy,life,maxLife,size,color,drag,grav}
    this.texts = []; // {x,y,vy,life,maxLife,text,color,size}
    this.rings = []; // {x,y,r,maxR,life,maxLife,color,width}
  }

  burst(x, y, { count = 10, color = COLORS.ember, speed = 220, size = 3, life = 0.5 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = speed * (0.3 + this.rng() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.5 + this.rng() * 0.5),
        maxLife: life,
        size: size * (0.6 + this.rng() * 0.8),
        color,
        drag: 0.9,
        grav: 60,
      });
    }
  }

  embers(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = 30 + this.rng() * 90;
      this.list.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        life: 0.7 + this.rng() * 0.6,
        maxLife: 1.3,
        size: 2 + this.rng() * 2.5,
        color: this.rng() < 0.5 ? COLORS.ember : COLORS.emberCore,
        drag: 0.94,
        grav: -40,
      });
    }
  }

  damageNumber(x, y, amount, color = '#ffe9a8') {
    this.texts.push({
      x: x + (this.rng() * 16 - 8),
      y,
      vy: -70,
      life: 0.7,
      maxLife: 0.7,
      text: String(Math.round(amount)),
      color,
      size: 15,
    });
  }

  floatText(x, y, text, color = COLORS.gold, size = 20) {
    this.texts.push({ x, y, vy: -40, life: 1.1, maxLife: 1.1, text, color, size });
  }

  ring(x, y, maxR, color = COLORS.ember, width = 5) {
    this.rings.push({ x, y, r: 8, maxR, life: 0.45, maxLife: 0.45, color, width });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= 0.96;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      const t = 1 - r.life / r.maxLife;
      r.r = 8 + (r.maxR - 8) * (1 - (1 - t) * (1 - t));
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.maxLife);
      ctx.globalAlpha = a;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * a + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.list.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
  }
}
