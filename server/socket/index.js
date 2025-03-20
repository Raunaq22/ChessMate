const socketIo = require('socket.io');
const gameHandler = require('./gameHandler');

module.exports = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Debug middleware for connection tracing
  io.use((socket, next) => {
    const { gameId, userId } = socket.handshake.query;
    console.log(`Socket connection attempt - Game: ${gameId}, User: ${userId}, SocketID: ${socket.id}`);
    next();
  });

  // Initialize game handler with the io instance
  gameHandler(io);

  return io;
};