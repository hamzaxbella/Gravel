// Canonical movement keys used by states and playerMovement: a, d, w, s, space.
// AZERTY users get q→a and z→w aliases so they don't have to remap their keyboard.
const AZERTY_ALIASES = { q: "a", z: "w" };
const MOVEMENT_KEYS = new Set(["a", "d", "w", "s", " ", "shift", "f"]);

function normalize(key) {
  if (!key) return key;
  const lower = key.toLowerCase();
  return AZERTY_ALIASES[lower] ?? lower;
}

export class InputHandler {
  constructor(game) {
    this.game = game;
    this.keys = [];

    window.addEventListener("keydown", (e) => {
      const key = normalize(e.key);

      if (MOVEMENT_KEYS.has(key) && this.keys.indexOf(key) === -1) {
        this.keys.push(key);
        return;
      }
      if (key === "e") {
        this.game.debug = !this.game.debug;
        return;
      }
      if (key === "r" && this.game.gameOver) {
        this.game.restart();
      }
    });

    window.addEventListener("keyup", (e) => {
      const key = normalize(e.key);
      if (MOVEMENT_KEYS.has(key)) {
        const idx = this.keys.indexOf(key);
        if (idx !== -1) this.keys.splice(idx, 1);
      }
    });
  }
}
