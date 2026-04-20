# Gravel V2 — Upgrade Plan

A roadmap to evolve Gravel from its current proof-of-concept into a full 2D action-platformer. This document captures the analysis of the existing code, the bugs that must be fixed, and the feature set planned for V2.

---

## 1. Analysis of the Current Build (V1)

### 1.1 What exists
- **Architecture:** Canvas-based, ES modules. `Game` class owns `Background1`, `Player`, `InputHandler`, and an `enemies[]` array.
- **Player:** Finite-state machine with 15 states (idle/run/kneel/jump/fall/stand/die/attack, each mirrored left/right). Sprite sheet at `assets/run.png` (32×32 cells).
- **Enemies:** Three types — `Sprout`, `Seeker`, `Golem`. Each has its own FSM (`MoveLeft/Right`, `AttackLeft/Right`, `HitLeft/Right`, `Die`).
- **Background:** 9-layer parallax from `assets/backgrounds/level1`.
- **Controls (AZERTY):** `q`/`d` move, `z` jump, `s` kneel, `space` attack, `a` pause, `e` debug toggle, `r` restart.

### 1.2 Unused assets already in the repo
- `assets/backgrounds/level 2/` (6 hill layers) — Level 2 background.
- `assets/backgrounds/NightForest/` — Level 3 / boss arena candidate.
- `assets/enemies/level 1/hell-beast-*.png` — fourth unused enemy ("Hell Beast" — breath/burn/idle).
- `assets/enemies/level 1/Old_Golem_bullet.png`, `Old_Golem_spit.png` — Golem projectile attack.
- `assets/enemies/level 1/skeleton_seeker_spawn.png` — Seeker spawn animation.

---

## 2. Known Bugs to Fix in V2

### 2.1 Critical
1. **Restart is broken.** `input.js:19` calls `game.restartGame()`, but `game.js:91` defines `restart()` with an empty body. Pick one name and actually reset `lives`, `enemies`, `enemyTimer`, `gameOver`, player position, and state.
2. **Player cannot die from enemies.** Enemy collision detection returns `true` then does nothing (`player.js:155` — `// Handle collision actions here`). No damage is ever applied to the player.
3. **`gameOver` never triggers.** `Die.enter()` (`playerStates.js:410`) checks `frameX >= maxFrame` at the moment of entering the state — always false. The check must run during updates, not on enter.
4. **Enemy hit-handling uses `setTimeout` inside per-frame transitions** (`enemiesStates.js:247-254` and `:295-302`). This queues a new timer every frame, causing runaway decrements of `enemy.lives` and repeated state changes. Replace with a one-shot hit flag + hit-animation timer.
5. **`enemy.lives` check uses `==` and can go negative** (`enemiesStates.js:63, 111, 159, 207`). Use `<= 0` and clamp.
6. **Dead state comparison is wrong type.** `AttackLeft.HandleInput` compares `player.currentState === states.JUMP_LEFT`, i.e., a `State` instance against the integer `6`. Always false. Compare against `player.states[states.JUMP_LEFT]` or track state by id.
7. **`game.speed` is recomputed weirdly.** `playerMovement` overwrites `game.speed = speedX`, while `setState` also sets `game.speed = maxSpeed * speed`. The two paths fight each other; enemy movement and parallax inherit whichever wins that frame. Make `game.speed` derived from a single source (the current state's intent).
8. **Sprout spawn x-position bug.** `Math.random() * this.game.width - this.width` has wrong operator precedence — can produce negative x. Use `Math.random() * (this.game.width - this.width)` (Seeker already does this).
9. **Golem is drawn mirrored.** `Golem.draw` inverts the flip test (`if (!this.toLeft)` instead of `if (this.toLeft)`), so it always faces the wrong way.

### 2.2 Gameplay/UX
10. **Start-up facing.** Game constructs with `IdleLeft` as the first state, so the player spawns facing left even though the run sprite is right-facing by default. Default to `IdleRight`.
11. **Debug key mismatch.** `index.html` tells the user "press D to toggle debug", but code uses `e` (`input.js:15`). Pick one.
12. **Pause key mismatch.** HTML says "press A to run or pause", and code does listen on `a`. Rename in-game to `P` for clarity.
13. **Attack input gated oddly.** `player.js:146-151` only registers an attack after `attackInterval` has already elapsed; the *first* attack also has to wait. Flip the logic: on press, if cooldown is ready, fire and reset timer.
14. **Player hitbox used only for attacks.** Enemy→player damage has no hitbox; enemy AABB vs player full AABB is used for movement AI instead. Introduce separate `hurtBox` (where the player *can be hit*) and `hitBox` (where the player *hits*) — same for enemies.
15. **`maxEnemies = 1` is too low** for a real encounter; tune after wave system is in.
16. **Parallax bounce.** `Layer.update` has both `this.x <= -this.width` and `this.x >= this.width` reset branches, but layer 1 has `speedModifier = 0`, so if the player runs only one direction the x never wraps cleanly on direction change — minor, but worth auditing.
17. **Keyboard layout is AZERTY-locked.** Add WASD aliases (and arrow-key support) alongside the current QZSD bindings.

---

## 3. V2 Feature Set

### 3.1 Advanced Player Health
- **HP system** replacing `lives` counter: `maxHp`, `hp`, `armor`. Damage = `enemyDamage - armor` (min 1).
- **Health bar HUD** drawn at top-left, with segmented hearts or a bar + number.
- **Invincibility frames (i-frames):** after taking damage, player flashes and is immune for ~800 ms.
- **Hurt state:** new `HurtLeft` / `HurtRight` states that play a knockback animation and briefly lock input.
- **Healing:** pickups (hearts) that drop from enemies with low probability; a rare **potion** item that fully heals.
- **Stamina bar** (optional, stretch): dashing and heavy attacks consume stamina, which regenerates over time.
- **Death flow:** on HP ≤ 0, trigger `Die` state; after death animation ends, show a "Game Over — press R to restart" overlay; `R` actually resets the world (see bug #1).

### 3.2 Level System & Goals
- **Level manager** (`levels.js`): each level defines background, enemy pool, spawn pattern, goal, boss.
- **Three initial levels** using existing art:
  1. **Forest (level1 bg)** — kill-count goal: defeat N enemies (Sprouts, Seekers).
  2. **Hills (level 2 bg)** — reach-the-end goal: scroll a finite distance while surviving waves; introduces Golem.
  3. **Night Forest (NightForest bg)** — boss arena goal: defeat **Hell Beast** (new boss, see §3.4).
- **Progress tracking:** level goal widget in the top-right (e.g., `Enemies: 7/10` or distance bar).
- **Level transitions:** short cut-to-black fade, level title card ("Chapter 1 — The Gravel Road"), unlocks persistence via `localStorage`.
- **Checkpoints** within a level at fixed x-distances so death doesn't always restart from 0.
- **Score & combo:** kill streak multiplier, score shown in HUD, high score saved to `localStorage`.

### 3.3 Player Powers
- **Double jump** — consumes a jump charge; refills on ground.
- **Dash** — short horizontal burst on `Shift`; i-frames during the dash window; cooldown.
- **Heavy attack** — `Shift + Space`; higher damage, slower, costs stamina.
- **Ranged throw** — `F` launches a projectile (new sprite or a reused pebble) with limited ammo.
- **Power-up pickups** (stretch): temporary damage boost, speed boost, shield.
- **Skill unlock tree** (stretch): complete a level to unlock one power; persists via `localStorage`.

### 3.4 Advanced Monster Capabilities
- **Proper AI states:** `Patrol`, `Chase`, `Alert`, `Attack`, `Retreat`, `Stunned`, `Die`. Sight radius triggers `Alert→Chase`.
- **Per-enemy stats** pulled into a data table (HP, damage, speed, aggro range, attack cooldown).
- **Sprout** — fast melee swarmer; gains a leap attack when below 50% HP.
- **Seeker** — ignores terrain, lunges at player, uses the unused `skeleton_seeker_spawn.png` for a rising-from-ground spawn animation.
- **Golem** — heavy melee, uses `Old_Golem_bullet.png` / `Old_Golem_spit.png` for a ranged spit attack at medium distance. Armor stat reduces incoming damage.
- **Hell Beast (new, boss candidate)** — uses the already-present `hell-beast-idle/breath/burn` sprites. Flame-breath projectile, multi-phase fight (phase 1: breath; phase 2: burn-ground hazard patches after 50% HP). Level 3 boss.
- **Spawner logic:** director system replaces simple timer — picks enemy types based on level definition and current difficulty; caps active enemies; spawns off-screen at edges.
- **Elite variants** (stretch): recolored/bigger enemies with a modifier (fast, armored, healer).
- **Knockback on hit** for both player and enemies, so combat has impact.

### 3.5 Visual / Game-Feel Polish
- **Screen shake** on heavy hits and boss attacks.
- **Hit flash** — enemy sprite tinted white for 2 frames on damage.
- **Damage numbers** floating upward on impact.
- **Particle effects** for dust on landing, dash trail, attack slashes.
- **Proper camera** that follows the player within bounds, instead of the player being fixed to center while the world scrolls.
- **Title screen + pause menu** (not just a silent `gamePaused` flag).

### 3.6 Audio
- Background music per level (loopable).
- SFX bank: jump, attack swing, hit impact, enemy death, pickup, boss roar.
- Master / music / SFX volume sliders, persisted to `localStorage`.

### 3.7 Save & Persistence
- `localStorage` keys for: best level reached, high score, unlocked powers, audio settings.
- "Continue" button on title screen loads last unlocked level.

---

## 4. Proposed File Layout (V2)

```
Gravel/
  index.html
  style.css
  src/
    game.js              # Game class, main loop
    input.js             # Keyboard + (stretch) gamepad
    camera.js            # NEW — viewport + shake
    hud.js               # NEW — HP bar, score, goal, timers
    audio.js             # NEW — SFX + music manager
    save.js              # NEW — localStorage wrapper
    levels/
      levelManager.js    # NEW — loads a level, handles goals/transitions
      level1.js
      level2.js
      level3.js
    entities/
      player.js
      playerStates.js
      projectile.js      # NEW
      pickup.js          # NEW
      enemies/
        enemy.js         # base class
        enemyStates.js
        sprout.js
        seeker.js
        golem.js
        hellBeast.js     # NEW boss
        spawner.js       # NEW director
    fx/
      particles.js       # NEW
      damageNumbers.js   # NEW
    ui/
      titleScreen.js     # NEW
      pauseMenu.js       # NEW
      gameOver.js        # NEW
```

Split is optional — the important part is separating **systems** (camera, hud, audio, save) from **entities** (player/enemies/pickups) from **levels**.

---

## 5. Implementation Roadmap (milestones)

Each milestone should leave the game playable end-to-end.

### M1 — Stabilize V1 *(bug-fix sprint)*
Fixes §2.1 items 1–9 and §2.2 items 10–17. After M1 the game has no broken features; no new gameplay added yet.

### M2 — Core health & combat loop
- `hp` / `hurtBox` / `hitBox` refactor.
- Player i-frames + hurt state.
- HUD health bar.
- Score + simple kill counter.

### M3 — Level system + goal widget
- `LevelManager`, level-1 goal (defeat N enemies), transition to level-2 (reach distance).
- Title card + game-over overlay + working restart.

### M4 — Player powers
- Double jump, dash, heavy attack, ranged throw.
- Stamina bar.

### M5 — Advanced AI + Golem projectile
- Patrol/chase/alert states, sight radius.
- Golem spit attack using existing bullet sprite.
- Knockback, hit flash, damage numbers.

### M6 — Level 3 + Hell Beast boss
- NightForest background wiring.
- Hell Beast entity + multi-phase fight.
- Victory screen.

### M7 — Polish pass
- Audio (music + SFX).
- Particles, screen shake.
- Save/continue, high score.
- Title screen + pause menu.
- Camera follow + edge-of-world logic.

### M8 *(stretch)*
- Elite enemy variants, skill tree, gamepad support, mobile touch overlay.

---

## 6. Open Questions (decide before M2)

1. **Keyboard:** default to WASD + arrows, keep QZSD as alternatives, or pick one?
2. **Art pipeline:** are new assets (hearts, HUD, projectiles, Hell Beast polish) being sourced from the same asset pack, or drawn from scratch?
3. **Resolution:** keep fixed 1200×793, or make the canvas responsive to viewport (affects camera design)?
4. **Persistence scope:** `localStorage` only, or is an account/cloud save out of scope?
5. **Difficulty curve:** free-play (no lives, unlimited retries) vs. classic (limited continues)?

Answers shape M3 and M7 specifically.
