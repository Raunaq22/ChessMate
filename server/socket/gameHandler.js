const { Chess } = require('chess.js');
const db = require('../src/models');

module.exports = (io) => {
  const games = new Map();
  
  // Initialize a new game
  const initializeGame = (gameId, whiteId, blackId, timeControl) => {
    if (!games.has(gameId)) {
      games.set(gameId, {
        id: gameId,
        chess: new Chess(),
        whitePlayerId: whiteId,
        blackPlayerId: blackId,
        whiteTimeLeft: timeControl.initialTime,
        blackTimeLeft: timeControl.initialTime,
        timeIncrement: timeControl.increment,
        isWhiteTimerRunning: false,
        isBlackTimerRunning: false,
        started: false,
        firstMoveMade: false,
        messages: [],
        spectators: []
      });
    }
    return games.get(gameId);
  };
  
  // Get user profile
  const getUserProfile = async (userId) => {
    try {
      const user = await db.User.findByPk(userId, {
        attributes: ['user_id', 'username']
      });
      return user ? {
        id: user.user_id,
        username: user.username
      } : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Game handlers
  io.on('connection', (socket) => {
    const { gameId, userId } = socket.handshake.query;
    
    console.log(`User ${userId} connected to game ${gameId}`);
    
    // Join game room
    socket.join(gameId);
    
    // Handle joining a game
    socket.on('joinGame', async ({ gameId, userId }) => {
      try {
        // Get game from database
        const gameData = await db.Game.findByPk(gameId);
        
        if (!gameData) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        const whiteId = gameData.player1_id;
        const blackId = gameData.player2_id;
        
        // Initialize or get game state
        let game = games.get(gameId);
        
        if (!game) {
          game = initializeGame(gameId, whiteId, blackId, {
            initialTime: gameData.initial_time,
            increment: gameData.increment
          });
        }
        
        // Check if user is a player or spectator
        const isPlayer = userId == whiteId || userId == blackId;
        const playerColor = userId == whiteId ? 'white' : userId == blackId ? 'black' : null;
        
        if (!isPlayer) {
          game.spectators.push(userId);
        }
        
        // Get player profiles
        const [whiteProfile, blackProfile] = await Promise.all([
          getUserProfile(whiteId),
          blackId ? getUserProfile(blackId) : null
        ]);
        
        // Send game state to connected user
        socket.emit('gameState', {
          fen: gameData.fen,
          playerColor: playerColor || 'spectator',
          initialTime: gameData.initial_time,
          increment: gameData.increment,
          isWhiteTimerRunning: game.isWhiteTimerRunning,
          isBlackTimerRunning: game.isBlackTimerRunning,
          whitePlayerId: whiteId,
          blackPlayerId: blackId,
          whitePlayerProfile: whiteProfile,
          blackPlayerProfile: blackProfile,
          started: gameData.status === 'playing',
          whiteTimeLeft: gameData.white_time,
          blackTimeLeft: gameData.black_time,
          firstMoveMade: game.firstMoveMade
        });
        
        // Also emit playerUpdate to all clients in the room
        io.to(gameId).emit('playerUpdate', {
          whitePlayerId: whiteId,
          blackPlayerId: blackId,
          whitePlayerProfile: whiteProfile,
          blackPlayerProfile: blackProfile
        });
        
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });
    
    // Handle game moves
    socket.on('move', ({ gameId, move, fen, moveNotation, whiteTimeLeft, blackTimeLeft, isWhiteTimerRunning, isBlackTimerRunning, isGameOver, firstMoveMade, timeIncrement }) => {
      const game = games.get(gameId);
      
      if (!game) return;
      
      // Update game state
      game.chess = new Chess(fen);
      
      // Apply increment server-side to ensure consistency
      // Determine which player just made the move based on whose timer should start
      if (game.timeIncrement > 0 && firstMoveMade) {
        // If white timer will run, black just moved
        if (isWhiteTimerRunning) {
          // Add increment to black's time (they just moved)
          blackTimeLeft += game.timeIncrement;
          console.log(`[SERVER] Adding increment: ${game.timeIncrement}s to black, now: ${blackTimeLeft}s`);
        } 
        // If black timer will run, white just moved
        else if (isBlackTimerRunning) {
          // Add increment to white's time (they just moved)
          whiteTimeLeft += game.timeIncrement;
          console.log(`[SERVER] Adding increment: ${game.timeIncrement}s to white, now: ${whiteTimeLeft}s`);
        }
      }
      
      // Update stored times
      game.whiteTimeLeft = whiteTimeLeft;
      game.blackTimeLeft = blackTimeLeft;
      game.isWhiteTimerRunning = isWhiteTimerRunning;
      game.isBlackTimerRunning = isBlackTimerRunning;
      
      if (firstMoveMade !== undefined) {
        game.firstMoveMade = firstMoveMade;
      }
      
      // If this is the first move or the game just started, update DB start_time
      if (!game.started) {
        game.started = true;
        
        // Update the database to set start_time if not already set
        (async () => {
          try {
            const dbGame = await db.Game.findByPk(gameId);
            if (dbGame && !dbGame.start_time) {
              dbGame.start_time = new Date();
              await dbGame.save();
              console.log(`Set start_time for game ${gameId}`);
            }
          } catch (error) {
            console.error('Error updating game start time:', error);
          }
        })();
      }
      
      // Broadcast move to all clients in the room, include time increment information
      io.to(gameId).emit('move', {
        fen,
        move,
        moveNotation,
        isWhiteTimerRunning,
        isBlackTimerRunning,
        whiteTimeLeft,
        blackTimeLeft,
        firstMoveMade: game.firstMoveMade,
        timeIncrement: game.timeIncrement,
        isIncrementApplied: true // Flag to tell clients the increment has been applied by server
      });
      
      // Update game in database if it's over
      if (isGameOver) {
        handleGameOver(gameId);
      }
    });
    
    // Handle time updates with improved sync
    socket.on('timeUpdate', ({ gameId, color, timeLeft }) => {
      const game = games.get(gameId);
      if (!game || game.ended) return;
      
      // Only accept reasonable time updates
      if (timeLeft >= 0 && timeLeft < 3600) { // Max 1 hour
        if (color === 'white') {
          game.whiteTimeLeft = timeLeft;
          io.to(gameId).emit('timeSync', { color: 'white', timeLeft });
        } else {
          game.blackTimeLeft = timeLeft;
          io.to(gameId).emit('timeSync', { color: 'black', timeLeft });
        }
      }
    });
    
    // FIX: Update the chat message handling to work correctly for both players
    socket.on('chat', ({ gameId, message }) => {
      try {
        console.log(`CHAT: Message received in game ${gameId}:`, message);
        
        // Store messages in the game object for persistence
        const game = games.get(gameId);
        if (game) {
          game.messages.push(message);
        }
        
        // Broadcast to all clients in the room EXCEPT sender
        socket.to(gameId).emit('chat', message);
        
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });
    
    // Update draw offer handling
    socket.on('offerDraw', ({ gameId, fromPlayerId }) => {
      try {
        console.log(`Draw offer from ${fromPlayerId} in game ${gameId}`);
        // Broadcast draw offer to ALL clients in the room EXCEPT sender
        socket.to(gameId).emit('drawOffer', { fromPlayerId });
      } catch (error) {
        console.error('Error in offerDraw handler:', error);
      }
    });
    
    socket.on('acceptDraw', ({ gameId }) => {
      const game = games.get(gameId);
      if (!game) return;
      
      io.to(gameId).emit('gameOver', { reason: 'draw', winner: null });
      
      // Update database
      handleGameOver(gameId, 'draw');
    });
    
    socket.on('declineDraw', ({ gameId, fromPlayerId }) => {
      socket.to(gameId).emit('drawOfferRejected', { fromPlayerId });
    });
    
    // Improve resignation handling
    socket.on('resign', ({ gameId, playerId, color }) => {
      try {
        const winner = color === 'white' ? 'black' : 'white';
        console.log(`Player ${playerId} resigned as ${color} in game ${gameId}`);
        
        // Get game instance
        const game = games.get(gameId);
        if (!game) return;
        
        // Set game as ended
        game.ended = true;
        game.result = `${winner}_by_resignation`;
        
        // Broadcast to ALL clients in the room including sender
        io.to(gameId).emit('gameOver', { 
          reason: 'resignation', 
          winner,
          message: `${color === 'white' ? 'White' : 'Black'} resigned. ${winner === 'white' ? 'White' : 'Black'} wins!` 
        });
        
        // Update database
        handleGameOver(gameId, 'resignation', winner);
      } catch (error) {
        console.error('Error in resign handler:', error);
      }
    });
    
    // Handle game over events (resignation, timeout, etc.)
    socket.on('gameOver', ({ gameId, winner, reason }) => {
      const game = games.get(gameId);
      if (!game || game.ended) return;
      
      console.log(`Game ${gameId} over: ${winner} wins by ${reason}`);
      game.ended = true;
      game.winner = winner;
      game.endReason = reason;
      
      // Stop all timers
      game.isWhiteTimerRunning = false;
      game.isBlackTimerRunning = false;
      
      // Broadcast game over to all clients
      io.to(gameId).emit('gameOver', { winner, reason });
      
      // Update game in database
      handleGameOver(gameId);
    });
    
    // Handle disconnections
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected from game ${gameId}`);
      
      // If a player disconnects, notify the opponent
      const game = games.get(gameId);
      
      if (game) {
        if (game.whitePlayerId == userId || game.blackPlayerId == userId) {
          // Check if game is already over before notifying about disconnection
          if (game.ended) {
            // Game already ended - just notify without suggesting redirect
            socket.to(gameId).emit('playerDisconnected', { 
              message: 'Your opponent has left the game.',
              gameActive: false  // Flag to indicate game was already over
            });
          } else {
            try {
              // Double check with database if the game is completed
              const gameData = await db.Game.findByPk(gameId);
              if (gameData && gameData.status === 'completed') {
                // Game already ended according to database
                socket.to(gameId).emit('playerDisconnected', { 
                  message: 'Your opponent has left the game.',
                  gameActive: false
                });
              } else {
                // Game still active - notify with redirect suggestion
                socket.to(gameId).emit('playerDisconnected', { 
                  message: 'Your opponent has disconnected',
                  gameActive: true  // Flag to indicate this was during active game
                });
              }
            } catch (error) {
              console.error('Error checking game status:', error);
              // Default to active game if database check fails
              socket.to(gameId).emit('playerDisconnected', { 
                message: 'Your opponent has disconnected',
                gameActive: true
              });
            }
          }
        } else {
          // Remove from spectators list
          game.spectators = game.spectators.filter(id => id !== userId);
        }
      }
    });
  });
  
  // Helper function to update game result in database
  const handleGameOver = async (gameId, reason = 'checkmate', winner = null) => {
    try {
      const game = games.get(gameId);
      if (!game) return;
      
      const gameData = await db.Game.findByPk(gameId);
      if (!gameData) return;
      
      // Determine the result value based on winner and reason
      let resultValue = null;
      if (winner === 'white') {
        resultValue = `white_win_by_${reason}`;
      } else if (winner === 'black') {
        resultValue = `black_win_by_${reason}`;
      } else if (reason === 'draw') {
        resultValue = 'draw';
      }
      
      // Update game record
      await gameData.update({
        status: 'completed',
        result: resultValue,
        winner_id: winner === 'white' ? gameData.player1_id : 
                  winner === 'black' ? gameData.player2_id : null,
        end_time: new Date()
      });
      
      // Clean up game state
      setTimeout(() => {
        games.delete(gameId);
      }, 3600000); // Keep game data for 1 hour after completion
      
    } catch (error) {
      console.error('Error handling game over:', error);
    }
  };
};