// core/AudioManager.js
export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.musicNoteIndex = 0;
    this.musicLastTime = 0;
    this.musicTempo = 200;
    this.currentTrack = 'main';
    
    this.tracks = {
      main: [262, 294, 330, 349, 392, 440, 494, 523],
      boss: [130, 165, 196, 220, 262, 311, 370, 440],
      victory: [523, 659, 784, 1047]
    };
  }
  
  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  
  playSound(freq, type = 'square', duration = 0.1, volume = 0.08) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch(e) {}
  }
  
  play(action) {
    switch(action) {
      case 'jump': this.playSound(400, 'square', 0.1, 0.08); break;
      case 'attack': this.playSound(200, 'sawtooth', 0.12, 0.08); break;
      case 'enemyDeath': this.playSound(500, 'square', 0.15, 0.08); break;
      case 'gemCollect': this.playSound(1200, 'square', 0.1, 0.06); break;
      case 'powerup': this.playSound(1000, 'square', 0.2, 0.1); break;
      case 'hurt': this.playSound(200, 'square', 0.2, 0.1); break;
      case 'death': this.playSound(150, 'sawtooth', 0.5, 0.15); break;
    }
  }
  
  updateMusic() {
    if (!this.audioCtx) return;
    const now = Date.now();
    if (now - this.musicLastTime > 60000 / this.musicTempo) {
      const notes = this.tracks[this.currentTrack];
      const freq = notes[this.musicNoteIndex % notes.length];
      this.playSound(freq, 'square', 0.12, 0.03);
      if (this.musicNoteIndex % 2 === 0) {
        this.playSound(freq * 1.5, 'square', 0.12, 0.02);
      }
      this.musicNoteIndex++;
      this.musicLastTime = now;
    }
  }
  
  switchTrack(track) {
    this.currentTrack = track;
    this.musicNoteIndex = 0;
    this.musicTempo = track === 'boss' ? 150 : 200;
  }
}
