// EMBERFALL — bootstrap, main loop and state machine.
// One job: own the Game object, step the world, and route input to the
// state the game is in. All gameplay lives in the other modules.

import { VIEW_W, VIEW_H, WIN_WAVE, mulberry32, clamp } from './config.js';
import { Input } from './input.js';
import { AudioBank } from './audio.js';
import { Particles } from './particles.js';
import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { updateEnemies, drawEnemy } from './enemies.js';
import { WaveDirector } from './waves.js';
import { applyUpgrade, rollUpgradeChoices } from './upgrades.js';
import {
  fireWeapon, updateBullets, updateEmbers, drawCombat, updateAmbient,
  damageEnemy, damagePlayer,
} from './combat.js';
import { Camera, drawArena, drawDarkness } from './render.js';
import {
  FONT, drawHUD, drawStart, drawPaused, drawLevelUp, drawVictory, drawGameOver,
} from './hud.js';
import { setupShotScene } from './shots.js';

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = mulberry32(opts.seed ?? ((Math.random() * 1e9) | 0));
    this.input = new Input(canvas);
    this.audio = new AudioBank();
    this.particles = new Particles(this.rng);
    this.camera = new Camera();
    this.waves = new WaveDirector(this);

    this.state = 'start'; // start | playing | levelup | paused | victory | gameover
    this.time = 0; // total wall-clock time inside the game (drives animation)
    this.playTime = 0;
    this.score = 0;
    this.kills = 0;
    this.wave = 0;
    this.waveKills = 0;
    this.boss = null;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.embers = [];
    this.upgradeStacks = {};
    this.levelChoices = [];
    this.levelCardRects = [];
    this.pendingLevels = 0;
    this.banner = '';
    this.bannerT = 0;
    this.shake = 0;
    this.hurtVignette = 0;
    this.ambientT = 0;
    this.player = createPlayer();
    this.posts = this.makePosts();
    this.shotMode = opts.shot || null;

    // Buttons, in screen space; hover is set each frame from the mouse.
    this.buttons = {
      start: { x: VIEW_W / 2 - 180, y: 400, w: 360, h: 76, hover: false },
      resume: { x: VIEW_W / 2 - 180, y: 340, w: 360, h: 64, hover: false },
      restartPause: { x: VIEW_W / 2 - 180, y: 420, w: 360, h: 64, hover: false },
      again: { x: VIEW_W / 2 - 180, y: 500, w: 360, h: 76, hover: false },
    };

    this._last = 0;
    this._raf = 0;
    this._destroyed = false;
  }

  makePosts() {
    const posts = [];
    const rng = mulberry32(20261116);
    for (let i = 0; i < 26; i++) {
      posts.push({ x: 80 + rng() * 2040, y: 80 + rng() * 1340 });
    }
    return posts;
  }

  start() {
    const loop = (t) => {
      if (this._destroyed) return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this._last) / 1000 || 0.016);
      this._last = t;
      this.frame(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this._raf);
  }

  startRun() {
    this.player = createPlayer();
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.embers = [];
    this.upgradeStacks = {};
    this.levelChoices = [];
    this.pendingLevels = 0;
    this.score = 0;
    this.kills = 0;
    this.playTime = 0;
    this.boss = null;
    this.banner = '';
    this.bannerT = 0;
    this.shake = 0;
    this.hurtVignette = 0;
    this.particles.clear();
    this.state = 'playing';
    this.audio.ensure();
    this.audio.startPad();
    this.waves.startRun();
  }

  // One deterministic step, used by the live loop and by screenshot scenes.
  step(dt) {
    this.time += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.hurtVignette = Math.max(0, this.hurtVignette - dt * 2.2);

    if (this.state === 'playing') {
      this.playTime += dt;
      updatePlayer(this, dt);
      if (this.input.mouseDown) fireWeapon(this);
      updateBullets(this, dt);
      updateEnemies(this, dt);
      updateEmbers(this, dt);
      updateAmbient(this, dt);
      this.waves.update(dt);
      this.particles.update(dt);
    } else if (this.state === 'start' || this.state === 'victory' || this.state === 'gameover') {
      updateAmbient(this, dt);
      this.particles.update(dt);
    }
    // levelup / paused: the world is frozen, particles settle only.
    if (this.state === 'levelup' || this.state === 'paused') {
      this.particles.update(dt);
    }
    this.camera.follow(this.player.x, this.player.y);
  }

  frame(dt) {
    this.handleInput();
    this.step(dt);
    this.render();
    this.input.endFrame();
  }

  inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  handleInput() {
    const input = this.input;
    // Hover states for every visible button.
    const allButtons = [this.buttons.start, this.buttons.resume, this.buttons.restartPause, this.buttons.again];
    for (const b of allButtons) b.hover = this.inRect(input.mouseX, input.mouseY, b);
    for (const r of this.levelCardRects) {
      r.hover = this.state === 'levelup' && this.inRect(input.mouseX, input.mouseY, r);
    }

    if (input.wasPressed('m', 'M')) this.audio.toggleMute();

    if (this.state === 'start') {
      const click = input.consumeClick();
      if ((click && this.inRect(click.x, click.y, this.buttons.start)) || input.wasPressed('Enter')) {
        this.audio.ensure();
        this.audio.click();
        this.startRun();
      }
      return;
    }

    if (this.state === 'playing') {
      if (input.wasPressed('p', 'P', 'Escape')) {
        this.state = 'paused';
        this.audio.click();
      }
      return;
    }

    if (this.state === 'paused') {
      const click = input.consumeClick();
      if ((click && this.inRect(click.x, click.y, this.buttons.resume)) || input.wasPressed('p', 'P', 'Escape', 'Enter')) {
        this.state = 'playing';
        this.audio.click();
      } else if ((click && this.inRect(click.x, click.y, this.buttons.restartPause)) || input.wasPressed('r', 'R')) {
        this.startRun();
      }
      return;
    }

    if (this.state === 'levelup') {
      const click = input.consumeClick();
      let picked = -1;
      if (click) {
        this.levelCardRects.forEach((r, i) => {
          if (this.inRect(click.x, click.y, r)) picked = i;
        });
      }
      if (picked === -1) {
        if (input.wasPressed('1')) picked = 0;
        if (input.wasPressed('2')) picked = 1;
        if (input.wasPressed('3')) picked = 2;
      }
      if (picked >= 0 && picked < this.levelChoices.length) {
        applyUpgrade(this, this.levelChoices[picked]);
        this.levelChoices = [];
        this.levelCardRects = [];
        if (this.pendingLevels > 0) {
          this.pendingLevels -= 1;
          this.levelChoices = rollUpgradeChoices(this);
          this.state = 'levelup';
        } else {
          this.state = 'playing';
        }
      }
      return;
    }

    if (this.state === 'victory' || this.state === 'gameover') {
      const click = input.consumeClick();
      if ((click && this.inRect(click.x, click.y, this.buttons.again)) || input.wasPressed('Enter', 'r', 'R')) {
        this.audio.click();
        this.startRun();
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== VIEW_W * dpr || this.canvas.height !== VIEW_H * dpr) {
      this.canvas.width = VIEW_W * dpr;
      this.canvas.height = VIEW_H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Screen shake: a decaying random offset in screen space.
    // Deterministic shake (a sine hash of game time) so ?shot= scenes replay.
    const sx = this.shake > 0 ? Math.sin(this.time * 127.1) * this.shake : 0;
    const sy = this.shake > 0 ? Math.cos(this.time * 149.7) * this.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    if (this.state === 'start') {
      // Title over a quiet arena: camera parked at the centre.
      this.camera.x = clamp(this.player.x - VIEW_W / 2, 0, 2200 - VIEW_W);
      this.camera.y = clamp(this.player.y - VIEW_H / 2, 0, 1500 - VIEW_H);
      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);
      drawArena(this, ctx);
      ctx.restore();
      ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawStart(this, ctx);
      ctx.restore();
      return;
    }

    // World space.
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    drawArena(this, ctx);
    drawCombat(this, ctx);
    for (const e of this.enemies) drawEnemy(this, ctx, e);
    drawPlayer(this, ctx);
    this.particles.draw(ctx);
    ctx.restore();

    // Screen space: darkness, HUD, menus.
    drawDarkness(this, ctx);
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'levelup') {
      drawHUD(this, ctx);
    }
    if (this.state === 'paused') drawPaused(this, ctx);
    if (this.state === 'levelup') drawLevelUp(this, ctx);
    if (this.state === 'victory') drawVictory(this, ctx);
    if (this.state === 'gameover') drawGameOver(this, ctx);
    ctx.restore();
  }
}

export function boot(canvas) {
  const params = new URLSearchParams(window.location.search);
  const seed = params.has('seed') ? Number(params.get('seed')) || 1 : undefined;
  const shot = params.get('shot') || null;
  const game = new Game(canvas, { seed, shot });
  // Exposed for automated playtests and debugging only.
  window.__EMBERFALL__ = game;
  game.debug = {
    killAll() {
      for (const e of [...game.enemies]) damageEnemy(game, e, 1e9);
    },
    hurt(n) {
      game.player.invuln = 0;
      damagePlayer(game, n);
    },
    skipToWave(n) {
      game.enemies = [];
      game.bullets = [];
      game.enemyBullets = [];
      game.embers = [];
      game.boss = null;
      game.waves.betweenWaves = 0;
      game.waves.startWave(n);
    },
    giveXp(n) {
      game.embers.push({
        x: game.player.x + 10, y: game.player.y, vx: 0, vy: 0,
        value: n, bob: 0, life: 25,
      });
    },
  };
  if (shot) {
    setupShotScene(game, shot);
    game.render();
  } else {
    game.start();
  }
  return game;
}
