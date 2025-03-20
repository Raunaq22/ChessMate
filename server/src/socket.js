const Game = require('./models/Game');
const { Chess } = require('chess.js');
const { Op } = require('sequelize');
const User = require('./models/User'); // Add this line to import the User model

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

    const activityInterval = setInterval(updateActivity, 30000);

    socket.on('joinGame', async ({ gameId, userId }) => {
      try {
        const game = await Game.findByPk(gameId);
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Prevent same user from joining both sides
        if (game.player1_id === userId && game.player2_id === userId) {
          socket.emit('error', { message: 'Cannot play against yourself' });
          return;
        }

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

        // Ensure we're sending the correct time values
        const initialTime = game.initial_time || null;
        const whiteTime = game.white_time !== null ? game.white_time : initialTime;
        const blackTime = game.black_time !== null ? game.black_time : initialTime;

        socket.emit('gameState', {
          fen: game.fen,
          playerColor,
          initialTime: initialTime,
          increment: game.increment || 0,
          whitePlayerId: game.player1_id,
          blackPlayerId: game.player2_id,
          isWhiteTimerRunning: game.status === 'playing' && game.fen.split(' ')[1] === 'w',
          isBlackTimerRunning: game.status === 'playing' && game.fen.split(' ')[1] === 'b',
          started: isGameStarted,
          whiteTimeLeft: whiteTime,
          blackTimeLeft: blackTime
        });
      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', { message: 'Failed to join game' });
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
        const game = activeGames.get(currentGameId);
        if (game) {
          game.delete(currentUserId);
          
          // Notify other players in the game
          socket.to(`game-${currentGameId}`).emit('playerDisconnected', {
            message: 'Opponent has disconnected. Game session ended.'
          });
          
          // Clean up empty game
          if (game.size === 0) {
            activeGames.delete(currentGameId);
          }
        }
      }

      if (currentUserId) {
        try {
          // Mark all waiting games created by this user as completed
          await Game.update(
            { status: 'completed' },
            {
              where: {
                player1_id: currentUserId,
                status: 'waiting'
              }
            }
          );
          console.log(`Cleaned up waiting games for user ${currentUserId}`);
        } catch (error) {
          console.error('Error cleaning up games:', error);
        }
      }

      // Find which game room this socket was in
      for (const [roomName, sockets] of activeGames.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          
          // If there are still players in the room, notify them
          if (sockets.size > 0) {
            io.to(roomName).emit('playerDisconnected', {
              message: 'Opponent disconnected - Game session ended'
            });
          }
          
          // Clean up empty rooms
          if (sockets.size === 0) {
            activeGames.delete(roomName);
          }
          
          break;
        }
      }
    });
  });
};

module.exports = configureSocket;