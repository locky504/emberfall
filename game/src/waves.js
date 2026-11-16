// EMBERFALL — wave director.
// One job: decide what spawns, when, and when a wave is cleared.
// Wave n fields 6 + 4n creatures; every 5th wave is a boss wave; wave 10's
// boss is the win condition. Between waves there is a short breather banner.

import { BOSS_EVERY, WIN_WAVE } from './config.js';
import { spawnAtEdge, spawnBoss } from './enemies.js';

export class WaveDirector {
  constructor(G) {
    this.G = G;
    this.queue = []; // enemy types waiting to spawn
    this.spawnCd = 0;
    this.betweenWaves = 0; // >0 during the breather before the next wave
    this.bossSpawned = false;
  }

  startRun() {
    this.queue = [];
    this.spawnCd = 0;
    this.betweenWaves = 0;
    this.bossSpawned = false;
    this.startWave(1);
  }

  startWave(n) {
    const G = this.G;
    G.wave = n;
    G.waveKills = 0;
    this.bossSpawned = false;
    this.queue = this.buildQueue(n);
    this.spawnCd = 0.4;
    G.banner = n % BOSS_EVERY === 0
      ? `WAVE ${n} — THE NIGHT HERALD AWAKENS`
      : `WAVE ${n}`;
    G.bannerT = 2.4;
    G.audio.waveHorn();
  }

  buildQueue(n) {
    const G = this.G;
    const q = [];
    const total = 6 + n * 4;
    for (let i = 0; i < total; i++) {
      const roll = G.rng();
      if (n >= 4 && roll < 0.14) q.push('brute');
      else if (n >= 3 && roll < 0.36) q.push('spitter');
      else if (n >= 2 && roll < 0.62) q.push('shade');
      else q.push('emberling');
    }
    // Shuffle so the wave doesn't arrive in sorted order.
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(G.rng() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    return q;
  }

  update(dt) {
    const G = this.G;
    if (G.state !== 'playing') return;

    if (this.betweenWaves > 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) this.startWave(G.wave + 1);
      return;
    }

    const isBossWave = G.wave % BOSS_EVERY === 0;
    if (isBossWave && !this.bossSpawned && this.queue.length === 0) {
      this.bossSpawned = true;
      spawnBoss(G);
    }

    if (this.queue.length > 0) {
      this.spawnCd -= dt;
      if (this.spawnCd <= 0) {
        // Spawn in small bursts as waves grow; never flood the arena at once.
        const burst = G.wave >= 6 ? 2 : 1;
        for (let i = 0; i < burst && this.queue.length > 0; i++) {
          spawnAtEdge(G, this.queue.shift());
        }
        const alive = G.enemies.length;
        this.spawnCd = Math.max(0.35, 1.15 - G.wave * 0.07 - alive * 0.012);
      }
    }

    // Wave cleared: nothing left to spawn and nothing alive.
    if (this.queue.length === 0 && G.enemies.length === 0 && !G.boss) {
      const G2 = this.G;
      G2.score += 50 + G2.wave * 10;
      if (G2.wave >= WIN_WAVE) return; // victory is handled by the boss kill
      G2.banner = `WAVE ${G2.wave} CLEARED  ·  +${50 + G2.wave * 10} SCORE`;
      G2.bannerT = 2.2;
      this.betweenWaves = 2.6;
    }
  }
}
