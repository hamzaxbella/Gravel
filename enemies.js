// -=> enemies.js
import {
  MoveLeft,
  MoveRight,
  AttackLeft,
  AttackRight,
  Die,
  HitLeft,
  HitRight,
} from "./enemiesStates.js";

// Base enemy. Subclasses set: enemyName, sprite dimensions, scale, images,
// lives, baseSpeed. Movement direction flips the sprite; world scroll is
// added on top.
const ENEMY_STATS = {
  sprout: { hp: 2, damage: 15, speed: 1.2, aggroRange: 350, attackCooldown: 1400 },
  seeker: { hp: 3, damage: 20, speed: 1.8, aggroRange: 500, attackCooldown: 1200 },
  golem:  { hp: 10, damage: 30, speed: 0.7, aggroRange: 400, attackCooldown: 2200, armor: 3 },
};

class Enemy {
  constructor(game) {
    this.game = game;
    this.player = this.game.player;

    this.frameY = 0;
    this.maxFrame = 4;
    this.fps = 10;
    this.frameInterval = 1000 / this.fps;
    this.frameTimer = 0;

    this.toLeft = false;
    this.isAttacking = false;
    this.markedForDeletion = false;

    // Attack cooldown: enemy will not re-enter ATTACK state until this
    // timer has fully ticked down. Prevents spamming 3 attacks a second.
    this.attackCooldown = 0;
    this.attackCooldownMax = 1600;

    this.vx = 0;
    this.vy = 0;

    // baseSpeed is how many px/frame the enemy moves toward the player on
    // its OWN (independent of world scroll). Subclasses override.
    this.baseSpeed = 1;

    // true when the sprite art naturally faces LEFT (like the Golem sheet).
    // Subclasses override if their art breaks the "faces right by default"
    // convention; the draw flip is then inverted accordingly.
    this.spriteFacesLeft = false;

    // One-shot per-swing flag. Damage is applied once, at the strike
    // moment (end of the attack animation), not continuously while the
    // animation plays.
    this.hasStruck = false;

    // Combat stats. Subclasses override.
    this.damage = 1;        // HP removed per successful strike
    this.scoreValue = 10;   // points awarded on kill

    // hitBox = where THIS enemy's attack lands (in front of the body).
    // hurtBox = where the PLAYER's attack can land on this enemy (tight
    // around the torso — smaller than the sprite AABB so hits feel fair).
    // Both are rebuilt every frame by updateBoxes().
    this.hitBox = { x: 0, y: 0, width: 0, height: 0 };
    this.hurtBox = { x: 0, y: 0, width: 0, height: 0 };

    this.states = [
      new MoveLeft(this),
      new MoveRight(this),
      new AttackLeft(this),
      new AttackRight(this),
      new Die(this),
      new HitLeft(this),
      new HitRight(this),
    ];
  }

  update(deltaTime) {
    if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;

    const distToPlayer = Math.abs((this.x + this.width / 2) - (this.player.x + this.player.width / 2));
    this.isChasing = distToPlayer <= (this.aggroRange || 400);

    this.spriteAnimation(deltaTime);
    this.updateBoxes();
    this.currentState.transition(this.player, deltaTime);

    // Apply knockback velocity/gravity
    // Important : never touch the following line i want it exactly ; this.x -= this.vx;
    this.x -= this.vx;
    this.vx *= 0.9; // Friction
    this.y += this.vy;
    
    if (!this.ignoreGravity) {
      this.vy += 0.5; // Gravity
      // Simple floor collision
      const floorY = this.game.height - this.height - this.game.groundMargin;
      if (this.y >= floorY) {
        this.y = floorY;
        this.vy = 0;
      }
    } else {
      this.vy *= 0.9; // Friction on Y for flyers
      if (this.isChasing && this.currentState !== this.states[4] && this.currentState !== this.states[5] && this.currentState !== this.states[6]) {
        const targetY = this.player.y + this.player.height / 2 - this.height / 2;
        if (this.y < targetY - 10) this.y += this.baseSpeed * 0.6;
        else if (this.y > targetY + 10) this.y -= this.baseSpeed * 0.6;
      }
    }

    // Horizontal motion = world scroll + own motion toward player.
    // Dying enemies stop their own motion but MUST keep scrolling with the
    // world, otherwise the corpse appears to glide alongside the player.
    const isDying = this.currentState === this.states[4];
    const isStunned = this.currentState === this.states[5] || this.currentState === this.states[6];
    
    let currentSpeed = this.baseSpeed;
    if (!this.isChasing) currentSpeed *= 0.4;

    const ownMotion = isDying || isStunned
      ? 0
      : this.toLeft ? -currentSpeed : currentSpeed;
    this.x += ownMotion - this.game.speed;
  }

  // Rebuild the hit/hurt boxes from the current x/y/facing. Called before
  // the state transition so damage checks see up-to-date geometry.
  updateBoxes() {
    // Tight hurtBox: narrower and shorter than the full sprite AABB, so
    // near-misses feel like near-misses instead of phantom hits. Anchored
    // to the feet.
    const hw = Math.max(28, this.width * 0.55);
    const hh = Math.max(40, this.height * 0.88);
    this.hurtBox.x = this.x + (this.width - hw) / 2;
    this.hurtBox.y = this.y + this.height - hh;
    this.hurtBox.width = hw;
    this.hurtBox.height = hh;

    // hitBox: a slab extending from the leading edge outward by ~half a
    // body width. Tall enough to catch a grounded player but short enough
    // that jumping clears it.
    const reach = Math.max(44, this.width * 0.55);
    const hH = Math.max(52, this.height * 0.7);
    this.hitBox.x = this.toLeft
      ? this.x - reach + 8
      : this.x + this.width - 8;
    this.hitBox.y = this.y + this.height - hH - 4;
    this.hitBox.width = reach;
    this.hitBox.height = hH;
  }

  spriteAnimation(deltaTime) {
    if (this.frameTimer > this.frameInterval) {
      if (this.frameY < this.maxFrame) this.frameY++;
      else this.frameY = 0;
      this.frameTimer = 0;
    } else {
      this.frameTimer += deltaTime;
    }
  }

  draw(context) {
    if (this.game.debug) {
      // Body AABB (red).
      context.strokeStyle = "red";
      context.strokeRect(this.x, this.y, this.width, this.height);
      // hurtBox (cyan) — what the player's swings collide with.
      context.strokeStyle = "cyan";
      context.lineWidth = 2;
      context.strokeRect(
        this.hurtBox.x,
        this.hurtBox.y,
        this.hurtBox.width,
        this.hurtBox.height
      );
      // hitBox (yellow; solid when this enemy is mid-swing).
      context.fillStyle = this.isAttacking
        ? "rgba(255,200,0,0.55)"
        : "rgba(255,200,0,0.18)";
      context.fillRect(
        this.hitBox.x,
        this.hitBox.y,
        this.hitBox.width,
        this.hitBox.height
      );
      context.lineWidth = 1;
    }
    context.save();
    // Mirror only when the intended facing disagrees with the sprite art's
    // natural facing. This handles enemies whose art faces left by default
    // (e.g. Golem) without a second code path.
    const shouldMirror = this.toLeft !== this.spriteFacesLeft;
    if (shouldMirror) {
      context.scale(-1, 1);
      context.drawImage(
        this.image,
        0,
        this.frameY * this.SpriteHeight,
        this.SpriteWidth,
        this.SpriteHeight,
        -this.x - this.width + this.xAdjustment,
        this.y + this.yAdjustment,
        this.scaledWidth,
        this.scaledHeight
      );
    } else {
      context.drawImage(
        this.image,
        0,
        this.frameY * this.SpriteHeight,
        this.SpriteWidth,
        this.SpriteHeight,
        this.x + this.xAdjustment,
        this.y + this.yAdjustment,
        this.scaledWidth,
        this.scaledHeight
      );
    }
    context.restore();
  }

  // Body-vs-body AABB proximity. Used by Move states to decide when to
  // start winding up an attack — not for damage itself.
  checkCollision() {
    return !!(
      this.player &&
      this.x < this.player.x + this.player.width &&
      this.x + this.width > this.player.x &&
      this.y < this.player.y + this.player.height &&
      this.y + this.height > this.player.y
    );
  }

  // True while the player's swing is live AND their attack hitBox overlaps
  // THIS enemy's hurtBox — triggers HIT state.
  checkPlayerAttackHit() {
    const p = this.player;
    if (!p || !p.isAttacking || !p.hitBox) return false;
    const atk = p.hitBox;
    const h = this.hurtBox;
    return (
      h.x < atk.x + atk.width &&
      h.x + h.width > atk.x &&
      h.y < atk.y + atk.height &&
      h.y + h.height > atk.y
    );
  }

  setState(state) {
    this.currentState = this.states[state];
    this.frameY = 0;
    this.frameTimer = 0;
    this.currentState.enter(this.enemyName);
  }

  // Called once per swing at the strike moment (last animation frame).
  // Lands damage only if the enemy's hitBox still overlaps the player's
  // hurtBox AND the player is grounded — so the animation plays through
  // to completion, and a well-timed jump dodges the hit.
  tryStrike() {
    if (this.hasStruck) return;
    this.hasStruck = true;

    const p = this.player;
    if (!p) return;
    if (this.game.hp <= 0) return;
    if (p.invincibleTimer > 0) return;
    if (!p.isOnGround) return;
    if (!this.hitBoxOverlapsPlayer()) return;

    p.takeDamage(this.damage, this.x);
  }

  hitBoxOverlapsPlayer() {
    const a = this.hitBox;
    const b = this.player?.hurtBox;
    if (!b) return false;
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Spawn just off-screen on either the left or the right edge, moving
  // inward. Predictable + readable.
  pickSpawnPosition() {
    const spawnRight = Math.random() < 0.5;
    this.x = spawnRight ? this.game.width + 10 : -this.width - 10;
    this.toLeft = spawnRight;
  }
}

// LEVEL 1 ENEMIES -----------------------------------------------------------

export class Sprout extends Enemy {
  constructor(game) {
    super(game);
    this.enemyName = "sprout";
    
    const stats = ENEMY_STATS.sprout;
    this.lives = stats.hp; this.maxLives = stats.hp;
    this.armor = stats.armor || 0;
    this.damage = stats.damage;
    this.baseSpeed = stats.speed;
    this.attackCooldownMax = stats.attackCooldown;
    this.aggroRange = stats.aggroRange;
    
    this.SpriteWidth = 96;
    this.SpriteHeight = 96;
    this.width = this.SpriteWidth;
    this.height = this.SpriteHeight;
    this.scaledWidth = this.SpriteWidth * 2.5;
    this.scaledHeight = this.SpriteHeight * 2.5;
    this.xAdjustment = (this.width - this.scaledWidth) / 2;
    this.yAdjustment = -this.height;
    this.y = this.game.height - this.height - this.game.groundMargin;
    this.maxFrame = 4;
    
    this.sproutIdleImage = document.getElementById("sproutIdle");
    this.sproutMoveImage = document.getElementById("sproutMove");
    this.sproutDamageImage = document.getElementById("sproutDamage");
    this.sproutAttackImage = document.getElementById("sproutAttack");
    this.sproutDeathImage = document.getElementById("sproutDeath");
    this.image = this.sproutMoveImage;

    this.pickSpawnPosition();
    this.currentState = this.states[this.toLeft ? 0 : 1];
    this.currentState.enter(this.enemyName);
  }
}

export class Seeker extends Enemy {
  constructor(game) {
    super(game);
    this.enemyName = "seeker";
    this.ignoreGravity = true;
    
    const stats = ENEMY_STATS.seeker;
    this.lives = stats.hp; this.maxLives = stats.hp;
    this.armor = stats.armor || 0;
    this.damage = stats.damage;
    this.baseSpeed = stats.speed;
    this.attackCooldownMax = stats.attackCooldown;
    this.aggroRange = stats.aggroRange;

    this.SpriteWidth = 120;
    this.SpriteHeight = 120;
    this.width = this.SpriteWidth;
    this.height = this.SpriteHeight;
    this.scaledWidth = this.SpriteWidth * 1.5;
    this.scaledHeight = this.SpriteHeight * 1.5;
    this.xAdjustment = (this.width - this.scaledWidth) / 2;
    this.yAdjustment = (this.height - this.scaledHeight) / 2;
    this.y = this.game.height - this.height - this.game.groundMargin;
    this.maxFrame = 5;
    
    this.seekerIdleImage = document.getElementById("seekerIdle");
    this.seekerMoveImage = document.getElementById("seekerMove");
    this.seekerDamageImage = document.getElementById("seekerDamage");
    this.seekerAttackImage = document.getElementById("seekerAttack");
    this.seekerDeathImage = document.getElementById("seekerDeath");
    this.image = this.seekerMoveImage;

    this.pickSpawnPosition();
    this.currentState = this.states[this.toLeft ? 0 : 1];
    this.currentState.enter(this.enemyName);
  }
}

export class Golem extends Enemy {
  constructor(game) {
    super(game);
    this.enemyName = "golem";

    const stats = ENEMY_STATS.golem;
    this.lives = stats.hp;
    this.maxLives = stats.hp;
    this.armor = stats.armor || 0;
    this.damage = stats.damage;
    this.baseSpeed = stats.speed;
    this.attackCooldownMax = stats.attackCooldown;
    this.aggroRange = stats.aggroRange;

    this.SpriteWidth = 160;
    this.SpriteHeight = 160;
    this.width = this.SpriteWidth;
    this.height = this.SpriteHeight;
    this.scaledWidth = this.SpriteWidth * 2.5;
    this.scaledHeight = this.SpriteHeight * 2.5;
    this.xAdjustment = (this.width - this.scaledWidth) / 2;
    this.yAdjustment = -this.height;
    this.y = this.game.height - this.height - this.game.groundMargin;
    this.maxFrame = 5;
    this.lives = 4;
    this.baseSpeed = 0.5;
    this.attackCooldownMax = 2100;
    this.spriteFacesLeft = true; // Golem spritesheet is drawn facing left

    this.golemIdleImage = document.getElementById("golemIdle");
    this.golemMoveImage = document.getElementById("golemMove");
    this.golemDamageImage = document.getElementById("golemDamage");
    this.golemAttackImage = document.getElementById("golemAttack");
    this.golemDeathImage = document.getElementById("golemDeath");
    this.golemSpitImage = document.getElementById("golemSpit");
    this.image = this.golemMoveImage;

    this.pickSpawnPosition();
    this.currentState = this.states[this.toLeft ? 0 : 1];
    this.currentState.enter(this.enemyName);
  }
}
