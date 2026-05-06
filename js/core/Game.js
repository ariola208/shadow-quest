// core/Game.js
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { Renderer } from './Renderer.js';
import { Physics } from './Physics.js';
import { World } from '../world/World.js';
import { Hero } from '../entities/Hero.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { UIManager } from '../ui/UIManager.js';
import { Inventory } from '../systems/Inventory.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { WeatherSystem } from '../effects/WeatherSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class Game {
  constructor(config) {
    this.config = config;
    this.container = document.querySelector(config.container);
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    
    // Systems
    this.input = new InputManager(this);
    this.audio = new AudioManager();
    this.renderer = new Renderer(this.ctx);
    this.physics = new Physics();
    this.ui = new UIManager(this);
    this.particles = new ParticleSystem();
    this.weather = new WeatherSystem();
    
    // Game state
    this.state = 'menu'; // menu, playing, paused, gameover
    this.score = 0;
    this.gems = 0;
    this.lives = 3;
    this.timeLeft = 300;
    this.camera = { x: 0, y: 0 };
    this.combo = { count: 0, timer: 0 };
    this.screenShake = 0;
    this.gameRunning = false;
    
    // World & Entities
    this.world = null;
    this.hero = null;
    this.enemies = null;
    this.projectiles = [];
    this.powerups = [];
    
    // Systems
    this.inventory = new Inventory();
    this.combat = new CombatSystem(this);
    this.achievements = new AchievementSystem(this);
    this.saveSystem = new SaveSystem();
    
    // Game loop
    this.lastTime = 0;
    this.deltaTime = 0;
    this.gameLoopId = null;
    this.timerInterval = null;
    
    // Configuration
    this.GRAVITY = 0.5;
    this.JUMP_FORCE = -12;
    this.MOVE_SPEED = 4;
    this.WORLD_WIDTH = config.worldWidth;
    this.GROUND_Y = 400;
    
    // Stars for background
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.WORLD_WIDTH,
        y: Math.random() * 300,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.1
      });
    }
    
    // Flag pole
    this.FLAG_POLE = { x: 3900, y: 240, w: 10, h: 160 };
  }
  
  init() {
    this.resizeCanvas();
    this.input.setupEventListeners();
    this.ui.setupUI();
    this.ui.showStartScreen();
  }
  
  resizeCanvas() {
    const resize = () => {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
  }
  
  start() {
    this.state = 'playing';
    this.gameRunning = true;
    this.resetState();
    this.initLevel();
    this.startGameLoop();
    this.startTimer();
    this.ui.hideStartScreen();
    this.audio.init();
  }
  
  resetState() {
    this.score = 0;
    this.gems = 0;
    this.lives = 3;
    this.timeLeft = 300;
    this.combo = { count: 0, timer: 0 };
    this.screenShake = 0;
    this.projectiles = [];
    this.powerups = [];
    this.particles.clear();
    this.inventory.reset();
    this.achievements.reset();
    this.updateHUD();
  }
  
  initLevel() {
    this.world = new World(this);
    this.world.generateLevel(1);
    
    this.hero = new Hero(this, 80, 340, 28, 32);
    this.enemies = new EnemyManager(this);
    this.enemies.spawnWave(this.world.getEnemySpawns());
    
    this.powerups = this.world.getPowerups();
    this.camera.x = 0;
  }
  
  startGameLoop() {
    this.lastTime = performance.now();
    
    const loop = (currentTime) => {
      if (!this.gameRunning) return;
      
      this.deltaTime = (currentTime - this.lastTime) / 16.67;
      this.lastTime = currentTime;
      
      this.update();
      this.render();
      
      this.gameLoopId = requestAnimationFrame(loop);
    };
    
    this.gameLoopId = requestAnimationFrame(loop);
  }
  
  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.gameRunning) return;
      this.timeLeft = Math.max(0, this.timeLeft - 1);
      this.ui.updateTime(this.timeLeft);
      if (this.timeLeft === 0 && !this.hero.isDead) {
        this.hero.die();
      }
    }, 1000);
  }
  
  update() {
    if (this.state !== 'playing') return;
    
    this.weather.update();
    this.hero.update(this.deltaTime);
    this.enemies.update(this.deltaTime);
    this.updateProjectiles();
    this.updatePowerups();
    this.particles.update();
    this.combat.update();
    this.updateCombo();
    
    // Update camera
    const targetX = this.hero.x - this.canvas.width / 3;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.WORLD_WIDTH - this.canvas.width));
    
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake *= 0.85;
      if (this.screenShake < 0.1) this.screenShake = 0;
    }
  }
  
  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(this.deltaTime);
      
      // Check enemy hits
      for (const enemy of this.enemies.enemies) {
        if (!enemy.alive) continue;
        if (this.physics.rectOverlap(p, enemy)) {
          enemy.takeDamage(p.damage);
          if (enemy.hp <= 0) {
            this.onEnemyKilled(enemy);
          }
          this.projectiles.splice(i, 1);
          break;
        }
      }
      
      // Remove if out of bounds
      if (p.shouldRemove(this)) {
        if (p.type === 'meteor') {
          this.particles.explosion(p.x, this.GROUND_Y, '#ff6600', 12);
          this.screenShake = Math.max(this.screenShake, 4);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  updatePowerups() {
    for (const pu of this.powerups) {
      if (!pu.alive) continue;
      pu.x += pu.vx;
      pu.vy += this.GRAVITY;
      pu.y += pu.vy;
      
      // Platform collision
      for (const p of this.world.platforms) {
        if (this.physics.rectOverlap(pu, p) && pu.vy >= 0) {
          pu.y = p.y - pu.h;
          pu.vy = 0;
        }
      }
      
      // Hero pickup
      if (this.physics.rectOverlap(this.hero, pu)) {
        pu.alive = false;
        this.onPowerupCollected(pu);
      }
      
      if (pu.x < -50 || pu.x > this.WORLD_WIDTH + 50) pu.alive = false;
    }
  }
  
  onEnemyKilled(enemy) {
    enemy.alive = false;
    const points = this.addComboScore(enemy.type === 'knight' ? 200 : 100);
    this.score += points;
    this.particles.explosion(enemy.x + 14, enemy.y + 10, '#660066', 6);
    this.audio.play('enemyDeath');
    
    // Check achievements
    this.achievements.check('firstKill');
    
    // Convert knight to armor
    if (enemy.type === 'knight' && !enemy.shell) {
      enemy.shell = true;
      enemy.alive = true;
      enemy.h = 24;
      enemy.y += 12;
      enemy.vx = 0;
      enemy.type = 'armor';
    }
    
    this.updateHUD();
  }
  
  onPowerupCollected(pu) {
    this.audio.play('powerup');
    if (pu.type === 'potion') {
      this.inventory.addItem('potions', 1);
      this.ui.showFloatingText(pu.x, pu.y, 'Potion +1', '#ff4444');
    } else if (pu.type === 'scroll') {
      this.hero.big = true;
      this.hero.h = 48;
      this.hero.y -= 16;
      this.ui.showFloatingText(pu.x, pu.y, 'GRAND!', '#ff8800');
    }
    this.ui.updateInventory(this.inventory);
  }
  
  addComboScore(baseScore) {
    this.combo.count++;
    this.combo.timer = 90;
    const multiplier = Math.min(this.combo.count, 15);
    const bonus = Math.floor(baseScore * (multiplier - 1) * 0.5);
    if (this.combo.count > 1) {
      this.ui.showCombo(this.combo.count, bonus);
    }
    return baseScore + bonus;
  }
  
  updateCombo() {
    if (this.combo.timer > 0) {
      this.combo.timer--;
      if (this.combo.timer === 0) {
        this.combo.count = 0;
        this.ui.hideCombo();
      }
    }
  }
  
  addProjectile(projectile) {
    this.projectiles.push(projectile);
  }
  
  heroTakeDamage() {
    this.hero.hp--;
    this.hero.invincible = 60;
    this.screenShake = Math.max(this.screenShake, 8);
    this.particles.explosion(this.hero.x + 14, this.hero.y + 16, '#ff0000', 10);
    this.audio.play('hurt');
    this.ui.updateHP(this.hero.hp, this.hero.maxHp);
    
    if (this.hero.hp <= 0) {
      this.hero.die();
    }
  }
  
  heroDie() {
    this.lives--;
    this.ui.updateLives(this.lives);
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      setTimeout(() => this.initLevel(), 1000);
    }
  }
  
  gameOver() {
    this.state = 'gameover';
    this.gameRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.saveSystem.saveHighScore(this.score);
    this.ui.showGameOver(this.score, this.saveSystem.getHighScore());
  }
  
  restart() {
    this.start();
  }
  
  updateHUD() {
    this.ui.updateScore(this.score);
    this.ui.updateGems(this.gems);
    this.ui.updateHP(this.hero ? this.hero.hp : 5, this.hero ? this.hero.maxHp : 5);
    this.ui.updateMana(this.hero ? this.hero.mana : 100, this.hero ? this.hero.maxMana : 100);
    this.ui.updateLives(this.lives);
  }
  
  render() {
    this.renderer.clear();
    this.renderer.drawBackground(this);
    this.renderer.drawWeather(this.weather);
    this.renderer.drawFlagPole(this.FLAG_POLE, this.camera);
    this.renderer.drawGems(this.world ? this.world.gems : []);
    this.renderer.drawPowerups(this.powerups);
    this.renderer.drawPlatforms(this.world ? this.world.platforms : []);
    this.renderer.drawPipes(this.world ? this.world.pipes : []);
    this.renderer.drawEnemies(this.enemies ? this.enemies.enemies : []);
    this.renderer.drawProjectiles(this.projectiles);
    if (this.hero) this.renderer.drawHero(this.hero);
    this.renderer.drawParticles(this.particles);
    this.renderer.drawMinimap(this);
  }
}
