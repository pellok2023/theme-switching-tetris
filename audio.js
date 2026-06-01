/**
 * audio.js - Web Audio API Synthesizer & Sound Effects Engine
 * 
 * Synthesizes BGM (Tetris theme / Korobeiniki) and SFX dynamically
 * based on the active theme.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterVolume = null;
    this.bgmVolume = null;
    this.sfxVolume = null;
    this.delayNode = null;
    this.feedbackNode = null;
    
    this.theme = 'modern'; // modern, retro, space, romantic
    this.isMuted = false;
    this.volume = 0.5; // Master volume
    
    // Sequencing state
    this.isPlaying = false;
    this.currentStep = 0;
    this.tempo = 145; // BPM
    this.nextNoteTime = 0;
    this.scheduleAheadTime = 0.1; // schedule 100ms in advance
    this.lookahead = 25.0; // poll every 25ms
    this.timerId = null;
    
    // Define notes and their frequencies
    this.notes = {
      'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'B5': 987.77,
      'C6': 1046.50
    };

    // Melody: 16 measures, 8 steps per measure (each step is an eighth note)
    this.melodyPattern = [
      // M1
      'E5', null, 'B4', 'C5', 'D5', null, 'C5', 'B4',
      // M2
      'A4', null, 'A4', 'C5', 'E5', null, 'D5', 'C5',
      // M3
      'B4', null, 'B4', 'C5', 'D5', null, 'E5', null,
      // M4
      'C5', null, 'A4', null, 'A4', null, null, null,
      // M5
      'D5', null, null, 'F5', 'A5', null, 'G5', 'F5',
      // M6
      'E5', null, null, 'C5', 'E5', null, 'D5', 'C5',
      // M7
      'B4', null, 'B4', 'C5', 'D5', null, 'E5', null,
      // M8
      'C5', null, 'A4', null, 'A4', null, null, null,
      // M9: Bridge
      'E4', null, null, null, 'C4', null, null, null,
      // M10
      'D4', null, null, null, 'B3', null, null, null,
      // M11
      'C4', null, null, null, 'A3', null, null, null,
      // M12
      'G#3', null, null, null, 'E3', null, null, null,
      // M13
      'E5', null, 'B4', 'C5', 'D5', null, 'C5', 'B4',
      // M14
      'A4', null, 'A4', 'C5', 'E5', null, 'D5', 'C5',
      // M15
      'B4', null, 'B4', 'C5', 'D5', null, 'E5', null,
      // M16
      'C5', null, 'A4', null, 'A4', null, null, null
    ];

    // Bassline matching the chords
    this.bassPattern = [
      // M1: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M2: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M3: E7
      'E2', 'E3', 'B2', 'E3', 'E2', 'E3', 'B2', 'E3',
      // M4: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M5: Dm
      'D2', 'D3', 'A2', 'D3', 'D2', 'D3', 'A2', 'D3',
      // M6: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M7: E7
      'E2', 'E3', 'B2', 'E3', 'E2', 'E3', 'B2', 'E3',
      // M8: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'E3', 'A3', 'E3',
      // M9: C
      'C2', 'C3', 'G2', 'C3', 'C2', 'C3', 'G2', 'C3',
      // M10: G
      'G2', 'G3', 'D3', 'G3', 'G2', 'G3', 'D3', 'G3',
      // M11: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M12: E
      'E2', 'E3', 'B2', 'E3', 'E2', 'E3', 'B2', 'E3',
      // M13: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M14: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3',
      // M15: E7
      'E2', 'E3', 'B2', 'E3', 'E2', 'E3', 'B2', 'E3',
      // M16: Am
      'A2', 'A3', 'E3', 'A3', 'A2', 'A3', 'E3', 'A3'
    ];
  }

  /**
   * Initializes the AudioContext (must be triggered by user action)
   */
  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API is not supported in this browser.");
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    // Setup routing: Master Volume
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = this.isMuted ? 0 : this.volume;
    this.masterVolume.connect(this.ctx.destination);
    
    // Submixes for BGM and SFX
    this.bgmVolume = this.ctx.createGain();
    this.bgmVolume.gain.value = 0.5; // BGM is slightly softer
    this.bgmVolume.connect(this.masterVolume);
    
    this.sfxVolume = this.ctx.createGain();
    this.sfxVolume.gain.value = 0.8;
    this.sfxVolume.connect(this.masterVolume);
    
    // Setup Space Theme Delay Effect
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.35; // Delay speed
    
    this.feedbackNode = this.ctx.createGain();
    this.feedbackNode.gain.value = 0.3; // Echo decay
    
    // Route delay: input -> delay -> feedback -> delay (feedback loop)
    // and delay -> master
    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(this.bgmVolume);
  }

  /**
   * Resume audio context if suspended (browser security block)
   */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Sets the theme, altering synth type & effects
   */
  setTheme(theme) {
    this.theme = theme;
  }

  /**
   * Sets master volume (0.0 to 1.0)
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterVolume && !this.isMuted) {
      this.masterVolume.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Toggles mute state
   */
  setMute(isMuted) {
    this.isMuted = isMuted;
    if (this.masterVolume) {
      const volumeToSet = isMuted ? 0 : this.volume;
      this.masterVolume.gain.setValueAtTime(volumeToSet, this.ctx.currentTime);
    }
  }

  /**
   * BGM Sequencer scheduling
   */
  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceNote();
    }
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  /**
   * Move sequencer forward
   */
  advanceNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    const stepDuration = secondsPerBeat / 2; // eighth note step duration
    
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % this.melodyPattern.length;
  }

  /**
   * Schedules a note at the given time
   */
  scheduleNote(step, time) {
    const melodyNote = this.melodyPattern[step];
    const bassNote = this.bassPattern[step];
    const stepDuration = (60.0 / this.tempo) / 2;

    // Play melody
    if (melodyNote && this.notes[melodyNote]) {
      this.playSynthNote(this.notes[melodyNote], time, stepDuration * 0.85, false);
    }
    
    // Play bass (every note or half step, depending on pattern)
    if (bassNote && this.notes[bassNote]) {
      // Bass is played softer and slightly sustained
      this.playSynthNote(this.notes[bassNote], time, stepDuration * 0.95, true);
    }
  }

  /**
   * Synthesizes a note based on the active theme
   */
  playSynthNote(freq, startTime, duration, isBass = false) {
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    
    // Route destination (direct or via Space Delay)
    if (this.theme === 'space' && !isBass) {
      // Route lead melody to space delay as well as main
      gainNode.connect(this.bgmVolume);
      gainNode.connect(this.delayNode);
    } else {
      gainNode.connect(this.bgmVolume);
    }
    
    // Theme-specific instrument configurations
    if (isBass) {
      // BASS SYNTH
      osc.frequency.setValueAtTime(freq, startTime);
      
      switch (this.theme) {
        case 'retro':
          osc.type = 'triangle';
          // Classic 8-bit bass envelope
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          break;
          
        case 'space':
          osc.type = 'sine';
          // Low deep sub bass
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          break;
          
        case 'romantic':
          osc.type = 'triangle';
          // Warm soft bass
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 1.1);
          break;
          
        case 'modern':
        default:
          osc.type = 'sawtooth';
          // Synthwave bass with low-pass filter
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(150, startTime);
          filter.frequency.exponentialRampToValueAtTime(80, startTime + duration);
          
          osc.disconnect(gainNode);
          osc.connect(filter);
          filter.connect(gainNode);
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          break;
      }
    } else {
      // LEAD MELODY SYNTH
      osc.frequency.setValueAtTime(freq, startTime);
      
      switch (this.theme) {
        case 'retro':
          osc.type = 'square';
          // 8-bit lead envelope (clicky attack, solid sustain, decay)
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.005);
          gainNode.gain.setValueAtTime(0.10, startTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          break;
          
        case 'space':
          osc.type = 'sine';
          // Theremin/spacey lead with slow attack and vibrato
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 1.2);
          
          // Add subtle vibrato (LFO)
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          lfo.frequency.value = 6; // 6 Hz vibrato
          lfoGain.gain.value = 4; // Vibrato depth (Hz)
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          
          lfo.start(startTime);
          lfo.stop(startTime + duration * 1.2);
          break;
          
        case 'romantic':
          osc.type = 'triangle';
          // Music box chime, soft envelope
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.95);
          break;
          
        case 'modern':
        default:
          osc.type = 'sawtooth';
          // Modern pluck synth with filter sweep
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.Q.value = 3;
          filter.frequency.setValueAtTime(1200, startTime);
          filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);
          
          osc.disconnect(gainNode);
          osc.connect(filter);
          filter.connect(gainNode);
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.005);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.9);
          break;
      }
    }
    
    osc.start(startTime);
    osc.stop(startTime + duration * 1.5);
  }

  /**
   * Starts BGM playback
   */
  startBGM() {
    this.init();
    this.resume();
    
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    this.scheduler();
  }

  /**
   * Stops BGM playback
   */
  stopBGM() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    clearTimeout(this.timerId);
    this.timerId = null;
  }

  /**
   * Play standard sound effect for moving pieces left/right/down
   */
  playMove() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    
    osc.type = this.theme === 'retro' ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);
    
    gainNode.gain.setValueAtTime(0.15, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    osc.start(time);
    osc.stop(time + 0.09);
  }

  /**
   * Play standard sound effect for rotating pieces
   */
  playRotate() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    
    osc.type = this.theme === 'retro' ? 'square' : 'sine';
    osc.frequency.setValueAtTime(300, time);
    osc.frequency.linearRampToValueAtTime(450, time + 0.05);
    osc.frequency.linearRampToValueAtTime(350, time + 0.1);
    
    gainNode.gain.setValueAtTime(0.12, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    
    osc.start(time);
    osc.stop(time + 0.11);
  }

  /**
   * Play landing sound effect when a piece locks into place
   */
  playLand() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.linearRampToValueAtTime(50, time + 0.12);
    
    gainNode.gain.setValueAtTime(0.25, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    osc.start(time);
    osc.stop(time + 0.13);
  }

  /**
   * Play ascending arpeggio when a line is cleared
   */
  playLineClear(linesCleared) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    
    const time = this.ctx.currentTime;
    const notesToPlay = linesCleared === 4 ? [261.63, 329.63, 392.00, 523.25, 659.25] : [261.63, 329.63, 392.00]; // Am/C major chords
    const noteDur = 0.07;
    
    notesToPlay.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(this.sfxVolume);
      
      osc.type = this.theme === 'retro' ? 'square' : 'sawtooth';
      
      if (this.theme === 'modern') {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, time + idx * noteDur);
        osc.disconnect(gainNode);
        osc.connect(filter);
        filter.connect(gainNode);
      }
      
      osc.frequency.setValueAtTime(freq, time + idx * noteDur);
      
      gainNode.gain.setValueAtTime(0.18, time + idx * noteDur);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + idx * noteDur + 0.15);
      
      osc.start(time + idx * noteDur);
      osc.stop(time + idx * noteDur + 0.16);
    });
  }

  /**
   * Play descending minor sweep for game over
   */
  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.sfxVolume);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.linearRampToValueAtTime(110, time + 0.3);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.8);
    
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    
    osc.start(time);
    osc.stop(time + 0.85);
  }
}

// Export single instance
window.audioEngine = new AudioEngine();
