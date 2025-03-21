const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

function setupSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: "*", // Or specify your frontend origin
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token not provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.user_id}`);
    
    // Join a room specific to this user for direct messages
    socket.join(`user_${socket.user.user_id}`);
    
    // Handle waiting for game
    socket.on('wait_for_game', (gameData) => {
      socket.join(`game_${gameData.game_id}`);
      console.log(`User ${socket.user.user_id} waiting for game ${gameData.game_id}`);
    });

    // Leave waiting room
    socket.on('stop_waiting', (gameData) => {
      socket.leave(`game_${gameData.game_id}`);
      console.log(`User ${socket.user.user_id} stopped waiting for game ${gameData.game_id}`);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.user_id}`);
    });
  });

  return io;
}

module.exports = setupSocket;
