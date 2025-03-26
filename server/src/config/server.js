const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const supabase = require('./supabase');
require('./passport')(passport);
require('dotenv').config();

// Import routes
const authRoutes = require('../api/routes/auth');

const app = express();

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);

// Generate a random 6-character code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Simple game creation endpoint
app.post('/api/games', async (req, res) => {
  try {
    const { userId, username, timeControl = 10, createFriendGame = false } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log('Creating game for user:', userId);
    
    const inviteCode = generateInviteCode();
    
    const gameData = {
      player1_id: userId,
      status: 'waiting',
      initial_time: timeControl,
      increment: 0,
      white_time: timeControl,
      black_time: timeControl,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      invite_code: inviteCode,
      is_private: createFriendGame || false,
      created_at: new Date().toISOString()
    };

    const { data: game, error: insertError } = await supabase
      .from('games')
      .insert([gameData])
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating game:', insertError);
      throw insertError;
    }

    console.log('Game created successfully:', {
      game_id: game.game_id,
      invite_code: inviteCode
    });
    
    // Return the game data
    res.status(201).json({ 
      game: {
        game_id: game.game_id,
        invite_code: inviteCode,
        player1_id: userId,
        player1: { username, user_id: userId },
        status: game.status,
        white_time: game.white_time,
        black_time: game.black_time,
        is_private: game.is_private
      }
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Failed to create game' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ChessMate API',
    version: '1.0.0',
    routes: {
      auth: {
        verify: 'GET /api/auth/verify',
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      }
    }
  });
});

// Debug route to test auth
app.get('/api/test-auth', (req, res) => {
  res.json({
    message: 'Auth routes are working',
    authRoutesAvailable: true
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle 404 errors
app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

module.exports = app;