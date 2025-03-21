class StockfishService {
    constructor() {
      this.worker = null;
      this.isReady = false;
      this.onMessage = null;
      this.skillLevel = 10; // Default to medium difficulty (range: 0-20)
      this.searchDepth = 12; // Default search depth
      this.useFallback = false;
    }
  
    init() {
      try {
        if (this.worker) return;
        
        this.worker = new Worker('/stockfish-nnue-16-single.js');
        
        this.worker.onmessage = (event) => {
          console.log('Stockfish:', event.data);
          
          // Check if engine is ready
          if (event.data.includes('readyok')) { 
            this.isReady = true;
          }
          
          // Forward message to callback if set
          if (this.onMessage) { 
            this.onMessage(event.data);
          }
        };
        
        // Initialize engine
        this.worker.postMessage('uci');   
        this.worker.postMessage('isready');
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
        // Fallback to simple random moves
        this.useFallback = true;
      }
    }
  
    setDifficulty(level) {
      if (this.useFallback) return;
      
      // Map difficulty levels to Stockfish skill levels (0-20)
      switch (level) {
        case 'easy':
          this.skillLevel = 5;
          this.searchDepth = 5;
          break;
        case 'medium':
          this.skillLevel = 10;
          this.searchDepth = 12;
          break;
        case 'hard':
          this.skillLevel = 20;
          this.searchDepth = 18;
          break;
        default:
          this.skillLevel = 10;
          this.searchDepth = 12;
      }
      
      if (this.worker) {
        this.worker.postMessage(`setoption name Skill Level value ${this.skillLevel}`);
      }
    }
  
    setBoardPosition(fen) {
      if (this.useFallback) return;
      
      if (!this.worker) this.init();
      
      if (this.worker) {
        this.worker.postMessage(`position fen ${fen}`);
      }
    }
  
    getNextMove(callback) {
      if (this.useFallback) {
        // Fallback to random moves
        setTimeout(() => this.getRandomMove(callback), 500);
        return;
      }
      
      this.onMessage = (data) => {
        // Parse best move from Stockfish output
        if (data.includes('bestmove')) {
          const match = data.match(/bestmove\s+(\w+)/);
          if (match && match[1]) {
            const moveNotation = match[1];
            callback(this.convertStockfishMove(moveNotation));
          }
        }
      };
      
      // Start search for best move
      if (this.worker) {
        this.worker.postMessage(`go depth ${this.searchDepth}`);
      }
    }
  
    // Fallback method for getting a random move when Stockfish fails
    getRandomMove(callback) {
      try {
        // Access the chess game from window global
        const game = window.currentChessGame;
        if (!game) {
          console.error('No current chess game found in global scope');
          callback(null);
          return;
        }
        
        // Get all legal moves in the current position
        const legalMoves = game.moves({ verbose: true });
        if (!legalMoves || legalMoves.length === 0) {
          console.log('No legal moves available');
          callback(null);
          return;
        }
        
        console.log(`Found ${legalMoves.length} legal moves`, legalMoves);
        
        // Pick a random move from the legal moves
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const randomMove = legalMoves[randomIndex];
        
        console.log('Selected random move:', randomMove);
        
        callback({
          from: randomMove.from,
          to: randomMove.to,
          promotion: randomMove.promotion || 'q'
        });
      } catch (error) {
        console.error('Error generating random move:', error);
        callback(null);
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
  }
  
  export default new StockfishService();