/**
 * app.js - Core Tetris Game Logic, Controls & Rendering Loop
 */

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Virtual size, canvas is fixed at 300x600

// Tetromino Definitions & Standard Colors
const TETROMINOES = {
  'I': {
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06b6d4', // Cyan
    id: 1
  },
  'O': {
    matrix: [
      [2, 2],
      [2, 2]
    ],
    color: '#eab308', // Yellow
    id: 2
  },
  'T': {
    matrix: [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0]
    ],
    color: '#a855f7', // Purple
    id: 3
  },
  'S': {
    matrix: [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0]
    ],
    color: '#22c55e', // Green
    id: 4
  },
  'Z': {
    matrix: [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0]
    ],
    color: '#ef4444', // Red
    id: 5
  },
  'J': {
    matrix: [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0]
    ],
    color: '#3b82f6', // Blue
    id: 6
  },
  'L': {
    matrix: [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0]
    ],
    color: '#f97316', // Orange
    id: 7
  }
};

// Theme-specific color overrides (to look consistent in traditional/romantic/space)
const THEME_BLOCK_COLORS = {
  modern: {
    1: '#06b6d4', // Cyan
    2: '#eab308', // Yellow
    3: '#a855f7', // Purple
    4: '#22c55e', // Green
    5: '#ef4444', // Red
    6: '#3b82f6', // Blue
    7: '#f97316'  // Orange
  },
  retro: {
    // Monochromatic dark greens
    1: '#306230', 2: '#306230', 3: '#306230', 4: '#306230', 5: '#306230', 6: '#306230', 7: '#306230'
  },
  space: {
    1: '#22d3ee', 2: '#facc15', 3: '#c084fc', 4: '#4ade80', 5: '#f87171', 6: '#60a5fa', 7: '#fb923c'
  },
  romantic: {
    // Pastel candy colors
    1: '#fda4af', // light rose
    2: '#fef08a', // light yellow
    3: '#e9d5ff', // light purple
    4: '#bbf7d0', // light green
    5: '#fecdd3', // light pink
    6: '#bfdbfe', // light blue
    7: '#fed7aa'  // light orange
  }
};

class Tetris {
  constructor() {
    this.canvas = document.getElementById('tetris-board');
    this.ctx = this.canvas.getContext('2d');
    
    // Scale backing store to exactly 300x600 for sharp pixels, CSS handles RWD scaling
    this.canvas.width = COLS * BLOCK_SIZE;
    this.canvas.height = ROWS * BLOCK_SIZE;
    
    this.holdCanvas = document.getElementById('hold-canvas');
    this.holdCtx = this.holdCanvas.getContext('2d');
    this.holdCanvas.width = 4 * BLOCK_SIZE;
    this.holdCanvas.height = 4 * BLOCK_SIZE;
    
    this.nextCanvas = document.getElementById('next-canvas');
    this.nextCtx = this.nextCanvas.getContext('2d');
    this.nextCanvas.width = 4 * BLOCK_SIZE;
    this.nextCanvas.height = 4 * BLOCK_SIZE;
    
    this.theme = 'modern';
    this.highScore = 0;
    try {
      this.highScore = parseInt(localStorage.getItem('tetris_high_score')) || 0;
    } catch (e) {
      console.warn("localStorage is not available: ", e);
    }
    
    // Game variables
    this.grid = this.createGrid();
    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.hasHeld = false;
    
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.gameOver = false;
    this.isPaused = false;
    this.gameStarted = false;
    
    // Timing / Game Loop
    this.dropCounter = 0;
    this.dropInterval = 1000; // ms
    this.lastTime = 0;
    
    // Clear animation line tracking
    this.clearingLines = [];
    this.clearAnimationTimer = 0;
    this.particles = [];
    
    // Input DAS states
    this.inputKeys = {
      left: false,
      right: false,
      down: false
    };
    this.inputTimers = {
      left: 0,
      right: 0,
      down: 0
    };
    this.dasDelay = 180; // ms before auto-repeat starts
    this.dasInterval = 50; // ms between repeats
    
    this.initUI();
    this.bindEvents();
    this.reset();
    this.draw();
    this.tick();
  }

  createGrid() {
    const grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid.push(new Array(COLS).fill(0));
    }
    return grid;
  }

  initUI() {
    document.getElementById('high-score-val').innerText = this.highScore;
    
    // Floating Hearts generator for Romantic Theme
    const heartsContainer = document.querySelector('.hearts');
    if (heartsContainer) {
      const heartSymbols = ['❤️', '💖', '💝', '💕', '🌸', '✨'];
      for (let i = 0; i < 15; i++) {
        const heart = document.createElement('div');
        heart.classList.add('heart-shape');
        heart.innerText = heartSymbols[Math.floor(Math.random() * heartSymbols.length)];
        heart.style.left = `${Math.random() * 100}vw`;
        heart.style.animationDelay = `${Math.random() * 12}s`;
        heart.style.fontSize = `${10 + Math.random() * 20}px`;
        heart.style.opacity = `${0.2 + Math.random() * 0.5}`;
        heartsContainer.appendChild(heart);
      }
    }
  }

  reset() {
    this.grid = this.createGrid();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.dropInterval = 1000;
    this.gameOver = false;
    this.isPaused = false;
    this.holdPiece = null;
    this.hasHeld = false;
    this.clearingLines = [];
    this.clearAnimationTimer = 0;
    this.particles = [];
    
    this.updateStats();
    
    // Generate first and next piece
    this.currentPiece = this.generatePiece();
    this.nextPiece = this.generatePiece();
  }

  updateStats() {
    document.getElementById('score-val').innerText = this.score;
    document.getElementById('level-val').innerText = this.level;
    document.getElementById('lines-val').innerText = this.lines;
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem('tetris_high_score', this.highScore);
      } catch (e) {
        console.warn("Could not save high score to localStorage: ", e);
      }
      document.getElementById('high-score-val').innerText = this.highScore;
    }
  }

  generatePiece() {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const type = types[Math.floor(Math.random() * types.length)];
    const piece = TETROMINOES[type];
    
    // Spawn at top middle
    const colOffset = Math.floor((COLS - piece.matrix[0].length) / 2);
    
    return {
      type: type,
      matrix: JSON.parse(JSON.stringify(piece.matrix)), // Deep copy matrix
      color: piece.color,
      id: piece.id,
      pos: { x: colOffset, y: type === 'I' ? -1 : 0 }
    };
  }

  /**
   * Main game loop tick
   */
  tick(time = 0) {
    if (this.gameOver || this.isPaused || !this.gameStarted) {
      this.lastTime = time;
      requestAnimationFrame((t) => this.tick(t));
      return;
    }

    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    // Handle inputs holding DAS
    this.handleKeyboardDAS(deltaTime);

    // Particles animation
    this.updateParticles(deltaTime);

    // If line clear animation is running, wait
    if (this.clearingLines.length > 0) {
      this.clearAnimationTimer -= deltaTime;
      if (this.clearAnimationTimer <= 0) {
        this.finishLineClear();
      }
    } else {
      // Normal drop timer
      this.dropCounter += deltaTime;
      if (this.dropCounter >= this.dropInterval) {
        this.drop();
      }
    }

    this.draw();
    requestAnimationFrame((t) => this.tick(t));
  }

  drop() {
    if (this.gameOver) return;
    this.currentPiece.pos.y++;
    
    if (this.checkCollision()) {
      this.currentPiece.pos.y--;
      this.lockPiece();
    } else {
      this.dropCounter = 0;
    }
  }

  softDrop() {
    if (this.gameOver || this.isPaused || this.clearingLines.length > 0) return;
    this.currentPiece.pos.y++;
    if (this.checkCollision()) {
      this.currentPiece.pos.y--;
      this.lockPiece();
    } else {
      this.score += 1; // Soft drop points
      this.updateStats();
      if (window.audioEngine) window.audioEngine.playMove();
    }
    this.dropCounter = 0;
  }

  hardDrop() {
    if (this.gameOver || this.isPaused || this.clearingLines.length > 0) return;
    let dropDist = 0;
    while (!this.checkCollision()) {
      this.currentPiece.pos.y++;
      dropDist++;
    }
    this.currentPiece.pos.y--;
    
    this.score += (dropDist - 1) * 2; // Hard drop points
    this.updateStats();
    
    this.lockPiece();
    if (window.audioEngine) window.audioEngine.playLand();
  }

  move(dir) {
    if (this.gameOver || this.isPaused || this.clearingLines.length > 0) return;
    this.currentPiece.pos.x += dir;
    if (this.checkCollision()) {
      this.currentPiece.pos.x -= dir;
    } else {
      if (window.audioEngine) window.audioEngine.playMove();
    }
  }

  hold() {
    if (this.gameOver || this.isPaused || this.hasHeld || this.clearingLines.length > 0) return;
    
    if (window.audioEngine) window.audioEngine.playRotate();
    
    if (this.holdPiece === null) {
      this.holdPiece = TETROMINOES[this.currentPiece.type];
      this.holdPiece.type = this.currentPiece.type; // save type
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.generatePiece();
    } else {
      const temp = this.holdPiece.type;
      this.holdPiece = TETROMINOES[this.currentPiece.type];
      this.holdPiece.type = this.currentPiece.type;
      
      const spawnPiece = TETROMINOES[temp];
      const colOffset = Math.floor((COLS - spawnPiece.matrix[0].length) / 2);
      this.currentPiece = {
        type: temp,
        matrix: JSON.parse(JSON.stringify(spawnPiece.matrix)),
        color: spawnPiece.color,
        id: spawnPiece.id,
        pos: { x: colOffset, y: temp === 'I' ? -1 : 0 }
      };
    }
    
    this.hasHeld = true;
    this.dropCounter = 0;
  }

  rotate(dir) {
    if (this.gameOver || this.isPaused || this.clearingLines.length > 0) return;
    
    const matrix = this.currentPiece.matrix;
    const oldMatrix = JSON.parse(JSON.stringify(matrix));
    
    // Perform rotation
    // Transpose
    for (let y = 0; y < matrix.length; ++y) {
      for (let x = 0; x < y; ++x) {
        [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
      }
    }
    // Reverse rows / columns
    if (dir > 0) {
      matrix.forEach(row => row.reverse());
    } else {
      matrix.reverse();
    }
    
    // Wall kick system test
    const kickOffsets = this.currentPiece.type === 'I' 
      ? [[0,0], [-2,0], [2,0], [-1,0], [1,0], [0,-1], [0,-2]]
      : [[0,0], [-1,0], [1,0], [0,-1], [-2,0], [2,0], [-1,-1], [1,-1]];
      
    let rotationSuccess = false;
    for (let offset of kickOffsets) {
      this.currentPiece.pos.x += offset[0];
      this.currentPiece.pos.y += offset[1];
      
      if (!this.checkCollision()) {
        rotationSuccess = true;
        if (window.audioEngine) window.audioEngine.playRotate();
        break;
      }
      
      // Revert offset
      this.currentPiece.pos.x -= offset[0];
      this.currentPiece.pos.y -= offset[1];
    }
    
    if (!rotationSuccess) {
      // Revert matrix
      this.currentPiece.matrix = oldMatrix;
    }
  }

  checkCollision() {
    const matrix = this.currentPiece.matrix;
    const pos = this.currentPiece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const boardX = pos.x + x;
          const boardY = pos.y + y;
          
          // Allow spawning pieces slightly above the grid
          if (boardY < 0) {
            if (boardX < 0 || boardX >= COLS) {
              return true;
            }
            continue;
          }
          
          if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
            return true;
          }
          
          if (this.grid[boardY][boardX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  lockPiece() {
    const matrix = this.currentPiece.matrix;
    const pos = this.currentPiece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          const boardY = pos.y + y;
          const boardX = pos.x + x;
          
          // Lock within board limits
          if (boardY >= 0) {
            this.grid[boardY][boardX] = this.currentPiece.id;
          } else {
            // Locked above visible screen, immediate GameOver
            this.triggerGameOver();
            return;
          }
        }
      }
    }
    
    if (window.audioEngine) window.audioEngine.playLand();
    
    // Check lines
    this.checkLineClears();
    
    if (!this.gameOver) {
      // Spawn new piece
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.generatePiece();
      this.hasHeld = false;
      
      // If spawns directly in collision, game over
      if (this.checkCollision()) {
        this.triggerGameOver();
      }
    }
  }

  checkLineClears() {
    const linesToClear = [];
    
    for (let r = ROWS - 1; r >= 0; r--) {
      let isFull = true;
      for (let c = 0; c < COLS; c++) {
        if (this.grid[r][c] === 0) {
          isFull = false;
          break;
        }
      }
      if (isFull) {
        linesToClear.push(r);
      }
    }
    
    if (linesToClear.length > 0) {
      this.clearingLines = linesToClear;
      this.clearAnimationTimer = 250; // 250ms flashing animation
      
      // Create line clear particles
      this.createClearParticles(linesToClear);
      
      if (window.audioEngine) {
        window.audioEngine.playLineClear(linesToClear.length);
      }
    }
  }

  createClearParticles(lines) {
    lines.forEach(r => {
      for (let c = 0; c < COLS; c++) {
        const cellValue = this.grid[r][c];
        const color = this.getBlockColor(cellValue);
        // Create 2-3 particles per block
        for (let i = 0; i < 2; i++) {
          this.particles.push({
            x: c * BLOCK_SIZE + BLOCK_SIZE / 2,
            y: r * BLOCK_SIZE + BLOCK_SIZE / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6 - 2, // slightly upward
            size: Math.random() * 5 + 3,
            color: color,
            alpha: 1.0,
            life: 300 + Math.random() * 200 // lifespan in ms
          });
        }
      }
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 500);
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  finishLineClear() {
    // Sort lines in ascending order to prevent indexing shifts
    this.clearingLines.sort((a, b) => a - b);
    
    this.clearingLines.forEach(r => {
      // Remove row and prepend new empty row
      this.grid.splice(r, 1);
      this.grid.unshift(new Array(COLS).fill(0));
    });
    
    // Scoring logic
    const linesCount = this.clearingLines.length;
    const lineScores = { 1: 100, 2: 300, 3: 500, 4: 800 };
    const scoreGain = (lineScores[linesCount] || 0) * this.level;
    
    this.score += scoreGain;
    this.lines += linesCount;
    
    // Level up condition: every 10 lines
    const prevLevel = this.level;
    this.level = Math.floor(this.lines / 10) + 1;
    
    if (this.level > prevLevel) {
      // Increase speed by decreasing interval (standard speed scaling)
      this.dropInterval = Math.max(80, 1000 - (this.level - 1) * 90);
    }
    
    this.clearingLines = [];
    this.updateStats();
  }

  triggerGameOver() {
    this.gameOver = true;
    if (window.audioEngine) {
      window.audioEngine.stopBGM();
      window.audioEngine.playGameOver();
    }
    
    const gameOverScreen = document.getElementById('game-over-screen');
    document.getElementById('final-score').innerText = this.score;
    gameOverScreen.classList.add('active');
  }

  togglePause() {
    if (!this.gameStarted || this.gameOver) return;
    
    this.isPaused = !this.isPaused;
    const pauseScreen = document.getElementById('pause-screen');
    const startBtn = document.getElementById('start-btn');
    
    if (this.isPaused) {
      pauseScreen.classList.add('active');
      if (window.audioEngine) window.audioEngine.stopBGM();
      startBtn.innerText = '繼續遊戲';
    } else {
      pauseScreen.classList.remove('active');
      if (window.audioEngine) window.audioEngine.startBGM();
      this.lastTime = performance.now();
    }
  }

  startGame() {
    const startScreen = document.getElementById('start-screen');
    const pauseScreen = document.getElementById('pause-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startBtn = document.getElementById('start-btn');
    
    startScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    this.reset();
    this.gameStarted = true;
    this.gameOver = false;
    this.isPaused = false;
    this.lastTime = performance.now();
    startBtn.innerText = '暫停遊戲';
    
    if (window.audioEngine) {
      window.audioEngine.startBGM();
    }
  }

  setTheme(theme) {
    this.theme = theme;
    // Update body classes
    document.body.className = `theme-${theme}`;
    if (window.audioEngine) {
      window.audioEngine.setTheme(theme);
    }
  }

  // Keyboard Event Management
  bindEvents() {
    // Keyboard inputs
    document.addEventListener('keydown', (e) => {
      if (!this.gameStarted || this.isPaused || this.gameOver) {
        // Allow starting/pausing from enter/escape/space
        if (e.key === 'Enter') {
          if (this.gameOver || !this.gameStarted) this.startGame();
          else this.togglePause();
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.inputKeys.left = true;
          this.move(-1);
          this.inputTimers.left = this.dasDelay; // Start DAS delay
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.inputKeys.right = true;
          this.move(1);
          this.inputTimers.right = this.dasDelay;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.inputKeys.down = true;
          this.softDrop();
          this.inputTimers.down = this.dasDelay;
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          e.preventDefault();
          this.rotate(1); // Rotate clockwise
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          this.rotate(-1); // Rotate counter-clockwise
          break;
        case ' ':
          e.preventDefault();
          this.hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          this.hold();
          break;
        case 'p':
        case 'P':
        case 'Escape':
          e.preventDefault();
          this.togglePause();
          break;
      }
    });

    document.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.inputKeys.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.inputKeys.right = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.inputKeys.down = false;
          break;
      }
    });

    // Handle Window Focus (Pause automatically when tab loses focus)
    window.addEventListener('blur', () => {
      if (this.gameStarted && !this.isPaused && !this.gameOver) {
        this.togglePause();
      }
    });

    // Theme Switcher Event
    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    // BGM Volume Slider Event
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      if (window.audioEngine) {
        window.audioEngine.setVolume(vol);
      }
    });

    // Mute Button Event
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.addEventListener('click', () => {
      const isMuted = !muteBtn.classList.contains('muted');
      if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.innerHTML = '🔇';
      } else {
        muteBtn.classList.remove('muted');
        muteBtn.innerHTML = '🔊';
      }
      if (window.audioEngine) {
        window.audioEngine.setMute(isMuted);
      }
    });

    // On-screen Gamepad Touch Buttons Setup
    this.setupTouchControls();
  }

  handleKeyboardDAS(dt) {
    // Left DAS
    if (this.inputKeys.left) {
      this.inputTimers.left -= dt;
      if (this.inputTimers.left <= 0) {
        this.move(-1);
        this.inputTimers.left = this.dasInterval;
      }
    }
    // Right DAS
    if (this.inputKeys.right) {
      this.inputTimers.right -= dt;
      if (this.inputTimers.right <= 0) {
        this.move(1);
        this.inputTimers.right = this.dasInterval;
      }
    }
    // Down DAS (soft drop repeat)
    if (this.inputKeys.down) {
      this.inputTimers.down -= dt;
      if (this.inputTimers.down <= 0) {
        this.softDrop();
        this.inputTimers.down = this.dasInterval;
      }
    }
  }

  setupTouchControls() {
    const bindTouchAction = (elementId, startAction, endAction = null) => {
      const btn = document.getElementById(elementId);
      if (!btn) return;
      
      let repeatTimer = null;
      
      const onStart = (e) => {
        e.preventDefault();
        if (!this.gameStarted || this.isPaused || this.gameOver) return;
        
        startAction();
        
        // Setup rapid firing for directional buttons
        if (elementId === 'btn-left' || elementId === 'btn-right' || elementId === 'btn-down') {
          const repeatSpeed = elementId === 'btn-down' ? 60 : 100;
          repeatTimer = setInterval(() => {
            startAction();
          }, repeatSpeed);
        }
      };

      const onEnd = (e) => {
        if (e) e.preventDefault();
        if (repeatTimer) {
          clearInterval(repeatTimer);
          repeatTimer = null;
        }
        if (endAction) endAction();
      };
      
      // Bind both touch and mouse events for universal compatibility
      btn.addEventListener('touchstart', onStart, { passive: false });
      btn.addEventListener('touchend', onEnd, { passive: false });
      btn.addEventListener('touchcancel', onEnd, { passive: false });
      
      btn.addEventListener('mousedown', onStart);
      btn.addEventListener('mouseup', onEnd);
      btn.addEventListener('mouseleave', onEnd);
    };

    // Directional Left Controller Actions
    bindTouchAction('btn-left', () => this.move(-1));
    bindTouchAction('btn-right', () => this.move(1));
    bindTouchAction('btn-down', () => this.softDrop());
    bindTouchAction('btn-up', () => this.hardDrop());
    
    // Hold block action (center of D-pad)
    bindTouchAction('btn-hold', () => this.hold());

    // Rotation Right Controller Actions
    bindTouchAction('btn-rot-l', () => this.rotate(-1));
    bindTouchAction('btn-rot-r', () => this.rotate(1));

    // Header buttons & Overlays start game hook
    document.getElementById('start-btn').addEventListener('click', () => {
      if (!this.gameStarted || this.gameOver) {
        this.startGame();
      } else {
        this.togglePause();
      }
    });

    document.getElementById('btn-play-now').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
  }

  // Draw Management
  draw() {
    this.drawBoard();
    this.drawPreviews();
  }

  getBlockColor(id) {
    const colors = THEME_BLOCK_COLORS[this.theme] || THEME_BLOCK_COLORS['modern'];
    return colors[id] || '#ffffff';
  }

  drawBoard() {
    // Clear Main Board
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw Grid Lines (based on theme)
    this.drawGridLines(this.ctx, COLS, ROWS, this.canvas.width, this.canvas.height);
    
    // Draw Locked Blocks on Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const id = this.grid[r][c];
        if (id !== 0) {
          // If clearing animation is playing, flash the blocks
          const isClearing = this.clearingLines.includes(r);
          this.drawBlock(this.ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, id, isClearing);
        }
      }
    }
    
    // Draw Current Falling Piece
    if (this.currentPiece && !this.gameOver && this.clearingLines.length === 0) {
      // Draw Ghost Piece (Soft shadow of where the block will land)
      this.drawGhostPiece();
      
      const matrix = this.currentPiece.matrix;
      const pos = this.currentPiece.pos;
      
      for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
          if (matrix[y][x] !== 0) {
            this.drawBlock(this.ctx, (pos.x + x) * BLOCK_SIZE, (pos.y + y) * BLOCK_SIZE, this.currentPiece.id, false);
          }
        }
      }
    }

    // Draw Particles on clear
    this.drawParticles(this.ctx);
  }

  drawGhostPiece() {
    if (this.theme === 'retro') return; // Retro theme does not have a ghost piece
    
    // Determine ghost Y position
    const originalY = this.currentPiece.pos.y;
    while (!this.checkCollision()) {
      this.currentPiece.pos.y++;
    }
    const ghostY = this.currentPiece.pos.y - 1;
    this.currentPiece.pos.y = originalY; // restore original
    
    if (ghostY <= originalY) return; // Only draw if lower than current
    
    const matrix = this.currentPiece.matrix;
    const pos = this.currentPiece.pos;
    
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] !== 0) {
          this.drawGhostBlock(this.ctx, (pos.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, this.currentPiece.color);
        }
      }
    }
  }

  drawGhostBlock(ctx, x, y, baseColor) {
    ctx.save();
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35;
    
    if (this.theme === 'modern') {
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 6);
      ctx.stroke();
    } else if (this.theme === 'romantic') {
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 10);
      ctx.stroke();
    } else {
      ctx.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    }
    ctx.restore();
  }

  drawGridLines(ctx, cols, rows, width, height) {
    ctx.save();
    
    // Configure lines depending on theme
    if (this.theme === 'retro') {
      ctx.strokeStyle = '#8bac0f';
      ctx.lineWidth = 1;
    } else if (this.theme === 'space') {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 0.5;
    } else if (this.theme === 'romantic') {
      ctx.strokeStyle = 'rgba(219, 39, 119, 0.05)';
      ctx.lineWidth = 1;
    } else { // modern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
    }
    
    // Vertical lines
    for (let c = 1; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK_SIZE, 0);
      ctx.lineTo(c * BLOCK_SIZE, height);
      ctx.stroke();
    }
    // Horizontal lines
    for (let r = 1; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK_SIZE);
      ctx.lineTo(width, r * BLOCK_SIZE);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawBlock(ctx, x, y, id, isClearing) {
    const color = this.getBlockColor(id);
    ctx.save();
    
    if (isClearing) {
      // Flashing animation
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = Math.sin(Date.now() / 30) * 0.5 + 0.5;
      
      if (this.theme === 'retro') {
        ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
      } else {
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3, 6);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    
    switch (this.theme) {
      case 'retro':
        // Gameboy style: solid dark color, flat, distinct black borders
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        
        ctx.strokeStyle = '#0f380f';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        
        // Inner pixel highlight
        ctx.fillStyle = '#9bbc0f';
        ctx.fillRect(x + 4, y + 4, 3, 3);
        break;
        
      case 'space':
        // Cyberpunk neon digital style: metal border, glow
        const spaceGrad = ctx.createLinearGradient(x, y, x + BLOCK_SIZE, y + BLOCK_SIZE);
        spaceGrad.addColorStop(0, color);
        spaceGrad.addColorStop(1, '#020617'); // Dark backplate
        
        ctx.fillStyle = spaceGrad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
        
        // Crosshair in middle
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + BLOCK_SIZE / 2 - 4, y + BLOCK_SIZE / 2);
        ctx.lineTo(x + BLOCK_SIZE / 2 + 4, y + BLOCK_SIZE / 2);
        ctx.moveTo(x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2 - 4);
        ctx.lineTo(x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2 + 4);
        ctx.stroke();
        break;
        
      case 'romantic':
        // Dreamy bubbles and hearts
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(244, 114, 182, 0.4)';
        ctx.shadowBlur = 6;
        
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 10);
        ctx.fill();
        
        // Draw heart shape in center of romantic block
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', x + BLOCK_SIZE / 2, y + BLOCK_SIZE / 2);
        
        // Soft white rim
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 10);
        ctx.stroke();
        break;
        
      case 'modern':
      default:
        // Modern glassmorphism look
        ctx.fillStyle = color;
        
        // Draw round rectangle
        ctx.beginPath();
        ctx.roundRect(x + 1.5, y + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3, 6);
        ctx.fill();
        
        // Overlay linear gradient for lighting/depth
        const fillG = ctx.createLinearGradient(x, y, x, y + BLOCK_SIZE);
        fillG.addColorStop(0, 'rgba(255, 255, 255, 0.3)'); // top highlight
        fillG.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
        fillG.addColorStop(1, 'rgba(0, 0, 0, 0.35)'); // bottom shadow
        ctx.fillStyle = fillG;
        ctx.fill();
        
        // Glowing rim outline
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Top reflection highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, BLOCK_SIZE - 6, 6, [3, 3, 1, 1]);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      
      if (this.theme === 'romantic') {
        ctx.font = `${p.size + 4}px Arial`;
        ctx.fillText('💖', p.x - p.size, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawPreviews() {
    // 1. Draw Hold Canvas
    this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
    if (this.holdPiece) {
      this.drawPreviewPiece(this.holdCtx, this.holdPiece, this.holdCanvas.width, this.holdCanvas.height);
    }
    
    // 2. Draw Next Canvas
    this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    if (this.nextPiece) {
      this.drawPreviewPiece(this.nextCtx, this.nextPiece, this.nextCanvas.width, this.nextCanvas.height);
    }
  }

  drawPreviewPiece(ctx, piece, width, height) {
    const matrix = piece.matrix;
    const blockId = piece.id;
    
    // Find boundary limits of actual block in matrix to center it perfectly
    let minX = matrix[0].length, maxX = -1, minY = matrix.length, maxY = -1;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          if (c < minX) minX = c;
          if (c > maxX) maxX = c;
          if (r < minY) minY = r;
          if (r > maxY) maxY = r;
        }
      }
    }
    
    const activeWidth = (maxX - minX + 1) * BLOCK_SIZE;
    const activeHeight = (maxY - minY + 1) * BLOCK_SIZE;
    
    const offsetX = (width - activeWidth) / 2 - minX * BLOCK_SIZE;
    const offsetY = (height - activeHeight) / 2 - minY * BLOCK_SIZE;
    
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const drawX = offsetX + c * BLOCK_SIZE;
          const drawY = offsetY + r * BLOCK_SIZE;
          
          this.drawBlock(ctx, drawX, drawY, blockId, false);
        }
      }
    }
  }
}

// Initialise the game on page load
window.addEventListener('DOMContentLoaded', () => {
  window.tetrisGame = new Tetris();
});
