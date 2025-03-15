const { Chess } = require('chess.js');

module.exports = (io) => {
  // Store active games in memory
  const games = new Map();
  
  io.on('connection', (socket) => {
    const { gameId, userId } = socket.handshake.query;
    console.log(`User ${userId} connected to game ${gameId}`);
    
    // Join the game room
    socket.join(gameId);
    
    // Handle joining a game
    socket.on('joinGame', ({ gameId, userId }) => {
      console.log(`User ${userId} joined game ${gameId}`);
      
      // Get or create game state
      let game = games.get(gameId);
      if (!game) {
        game = {
          id: gameId,
          chess: new Chess(),
          whitePlayerId: null,
          blackPlayerId: null,
          whiteTimeLeft: 600,
          blackTimeLeft: 600,
          timeIncrement: 5,
          started: false,
          messages: []
        };
        games.set(gameId, game);
      }
      
      // Assign player to a side if needed
      if (!game.whitePlayerId) {
        game.whitePlayerId = userId;
      } else if (!game.blackPlayerId && game.whitePlayerId !== userId) {
        game.blackPlayerId = userId;
      }
      
      // Determine player color
      let playerColor = 'spectator';
      if (userId === game.whitePlayerId) {
        playerColor = 'white';
      } else if (userId === game.blackPlayerId) {
        playerColor = 'black';
      }
      
      console.log(`Player ${userId} assigned color: ${playerColor}`);
      
      // Send game state
      socket.emit('gameState', {
        fen: game.chess.fen(),
        playerColor,
        initialTime: 600,
        increment: 5,
        isWhiteTimerRunning: false,
        isBlackTimerRunning: false,
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        whitePlayerProfile: { 
          username: `Player ${game.whitePlayerId}`, 
          elo_rating: 1500 
        },
        blackPlayerProfile: { 
          username: `Player ${game.blackPlayerId}`, 
          elo_rating: 1500 
        },
        started: false,
        whiteTimeLeft: game.whiteTimeLeft,
        blackTimeLeft: game.blackTimeLeft,
        firstMoveMade: false
      });
    });
    
    // Handle move
    socket.on('move', ({ gameId, move, fen, moveNotation, whiteTimeLeft, blackTimeLeft, isWhiteTimerRunning, isBlackTimerRunning, firstMoveMade }) => {
      console.log(`Move received in game ${gameId}: ${JSON.stringify(move)}`);
      
      const game = games.get(gameId);
      if (!game) return;
      
      game.chess = new Chess(fen);
      game.started = true;
      game.whiteTimeLeft = whiteTimeLeft;
      game.blackTimeLeft = blackTimeLeft;
      
      // Broadcast move to everyone EXCEPT sender
      socket.to(gameId).emit('move', { 
        fen, 
        moveNotation, 
        isWhiteTimerRunning, 
        isBlackTimerRunning,
        whiteTimeLeft,
        blackTimeLeft,
        firstMoveMade 
      });
    });
    
    // Update the timeUpdate handler to prevent runaway time increases
    socket.on('timeUpdate', ({ gameId, color, timeLeft }) => {
      const game = games.get(gameId);
      if (!game) return;
      
      // Only accept reasonable time updates (prevent runaway values)
      if (timeLeft > 0 && timeLeft < 3600) { // Max 1 hour
        if (color === 'white') {
          // Only update if the new time is reasonable compared to stored time
          if (Math.abs(game.whiteTimeLeft - timeLeft) < 10) {
            game.whiteTimeLeft = timeLeft;
          } else {
            console.log(`Large time difference ignored for white: ${game.whiteTimeLeft} -> ${timeLeft}`);
          }
        } else {
          // Only update if the new time is reasonable compared to stored time
          if (Math.abs(game.blackTimeLeft - timeLeft) < 10) {
            game.blackTimeLeft = timeLeft;
          } else {
            console.log(`Large time difference ignored for black: ${game.blackTimeLeft} -> ${timeLeft}`);
          }
        }
        
        // Broadcast time update to other clients
        socket.to(gameId).emit('timeUpdate', { color, timeLeft });
      } else {
        console.error(`Invalid time value received: ${timeLeft}`);
      }
    });
    
    // Handle chat messages - critical fix for chat
    socket.on('chat', ({ gameId, message }) => {
      console.log(`CHAT: Message from ${message.username || userId} in game ${gameId}: "${message.text}"`);
      
      if (!message || typeof message.text !== 'string') {
        console.error('Invalid chat message format:', message);
        return;
      }
      
      // Store message in game state
      const game = games.get(gameId);
      if (game) {
        if (!game.messages) game.messages = [];
        game.messages.push(message);
      }
      
      // Broadcast to everyone EXCEPT sender
      socket.to(gameId).emit('chat', message);
    });
    
    // Handle draw offers
    socket.on('offerDraw', ({ gameId, fromPlayerId }) => {
      console.log(`Draw offer from ${fromPlayerId} in game ${gameId}`);
      // Broadcast to all clients in room EXCEPT sender
      socket.to(gameId).emit('drawOffer', { fromPlayerId });
    });
    
    socket.on('acceptDraw', ({ gameId }) => {
      io.to(gameId).emit('gameOver', { reason: 'draw', winner: null });
    });
    
    socket.on('declineDraw', ({ gameId }) => {
      socket.to(gameId).emit('drawOfferRejected');
    });
    
    // Handle resignation
    socket.on('resign', ({ gameId, playerId, color }) => {
      console.log(`Player ${playerId} resigned as ${color} in game ${gameId}`);
      const winner = color === 'white' ? 'black' : 'white';
      io.to(gameId).emit('gameOver', { reason: 'resignation', winner });
    });
    
    // Handle game over
    socket.on('gameOver', ({ gameId, winner, reason }) => {
      io.to(gameId).emit('gameOver', { reason, winner });
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from game ${gameId}`);
    });
  });
};