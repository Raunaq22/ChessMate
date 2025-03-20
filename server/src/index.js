const app = require('./app');
const http = require('http');
const syncDatabase = require('./config/syncDb');
const db = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Use the main socket handler
const socketHandler = require('./socket');
socketHandler(io);

async function startServer() {
  try {
    await syncDatabase();
    await db.authenticate();
    console.log('Database connection established');

    server.listen(PORT, () => {
      console.log(`HTTP server running on port ${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });

  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();