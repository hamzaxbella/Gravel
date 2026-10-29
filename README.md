# Gravel

A JavaScript Canvas action game and an evolving playground for player abilities and enemy behavior.

## Project status

This repository contains a playable game implementation and ongoing V2 work. [V2_PLAN.md](V2_PLAN.md) describes planned work; its roadmap should not be read as a list of completed features.

## Controls

Movement uses `A` / `D`, `W`, `S`, and `Space`, with `Q` and `Z` accepted as AZERTY aliases. `E` toggles debugging, and `R` restarts after game over. The input layer also accepts `Shift` and `F` for ability logic; consult the player-state code for the current behavior.

## Run locally

```bash
git clone https://github.com/hamzaxbella/Gravel.git
cd Gravel
python3 -m http.server 8000
```

Open <http://localhost:8000> in a modern browser. There is no package installation or build step.

## Code map

`game.js` coordinates the loop and game state. `player.js` and `playerStates.js` manage the character. `enemies.js` and `enemiesStates.js` handle opponents. `items.js`, `background.js`, and `assets/` supply world elements.

The repository also contains temporary and one-off development scripts. They are not required to serve the game. This is an experimental game project, with included art retaining its original ownership.
