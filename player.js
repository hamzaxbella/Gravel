// -=> player.js
import {
  IdleLeft,
  IdleRight,
  RunLeft,
  RunRight,
  KneelLeft,
  KneelRight,
  JumpLeft,
  JumpRight,
  Die,
  AttackLeft,
  AttackRight,
  FallLeft,
  FallRight,
  standLeft,
  standRight,
  HurtLeft,
  HurtRight,
  DashLeft,
  DashRight,
  HeavyAttackLeft,
  HeavyAttackRight,
  ThrowLeft,
  ThrowRight,
} from "./playerStates.js";

// State indices (must match the order in `this.states` and the enum in playerStates.js).
const S = {
  IDLE_LEFT: 0,
  IDLE_RIGHT: 1,
  RUN_LEFT: 2,
  RUN_RIGHT: 3,
  KNEEL_LEFT: 4,
  KNEEL_RIGHT: 5,
  JUMP_LEFT: 6,
  JUMP_RIGHT: 7,
  DIE: 8,
  ATTACK_LEFT: 9,
  ATTACK_RIGHT: 10,
  FALL_LEFT: 11,
  FALL_RIGHT: 12,
  STAND_LEFT: 13,
  STAND_RIGHT: 14,
  HURT_LEFT: 15,
  HURT_RIGHT: 16,
  DASH_LEFT: 17,
  DASH_RIGHT: 18,
  HEAVY_ATTACK_LEFT: 19,
  HEAVY_ATTACK_RIGHT: 20,
  THROW_LEFT: 21,
  THROW_RIGHT: 22,
};

export class player {
  constructor(game) {
    this.game = game;
    this.spriteWidth = 32;
    this.spriteHeight = 32;
    this.width = this.spriteWidth * 2;
    this.height = this.spriteHeight * 3;
    this.vy = 0;
    this.weight = 1;
    this.jumpStrength = 15;
    this.isOnGround = true;
    this.jumps = 0;
    this.maxJumps = 2;
    this.dashTimer = 0;
    this.dashCooldown = 1500;
    this.stamina = 100;
    this.maxStamina = 100;
    this.ammo = 10;
    this.x = this.game.width / 2 - this.width / 2;
    this.y = this.game.height - this.height - this.game.groundMargin;
    this.image = PlayerImage;

    this.frameY = 0;
    this.frameX = 0;
    this.maxFrame = 1;
    this.fps = 15; // animation frames per second
    this.defaultFrameInterval = 1000 / this.fps; // ~67ms
    this.frameInterval = this.defaultFrameInterval;
    this.frameTimer = 0;

    this.currentState = null;
    this.flipLeft = false;

    // Attack: the swing plays its animation and also opens a single damage
    // window (isAttacking = true) that one enemy can consume per swing.
    this.isAttacking = false;
    this.attackTimer = 0; // cooldown between swings
    this.attackInterval = 300; // ms between swings

    this.invincibleTimer = 0;
    this.invincibleDuration = 900;

    // Hurt stagger: how long input is locked after taking damage. i-frames
    // outlast the stagger so the player has a brief window to reposition
    // even after regaining control.
    this.hurtTimer = 0;
    this.hurtDuration = 380;

    // hitBox = where the player's SWING lands (offensive, in front of them).
    // hurtBox = where enemies can HIT the player (defensive, tight around
    // the torso so feet/head aren't phantom targets).
    this.hitBox = { x: 0, y: 0, width: 22, height: 22 };
    this.hurtBox = { x: 0, y: 0, width: 36, height: 80 };

    this.states = [
      new IdleLeft(this.game),
      new IdleRight(this.game),
      new RunLeft(this.game),
      new RunRight(this.game),
      new KneelLeft(this.game),
      new KneelRight(this.game),
      new JumpLeft(this.game),
      new JumpRight(this.game),
      new Die(this.game),
      new AttackLeft(this.game),
      new AttackRight(this.game),
      new FallLeft(this.game),
      new FallRight(this.game),
      new standLeft(this.game),
      new standRight(this.game),
      new HurtLeft(this.game),
      new HurtRight(this.game),
      new DashLeft(this.game),
      new DashRight(this.game),
      new HeavyAttackLeft(this.game),
      new HeavyAttackRight(this.game),
      new ThrowLeft(this.game),
      new ThrowRight(this.game),
    ];
    
    this.attackDamage = 1;

    // Buffs
    this.speedBoostTimer = 0;
    this.damageBoostTimer = 0;
    this.hasShield = false;
  }

  update(deltaTime, input) {
    // If HP is gone, force the Die state once and skip the rest of logic
    // (the Die state freezes on its final frame and flips gameOver).
    if (this.game.hp <= 0 && this.currentState !== this.states[S.DIE]) {
      this.setState(S.DIE);
    }

    const dead = this.currentState === this.states[S.DIE];
    const stunned = this.isHurt();

    this.applyHorizontalIntent(input, dead, stunned);
    this.applyVerticalPhysics(input, dead, stunned);
    this.updateHitBox();
    this.updateHurtBox();

    this.spriteAnimation(deltaTime);

    // Hurt stagger: lock input until timer expires, then flip back to idle
    // facing the appropriate direction.
    if (this.hurtTimer > 0) {
      this.hurtTimer -= deltaTime;
      if (this.hurtTimer <= 0 && !dead) {
        this.setState(this.flipLeft ? S.IDLE_LEFT : S.IDLE_RIGHT);
      }
    } else {
      const stateBefore = this.currentState;
      this.currentState.HandleInput(input);
      const stateAfter = this.currentState;
      
      // Override for Throw
      if (input.includes("f") && this.ammo > 0 && this.attackTimer <= 0) {
        if (stateAfter !== this.states[S.THROW_LEFT] && stateAfter !== this.states[S.THROW_RIGHT]) {
          this.setState(this.flipLeft ? S.THROW_LEFT : S.THROW_RIGHT);
        }
      }
      // Override for Heavy Attack
      else if ((stateAfter === this.states[S.ATTACK_LEFT] || stateAfter === this.states[S.ATTACK_RIGHT]) && input.includes("shift") && this.stamina >= 20) {
        this.setState(this.flipLeft ? S.HEAVY_ATTACK_LEFT : S.HEAVY_ATTACK_RIGHT);
      }
    }

    // Attack cooldown ticks down; a fresh Space press fires the damage window.
    if (this.attackTimer > 0) this.attackTimer -= deltaTime;
    // Set isAttacking for enemy hit detection
    if (!dead && !stunned && this.attackTimer <= 0) {
      if (input.includes(" ")) {
        this.isAttacking = true;
        this.attackTimer = this.attackInterval;
        if (input.includes("shift") && this.stamina >= 20) {
          this.attackTimer = 700; // longer cooldown
        }
      } else if (input.includes("f") && this.ammo > 0) {
        this.attackTimer = 500; // cooldown for throwing
      }
    }

    if (this.dashTimer > 0) this.dashTimer -= deltaTime;
    const shiftPressed = input.includes("shift");
    if (!dead && !stunned && shiftPressed && !this.shiftWasPressed && this.dashTimer <= 0 && !input.includes(" ")) {
      this.dashTimer = this.dashCooldown;
      this.invincibleTimer = 300; // 300ms i-frames
      this.setState(this.flipLeft ? S.DASH_LEFT : S.DASH_RIGHT);
    }
    this.shiftWasPressed = shiftPressed;

    if (this.invincibleTimer > 0) this.invincibleTimer -= deltaTime;
    if (this.speedBoostTimer > 0) this.speedBoostTimer -= deltaTime;
    if (this.damageBoostTimer > 0) this.damageBoostTimer -= deltaTime;

    // Stamina regen
    if (this.stamina < 100) {
      this.stamina += (deltaTime * 0.05); // roughly ~3 stamina per second regenerate
      if (this.stamina > 100) this.stamina = 100;
    }

    // Enemy damage is applied via takeDamage() called from enemy.tryStrike()
    // at the strike frame of the attack animation.
  }

  isHurt() {
    return (
      this.currentState === this.states[S.HURT_LEFT] ||
      this.currentState === this.states[S.HURT_RIGHT]
    );
  }

  // Entry point for enemies landing a hit. Applies damage, i-frames, a
  // small upward recoil, and transitions into the Hurt state so the
  // player visibly flinches and can't input-buffer through the stagger.
  takeDamage(amount, sourceX) {
    if (this.invincibleTimer > 0 || this.game.hp <= 0) return;
    
    if (this.hasShield) {
      this.hasShield = false;
      this.invincibleTimer = 1000;
      return; // blocked the damage fully
    }

    // Armor mitigation
    const actualDamage = Math.max(1, amount - this.game.armor);
    this.game.hp = Math.max(0, this.game.hp - actualDamage);
    
    this.invincibleTimer = this.invincibleDuration;
    this.isAttacking = false;

    // Knockback
    this.vy = -5; // Small upward hop
    if (sourceX !== undefined) {
      this.vx = this.x > sourceX ? 8 : -8;
    }

    if (this.game.hp <= 0) {
      this.setState(S.DIE);
      return;
    }
    this.hurtTimer = this.hurtDuration;
    this.vy = Math.min(this.vy, -6); // brief vertical pop for impact
    this.isOnGround = false;
    this.setState(this.flipLeft ? S.HURT_LEFT : S.HURT_RIGHT);
  }

  // Horizontal movement in this game is a camera-scroll: the player stays
  // centered and `game.speed` drives the parallax. We set that here every
  // frame so jumping/attacking don't nuke momentum and we're not fighting
  // the state machine over a shared variable.
  applyHorizontalIntent(input, dead, stunned) {
    if (this.vx !== undefined && this.vx !== 0) {
      this.game.speed = this.vx;
      this.vx *= 0.85;
      if (Math.abs(this.vx) < 0.5) this.vx = 0;
      return;
    }

    const isDashing = 
      this.currentState === this.states[S.DASH_LEFT] ||
      this.currentState === this.states[S.DASH_RIGHT];

    if (isDashing) {
      const dashSpeed = this.game.maxSpeed * 4.5;
      this.game.speed = this.flipLeft ? -dashSpeed : dashSpeed;
      return;
    }

    const kneeling =
      this.currentState === this.states[S.KNEEL_LEFT] ||
      this.currentState === this.states[S.KNEEL_RIGHT];

    const holdA = input.includes("a");
    const holdD = input.includes("d");

    if (dead || kneeling || stunned) {
      this.game.speed = 0;
      return;
    }

    let runSpeed = this.game.maxSpeed * 2;
    if (this.speedBoostTimer > 0) runSpeed *= 1.5;

    if (holdA && !holdD) {
      this.game.speed = -runSpeed;
    } else if (holdD && !holdA) {
      this.game.speed = runSpeed;
    } else {
      this.game.speed = 0;
    }
  }

  applyVerticalPhysics(input, dead, stunned) {
    const wPressed = input.includes("w");
    
    // Jump only if alive + not staggered + unconsumed charge.
    if (!dead && !stunned && wPressed && !this.wWasPressed) {
      if (this.isOnGround || this.jumps < this.maxJumps) {
        this.vy = -this.jumpStrength;
        this.isOnGround = false;
        this.jumps++;
        this.setState(this.flipLeft ? S.JUMP_LEFT : S.JUMP_RIGHT);
      }
    }
    this.wWasPressed = wPressed;

    this.y += this.vy;
    this.vy += this.weight;

    const groundY = this.game.height - this.height - this.game.groundMargin;
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      this.isOnGround = true;
      this.jumps = 0;
    }
  }

  // Attack hitbox sits in front of the player, mirrored by facing.
  updateHitBox() {
    const reach = this.width;
    const size = this.hitBox.width;
    const centerY = this.y + this.height / 2 - size / 2;
    if (this.flipLeft) {
      this.hitBox.x = this.x - reach / 2 - size / 2;
    } else {
      this.hitBox.x = this.x + this.width + reach / 2 - size / 2;
    }
    this.hitBox.y = centerY;
  }

  // Hurtbox wraps the torso — narrower than the body AABB so a well-timed
  // duck/jump has room to dodge.
  updateHurtBox() {
    const bw = this.hurtBox.width;
    const bh = this.hurtBox.height;
    this.hurtBox.x = this.x + (this.width - bw) / 2;
    this.hurtBox.y = this.y + (this.height - bh) - 6;
  }

  draw(context) {
    const scaleX = this.flipLeft ? -1 : 1;

    if (this.game.debug) {
      // Body AABB (red) — rough outline of the sprite footprint.
      context.strokeStyle = "red";
      context.strokeRect(this.x, this.y, this.width, this.height);
      // Attack hitBox (yellow — solid when live).
      context.fillStyle = this.isAttacking ? "yellow" : "rgba(255,255,0,0.3)";
      context.fillRect(
        this.hitBox.x,
        this.hitBox.y,
        this.hitBox.width,
        this.hitBox.height
      );
      // HurtBox (cyan outline) — where enemies can land a hit.
      context.strokeStyle = "cyan";
      context.lineWidth = 2;
      context.strokeRect(
        this.hurtBox.x,
        this.hurtBox.y,
        this.hurtBox.width,
        this.hurtBox.height
      );
      context.lineWidth = 1;
    }

    // Flash sprite during i-frames so damage is visible.
    const flashing = this.invincibleTimer > 0 &&
      Math.floor(this.invincibleTimer / 80) % 2 === 0;
    if (flashing) {
      context.save();
      context.globalAlpha = 0.35;
    }

    context.save();
    context.scale(scaleX, 1);
    if (this.flipLeft) {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth,
        this.frameY * this.spriteHeight,
        this.spriteWidth,
        this.spriteHeight,
        -this.x - this.width,
        this.y,
        this.width,
        this.height
      );
    } else {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth,
        this.frameY * this.spriteHeight,
        this.spriteWidth,
        this.spriteHeight,
        this.x * scaleX,
        this.y,
        this.width,
        this.height
      );
    }
    context.restore();

    if (flashing) context.restore();
  }

  spriteAnimation(deltaTime) {
    if (this.frameTimer >= this.frameInterval) {
      if (this.frameX < this.maxFrame) this.frameX++;
      else this.frameX = 0;
      this.frameTimer = 0;
    } else {
      this.frameTimer += deltaTime;
    }
  }

  // Player attack hitBox vs enemy hurtBox (player -> enemy damage).
  checkHitBoxCollision(enemy, hitbox) {
    const hb = enemy.hurtBox;
    return (
      hb.x < hitbox.x + hitbox.width &&
      hb.x + hb.width > hitbox.x &&
      hb.y < hitbox.y + hitbox.height &&
      hb.y + hb.height > hitbox.y
    );
  }

  // States transition through this method — it resets animation defaults
  // before calling the new state's enter() hook so each state only has to
  // override what it cares about.
  setState(state) {
    this.currentState = this.states[state];
    this.frameInterval = this.defaultFrameInterval;
    this.frameTimer = 0;
    this.currentState.enter();
  }
}
