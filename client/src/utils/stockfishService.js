class StockfishService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.onMessage = null;
    this.skillLevel = 10; // Default to medium difficulty (range: 0-20)
    this.searchDepth = 12; // Default search depth
    this.moveTime = 1000; // Default move time in milliseconds
    this.pendingSettings = null;
    this.uciLimitStrength = false; // For ELO-based difficulty control
    this.uciElo = 1000; // Default ELO value
    this.randomizeMove = false; // Flag to enable move randomization for easier levels
    this.randomChance = 0; // Chance to pick a sub-optimal move
    this.contemptFactor = 0; // Controls how much Stockfish values position (0 = neutral)
    this.moveOverhead = 100; // Additional time for move execution in ms
    this.slowMover = 100; // Time allocation factor (100 = normal)
    console.log('StockfishService initialized with default settings');
  }

  init() {
    try {
      if (this.worker) return;
      
      console.log('Initializing Stockfish worker...');
      this.worker = new Worker('/stockfish-nnue-16-single.js');
      
      this.worker.onmessage = (event) => {
        console.log('Stockfish:', event.data);
        
        // Check if engine is ready
        if (event.data.includes('readyok')) { 
          this.isReady = true;
          console.log('Stockfish engine is ready!');
          // Apply any pending settings once engine is ready
          if (this.pendingSettings) {
            console.log('Applying pending settings for difficulty:', this.pendingSettings);
            this.applyEngineSettings();
          }
        }
        
        // Forward message to callback if set
        if (this.onMessage) { 
          this.onMessage(event.data);
        }
      };
      
      // Initialize engine
      console.log('Sending UCI init commands to Stockfish');
      this.worker.postMessage('uci');   
      this.worker.postMessage('isready');
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
    }
  }

  applyEngineSettings() {
    if (!this.worker || !this.isReady) {
      console.warn('Cannot apply settings - worker not ready', {
        workerExists: !!this.worker,
        isReady: this.isReady
      });
      return;
    }
    
    console.log('APPLYING ENGINE SETTINGS:', {
      difficulty: this.pendingSettings,
      uciLimitStrength: this.uciLimitStrength,
      uciElo: this.uciElo,
      skillLevel: this.skillLevel,
      searchDepth: this.searchDepth,
      moveTime: this.moveTime,
      contemptFactor: this.contemptFactor,
      moveOverhead: this.moveOverhead,
      slowMover: this.slowMover,
      randomChance: this.randomChance
    });
    
    // Apply UCI_LimitStrength only for certain difficulty levels
    if (this.uciLimitStrength) {
      console.log(`Setting UCI_LimitStrength: true, ELO: ${this.uciElo}`);
      this.worker.postMessage(`setoption name UCI_LimitStrength value true`);
      this.worker.postMessage(`setoption name UCI_Elo value ${this.uciElo}`);
    } else {
      console.log('Setting UCI_LimitStrength: false (unrestricted strength)');
      this.worker.postMessage(`setoption name UCI_LimitStrength value false`);
    }
    
    // Apply skill level setting
    console.log(`Setting Skill Level: ${this.skillLevel}`);
    this.worker.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
    
    // Apply additional engine parameters for fine-tuned difficulty
    this.worker.postMessage(`setoption name Contempt value ${this.contemptFactor}`);
    this.worker.postMessage(`setoption name Move Overhead value ${this.moveOverhead}`);
    this.worker.postMessage(`setoption name Slow Mover value ${this.slowMover}`);
    
    // Clear hash to ensure fresh evaluation
    this.worker.postMessage('setoption name Clear Hash');
    
    // Mark settings as applied
    this.pendingSettings = null;
    console.log(`Applied engine settings: UCI_LimitStrength=${this.uciLimitStrength}, ELO=${this.uciElo}, Skill Level=${this.skillLevel}, Contempt=${this.contemptFactor}, Move Overhead=${this.moveOverhead}, Slow Mover=${this.slowMover}, Depth=${this.searchDepth}, Move Time=${this.moveTime}ms`);
  }

  setDifficulty(level) {
    console.log(`===== SETTING DIFFICULTY TO: ${level} =====`);
    
    // Map difficulty levels to Stockfish settings with wider gaps between levels
    switch (level) {
      case 'very_easy':
        console.log('Configuring for VERY EASY difficulty');
        this.uciLimitStrength = true;
        this.uciElo = 400;  // Extremely low ELO - absolute beginner
        this.skillLevel = 0;
        this.searchDepth = 1; // Minimal search
        this.moveTime = 100;  // Very quick decisions
        this.contemptFactor = -100; // Extremely defensive/passive play
        this.moveOverhead = 1000; // Very slow reaction time
        this.slowMover = 10;   // Extremely rushed thinking
        this.randomizeMove = false;
        break;
      case 'easy':
        console.log('Configuring for EASY difficulty');
        this.uciLimitStrength = true;
        this.uciElo = 600; // Very novice player
        this.skillLevel = 2;
        this.searchDepth = 2;
        this.moveTime = 200;
        this.contemptFactor = -50; // Very defensive play
        this.moveOverhead = 500; 
        this.slowMover = 40;  // Very rushed thinking
        this.randomizeMove = false;
        break;
      case 'medium':
        console.log('Configuring for MEDIUM difficulty');
        this.uciLimitStrength = true;
        this.uciElo = 1100; // Average casual player
        this.skillLevel = 6;
        this.searchDepth = 5;
        this.moveTime = 400;
        this.contemptFactor = 0; // Neutral play
        this.moveOverhead = 200;
        this.slowMover = 80; // Slightly rushed thinking
        this.randomizeMove = false;
        break;
      case 'hard':
        console.log('Configuring for HARD difficulty');
        this.uciLimitStrength = true;
        this.uciElo = 1700; // Strong club player
        this.skillLevel = 12;
        this.searchDepth = 10;
        this.moveTime = 800;
        this.contemptFactor = 15; // Somewhat aggressive
        this.moveOverhead = 100;
        this.slowMover = 100; // Normal thinking
        this.randomizeMove = false;
        break;
      case 'very_hard':
        console.log('Configuring for VERY HARD difficulty');
        this.uciLimitStrength = false; // Unrestricted strength for very hard
        this.skillLevel = 20;
        this.searchDepth = 15;
        this.moveTime = 1500;
        this.contemptFactor = 30; // Aggressive play
        this.moveOverhead = 50; // Quick reactions
        this.slowMover = 130; // Thorough thinking
        this.randomizeMove = false;
        break;
      default:
        console.log(`Unknown difficulty "${level}" - using medium as default`);
        this.uciLimitStrength = true;
        this.uciElo = 1100;
        this.skillLevel = 6;
        this.searchDepth = 5;
        this.moveTime = 400;
        this.contemptFactor = 0;
        this.moveOverhead = 200;
        this.slowMover = 80;
        this.randomizeMove = false;
    }
    
    // Store settings to apply when ready
    this.pendingSettings = level;
    
    if (this.worker && this.isReady) {
      console.log('Worker ready - applying settings immediately');
      this.applyEngineSettings();
    } else if (!this.worker) {
      console.log('Worker not initialized - initializing now');
      this.init();
    } else {
      console.log('Worker initializing - settings will be applied when ready');
    }
    
    console.log(`Set difficulty to ${level}: ELO=${this.uciElo}, Skill=${this.skillLevel}, Contempt=${this.contemptFactor}, Depth=${this.searchDepth}, Time=${this.moveTime}ms`);
  }

  setBoardPosition(fen) {
    if (!this.worker) this.init();
    
    if (this.worker) {
      this.worker.postMessage(`position fen ${fen}`);
    }
  }

  getNextMove(callback) {
    console.log('Getting next move with current settings:', {
      difficulty: this.pendingSettings || 'applied',
      skillLevel: this.skillLevel,
      searchDepth: this.searchDepth,
      moveTime: this.moveTime,
      contemptFactor: this.contemptFactor,
      slowMover: this.slowMover
    });
    
    // Use Stockfish for move generation
    console.log('Using Stockfish for move generation with depth:', this.searchDepth, 'and time:', this.moveTime);
    this.onMessage = (data) => {
      // Parse best move from Stockfish output
      if (data.includes('bestmove')) {
        const match = data.match(/bestmove\s+(\w+)/);
        if (match && match[1]) {
          const moveNotation = match[1];
          const move = this.convertStockfishMove(moveNotation);
          console.log('Stockfish selected move:', move, 'from notation:', moveNotation);
          callback(move);
        }
      }
    };
    
    // Start search for best move with appropriate constraints based on difficulty
    if (this.worker) {
      try {
        // Clear any previous search
        this.worker.postMessage('stop');
        
        // Use go command with depth and time limits based on difficulty
        const goCommand = `go depth ${this.searchDepth} movetime ${this.moveTime}`;
        console.log('Sending command to Stockfish:', goCommand);
        this.worker.postMessage(goCommand);
      } catch (error) {
        console.error('Error during move generation:', error);
        // If there's an error, use a safe fallback command
        console.log('Using fallback move generation command');
        this.worker.postMessage('go depth 1 movetime 100');
      }
    } else {
      console.error('Cannot get next move - worker not initialized');
    }
  }

  convertStockfishMove(moveNotation) {
    // Convert Stockfish move notation (e.g., "e2e4") to format needed by chess.js
    const from = moveNotation.substring(0, 2);
    const to = moveNotation.substring(2, 4);
    const promotion = moveNotation.length > 4 ? moveNotation[4] : undefined;
    
    return { from, to, promotion };
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }

  // Add a new method to help debugging difficulty levels
  logCurrentDifficultyStatus() {
    const currentStatus = {
      difficulty: this.pendingSettings || 'unknown',
      uciLimitStrength: this.uciLimitStrength,
      uciElo: this.uciElo,
      skillLevel: this.skillLevel,
      searchDepth: this.searchDepth,
      moveTime: this.moveTime,
      contemptFactor: this.contemptFactor,
      moveOverhead: this.moveOverhead,
      slowMover: this.slowMover
    };
    
    console.table(currentStatus);
    return currentStatus;
  }
}

export default new StockfishService();