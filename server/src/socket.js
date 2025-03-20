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
          increment: game.increment,
          white_time: game.white_time,
          black_time: game.black_time,
          time_control: game.time_control
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
            attributes: ['user_id', 'username', 'elo_rating']
          }),
          game.player2_id ? User.findByPk(game.player2_id, {
            attributes: ['user_id', 'username', 'elo_rating']
          }) : null
        ]);

        // Prepare player profiles with real usernames
        const whitePlayerProfile = player1 ? {
          id: player1.user_id,
          username: player1.username,
          elo_rating: player1.elo_rating
        } : null;
        
        const blackPlayerProfile = player2 ? {
          id: player2.user_id,
          username: player2.username,
          elo_rating: player2.elo_rating
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
          increment: game.increment
        });

        // CRITICAL FIX: Use the EXACT values from the database without any defaults/overrides
        const initialTime = game.initial_time;
        const whiteTime = game.white_time !== null ? game.white_time : initialTime;
        const blackTime = game.black_time !== null ? game.black_time : initialTime;
        const increment = game.increment || 0;
        
        console.log(`Sending time values to client:`, {
          initialTime,
          whiteTime,
          blackTime,
          increment
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
          increment: increment,
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
            increment: game.increment,
            time_control: game.time_control
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

    socket.on('move', async ({ gameId, move, fen, moveNotation, whiteTimeRemaining, blackTimeRemaining }) => {
      console.log('Move received:', { gameId, move, fen });

      try {
        const game = await Game.findByPk(gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Validate move using chess.js
        const chessInstance = new Chess(game.fen);
        const moveResult = chessInstance.move({
          from: move.from,
          to: move.to,
          promotion: 'q'
        });

        if (!moveResult) {
          socket.emit('error', { message: 'Invalid move' });
          return;
        }

        // Update game in database
        game.fen = fen;
        game.white_time = whiteTimeRemaining;
        game.black_time = blackTimeRemaining;
        game.move_history = [...(game.move_history || []), move];
        await game.save();

        const isWhiteTurn = fen.split(' ')[1] === 'w';

        // Broadcast move to other players
        io.to(`game-${gameId}`).emit('move', {
          from: move.from,
          to: move.to,
          fen: fen,
          moveNotation: moveNotation,
          whiteTimeRemaining,
          blackTimeRemaining,
          isWhiteTimerRunning: isWhiteTurn,
          isBlackTimerRunning: !isWhiteTurn
        });
      } catch (error) {
        console.error('Error processing move:', error);
        socket.emit('error', { message: 'Failed to process move' });
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
          
          // Notify other players in the game
          socket.to(`game-${currentGameId}`).emit('playerDisconnected', {
            message: 'Opponent has disconnected. Game session ended.'
          });
          
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
            
            // If there are still players in the room, notify them
            if (users.size > 0) {
              io.to(`game-${roomId}`).emit('playerDisconnected', {
                message: 'Opponent disconnected - Game session ended'
              });
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
      const game = await Game.findByPk(gameId);
      if (!game) return;
      
      let whiteEloChange = 0;
      let blackEloChange = 0;
      let winnerId = null;
      
      if (winner === 'white') {
        whiteEloChange = 15;
        blackEloChange = -15;
        winnerId = game.player1_id;
      } else if (winner === 'black') {
        whiteEloChange = -15;
        blackEloChange = 15;
        winnerId = game.player2_id;
      }
      
      // Update game in database
      await game.update({
        status: 'completed',
        end_time: new Date(),
        winner_id: winnerId,
        result: winner ? `${winner}_win` : 'draw'
      });
      
      // Update player ratings
      if (game.player1_id && whiteEloChange !== 0) {
        await User.increment('elo_rating', {
          by: whiteEloChange,
          where: { user_id: game.player1_id }
        });
      }
      
      if (game.player2_id && blackEloChange !== 0) {
        await User.increment('elo_rating', {
          by: blackEloChange,
          where: { user_id: game.player2_id }
        });
      }
      
      console.log(`Game ${gameId} result updated: ${reason}, winner: ${winner || 'draw'}`);
    } catch (error) {
      console.error('Error updating game result:', error);
    }
  }
};

module.exports = configureSocket;