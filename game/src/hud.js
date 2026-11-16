// EMBERFALL — HUD and every menu screen.
// One job: all 2D interface drawing (start, HUD, pause, level-up, victory,
// game over) in screen space, plus the buttons the game clicks on.
// Buttons are described as rects so main.js can hit-test them.

import { COLORS, VIEW_W, VIEW_H, WIN_WAVE } from './config.js';

export const FONT = '"Trebuchet MS", Verdana, sans-serif';

function bar(ctx, x, y, w, h, frac, fill, bg = COLORS.hpBg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function button(ctx, rect, label, sub = null) {
  const hover = rect.hover;
  ctx.fillStyle = hover ? 'rgba(255, 179, 71, 0.28)' : 'rgba(255, 179, 71, 0.14)';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = COLORS.ember;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold ${sub ? 22 : 26}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 - (sub ? 10 : 0));
  if (sub) {
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
  }
  ctx.textBaseline = 'alphabetic';
}

// --- HUD (drawn over play, pause and level-up) ---------------------------

export function drawHUD(G, ctx) {
  const p = G.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: HP bar, XP bar, level.
  ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
  ctx.fillRect(14, 12, 300, 64);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText('❤  LANTERN KEEPER', 24, 32);
  bar(ctx, 24, 38, 220, 12, p.hp / p.maxHp, '#ff5a5a');
  ctx.fillStyle = COLORS.text;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 250, 49);
  bar(ctx, 24, 54, 220, 7, p.xp / p.xpNeed, COLORS.xp);
  ctx.fillStyle = COLORS.xp;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`LV ${p.level}`, 250, 62);

  // Top-center: wave and foes left.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
  ctx.fillRect(VIEW_W / 2 - 150, 12, 300, 52);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`WAVE ${G.wave} / ${WIN_WAVE}`, VIEW_W / 2, 34);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = COLORS.dim;
  const left = G.enemies.length + G.waves.queue.length + (G.boss ? 0 : 0);
  ctx.fillText(G.boss ? '☠  THE NIGHT HERALD  ☠' : `${left} shadows remain`, VIEW_W / 2, 54);

  // Top-right: score, kills, time.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
  ctx.fillRect(VIEW_W - 314, 12, 300, 64);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`SCORE ${G.score}`, VIEW_W - 24, 36);
  ctx.fillStyle = COLORS.text;
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`☠ ${G.kills} kills    ⏱ ${fmtTime(G.playTime)}`, VIEW_W - 24, 58);

  // Bottom-left: dash cooldown + active boons.
  const dashFrac = 1 - Math.max(0, p.dashCd) / p.dashCdMax;
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
  ctx.fillRect(14, VIEW_H - 52, 300, 38);
  ctx.fillStyle = COLORS.dim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText('SPACE — dash', 24, VIEW_H - 32);
  bar(ctx, 130, VIEW_H - 40, 110, 8, dashFrac, dashFrac >= 1 ? COLORS.ember : '#5a6a9a');
  ctx.fillStyle = COLORS.text;
  ctx.font = `13px ${FONT}`;
  const boons = [];
  if (p.scatter > 1) boons.push(`✦×${p.scatter}`);
  if (p.orbitBlades > 0) boons.push(`🌀×${p.orbitBlades}`);
  if (p.novaLevel > 0) boons.push(`💥Lv${p.novaLevel}`);
  if (p.regen > 0) boons.push('🌿');
  if (boons.length > 0) ctx.fillText(boons.join('  '), 250, VIEW_H - 32);

  // Boss health bar, top-center under the wave plate.
  if (G.boss) {
    const b = G.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5, 6, 16, 0.6)';
    ctx.fillRect(VIEW_W / 2 - 260, 72, 520, 30);
    ctx.fillStyle = COLORS.boss;
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText('☠  NIGHT HERALD  ☠', VIEW_W / 2, 86);
    bar(ctx, VIEW_W / 2 - 250, 90, 500, 8, b.hp / b.maxHp, '#e5484d');
  }

  // Wave banner across the middle.
  if (G.bannerT > 0) {
    const a = Math.min(1, G.bannerT);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5, 6, 16, 0.55)';
    const bw = ctx.measureText(G.banner).width + 80;
    ctx.fillRect(VIEW_W / 2 - bw / 2 - 40, 150, bw + 80, 54);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(G.banner, VIEW_W / 2, 186);
    ctx.globalAlpha = 1;
  }

  // Controls hint, first seconds of wave 1 only.
  if (G.wave === 1 && G.playTime < 6 && G.state === 'playing') {
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('WASD move  ·  Mouse aim  ·  Hold click to fire  ·  SPACE dash  ·  P pause  ·  M mute',
      VIEW_W / 2, VIEW_H - 66);
    ctx.globalAlpha = 1;
  }
}

// --- Screens --------------------------------------------------------------

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(5, 6, 16, 0.8)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function titleGlow(ctx, cx, cy, r, color) {
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStart(G, ctx) {
  // The arena behind the title, with drifting embers.
  titleGlow(ctx, VIEW_W / 2, 300, 340, 'rgba(255, 170, 60, 0.20)');
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ember;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText('✦  THE LAST LIGHT STANDS  ✦', VIEW_W / 2, 168);
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 96px ${FONT}`;
  ctx.fillText('EMBERFALL', VIEW_W / 2, 268);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `22px ${FONT}`;
  ctx.fillText('You are the last Lantern Keeper. Hold the arena through 10 waves of night.', VIEW_W / 2, 312);
  ctx.fillStyle = COLORS.dim;
  ctx.font = `17px ${FONT}`;
  ctx.fillText('Slay shadows · gather their embers · choose your blessings · fell the Night Herald', VIEW_W / 2, 344);

  button(ctx, G.buttons.start, 'LIGHT THE LANTERN', 'click or press Enter');
  G.buttons.start.hover = false;

  ctx.fillStyle = COLORS.dim;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('WASD / Arrows — move      Mouse — aim      Hold Click — fire      SPACE — dash      P — pause      M — mute',
    VIEW_W / 2, 560);
  ctx.fillText('4 shadow kinds · a boss every 5 waves · win by felling the Herald of Wave 10',
    VIEW_W / 2, 588);
  ctx.fillStyle = 'rgba(170, 176, 214, 0.7)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText('An original game · all art drawn in code · all sound synthesized live · no downloads', VIEW_W / 2, 640);
}

export function drawPaused(G, ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText('PAUSED', VIEW_W / 2, 260);
  ctx.fillStyle = COLORS.dim;
  ctx.font = `18px ${FONT}`;
  ctx.fillText(`Wave ${G.wave}  ·  Score ${G.score}  ·  ${fmtTime(G.playTime)}`, VIEW_W / 2, 300);
  button(ctx, G.buttons.resume, 'RESUME', 'P or click');
  button(ctx, G.buttons.restartPause, 'RESTART RUN', 'R');
}

export function drawLevelUp(G, ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillText('LEVEL UP!', VIEW_W / 2, 150);
  ctx.fillStyle = COLORS.text;
  ctx.font = `19px ${FONT}`;
  ctx.fillText(`The lantern burns brighter — choose a blessing (click or press 1 / 2 / 3)`, VIEW_W / 2, 188);

  const cards = G.levelChoices;
  const cw = 300;
  const ch = 220;
  const gap = 36;
  const total = cards.length * cw + (cards.length - 1) * gap;
  const x0 = (VIEW_W - total) / 2;
  const y0 = 250;
  G.levelCardRects = [];
  cards.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const rect = { x, y: y0, w: cw, h: ch, hover: false };
    G.levelCardRects.push(rect);
    ctx.fillStyle = rect.hover ? 'rgba(255, 179, 71, 0.22)' : 'rgba(20, 24, 48, 0.9)';
    ctx.fillRect(x, y0, cw, ch);
    ctx.strokeStyle = COLORS.ember;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y0, cw, ch);
    ctx.fillStyle = COLORS.text;
    ctx.font = '40px sans-serif';
    ctx.fillText(u.icon, x + cw / 2, y0 + 62);
    ctx.font = `bold 21px ${FONT}`;
    ctx.fillText(u.name, x + cw / 2, y0 + 108);
    ctx.fillStyle = COLORS.dim;
    ctx.font = `16px ${FONT}`;
    // Wrap the description to two lines if needed.
    const words = u.desc.split(' ');
    let line = '';
    let ly = y0 + 142;
    for (const w of words) {
      if (ctx.measureText(`${line} ${w}`.trim()).width > cw - 36 && line) {
        ctx.fillText(line, x + cw / 2, ly);
        line = w;
        ly += 22;
      } else {
        line = `${line} ${w}`.trim();
      }
    }
    if (line) ctx.fillText(line, x + cw / 2, ly);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y0 + ch - 18);
  });
}

function drawStats(G, ctx, y0) {
  const rows = [
    ['SCORE', String(G.score)],
    ['WAVES CLEARED', String(G.state === 'victory' ? WIN_WAVE : Math.max(0, G.wave - 1))],
    ['SHADOWS SLAIN', String(G.kills)],
    ['LEVEL REACHED', String(G.player.level)],
    ['TIME', fmtTime(G.playTime)],
  ];
  ctx.font = `19px ${FONT}`;
  rows.forEach(([label, value], i) => {
    const y = y0 + i * 34;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(label, VIEW_W / 2 - 12, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(value, VIEW_W / 2 + 12, y);
  });
}

export function drawVictory(G, ctx) {
  dimScreen(ctx);
  titleGlow(ctx, VIEW_W / 2, 210, 300, 'rgba(255, 210, 100, 0.22)');
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('DAWN BREAKS', VIEW_W / 2, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = `21px ${FONT}`;
  ctx.fillText('The Night Herald is fallen. The lantern still burns — you kept the light.', VIEW_W / 2, 232);
  drawStats(G, ctx, 300);
  button(ctx, G.buttons.again, 'PLAY AGAIN', 'click or press Enter');
}

export function drawGameOver(G, ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('THE LIGHT FADES', VIEW_W / 2, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = `21px ${FONT}`;
  ctx.fillText(`The shadows take the arena on Wave ${G.wave}. The lantern can be lit again.`, VIEW_W / 2, 232);
  drawStats(G, ctx, 300);
  button(ctx, G.buttons.again, 'TRY AGAIN', 'click or press Enter');
}
