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
