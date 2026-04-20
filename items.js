export class HeartItem {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.markedForDeletion = false;
    this.vy = -6; // bounce up initially
    this.gravity = 0.4;
    this.healAmount = 25;
  }
  
  update(deltaTime) {
    // Parallax scrolling
    this.x -= this.game.speed;

    // Gravity
    this.vy += this.gravity;
    this.y += this.vy;

    const groundLevel = this.game.height - this.height - this.game.groundMargin;
    if (this.y >= groundLevel) {
      this.y = groundLevel;
      this.vy = 0;
    }

    // Check collision with player
    const p = this.game.player;
    if (
      p.x < this.x + this.width &&
      p.x + p.width > this.x &&
      p.y < this.y + this.height &&
      p.y + p.height > this.y
    ) {
      this.game.hp = Math.min(this.game.maxHp, this.game.hp + this.healAmount);
      this.markedForDeletion = true;
    }
    
    // Remove if way off screen
    if (this.x < -1000 || this.x > this.game.width + 1000) {
      this.markedForDeletion = true;
    }
  }

  draw(ctx) {
    // Draw simple pixel heart for item
    ctx.save();
    ctx.translate(this.x + this.width / 2 - 12, this.y + this.height / 2 - 12);
    const pattern = [
      "01100110",
      "11111111",
      "11111111",
      "01111110",
      "00111100",
      "00011000"
    ];
    const s = 3; // size multiplier
    for (let py = 0; py < pattern.length; py++) {
      for (let px = 0; px < pattern[py].length; px++) {
        if (pattern[py][px] === "1") {
          ctx.fillStyle = "#ff3333";
          ctx.fillRect(px * s, py * s, s, s);
        }
      }
    }
    ctx.restore();
  }
}

export class PotionItem extends HeartItem {
  constructor(game, x, y) {
    super(game, x, y);
    this.healAmount = 9999; // full heal
  }
  draw(ctx) {
    // Simple blue potion
    ctx.fillStyle = '#3333ff';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#cccccc';
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

export class Projectile {
  constructor(game, x, y, direction) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 16;
    this.height = 16;
    this.markedForDeletion = false;
    this.speed = 10 * direction; // direction is 1 (right) or -1 (left)
    this.damage = 2; // Ranged attack damage
    if (this.game.player && this.game.player.damageBoostTimer > 0) {
      this.damage *= 2;
    }
  }
  
  update(deltaTime) {
    // move independently of scroll, plus scroll factor
    this.x += this.speed - this.game.speed;
    
    // hit enemies!
    for (let e of this.game.enemies) {
      if (e.markedForDeletion) continue;
      // bounding box collision
      if (
        this.x < e.x + e.width &&
        this.x + this.width > e.x &&
        this.y < e.y + e.height &&
        this.y + this.height > e.y
      ) {
        // hit enemy
        e.lives -= this.damage;
        
        if (e.lives <= 0) e.setState(4); // DIE
        else e.setState(this.speed > 0 ? 6 : 5); // HIT_RIGHT / HIT_LEFT
        
        this.markedForDeletion = true;
        break; // stop hitting other enemies with this projectile
      }
    }
    
    // destroy if offscreen
    if (this.x < -100 || this.x > this.game.width + 100) {
      this.markedForDeletion = true;
    }
  }

  draw(context) {
    context.fillStyle = "gray";
    context.beginPath();
    context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
    context.fill();
    
    // speed lines
    context.strokeStyle = "white";
    context.beginPath();
    if (this.speed > 0) {
      context.moveTo(this.x, this.y + this.height/2);
      context.lineTo(this.x - 10, this.y + this.height/2);
    } else {
      context.moveTo(this.x + this.width, this.y + this.height/2);
      context.lineTo(this.x + this.width + 10, this.y + this.height/2);
    }
    context.stroke();
  }
}

export class SpeedBoostItem {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.markedForDeletion = false;
    this.vy = -6;
    this.gravity = 0.4;
  }
  update(deltaTime) {
    this.x -= this.game.speed;
    this.vy += this.gravity;
    this.y += this.vy;
    const groundLevel = this.game.height - this.height - this.game.groundMargin;
    if (this.y >= groundLevel) { this.y = groundLevel; this.vy = 0; }
    
    const p = this.game.player;
    if (p.x < this.x + this.width && p.x + p.width > this.x && p.y < this.y + this.height && p.y + p.height > this.y) {
      if (p.speedBoostTimer < 10000) p.speedBoostTimer = 10000;
      this.markedForDeletion = true;
    }
    if (this.x < -100 || this.x > this.game.width + 100) this.markedForDeletion = true;
  }
  draw(ctx) {
    ctx.fillStyle = "cyan";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class DamageBoostItem {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.markedForDeletion = false;
    this.vy = -6;
    this.gravity = 0.4;
  }
  update(deltaTime) {
    this.x -= this.game.speed;
    this.vy += this.gravity;
    this.y += this.vy;
    const groundLevel = this.game.height - this.height - this.game.groundMargin;
    if (this.y >= groundLevel) { this.y = groundLevel; this.vy = 0; }
    
    const p = this.game.player;
    if (p.x < this.x + this.width && p.x + p.width > this.x && p.y < this.y + this.height && p.y + p.height > this.y) {
      if (p.damageBoostTimer < 10000) p.damageBoostTimer = 10000;
      this.markedForDeletion = true;
    }
    if (this.x < -100 || this.x > this.game.width + 100) this.markedForDeletion = true;
  }
  draw(ctx) {
    ctx.fillStyle = "orange";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class ShieldItem {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.markedForDeletion = false;
    this.vy = -6;
    this.gravity = 0.4;
  }
  update(deltaTime) {
    this.x -= this.game.speed;
    this.vy += this.gravity;
    this.y += this.vy;
    const groundLevel = this.game.height - this.height - this.game.groundMargin;
    if (this.y >= groundLevel) { this.y = groundLevel; this.vy = 0; }
    
    const p = this.game.player;
    if (p.x < this.x + this.width && p.x + p.width > this.x && p.y < this.y + this.height && p.y + p.height > this.y) {
      p.hasShield = true;
      this.markedForDeletion = true;
    }
    if (this.x < -100 || this.x > this.game.width + 100) this.markedForDeletion = true;
  }
  draw(ctx) {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class MonsterProjectile {
  constructor(game, x, y, direction, damage = 10, imageId = "golemBullet") {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.markedForDeletion = false;
    this.speed = 6 * direction; 
    this.damage = damage;
    this.image = document.getElementById(imageId);
  }
  
  update(deltaTime) {
    this.x += this.speed - this.game.speed;
    const p = this.game.player;
    if (!p.isHurt() && 
        this.x < p.x + p.width && this.x + this.width > p.x &&
        this.y < p.y + p.height && this.y + this.height > p.y) {
      p.takeDamage(this.damage, this.x);
      this.markedForDeletion = true;
    }
  }
  
  draw(ctx) {
    if (this.image) {
      if (this.speed < 0) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.scale(-1, 1);
        ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
      } else {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      }
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}
