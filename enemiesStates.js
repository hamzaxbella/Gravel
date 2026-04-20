import { MonsterProjectile } from './items.js';
import { HeartItem, PotionItem, SpeedBoostItem, DamageBoostItem, ShieldItem } from "./items.js";
// -=> enemiesStates.js

const states = {
  MOVE_LEFT: 0,
  MOVE_RIGHT: 1,
  ATTACK_LEFT: 2,
  ATTACK_RIGHT: 3,
  DIE: 4,
  HIT_LEFT: 5,
  HIT_RIGHT: 6,
};

class State {
  constructor(state, enemy) {
    this.state = state;
    this.enemy = enemy;
  }
}

// Per-enemy animation config for each non-trivial state.
const MOVE_CFG = {
  sprout: { maxFrame: 4, imageKey: "sproutMoveImage" },
  seeker: { maxFrame: 5, imageKey: "seekerMoveImage" },
  golem:  { maxFrame: 5, imageKey: "golemMoveImage" },
};
const ATTACK_CFG = {
  sprout: { maxFrame: 5, imageKey: "sproutAttackImage" },
  seeker: { maxFrame: 5, imageKey: "seekerAttackImage" },
  golem:  { maxFrame: 5, imageKey: "golemAttackImage" },
};

const HIT_CFG = {
  sprout: { maxFrame: 4, imageKey: "sproutDamageImage" },
  seeker: { maxFrame: 3, imageKey: "seekerDamageImage" },
  golem:  { maxFrame: 3, imageKey: "golemDamageImage" },
};
const DIE_CFG = {
  sprout: { maxFrame: 7, imageKey: "sproutDeathImage" },
  seeker: { maxFrame: 4, imageKey: "seekerDeathImage" },
  golem:  { maxFrame: 9, imageKey: "golemDeathImage" },
};

function applyConfig(enemy, cfg) {
  enemy.maxFrame = cfg.maxFrame;
  enemy.image = enemy[cfg.imageKey];
}

//------------------------------------------------------------------------

export class MoveLeft extends State {
  constructor(enemy) { super("MOVE left", enemy); }
  enter(name) {
    applyConfig(this.enemy, MOVE_CFG[name]);
    this.enemy.toLeft = true;
    this.enemy.isAttacking = false;
  }
  transition(player, deltaTime) {
    const e = this.enemy;
    if (e.lives <= 0) { e.setState(states.DIE); return; }
    if (e.checkPlayerAttackHit()) { e.setState(states.HIT_LEFT); return; }

    // Only allow an attack when cooldown has elapsed. Otherwise just walk.
    if (e.checkCollision() && e.attackCooldown <= 0) {
      e.setState(states.ATTACK_LEFT);
      return;
    }

    if (!e.isChasing) {
      e.patrolTimer = (e.patrolTimer || 0) - deltaTime;
      if (e.patrolTimer <= 0) {
        e.patrolTimer = 2000 + Math.random() * 3000;
        e.setState(states.MOVE_RIGHT);
      }
    } else {
      // Flip direction toward player if they crossed behind the enemy.
      if (e.x + e.width < player.x) {
        e.setState(states.MOVE_RIGHT);
      }
    }
  }
}

export class MoveRight extends State {
  constructor(enemy) { super("MOVE right", enemy); }
  enter(name) {
    applyConfig(this.enemy, MOVE_CFG[name]);
    this.enemy.toLeft = false;
    this.enemy.isAttacking = false;
  }
  transition(player, deltaTime) {
    const e = this.enemy;
    if (e.lives <= 0) { e.setState(states.DIE); return; }
    if (e.checkPlayerAttackHit()) { e.setState(states.HIT_RIGHT); return; }

    if (e.checkCollision() && e.attackCooldown <= 0) {
      e.setState(states.ATTACK_RIGHT);
      return;
    }

    if (!e.isChasing) {
      e.patrolTimer = (e.patrolTimer || 0) - deltaTime;
      if (e.patrolTimer <= 0) {
        e.patrolTimer = 2000 + Math.random() * 3000;
        e.setState(states.MOVE_LEFT);
      }
    } else {
      if (e.x > player.x + player.width) {
        e.setState(states.MOVE_LEFT);
      }
    }
  }
}

//------------------------------------------------------------------------

export class AttackLeft extends State {
  constructor(enemy) { super("ATTACK left", enemy); }
  enter(name) {
    applyConfig(this.enemy, ATTACK_CFG[name]);
    this.enemy.toLeft = true;
    this.enemy.isAttacking = true;
    // Per-swing strike flag; damage is landed once, on the final frame.
    this.enemy.hasStruck = false;
    // Start cooldown the moment the swing starts, not when it ends, so the
    // enemy can't chain swings the instant the anim wraps.
    this.enemy.attackCooldown = this.enemy.attackCooldownMax;
    
    
    const name = this.enemy.enemyName;
    if (name === "sprout" && this.enemy.lives <= this.enemy.maxLives / 2) {
      this.enemy.vx = 14; 
      this.enemy.vy = -10;
    }
    
    if (name === "golem") {
      const p = this.enemy.game.player;
      let dist = Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y);
      if (dist > this.enemy.ATTACK_RANGE + 40) {
        this.enemy.game.enemyProjectiles = this.enemy.game.enemyProjectiles || [];
        this.enemy.game.enemyProjectiles.push(new MonsterProjectile(this.enemy.game, this.enemy.x, this.enemy.y + 20, -1, this.enemy.damage, "golemSpit"));
        // Don't want it to also melee attack on the last frame if it spitted
        this.enemy.hasStruck = true; 
      }
    }

  }
  transition(player, deltaTime) {
    const e = this.enemy;

    if (e.lives <= 0) {
      e.isAttacking = false;
      e.setState(states.DIE);
      return;
    }
    if (e.checkPlayerAttackHit()) {
      e.isAttacking = false;
      e.setState(states.HIT_LEFT);
      return;
    }
    // Swing plays fully regardless of where the player moves. On the last
    // frame (the strike), check if the player is still in range and
    // grounded; tryStrike() handles the rest.
    if (e.frameY >= e.maxFrame) {
      e.tryStrike();
      e.isAttacking = false;
      e.setState(states.MOVE_LEFT);
    }
  }
}

export class AttackRight extends State {
  constructor(enemy) { super("ATTACK right", enemy); }
  enter(name) {
    applyConfig(this.enemy, ATTACK_CFG[name]);
    this.enemy.toLeft = false;
    this.enemy.isAttacking = true;
    this.enemy.hasStruck = false;
    this.enemy.attackCooldown = this.enemy.attackCooldownMax;
    
    
    const name = this.enemy.enemyName;
    if (name === "sprout" && this.enemy.lives <= this.enemy.maxLives / 2) {
      this.enemy.vx = -14; 
      this.enemy.vy = -10;
    }
    
    if (name === "golem") {
      const p = this.enemy.game.player;
      let dist = Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y);
      if (dist > this.enemy.ATTACK_RANGE + 40) {
        this.enemy.game.enemyProjectiles = this.enemy.game.enemyProjectiles || [];
        this.enemy.game.enemyProjectiles.push(new MonsterProjectile(this.enemy.game, this.enemy.x + this.enemy.width, this.enemy.y + 20, 1, this.enemy.damage, "golemSpit"));
        // Don't want it to also melee attack on the last frame if it spitted
        this.enemy.hasStruck = true; 
      }
    }

  }
  transition(player, deltaTime) {
    const e = this.enemy;

    if (e.lives <= 0) {
      e.isAttacking = false;
      e.setState(states.DIE);
      return;
    }
    if (e.checkPlayerAttackHit()) {
      e.isAttacking = false;
      e.setState(states.HIT_RIGHT);
      return;
    }
    if (e.frameY >= e.maxFrame) {
      e.tryStrike();
      e.isAttacking = false;
      e.setState(states.MOVE_RIGHT);
    }
  }
}

//------------------------------------------------------------------------

export class HitLeft extends State {
  constructor(enemy) { super("HIT left", enemy); }
  enter(name) {
    applyConfig(this.enemy, HIT_CFG[name]);
    this.enemy.toLeft = true;
    this.enemy.isAttacking = false;
    // One-shot damage on entry. Consuming player.isAttacking prevents
    // repeated hits within a single swing.
    let dmg = this.enemy.player ? (this.enemy.player.attackDamage || 1) : 1;
    if (this.enemy.player && this.enemy.player.damageBoostTimer > 0) dmg *= 2;
    this.enemy.lives -= Math.max(1, dmg - (this.enemy.armor || 0));
    
    // Knockback (hit from right, pushed left)
    this.enemy.vx = -12;
    this.enemy.vy = -6;

    if (this.enemy.player) this.enemy.player.isAttacking = false;
  }
  transition(player, deltaTime) {
    const e = this.enemy;
    if (e.frameY >= e.maxFrame) {
      if (e.lives <= 0) e.setState(states.DIE);
      else e.setState(states.MOVE_LEFT);
    }
  }
}

export class HitRight extends State {
  constructor(enemy) { super("HIT right", enemy); }
  enter(name) {
    applyConfig(this.enemy, HIT_CFG[name]);
    this.enemy.toLeft = false;
    this.enemy.isAttacking = false;
    let dmg = this.enemy.player ? (this.enemy.player.attackDamage || 1) : 1;
    if (this.enemy.player && this.enemy.player.damageBoostTimer > 0) dmg *= 2;
    this.enemy.lives -= Math.max(1, dmg - (this.enemy.armor || 0));

    // Knockback (hit from left, pushed right)
    this.enemy.vx = 12;
    this.enemy.vy = -6;

    if (this.enemy.player) this.enemy.player.isAttacking = false;
  }
  transition(player, deltaTime) {
    const e = this.enemy;
    if (e.frameY >= e.maxFrame) {
      if (e.lives <= 0) e.setState(states.DIE);
      else e.setState(states.MOVE_RIGHT);
    }
  }
}

//------------------------------------------------------------------------

export class Die extends State {
  constructor(enemy) { super("Die", enemy); }
  enter(name) {
    applyConfig(this.enemy, DIE_CFG[name]);
    this.enemy.isAttacking = false;
    this.enemy.toLeft = false;

    // Small chance to drop a healing heart when enemy starts dying
    const dropRoll = Math.random();
    const spawnX = this.enemy.x;
    const spawnY = this.enemy.y + this.enemy.height / 2;

    if (dropRoll < 0.05) {
      this.enemy.game.items.push(new PotionItem(this.enemy.game, spawnX, spawnY));
    } else if (dropRoll < 0.15) {
      this.enemy.game.items.push(new SpeedBoostItem(this.enemy.game, spawnX, spawnY));
    } else if (dropRoll < 0.25) {
      this.enemy.game.items.push(new DamageBoostItem(this.enemy.game, spawnX, spawnY));
    } else if (dropRoll < 0.35) {
      this.enemy.game.items.push(new ShieldItem(this.enemy.game, spawnX, spawnY));
    } else if (dropRoll < 0.50) {
      // 15% chance to drop normal heart
      this.enemy.game.items.push(new HeartItem(this.enemy.game, spawnX, spawnY));
    }
  }
  transition(player, deltaTime) {
    if (this.enemy.frameY >= this.enemy.maxFrame) {
      this.enemy.markedForDeletion = true;
    }
  }
}
