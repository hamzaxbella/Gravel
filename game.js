// -=> game.js
import { player } from "./player.js";
import { InputHandler } from "./input.js";
import { Background1 } from "./background.js";
import { Sprout, Seeker, Golem } from "./enemies.js";
import { HeartItem, Projectile } from "./items.js";

const GAME_STATE = {
  MENU: "menu",
  PLAYING: "playing",
  PAUSED: "paused",
  GAME_OVER: "gameOver",
  SKILL_TREE: "skillTree",
};

window.addEventListener("load", () => {
  const canvas = document.getElementById("canvas");
  canvas.width = 1200;
  canvas.height = 793;
  const ctx = canvas.getContext("2d");

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.width = canvas.width;
      this.height = canvas.height;
      this.speed = 0;
      this.maxSpeed = 2.5;
      this.deltaTime = 0;
      this.hp = 100;
      this.maxHp = 100;
      this.armor = 2;
      this.gameOver = false;
      this.debug = false;
      this.groundMargin = 35;
      this.maxEnemies = 3;
      this.enemyTimer = 0;
      this.enemyInterval = 2200;

      // Progression
      this.distanceTravelled = 0;
      this.distanceToNextLevel = 5000;
      this.level = 1;
      this.unlocks = JSON.parse(localStorage.getItem('gravel_unlocks') || '[]');
      this.skillOptions = [];
      this.skillCards = [];

      this.state = GAME_STATE.MENU;
      this.hover = null; // "start" | "restart" | null, for button highlight

      this.background1 = new Background1(this);
      this.player = new player(this);
      this.input = new InputHandler(this);
      this.player.setState(1); // IDLE_RIGHT
      this.enemies = [];
      this.items = []; // Items array
      this.projectiles = []; // Projectiles array

      this.startButton = { x: 0, y: 0, width: 0, height: 0 };
      this.restartButton = { x: 0, y: 0, width: 0, height: 0 };
    }

    update(deltaTime) {
      this.deltaTime = deltaTime;
      if (this.state !== GAME_STATE.PLAYING) return;

      this.distanceTravelled += this.speed * deltaTime / 100;
      if (this.speed > 0 && this.distanceTravelled >= this.distanceToNextLevel) {
        this.triggerLevelComplete();
        return;
      }

      const input = this.input.keys;
      this.player.update(deltaTime, input);
      this.background1.update();
      this.enemies.forEach((e) => e.update(deltaTime));
      this.items.forEach((item) => item.update(deltaTime));
      this.projectiles.forEach((p) => p.update(deltaTime));

      if (this.enemyTimer > this.enemyInterval) {
        this.addEnemies();
        this.enemyTimer = 0;
      } else {
        this.enemyTimer += deltaTime;
      }

      // Also remove enemies that have wandered far off-screen so they don't
      // pile up invisibly.
      this.enemies = this.enemies.filter(
        (e) =>
          !e.markedForDeletion &&
          e.x > -e.width - 600 &&
          e.x < this.width + 600
      );

      this.items = this.items.filter((item) => !item.markedForDeletion);
      this.projectiles = this.projectiles.filter((p) => !p.markedForDeletion);

      if (this.gameOver) {
        this.state = GAME_STATE.GAME_OVER;
      }
    }

    draw(ctx) {
      if (this.state === GAME_STATE.MENU) {
        this.drawMenu(ctx);
        return;
      }
      this.background1.draw(ctx);
      this.items.forEach((item) => item.draw(ctx));
      this.projectiles.forEach((p) => p.draw(ctx));
      this.enemies.forEach((e) => e.draw(ctx));
      this.player.draw(ctx);
      this.drawHud(ctx);

      if (this.state === GAME_STATE.PAUSED) this.drawPauseOverlay(ctx);
      else if (this.state === GAME_STATE.GAME_OVER) this.drawGameOverOverlay(ctx);
      else if (this.state === GAME_STATE.SKILL_TREE) this.drawSkillTree(ctx);
    }

    addEnemies() {
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
    }

    spawnProjectile(x, y, direction) {
      if (this.projectiles.length < 5) {
        this.projectiles.push(new Projectile(this, x, y, direction));
      }
    }

    startGame() {
      if (this.state !== GAME_STATE.MENU) return;
      this.state = GAME_STATE.PLAYING;
    }

    togglePause() {
      if (this.state === GAME_STATE.PLAYING) this.state = GAME_STATE.PAUSED;
      else if (this.state === GAME_STATE.PAUSED) this.state = GAME_STATE.PLAYING;
    }

    restart() {
      this.hp = this.maxHp;
      this.gameOver = false;
      this.enemies = [];
      this.items = [];
      this.projectiles = [];
      this.enemyTimer = 0;
      this.speed = 0;
      this.player.x = this.width / 2 - this.player.width / 2;
      this.player.y = this.height - this.player.height - this.groundMargin;
      this.player.vy = 0;
      this.player.isOnGround = true;
      this.player.isAttacking = false;
      this.player.attackTimer = 0;
      this.player.invincibleTimer = 0;
      this.player.setState(1); // IDLE_RIGHT
      this.state = GAME_STATE.PLAYING;
    }

    triggerLevelComplete() {
      this.state = GAME_STATE.SKILL_TREE;
      this.speed = 0;
      this.player.setState(0); // IDLE
      
      const allSkills = [
        { id: "max_hp", name: "+25 Max HP", effect: () => { this.maxHp += 25; this.hp += 25; } },
        { id: "max_ammo", name: "+5 Max Ammo", effect: () => { this.player.ammo += 5; } },
        { id: "stamina_regen", name: "Fast Stamina", effect: () => { this.player.staminaRegenRate = (this.player.staminaRegenRate || 0.05) + 0.03; } },
        { id: "armor_up", name: "+1 Armor", effect: () => { this.armor += 1; } },
        { id: "dash_cooldown", name: "Fast Dash", effect: () => { this.player.dashCooldown = Math.max(500, this.player.dashCooldown - 300); } }
      ];

      // Grab 3 random choices
      this.skillOptions = allSkills.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      this.skillCards = [];
      for (let i = 0; i < 3; i++) {
        this.skillCards.push({
          x: this.width / 2 - 250 + i * 180,
          y: this.height / 2 - 80,
          w: 140,
          h: 160,
          skill: this.skillOptions[i]
        });
      }
    }

    drawSkillTree(ctx) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = "bold 36px 'VT323', sans-serif";
      ctx.fillText(`LEVEL ${this.level} COMPLETE!`, this.width / 2, this.height / 2 - 150);
      ctx.font = "24px 'VT323', sans-serif";
      ctx.fillText("Choose an Upgrade:", this.width / 2, this.height / 2 - 110);

      this.skillCards.forEach((card, idx) => {
        let isHover = false; 
        if (this.pointerPos && 
            this.pointerPos.x > card.x && this.pointerPos.x < card.x + card.w &&
            this.pointerPos.y > card.y && this.pointerPos.y < card.y + card.h) {
          isHover = true;
        }

        ctx.fillStyle = isHover ? "#6d3e1f" : "#3e2210";
        ctx.fillRect(card.x, card.y, card.w, card.h);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#a3663a";
        ctx.strokeRect(card.x, card.y, card.w, card.h);

        ctx.fillStyle = "white";
        ctx.font = "bold 20px sans-serif";
        const lines = card.skill.name.split(" ");
        lines.forEach((l, i) => {
          ctx.fillText(l, card.x + card.w / 2, card.y + 60 + i * 28);
        });
      });
    }

    applySkill(skill) {
      skill.effect();
      this.unlocks.push(skill.id);
      localStorage.setItem('gravel_unlocks', JSON.stringify(this.unlocks));
      
      this.level++;
      this.distanceTravelled = 0;
      this.distanceToNextLevel *= 1.25; // Increase next level requirement
      this.state = GAME_STATE.PLAYING;
    }

    // ----- Wooden UI primitives -----------------------------------------------

    drawWoodPanel(ctx, x, y, w, h) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "#6d3e1f");
      grad.addColorStop(0.5, "#4a2611");
      grad.addColorStop(1, "#2c160a");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      // Horizontal plank separators
      ctx.strokeStyle = "rgba(10, 5, 2, 0.55)";
      ctx.lineWidth = 2;
      for (let py = y + 48; py < y + h; py += 48) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }

      // Subtle grain
      ctx.strokeStyle = "rgba(210, 150, 90, 0.08)";
      ctx.lineWidth = 1;
      for (let py = y + 6; py < y + h; py += 6) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w, py);
        ctx.stroke();
      }

      // Iron frame
      ctx.strokeStyle = "#1a0d05";
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

      // Corner rivets
      const rivet = (cx, cy) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#1a0d05";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#8b8b90";
        ctx.fill();
      };
      rivet(x + 20, y + 20);
      rivet(x + w - 20, y + 20);
      rivet(x + 20, y + h - 20);
      rivet(x + w - 20, y + h - 20);
    }

    drawWoodButton(ctx, rect, label, hovered) {
      const { x, y, width: w, height: h } = rect;
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      if (hovered) {
        grad.addColorStop(0, "#b07140");
        grad.addColorStop(1, "#6d3e1f");
      } else {
        grad.addColorStop(0, "#7e4a22");
        grad.addColorStop(1, "#4a2611");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "#1a0d05";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

      if (hovered) {
        ctx.strokeStyle = "rgba(255, 220, 150, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
      }

      ctx.fillStyle = "#f1d8a7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 34px Georgia, serif";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(label, x + w / 2, y + h / 2 + 2);
      ctx.shadowColor = "transparent";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    drawMenu(ctx) {
      this.drawWoodPanel(ctx, 0, 0, this.width, this.height);

      // Title plaque
      const plaqueW = 820, plaqueH = 240;
      const plaqueX = (this.width - plaqueW) / 2;
      const plaqueY = 130;
      this.drawWoodPanel(ctx, plaqueX, plaqueY, plaqueW, plaqueH);

      ctx.fillStyle = "#f1d8a7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 120px Georgia, serif";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fillText("GRAVEL", this.width / 2, plaqueY + plaqueH / 2 - 10);
      ctx.shadowColor = "transparent";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = "#d4a24a";
      ctx.font = "italic 24px Georgia, serif";
      ctx.fillText(
        "— a side-scrolling brawler —",
        this.width / 2,
        plaqueY + plaqueH - 34
      );

      // Start button
      const btnW = 280, btnH = 84;
      this.startButton.x = (this.width - btnW) / 2;
      this.startButton.y = 460;
      this.startButton.width = btnW;
      this.startButton.height = btnH;
      this.drawWoodButton(ctx, this.startButton, "START", this.hover === "start");

      // Controls hint plaque
      ctx.fillStyle = "rgba(241, 216, 167, 0.9)";
      ctx.font = "20px Georgia, serif";
      ctx.textAlign = "center";
      const hintY = 620;
      ctx.fillText(
        "WASD to move  •  W to jump  •  SPACE to attack",
        this.width / 2,
        hintY
      );
      ctx.fillText(
        "P pauses  •  E toggles debug  •  R restarts after death",
        this.width / 2,
        hintY + 30
      );
      ctx.fillText(
        "(click START or press ENTER)",
        this.width / 2,
        hintY + 70
      );
    }

    drawPauseOverlay(ctx) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, this.width, this.height);
      const pw = 440, ph = 180;
      const px = (this.width - pw) / 2;
      const py = (this.height - ph) / 2;
      this.drawWoodPanel(ctx, px, py, pw, ph);
      ctx.fillStyle = "#f1d8a7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 58px Georgia, serif";
      ctx.fillText("PAUSED", this.width / 2, py + 75);
      ctx.font = "20px Georgia, serif";
      ctx.fillText("Press P to resume", this.width / 2, py + 140);
    }

    drawGameOverOverlay(ctx) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(0, 0, this.width, this.height);
      const pw = 580, ph = 300;
      const px = (this.width - pw) / 2;
      const py = (this.height - ph) / 2;
      this.drawWoodPanel(ctx, px, py, pw, ph);

      ctx.fillStyle = "#e63946";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 68px Georgia, serif";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillText("GAME OVER", this.width / 2, py + 90);
      ctx.shadowColor = "transparent";
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      const btnW = 280, btnH = 74;
      this.restartButton.x = (this.width - btnW) / 2;
      this.restartButton.y = py + ph - btnH - 40;
      this.restartButton.width = btnW;
      this.restartButton.height = btnH;
      this.drawWoodButton(
        ctx,
        this.restartButton,
        "RESTART",
        this.hover === "restart"
      );

      ctx.fillStyle = "rgba(241, 216, 167, 0.8)";
      ctx.font = "18px Georgia, serif";
      ctx.fillText("(or press R)", this.width / 2, py + ph - 14);
    }

    drawHud(ctx) {
      // HP Bar at top-left
      const pad = 22;
      const barWidth = 200;
      const barHeight = 24;
      
      // Background of HP Bar
      ctx.fillStyle = "#1a0d05";
      ctx.fillRect(pad, pad, barWidth, barHeight);
      
      // HP Fill
      const hpPercent = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "#cc2222";
      ctx.fillRect(pad + 2, pad + 2, (barWidth - 4) * hpPercent, barHeight - 4);
      
      // Frame
      ctx.strokeStyle = "#b07140";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, pad, barWidth, barHeight);

      // Label / Number
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px 'VT323', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`HP: ${Math.max(0, Math.floor(this.hp))} / ${this.maxHp}  (Armor: ${this.armor})`, pad + barWidth + 12, pad + 18);

      // Stamina Bar
      const stBarTop = pad + barHeight + 8;
      ctx.fillStyle = "#1a0d05";
      ctx.fillRect(pad, stBarTop, barWidth * 0.75, 14);
      ctx.fillStyle = "#11aa22";
      const stPercent = Math.max(0, this.player.stamina / 100);
      ctx.fillRect(pad + 2, stBarTop + 2, ((barWidth * 0.75) - 4) * stPercent, 10);
      ctx.strokeStyle = "#b07140";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pad, stBarTop, barWidth * 0.75, 14);
      
      // Ammo
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px 'VT323', sans-serif";
      ctx.fillText(`Ammo: ${this.player.ammo}`, pad, stBarTop + 32);

      // Status Effects
      let buffStack = 0;
      if (this.player.speedBoostTimer > 0) {
        ctx.fillStyle = "cyan";
        ctx.fillText(`SPEED ↑ (${Math.ceil(this.player.speedBoostTimer/1000)}s)`, pad, stBarTop + 52 + buffStack*20);
        buffStack++;
      }
      if (this.player.damageBoostTimer > 0) {
        ctx.fillStyle = "orange";
        ctx.fillText(`DAMAGE ↑ (${Math.ceil(this.player.damageBoostTimer/1000)}s)`, pad, stBarTop + 52 + buffStack*20);
        buffStack++;
      }
      if (this.player.hasShield) {
        ctx.fillStyle = "blue";
        ctx.fillText(`SHIELD ACTIVE`, pad, stBarTop + 52 + buffStack*20);
        buffStack++;
      }
    }

    drawHeart(ctx, x, y, size, filled) {
      ctx.save();
      ctx.translate(x, y);
      const s = size / 8;
      const pattern = [
        "01100110",
        "11111111",
        "11111111",
        "01111110",
        "00111100",
        "00011000",
      ];
      for (let row = 0; row < pattern.length; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
          if (pattern[row][col] === "1") {
            ctx.fillStyle = filled ? "#e63946" : "rgba(255,255,255,0.18)";
            ctx.fillRect(col * s, row * s, s, s);
          }
        }
      }
      if (filled) {
        // highlight pixel
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillRect(2 * s, 1 * s, s, s);
      }
      ctx.restore();
    }
  }

  const game = new Game(canvas);

  // ---- Pointer interaction for the menu / game-over buttons ----

  function pointIn(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    );
  }

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const p = canvasPoint(e);
    game.pointerPos = p; // Store the pointer for use in drawSkillTree
    if (game.state === GAME_STATE.MENU && pointIn(p.x, p.y, game.startButton)) {
      game.hover = "start";
      canvas.style.cursor = "pointer";
    } else if (
      game.state === GAME_STATE.GAME_OVER &&
      pointIn(p.x, p.y, game.restartButton)
    ) {
      game.hover = "restart";
      canvas.style.cursor = "pointer";
    } else if (game.state === GAME_STATE.SKILL_TREE && game.skillCards) {
      let isHoveringCard = false;
      for (let i = 0; i < game.skillCards.length; i++) {
        const card = game.skillCards[i];
        if (p.x > card.x && p.x < card.x + card.w && p.y > card.y && p.y < card.y + card.h) {
          isHoveringCard = true;
          break;
        }
      }
      if (isHoveringCard) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    } else {
      game.hover = null;
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("click", (e) => {
    const p = canvasPoint(e);
    if (game.state === GAME_STATE.MENU && pointIn(p.x, p.y, game.startButton)) {
      game.startGame();
    } else if (
      game.state === GAME_STATE.GAME_OVER &&
      pointIn(p.x, p.y, game.restartButton)
    ) {
      game.restart();
    } else if (game.state === GAME_STATE.SKILL_TREE) {
      if (game.skillCards) {
        for (let i = 0; i < game.skillCards.length; i++) {
          const card = game.skillCards[i];
          if (p.x > card.x && p.x < card.x + card.w && p.y > card.y && p.y < card.y + card.h) {
            game.applySkill(card.skill);
            break;
          }
        }
      }
    }
  });

  // Meta-keys: start, pause, restart. Movement/attack keys are collected
  // by InputHandler and consumed from game.input.keys during update.
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (game.state === GAME_STATE.MENU && (k === "enter")) {
      game.startGame();
    } else if (game.state === GAME_STATE.GAME_OVER && k === "r") {
      game.restart();
    } else if (
      (game.state === GAME_STATE.PLAYING || game.state === GAME_STATE.PAUSED) &&
      k === "p"
    ) {
      game.togglePause();
    }
  });

  // ---- Main loop ----
  let lastTime = 0;
  function animate(timeStamp) {
    const deltaTime = Math.min(timeStamp - lastTime, 50); // clamp dt spikes
    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.update(deltaTime);
    game.draw(ctx);

    requestAnimationFrame(animate);
  }
  animate(0);
});
