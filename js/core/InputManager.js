// core/InputManager.js
export class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = {};
    this.bindings = {};
  }
  
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
    
    this.setupMobileControls();
    
    // Start button
    document.getElementById('start-btn').addEventListener('click', () => {
      this.game.start();
    });
    
    // Restart button
    document.getElementById('restart-btn')?.addEventListener('click', () => {
      this.game.restart();
    });
  }
  
  setupMobileControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || window.innerWidth <= 768;
    const mobileControls = document.getElementById('mobile-controls');
    
    if (isMobile) {
      mobileControls.style.display = 'flex';
    }
    
    const bindButton = (id, key) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[key] = true; });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
      btn.addEventListener('mousedown', () => this.keys[key] = true);
      btn.addEventListener('mouseup', () => this.keys[key] = false);
      btn.addEventListener('mouseleave', () => this.keys[key] = false);
    };
    
    bindButton('btn-left', 'ArrowLeft');
    bindButton('btn-right', 'ArrowRight');
    bindButton('btn-jump', ' ');
    bindButton('btn-attack', 'x');
  }
  
  isPressed(key) {
    return this.keys[key] || false;
  }
}
