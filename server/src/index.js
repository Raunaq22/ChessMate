const app = require('./app');
const http = require('http');
const syncDatabase = require('./config/syncDb');
const db = require('./config/db');
const express = require('express'); // Add this line to import express
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Add this near the top of the file, before any routes that use models
require('./models/index'); // This sets up all associations

const PORT = process.env.PORT || 5001;

// Set up static file serving
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../public/uploads/profile');
if (!fs.existsSync(uploadDir)) {
  console.log(`Creating upload directory: ${uploadDir}`);
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Log the directories for debugging
console.log("Static files served from:", path.join(__dirname, '../public'));
console.log("Upload directory:", uploadDir);

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