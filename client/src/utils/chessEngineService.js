import { Game } from 'js-chess-engine';

class ChessEngineService {
  constructor() {
    this.game = null;
    this.isReady = true; // js-chess-engine is synchronous and ready immediately
    this.onMessage = null;
    this.difficultyLevel = 2; // Default to intermediate difficulty
    this.pendingSettings = null;
    
    console.log('ChessEngineService initialized with default settings');
  }

  init() {
    try {
      console.log('Initializing Chess Engine...');
      this.game = new Game(); // Initialize with a new standard game
      
      if (this.pendingSettings) {
        console.log('Applying pending settings for difficulty:', this.pendingSettings);
        this.applyEngineSettings();
      }
      
      console.log('Chess Engine is ready!');
    } catch (error) {
      console.error('Failed to initialize Chess Engine:', error);
    }
  }

  applyEngineSettings() {
    if (!this.game) {
      console.warn('Cannot apply settings - game not initialized');
      return;
    }
    
    console.log('APPLYING ENGINE SETTINGS:', {
      difficulty: this.pendingSettings,
      difficultyLevel: this.difficultyLevel
    });
    
    // Mark settings as applied
    this.pendingSettings = null;
    console.log(`Applied engine settings: Difficulty level=${this.difficultyLevel}`);
  }

  setDifficulty(level) {
    console.log(`===== SETTING DIFFICULTY TO: ${level} =====`);
    
    // Map difficulty levels to js-chess-engine levels (0-4)
    switch (level) {
      case 'very_easy':
        console.log('Configuring for VERY EASY difficulty');
        this.difficultyLevel = 0; // Well-trained monkey level
        break;
      case 'easy':
        console.log('Configuring for EASY difficulty');
        this.difficultyLevel = 1; // Beginner level
        break;
      case 'medium':
        console.log('Configuring for MEDIUM difficulty');
        this.difficultyLevel = 2; // Intermediate level
        break;
      case 'hard':
        console.log('Configuring for HARD difficulty');
        this.difficultyLevel = 3; // Advanced level
        break;
      case 'very_hard':
        console.log('Configuring for VERY HARD difficulty');
        this.difficultyLevel = 4; // Experienced level
        break;
      default:
        console.log(`Unknown difficulty "${level}" - using medium as default`);
        this.difficultyLevel = 2;
    }
    
    // Store settings to apply when ready
    this.pendingSettings = level;
    
    if (this.game) {
      console.log('Game initialized - applying settings immediately');
      this.applyEngineSettings();
    } else {
      console.log('Game not initialized - initializing now');
      this.init();
    }
    
    console.log(`Set difficulty to ${level}: Level=${this.difficultyLevel}`);
  }

  setBoardPosition(fen) {
    if (!this.game) this.init();
    
    if (this.game) {
      try {
        // Create a new game with the specified FEN position
        this.game = new Game(fen);
      } catch (error) {
        console.error('Error setting board position:', error);
        // If failed, try to initialize a new standard game
        this.game = new Game();
      }
    }
  }

  getNextMove(callback) {
    console.log('Getting next move with current settings:', {
      difficulty: this.pendingSettings || 'applied',
      difficultyLevel: this.difficultyLevel
    });
    
    if (!this.game) this.init();
    
    try {
      // js-chess-engine calculates AI move synchronously
      const aiMoveResult = this.game.aiMove(this.difficultyLevel);
      console.log('AI selected move:', aiMoveResult);
      
      // Convert move format to what the application expects
      // aiMoveResult format is like {"E7":"E5"}
      if (aiMoveResult) {
        const from = Object.keys(aiMoveResult)[0];
        const to = aiMoveResult[from];
        
        const move = {
          from: from.toLowerCase(),
          to: to.toLowerCase()
        };
        
        console.log('Converted move:', move);
        callback(move);
      } else {
        console.error('AI did not return a valid move');
      }
    } catch (error) {
      console.error('Error during move generation:', error);
    }
  }

  terminate() {
    // No need to terminate anything as js-chess-engine is synchronous
    this.game = null;
  }

  // Method to help debugging difficulty levels
  logCurrentDifficultyStatus() {
    const currentStatus = {
      difficulty: this.pendingSettings || 'unknown',
      difficultyLevel: this.difficultyLevel,
    };
    
    console.table(currentStatus);
    return currentStatus;
  }
}

export default new ChessEngineService();
