import fs from 'fs';

const gameJsPath = './game.js';
let gameJs = fs.readFileSync(gameJsPath, 'utf8');

const regex = /addEnemies\(\) \{[\s\S]*?else this\.enemies\.push\(new Golem\(this\)\);\s*\}/;

const replacement = `addEnemies() {
      let dynamicMax = this.maxEnemies + Math.floor(this.level * 1.5);
      if (this.enemies.length >= dynamicMax) return;
      
      const roll = Math.random();
      let enemyType = Sprout; // fallback
      
      if (this.level === 1) {
        if (roll < 0.60) enemyType = Sprout;
        else if (roll < 0.90) enemyType = Seeker;
        else enemyType = Golem;
      } else if (this.level === 2) {
        if (roll < 0.40) enemyType = Sprout;
        else if (roll < 0.70) enemyType = Seeker;
        else enemyType = Golem;
      } else {
        if (roll < 0.20) enemyType = Sprout;
        else if (roll < 0.50) enemyType = Seeker;
        else enemyType = Golem;
      }

      let newEnemy = new enemyType(this);
      if (Math.random() < 0.5) {
        newEnemy.x = -newEnemy.width * 2;
      } else {
        newEnemy.x = this.width + newEnemy.width * 2;
      }
      this.enemies.push(newEnemy);
    }`;

if(gameJs.match(regex)) {
    gameJs = gameJs.replace(regex, replacement);
    fs.writeFileSync(gameJsPath, gameJs);
    console.log("Spawner fixed");
} else {
    console.log("Could not find addEnemies match");
}
