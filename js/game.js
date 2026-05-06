// game.js - Main entry point for Shadow Quest
import { Game } from './core/Game.js';

const game = new Game({
  container: '#game-container',
  width: 1200,
  height: 600,
  worldWidth: 4000
});

// Initialize game
game.init();

// Export for debugging
window.game = game;
