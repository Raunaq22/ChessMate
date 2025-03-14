const Game = require('./models/Game');
const { Chess } = require('chess.js');
const { Op } = require('sequelize');

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
          await User.update(
            { last_active: new Date() },
            { where: { user_id: userId } }
          );
        } catch (error) {
          console.error('Error updating user activity:', error);
        }
      }
    };

    const activityInterval = setInterval(updateActivity, 30000);

    socket.on('joinGame', async ({ gameId, userId }) => {
      console.log(`Join game request: { gameId: '${gameId}', userId: ${userId} }`);
      
      currentGameId = gameId;
      currentUserId = userId;

      try {
        // Instead of cancelling, we'll mark old games as completed
        await Game.update(
          { status: 'completed' },
          {
            where: {
              player1_id: userId,
              status: 'waiting',
              game_id: { [Op.ne]: gameId }
            }
          }
        );

        const game = await Game.findByPk(gameId);
        if (!game || game.status === 'cancelled') {
          socket.emit('error', { message: 'Game not found or cancelled' });
          return;
        }

        const roomName = `game-${gameId}`;
        socket.join(roomName);

        if (!activeGames.has(gameId)) {
          activeGames.set(gameId, new Set());
        }
        activeGames.get(gameId).add(userId);

        console.log(`User ${userId} joined game room ${roomName}`);
        console.log(`Players in room ${roomName}:`, activeGames.get(gameId).size);

        const playerColor = game.player1_id === userId ? 'white' : 'black';
        socket.emit('gameState', {
          fen: game.fen,
          status: game.status,
          playerColor
        });

      } catch (error) {
        console.error('Error in joinGame:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    socket.on('move', async ({ gameId, move, fen }) => {
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
        game.move_history = [...(game.move_history || []), move];
        await game.save();

        // Broadcast move to other players
        socket.to(`game-${gameId}`).emit('move', move);
      } catch (error) {
        console.error('Error processing move:', error);
        socket.emit('error', { message: 'Failed to process move' });
      }
    });

    socket.on('disconnect', async () => {
      clearInterval(activityInterval);
      console.log('Client disconnected:', socket.id);

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