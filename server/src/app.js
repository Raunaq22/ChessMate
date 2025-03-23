const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const { Op } = require('sequelize');
const Game = require('./models/Game');
const User = require('./models/User');
require('./config/passport')(passport);
require('dotenv').config();

// Import routes
const authRoutes = require('./api/routes/auth');
const gamesRoutes = require('./api/routes/games');
const usersRoutes = require('./api/routes/users'); // Add this line

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// Update CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  exposedHeaders: ['Content-Disposition']  // Add any needed headers
}));

// Additional CORS headers specifically for image requests
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ChessMate API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        verify: 'GET /api/auth/verify'
      }
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/users', usersRoutes); // Add this line

// Add a cleanup job for abandoned games
const cleanupAbandonedGames = async () => {
  try {
    console.log("Running cleanup for abandoned games...");
    // Get users who haven't been active in the last 2 minutes
    const inactiveUsers = await User.findAll({
      where: {
        last_active: {
          [Op.lt]: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
        }
      },
      attributes: ['user_id']
    });
    
    const inactiveUserIds = inactiveUsers.map(user => user.user_id);
    
    if (inactiveUserIds.length > 0) {
      console.log(`Found ${inactiveUserIds.length} inactive users`);
      // Close any waiting games from inactive users
      const result = await Game.update(
        { status: 'completed' },
        {
          where: {
            player1_id: { [Op.in]: inactiveUserIds },
            status: 'waiting'
          }
        }
      );
      
      if (result[0] > 0) {
        console.log(`Cleaned up ${result[0]} abandoned games from inactive users`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up abandoned games:', error);
  }
};

// Run cleanup job every minute
setInterval(cleanupAbandonedGames, 60 * 1000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;