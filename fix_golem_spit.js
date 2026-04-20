import fs from 'fs';

const enemiesStatesPath = './enemiesStates.js';
let enemiesStates = fs.readFileSync(enemiesStatesPath, 'utf8');

if (!enemiesStates.includes("MonsterProjectile")) {
    enemiesStates = "import { MonsterProjectile } from './items.js';\n" + enemiesStates;
}

const attackLeftReplacement = `
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
`;
enemiesStates = enemiesStates.replace(
    /if \(name === "sprout" && this\.enemy\.lives <= this\.enemy\.maxLives \/ 2\) \{\s*this\.enemy\.vx = 14; \s*this\.enemy\.vy = -10;\s*\}/g,
    attackLeftReplacement
);

const attackRightReplacement = `
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
`;
enemiesStates = enemiesStates.replace(
    /if \(name === "sprout" && this\.enemy\.lives <= this\.enemy\.maxLives \/ 2\) \{\s*this\.enemy\.vx = -14; \s*this\.enemy\.vy = -10;\s*\}/g,
    attackRightReplacement
);

fs.writeFileSync(enemiesStatesPath, enemiesStates);

const gameJsPath = './game.js';
let gameJs = fs.readFileSync(gameJsPath, 'utf8');
if (!gameJs.includes("this.enemyProjectiles.forEach")) {
    const updateReplacement = `
      // Update logic per object
      [
        this.background,
        ...this.enemies,
        ...this.dust,
        ...(this.enemyProjectiles || []),
        ...this.floatingMessage,
        ...this.healthPickups,
        // Ensure player drops down last so they are drawn on top/checked last
        this.player,
      ].forEach((object) => {
        object.update(deltaTime);
      });
      // Cleanup Logic
      this.enemies = this.enemies.filter((enemy) => !enemy.markedForDeletion);
      this.dust = this.dust.filter((dust) => !dust.markedForDeletion);
      this.enemyProjectiles = (this.enemyProjectiles || []).filter((p) => !p.markedForDeletion);
      this.floatingMessage = this.floatingMessage.filter(
        (floatingMessage) => !floatingMessage.markedForDeletion
      );
      this.healthPickups = this.healthPickups.filter((h) => !h.markedForDeletion);
`;
    // Find where update loop is to replace it. A bit crude without actual ast parser.
    gameJs = gameJs.replace(/\s*\/\/ Update logic per object[\s\S]*?(?=\/\/ Delete player when out of lives)/, updateReplacement + "      ");
    
    // add drawing of projectiles
    const drawReplacement = `
      this.background.draw(context);
      
      this.dust.forEach((dust) => dust.draw(context));
      
      if(this.enemyProjectiles) {
        this.enemyProjectiles.forEach(p => p.draw(context));
      }
`;
    gameJs = gameJs.replace(/\s*this\.background\.draw\(context\);[\s\S]*?this\.dust\.forEach\(\(dust\) => dust\.draw\(context\)\);/g, drawReplacement);
    
    fs.writeFileSync(gameJsPath, gameJs);
}

