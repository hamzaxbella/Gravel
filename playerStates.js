// -=> playerStates.js
// The state machine handles animation and which state to transition into.
// It does NOT manage horizontal movement — player.applyHorizontalIntent
// reads the input keys directly each frame and drives game.speed, so
// jumping, attacking, running can all coexist with scroll.

const states = {
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
  HURT_RIGHT: 16,
  DASH_LEFT: 17,
  DASH_RIGHT: 18,
  HEAVY_ATTACK_LEFT: 19,
  HEAVY_ATTACK_RIGHT: 20,
  THROW_LEFT: 21,
  THROW_RIGHT: 22,
};

// Mirror sprite according to the keys currently held. Used by airborne
// states (jump/fall/attack) so changing direction mid-air flips the sprite
// instantly without re-entering the state (which would reset the animation).
function syncFacingToInput(player, input) {
  if (input.includes("d") && !input.includes("a")) player.flipLeft = false;
  else if (input.includes("a") && !input.includes("d")) player.flipLeft = true;
}

class State {
  constructor(state, game) {
    this.state = state;
    this.game = game;
  }
}

//-------------------------------------------------------------------------

export class IdleLeft extends State {
  constructor(game) { super("IDLE LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 0;
    p.maxFrame = 1;
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (input.includes("w") && p.isOnGround) p.setState(states.JUMP_LEFT);
    else if (input.includes(" ")) p.setState(states.ATTACK_LEFT);
    else if (input.includes("a")) p.setState(states.RUN_LEFT);
    else if (input.includes("d")) p.setState(states.RUN_RIGHT);
    else if (input.includes("s")) p.setState(states.KNEEL_LEFT);
  }
}

export class IdleRight extends State {
  constructor(game) { super("IDLE RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 0;
    p.maxFrame = 1;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (input.includes("w") && p.isOnGround) p.setState(states.JUMP_RIGHT);
    else if (input.includes(" ")) p.setState(states.ATTACK_RIGHT);
    else if (input.includes("d")) p.setState(states.RUN_RIGHT);
    else if (input.includes("a")) p.setState(states.RUN_LEFT);
    else if (input.includes("s")) p.setState(states.KNEEL_RIGHT);
  }
}

//-------------------------------------------------------------------------

export class RunLeft extends State {
  constructor(game) { super("RUN LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 3;
    p.maxFrame = 7;
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (input.includes("w") && p.isOnGround) p.setState(states.JUMP_LEFT);
    else if (input.includes(" ")) p.setState(states.ATTACK_LEFT);
    else if (input.includes("s")) p.setState(states.KNEEL_LEFT);
    else if (input.includes("d") && !input.includes("a")) p.setState(states.RUN_RIGHT);
    else if (!input.includes("a")) p.setState(states.IDLE_LEFT);
  }
}

export class RunRight extends State {
  constructor(game) { super("RUN RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 3;
    p.maxFrame = 7;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (input.includes("w") && p.isOnGround) p.setState(states.JUMP_RIGHT);
    else if (input.includes(" ")) p.setState(states.ATTACK_RIGHT);
    else if (input.includes("s")) p.setState(states.KNEEL_RIGHT);
    else if (input.includes("a") && !input.includes("d")) p.setState(states.RUN_LEFT);
    else if (!input.includes("d")) p.setState(states.IDLE_RIGHT);
  }
}

//-------------------------------------------------------------------------

export class KneelLeft extends State {
  constructor(game) { super("KNEEL LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 4;
    p.maxFrame = 3;
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (!input.includes("s")) p.setState(states.IDLE_LEFT);
    else if (input.includes("d")) p.setState(states.KNEEL_RIGHT);
    else p.frameX = 3; // hold on last frame
  }
}

export class KneelRight extends State {
  constructor(game) { super("KNEEL RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 4;
    p.maxFrame = 3;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (!input.includes("s")) p.setState(states.IDLE_RIGHT);
    else if (input.includes("a")) p.setState(states.KNEEL_LEFT);
    else p.frameX = 3;
  }
}

//-------------------------------------------------------------------------

export class standLeft extends State {
  constructor(game) { super("STAND LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 3;
    p.frameY = 4;
    p.maxFrame = 5;
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (p.frameX >= 5) p.setState(states.IDLE_LEFT);
    else if (input.includes("d")) p.setState(states.STAND_RIGHT);
  }
}

export class standRight extends State {
  constructor(game) { super("STAND RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 3;
    p.frameY = 4;
    p.maxFrame = 5;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    if (p.frameX >= 5) p.setState(states.IDLE_RIGHT);
    else if (input.includes("a")) p.setState(states.STAND_LEFT);
  }
}

//-------------------------------------------------------------------------

export class JumpLeft extends State {
  constructor(game) { super("JUMP LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 5;
    p.maxFrame = 3;
    p.flipLeft = true;
    if (p.isOnGround) {
      p.vy = -p.jumpStrength;
      p.isOnGround = false;
    }
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input); // mid-air direction changes flip sprite
    if (p.isOnGround) {
      p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
    } else if (p.vy > 0) {
      p.setState(p.flipLeft ? states.FALL_LEFT : states.FALL_RIGHT);
    } else if (input.includes(" ")) {
      p.setState(p.flipLeft ? states.ATTACK_LEFT : states.ATTACK_RIGHT);
    }
  }
}

export class JumpRight extends State {
  constructor(game) { super("JUMP RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 5;
    p.maxFrame = 3;
    p.flipLeft = false;
    if (p.isOnGround) {
      p.vy = -p.jumpStrength;
      p.isOnGround = false;
    }
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);
    if (p.isOnGround) {
      p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
    } else if (p.vy > 0) {
      p.setState(p.flipLeft ? states.FALL_LEFT : states.FALL_RIGHT);
    } else if (input.includes(" ")) {
      p.setState(p.flipLeft ? states.ATTACK_LEFT : states.ATTACK_RIGHT);
    }
  }
}

//-------------------------------------------------------------------------

export class FallLeft extends State {
  constructor(game) { super("FALL LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 4;
    p.frameY = 5;
    p.maxFrame = 7;
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);
    if (p.isOnGround) {
      p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
    } else if (input.includes(" ")) {
      p.setState(p.flipLeft ? states.ATTACK_LEFT : states.ATTACK_RIGHT);
    }
  }
}

export class FallRight extends State {
  constructor(game) { super("FALL RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 4;
    p.frameY = 5;
    p.maxFrame = 7;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);
    if (p.isOnGround) {
      p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
    } else if (input.includes(" ")) {
      p.setState(p.flipLeft ? states.ATTACK_LEFT : states.ATTACK_RIGHT);
    }
  }
}

//-------------------------------------------------------------------------

export class Die extends State {
  constructor(game) { super("DIE", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 7;
    p.maxFrame = 7;
    p.isAttacking = false;
    p.frameInterval = 120; // slow, dramatic death anim
  }
  HandleInput(input) {
    const p = this.game.player;
    if (p.frameX >= p.maxFrame) {
      p.frameX = p.maxFrame; // freeze
      this.game.gameOver = true;
    }
  }
}

//-------------------------------------------------------------------------

export class AttackLeft extends State {
  constructor(game) { super("ATTACK LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 8;
    p.maxFrame = 8;
    p.flipLeft = true;
    p.frameInterval = 35; // fast swing (~315ms total)
    p.attackDamage = 1;
  }
  HandleInput(input) {
    const p = this.game.player;
    // Sync facing so an attack followed by pressing the opposite direction
    // still flips the swing arc.
    syncFacingToInput(p, input);

    if (p.frameX >= p.maxFrame) {
      p.isAttacking = false;
      if (!p.isOnGround) {
        p.setState(p.vy > 0
          ? (p.flipLeft ? states.FALL_LEFT : states.FALL_RIGHT)
          : (p.flipLeft ? states.JUMP_LEFT : states.JUMP_RIGHT));
      } else if (input.includes("a") && !input.includes("d")) {
        p.setState(states.RUN_LEFT);
      } else if (input.includes("d") && !input.includes("a")) {
        p.setState(states.RUN_RIGHT);
      } else {
        p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
      }
    }
  }
}

export class AttackRight extends State {
  constructor(game) { super("ATTACK RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 8;
    p.maxFrame = 8;
    p.flipLeft = false;
    p.frameInterval = 35;
    p.attackDamage = 1;
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);

    if (p.frameX >= p.maxFrame) {
      p.isAttacking = false;
      if (!p.isOnGround) {
        p.setState(p.vy > 0
          ? (p.flipLeft ? states.FALL_LEFT : states.FALL_RIGHT)
          : (p.flipLeft ? states.JUMP_LEFT : states.JUMP_RIGHT));
      } else if (input.includes("d") && !input.includes("a")) {
        p.setState(states.RUN_RIGHT);
      } else if (input.includes("a") && !input.includes("d")) {
        p.setState(states.RUN_LEFT);
      } else {
        p.setState(p.flipLeft ? states.IDLE_LEFT : states.IDLE_RIGHT);
      }
    }
  }
}

//-------------------------------------------------------------------------
// Hurt states: brief stagger after taking damage. Input is ignored while
// player.hurtTimer is still counting down. Player.update handles the timer
// and the auto-return to idle; these states just freeze the visual pose.

export class HurtLeft extends State {
  constructor(game) { super("HURT LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 4;      // fall-pose frame doubles as a recoil pose
    p.frameY = 5;
    p.maxFrame = 4;    // no advance — single-frame freeze
    p.flipLeft = true;
    p.isAttacking = false;
  }
  HandleInput(input) { /* input is locked during hurt stagger */ }
}

export class HurtRight extends State {
  constructor(game) { super("HURT RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 4;
    p.frameY = 5;
    p.maxFrame = 4;
    p.flipLeft = false;
    p.isAttacking = false;
  }
  HandleInput(input) { /* input is locked during hurt stagger */ }
}

//-------------------------------------------------------------------------

export class DashLeft extends State {
  constructor(game) { super("DASH LEFT", game); }
  enter() {
    const p = this.game.player;
    // Dash pose: could use run or stand frame statically
    p.frameX = 2; // slide frame
    p.frameY = 3; // run anim row
    p.maxFrame = 2; // lock animation
    p.flipLeft = true;
  }
  HandleInput(input) {
    const p = this.game.player;
    const timeInDash = p.dashCooldown - p.dashTimer;
    // dash lasts 250ms
    if (timeInDash >= 250 || p.dashTimer <= 0) {
      if (!p.isOnGround) p.setState(11); // FALL_LEFT
      else if (input.includes("d")) p.setState(3); // RUN_RIGHT
      else if (input.includes("a")) p.setState(2); // RUN_LEFT
      else p.setState(0); // IDLE_LEFT
    }
  }
}

export class DashRight extends State {
  constructor(game) { super("DASH RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 2; 
    p.frameY = 3;
    p.maxFrame = 2;
    p.flipLeft = false;
  }
  HandleInput(input) {
    const p = this.game.player;
    const timeInDash = p.dashCooldown - p.dashTimer;
    if (timeInDash >= 250 || p.dashTimer <= 0) {
      if (!p.isOnGround) p.setState(12); // FALL_RIGHT
      else if (input.includes("d")) p.setState(3);
      else if (input.includes("a")) p.setState(2);
      else p.setState(1); // IDLE_RIGHT
    }
  }
}

//-------------------------------------------------------------------------

export class HeavyAttackLeft extends State {
  constructor(game) { super("HEAVY ATTACK LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 8;
    p.maxFrame = 8;
    p.flipLeft = true;
    p.frameInterval = 70; // 70ms * 8 = 560ms swing
    p.attackDamage = 3;
    p.stamina -= 20;
    if (p.stamina < 0) p.stamina = 0;
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);
    if (p.frameX >= p.maxFrame) {
      p.isAttacking = false;
      p.attackDamage = 1;
      if (!p.isOnGround) p.setState(p.vy > 0 ? 11 : 6);
      else p.setState(0);
    }
  }
}

export class HeavyAttackRight extends State {
  constructor(game) { super("HEAVY ATTACK RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 8;
    p.maxFrame = 8;
    p.flipLeft = false;
    p.frameInterval = 70;
    p.attackDamage = 3;
    p.stamina -= 20;
    if (p.stamina < 0) p.stamina = 0;
  }
  HandleInput(input) {
    const p = this.game.player;
    syncFacingToInput(p, input);
    if (p.frameX >= p.maxFrame) {
      p.isAttacking = false;
      p.attackDamage = 1;
      if (!p.isOnGround) p.setState(p.vy > 0 ? 12 : 7);
      else p.setState(1);
    }
  }
}

export class ThrowLeft extends State {
  constructor(game) { super("THROW LEFT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 9; // use kneel attack or similar frame
    p.maxFrame = 4;
    p.flipLeft = true;
    p.frameInterval = 50;
    
    // Spawn projectile!
    p.ammo -= 1;
    // We add to a global game projectiles array or enemy array later.
    // Assuming game has a spawnProjectile method.
    if (p.game.spawnProjectile) p.game.spawnProjectile(p.x, p.y + p.height/2, -1);
  }
  HandleInput(input) {
    const p = this.game.player;
    if (p.frameX >= p.maxFrame) {
      if (!p.isOnGround) p.setState(p.vy > 0 ? 11 : 6);
      else p.setState(0);
    }
  }
}

export class ThrowRight extends State {
  constructor(game) { super("THROW RIGHT", game); }
  enter() {
    const p = this.game.player;
    p.frameX = 0;
    p.frameY = 9; 
    p.maxFrame = 4;
    p.flipLeft = false;
    p.frameInterval = 50;
    
    p.ammo -= 1;
    if (p.game.spawnProjectile) p.game.spawnProjectile(p.x + p.width, p.y + p.height/2, 1);
  }
  HandleInput(input) {
    const p = this.game.player;
    if (p.frameX >= p.maxFrame) {
      if (!p.isOnGround) p.setState(p.vy > 0 ? 12 : 7);
      else p.setState(1);
    }
  }
}
