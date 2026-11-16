// EMBERFALL — level-up upgrades.
// One job: the upgrade pool, rolling three distinct choices, and applying them.
// Each upgrade has a stack cap; exhausted ones leave the pool.

export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'Ember Rounds', icon: '🔥', max: 5,
    desc: '+25% bullet damage',
    apply: (p) => { p.damage *= 1.25; },
  },
  {
    id: 'firerate', name: 'Rapid Wick', icon: '⚡', max: 5,
    desc: '+20% fire rate',
    apply: (p) => { p.fireRate *= 1.2; },
  },
  {
    id: 'speed', name: 'Swift Boots', icon: '💨', max: 4,
    desc: '+12% move speed',
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'maxhp', name: 'Stout Heart', icon: '❤️', max: 5,
    desc: '+25 max HP and heal 25',
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'dash', name: 'Smoke Step', icon: '🌫️', max: 4,
    desc: 'Dash recharges 25% faster',
    apply: (p) => { p.dashCdMax = Math.max(0.9, p.dashCdMax * 0.75); },
  },
  {
    id: 'scatter', name: 'Split Flame', icon: '✦', max: 2,
    desc: '+1 projectile per shot',
    apply: (p) => { p.scatter += 1; },
  },
  {
    id: 'orbit', name: 'Orbiting Blades', icon: '🌀', max: 3,
    desc: '+1 blade circling you (12 dmg on touch)',
    apply: (p) => { p.orbitBlades += 1; },
  },
  {
    id: 'nova', name: 'Nova Burst', icon: '💥', max: 3,
    desc: 'A shockwave erupts around you every 6s',
    apply: (p) => { p.novaLevel += 1; },
  },
  {
    id: 'magnet', name: 'Ember Lure', icon: '🧲', max: 3,
    desc: '+45% ember pickup radius',
    apply: (p) => { p.magnetR *= 1.45; },
  },
  {
    id: 'regen', name: 'Warmth Within', icon: '🌿', max: 3,
    desc: 'Regenerate +0.8 HP per second',
    apply: (p) => { p.regen += 0.8; },
  },
];

export function rollUpgradeChoices(G) {
  const taken = G.upgradeStacks;
  const available = UPGRADE_POOL.filter((u) => (taken[u.id] || 0) < u.max);
  const pool = available.length >= 3 ? available : UPGRADE_POOL.filter((u) => (taken[u.id] || 0) < u.max + 99);
  const picks = [];
  const copy = pool.slice();
  while (copy.length > 0 && picks.length < 3) {
    picks.push(copy.splice(Math.floor(G.rng() * copy.length), 1)[0]);
  }
  return picks;
}

export function applyUpgrade(G, upgrade) {
  const p = G.player;
  G.upgradeStacks[upgrade.id] = (G.upgradeStacks[upgrade.id] || 0) + 1;
  upgrade.apply(p);
  G.particles.ring(p.x, p.y, 120, '#7ee787', 4);
  G.particles.floatText(p.x, p.y - 34, upgrade.name, '#7ee787', 20);
  G.audio.levelUp();
}
