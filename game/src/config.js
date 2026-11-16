// EMBERFALL — tuning constants and small math helpers.
// One job: every number the rest of the game balances against lives here,
// so tuning never means hunting through gameplay code.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const ARENA_W = 2200;
export const ARENA_H = 1500;
export const WIN_WAVE = 10;
export const BOSS_EVERY = 5;

// Palette: warm ember light against a cold dark arena.
export const COLORS = {
  bg: '#0b0d1a',
  bg2: '#12142a',
  floorLine: 'rgba(120, 130, 200, 0.10)',
  ember: '#ffb347',
  emberHot: '#ff7b24',
  emberCore: '#ffe9a8',
  hp: '#ff5a5a',
  hpBg: 'rgba(255, 255, 255, 0.14)',
  xp: '#7ee787',
  gold: '#ffd166',
  text: '#f5efe0',
  dim: '#aab0d6',
  shade: '#8b7ff0',
  brute: '#c96f4a',
  spitter: '#7fd08b',
  boss: '#e5484d',
};

// Deterministic RNG (mulberry32) so screenshot scenes replay exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Pick `n` distinct entries from an array using the game's RNG.
export function pickDistinct(rng, arr, n) {
  const copy = arr.slice();
  const out = [];
  while (copy.length > 0 && out.length < n) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}
