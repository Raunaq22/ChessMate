const Game = require('./models/Game');
const { Chess } = require('chess.js');
const { Op } = require('sequelize');
const User = require('./models/User');

const configureSocket = (io) => {
  const activeGames = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    let currentGameId = null;
    let currentUserId = null;

    // Update user's last_active timestamp every 30 seconds
    const updateActivity = async () => {
      const userId = socket.handshake.query.userId;
      if (userId) {
        try {
          const now = new Date();
          console.log(`Updating activity for user ${userId} to ${now.toISOString()}`);
          await User.update(
            { last_active: now },
            { where: { user_id: userId } }
          );
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      }
    };

    // Run immediately on connection to update activity
    updateActivity();
    const activityInterval = setInterval(updateActivity, 30000);

    socket.on('joinGame', async ({ gameId, userId }) => {
      try {
        // Get game data with detailed logging
        console.log(`Attempting to fetch game ${gameId} for user ${userId}`);
        const game = await Game.findByPk(gameId);
        
        if (!game) {
          console.error(`Game ${gameId} not found in database`);
          socket.emit('error', { message: 'Game not found' });
          return;
        }
        
        // Log the ACTUAL raw data from the database - crucial for debugging
        console.log(`GAME DATA FROM DATABASE:`, {
          game_id: game.game_id,
          initial_time: game.initial_time,
          increment: game.getDataValue('increment'), // Fixed to use getDataValue instead of accessing increment directly
          white_time: game.white_time,
          black_time: game.black_time
        });

        // Prevent same user from joining both sides
        if (game.player1_id === userId && game.player2_id === userId) {
          socket.emit('error', { message: 'Cannot play against yourself' });
          return;
        }

        // Store the game ID for this socket
        currentGameId = gameId;
        currentUserId = userId;

        // Fetch the player information for both players
        const [player1, player2] = await Promise.all([
          User.findByPk(game.player1_id, {
            attributes: ['user_id', 'username']
          }),
          game.player2_id ? User.findByPk(game.player2_id, {
            attributes: ['user_id', 'username']
          }) : null
        ]);

        // Prepare player profiles with real usernames
        const whitePlayerProfile = player1 ? {
          id: player1.user_id,
          username: player1.username
        } : null;
        
        const blackPlayerProfile = player2 ? {
          id: player2.user_id,
          username: player2.username
        } : null;

        console.log('Player profiles:', {
          white: whitePlayerProfile,
          black: blackPlayerProfile
        });

        const roomName = `game-${gameId}`;
        socket.join(roomName);

        // Determine player color and role
        const playerColor = game.player1_id === userId ? 'white' : 'black';
        const isGameStarted = game.status === 'playing';

        // Add debug logging to check time values
        console.log(`Game ${gameId} time settings:`, {
          initialTime: game.initial_time,
          whiteTime: game.white_time,
          blackTime: game.black_time,
          // Fix: Use getDataValue to bypass the method/property conflict
          increment: game.getDataValue('increment')
        });

        // CRITICAL FIX: Use the EXACT values from the database without any defaults/overrides
        const initialTime = game.initial_time;
        const whiteTime = game.white_time !== null ? game.white_time : initialTime;
        const blackTime = game.black_time !== null ? game.black_time : initialTime;
        // Always use getDataValue to access the increment property
        const incrementValue = game.getDataValue('increment') || 0;
        
        console.log(`Sending time values to client:`, {
          initialTime,
          whiteTime,
          blackTime,
          increment: incrementValue
        });

        // Important - emit to EVERYONE in the room (including sender)
        // This ensures all players get updated about each other
        io.to(roomName).emit('playerUpdate', {
          whitePlayerId: game.player1_id,
          blackPlayerId: game.player2_id,
          whitePlayerProfile: whitePlayerProfile,
          blackPlayerProfile: blackPlayerProfile
        });

        socket.emit('gameState', {
          fen: game.fen,
          playerColor,
          initialTime: initialTime,
          increment: incrementValue,  // Use the fixed increment value
          whitePlayerId: game.player1_id,
          blackPlayerId: game.player2_id,
          whitePlayerProfile: whitePlayerProfile,
          blackPlayerProfile: blackPlayerProfile,
          isWhiteTimerRunning: game.status === 'playing' && game.fen.split(' ')[1] === 'w',
          isBlackTimerRunning: game.status === 'playing' && game.fen.split(' ')[1] === 'b',
          started: isGameStarted,
          whiteTimeLeft: whiteTime,
          blackTimeLeft: blackTime,
          // Add raw game data for complete debugging
          gameData: {
            initial_time: game.initial_time,
            increment: game.increment
          }
        });
        
        // Track this socket in the activeGames map
        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, new Map());
        }
        activeGames.get(gameId).set(userId, socket.id);
        
      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // FIX: Modified chat message handling to be compatible with gameHandler.js
    socket.on('chat', ({ gameId, message }) => {
      try {
        console.log(`CHAT: Message from ${message.username} in game ${gameId}:`, message);
        
        if (!message || !message.text) {
          console.error('Invalid chat message format');
          return;
        }
        
        // Broadcast to all clients in the room EXCEPT sender
        socket.to(`game-${gameId}`).emit('chat', message);
      } catch (error) {
        console.error('Error handling chat message:', error);
      }
    });

    // Inside your move event handler in configureSocket.js
socket.on('move', async ({ gameId, move, fen, moveNotation, whiteTimeLeft, blackTimeLeft, isWhiteTimerRunning, isBlackTimerRunning, isCheckmate, winner }) => {
  try {
    const game = await Game.findByPk(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }
    
    // Safely extract increment value
    const incrementValue = game.getDataValue('increment') || 0;
    
    // Determine which color just made a move from the FEN
    const currentTurn = fen.split(' ')[1]; // 'w' or 'b'
    const movingColor = currentTurn === 'w' ? 'black' : 'white'; // If it's white's turn now, black just moved
    
    console.log(`Received move: ${move.from} to ${move.to}, moving color: ${movingColor}`);
    console.log(`Current time values - White: ${whiteTimeLeft}s, Black: ${blackTimeLeft}s`);
    
    // Get move count to determine if increment should be applied
    const moveHistory = game.move_history || [];
    const moveCount = moveHistory.length;
    
    // Apply increment to the player who just moved (skip the first move)
    const shouldApplyIncrement = incrementValue > 0 && moveCount > 0;
    
    if (shouldApplyIncrement) {
      if (movingColor === 'white') {
        // Add increment to white's time
        const oldWhiteTime = whiteTimeLeft;
        whiteTimeLeft = Math.round(whiteTimeLeft + incrementValue);
        console.log(`Applied increment to white: ${oldWhiteTime}s → ${whiteTimeLeft}s (+${incrementValue}s)`);
      } else if (movingColor === 'black') {
        // Add increment to black's time
        const oldBlackTime = blackTimeLeft;
        blackTimeLeft = Math.round(blackTimeLeft + incrementValue);
        console.log(`Applied increment to black: ${oldBlackTime}s → ${blackTimeLeft}s (+${incrementValue}s)`);
      }
    }

    // Update game in database with rounded values for consistency
    game.fen = fen;
    game.white_time = Math.round(whiteTimeLeft);
    game.black_time = Math.round(blackTimeLeft);
    game.move_history = [...moveHistory, move];
    await game.save();

    // Log all values before sending to client
    console.log(`Updated time values - White: ${game.white_time}s, Black: ${game.black_time}s`);
    
    // Broadcast the move to all clients with the updated times
    io.to(`game-${gameId}`).emit('move', {
      from: move.from,
      to: move.to,
      fen: fen,
      moveNotation: moveNotation,
      whiteTimeLeft: game.white_time,  // Use database values for consistency
      blackTimeLeft: game.black_time,  // Use database values for consistency 
      isWhiteTimerRunning,
      isBlackTimerRunning
    });

    // Handle checkmate
    if (isCheckmate && winner) {
      console.log(`Checkmate detected in game ${gameId}. Winner: ${winner}`);
      
      io.to(`game-${gameId}`).emit('gameOver', {
        reason: 'checkmate',
        winner: winner
      });
      
      updateGameResult(gameId, 'checkmate', winner);
    }
  } catch (error) {
    console.error('Error processing move:', error);
    socket.emit('error', { message: 'Failed to process move' });
  }
});

    // Enhance gameOver event handler with acknowledgment
    socket.on('gameOver', ({ gameId, winner, reason }, callback) => {
      console.log(`Game over event: ${gameId}, winner: ${winner}, reason: ${reason}`);
      
      // Broadcast to all clients in the room (including sender to ensure everyone gets the message)
      io.to(`game-${gameId}`).emit('gameOver', {
        reason,
        winner
      });
      
      // Update game result in database
      updateGameResult(gameId, reason, winner);
      
      // Send acknowledgment if callback exists
      if (typeof callback === 'function') {
        callback({ received: true });
      }
    });

    socket.on('timeUpdate', async ({ gameId, color, timeLeft }) => {
      try {
        const game = await Game.findByPk(gameId);
        if (!game) return;

        if (color === 'white') {
          game.white_time = timeLeft;
        } else {
          game.black_time = timeLeft;
        }
        await game.save();

        // Broadcast time update to other player
        socket.to(`game-${gameId}`).emit('timeUpdate', { color, timeLeft });
      } catch (error) {
        console.error('Error updating time:', error);
      }
    });

    // Event handlers for draw offers and resignations
    socket.on('offerDraw', ({ gameId, fromPlayerId }) => {
      console.log(`Draw offer from ${fromPlayerId} in game ${gameId}`);
      socket.to(`game-${gameId}`).emit('drawOffer', { fromPlayerId });
    });
    
    socket.on('acceptDraw', ({ gameId }) => {
      io.to(`game-${gameId}`).emit('gameOver', { reason: 'draw', winner: null });
      // Update game result in the database
      updateGameResult(gameId, 'draw');
    });
    
    socket.on('declineDraw', ({ gameId, fromPlayerId }) => {
      socket.to(`game-${gameId}`).emit('drawOfferRejected', { fromPlayerId });
    });
    
    socket.on('resign', ({ gameId, playerId, color }) => {
      const winner = color === 'white' ? 'black' : 'white';
      console.log(`Player ${playerId} resigned as ${color} in game ${gameId}`);
      
      io.to(`game-${gameId}`).emit('gameOver', {
        reason: 'resignation',
        winner,
        message: `${color === 'white' ? 'White' : 'Black'} resigned. ${winner === 'white' ? 'White' : 'Black'} wins!`
      });
      
      // Update game result in the database
      updateGameResult(gameId, 'resignation', winner);
    });

    socket.on('disconnect', async () => {
      clearInterval(activityInterval);
      console.log('Client disconnected:', socket.id);

      // Get the user ID from the socket handshake query
      const userId = socket.handshake.query.userId;

      if (userId) {
        try {
          // Mark all waiting games created by this user as completed
          await Game.update(
            { status: 'completed' },
            {
              where: {
                player1_id: userId,
                status: 'waiting'
              }
            }
          );
          console.log(`Cleaned up waiting games for user ${userId}`);
        } catch (error) {
          console.error('Error cleaning up games:', error);
        }
      }

      if (currentGameId && currentUserId) {
        const gameUsers = activeGames.get(currentGameId);
        if (gameUsers) {
          gameUsers.delete(currentUserId);
          
          try {
            // Check if the game has already ended before notifying about disconnection
            const game = await Game.findByPk(currentGameId);
            
            if (game && game.status !== 'completed') {
              // Only notify about disconnection if game is still active
              socket.to(`game-${currentGameId}`).emit('playerDisconnected', {
                message: 'Opponent has disconnected. Game session ended.',
                gameActive: true // Flag to indicate this was during active game
              });
            } else {
              // Game already completed - just notify without suggesting redirect
              socket.to(`game-${currentGameId}`).emit('playerDisconnected', {
                message: 'Opponent has left the game.',
                gameActive: false // Flag to indicate game was already over
              });
            }
          } catch (error) {
            console.error('Error checking game status on disconnect:', error);
          }
          
          // Clean up empty game
          if (gameUsers.size === 0) {
            activeGames.delete(currentGameId);
          }
        }
      }

      // Find which game room this socket was in
      for (const [roomId, users] of activeGames.entries()) {
        for (const [userId, socketId] of users.entries()) {
          if (socketId === socket.id) {
            users.delete(userId);
            
            try {
              // Check if the game has already ended before notifying about disconnection
              const game = await Game.findByPk(roomId);
              
              // If there are still players in the room, notify them based on game status
              if (users.size > 0) {
                if (game && game.status !== 'completed') {
                  io.to(`game-${roomId}`).emit('playerDisconnected', {
                    message: 'Opponent disconnected - Game session ended',
                    gameActive: true // Flag to indicate this was during active game
                  });
                } else {
                  io.to(`game-${roomId}`).emit('playerDisconnected', {
                    message: 'Opponent has left the game.',
                    gameActive: false // Flag to indicate game was already over
                  });
                }
              }
            } catch (error) {
              console.error('Error checking game status on disconnect:', error);
            }
            
            // Clean up empty rooms
            if (users.size === 0) {
              activeGames.delete(roomId);
            }
            
            break;
          }
        }
      }
    });
  });
  
  // Helper function to update game result in the database
  async function updateGameResult(gameId, reason, winner = null) {
    try {
      console.log(`Updating game result in database: ${gameId}, reason: ${reason}, winner: ${winner}`);
      const game = await Game.findByPk(gameId);
      if (!game) {
        console.log(`Game ${gameId} not found in database`);
        return;
      }
      
      let winnerId = null;
      let resultValue = null;
      
      if (winner === 'white') {
        winnerId = game.player1_id;
        resultValue = `white_win_by_${reason}`;
      } else if (winner === 'black') {
        winnerId = game.player2_id;
        resultValue = `black_win_by_${reason}`;
      } else if (reason === 'draw') {
        resultValue = 'draw';
      }
      
      // Update game in database
      await game.update({
        status: 'completed',
        end_time: new Date(),
        winner_id: winnerId,
        result: resultValue
      });
      
      console.log(`Game ${gameId} result updated: ${reason}, winner: ${winner || 'draw'}, result: ${resultValue}`);
    } catch (error) {
      console.error('Error updating game result:', error);
    }
  }
};

module.exports = configureSocket;