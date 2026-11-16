# emberfall

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/locky504/emberfall/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/locky504/emberfall/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

EMBERFALL — a 2D arena survival game: you are the last Lantern Keeper, holding a ring of light against ten waves of living shadow.

## Run it

```sh
node serve.ts
```

## The game

Darkness is closing in. As the last Lantern Keeper you stand in a ruined arena with only your lantern, your wits, and a dash that leaves smoke behind you. Shadows come in waves — fast Emberlings, chasing Shades, long-range Spitters, hulking Brutes — and every fifth wave the Night Herald itself descends. Slay them, gather the embers they drop, and level up to choose blessings: split flame, orbiting blades, nova bursts, a faster dash, a stouter heart. Fell the Herald of Wave 10 and dawn breaks. Fall, and the light fades.

- **Goal:** survive all 10 waves and defeat the Wave 10 boss; lose if your lantern goes out.
- **Controls:** WASD / arrows to move, mouse to aim, hold click to fire, SPACE to dash (brief invulnerability), P to pause, M to mute.
- **Depth:** 10 stackable upgrades with real build choices, 4 enemy kinds plus a boss with radial bullet bursts and minion summons, scaling waves, score / kills / timer tracking.
- **Feel:** hit particles, white hit-flash, screen shake, floating damage numbers, ember magnet pickups, wave banners, a boss health bar, a hurt vignette, and fully synthesized WebAudio sound effects over an ambient drone — no audio files.
- **Look:** all art is drawn procedurally in code (no image files at all), in one palette: warm ember gold against cold dark blue, with a lantern light that pushes the darkness back.

## Layout

```
game/
  index.html          page + canvas shell
  src/
    main.js           bootstrap, game loop, state machine
    config.js         tuning constants, palette, seeded RNG
    input.js          keyboard + mouse, logical 1280x720 coordinates
    audio.js          synthesized SFX + ambient drone (WebAudio)
    particles.js      sparks, damage numbers, shockwave rings
    player.js         the Lantern Keeper: movement, dash, lantern
    enemies.js        4 enemy kinds + Night Herald boss AI and art
    waves.js          wave director: spawning, boss waves, clear bonus
    upgrades.js       level-up pool: 10 blessings, roll 3 / pick 1
    combat.js         firing, bullets, pickups, damage, death, XP
    render.js         arena floor, camera, lantern darkness
    hud.js            HUD, start / pause / level-up / victory / defeat
    shots.js          deterministic screenshot scenes (?shot=...)
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=dvanqqs1&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
