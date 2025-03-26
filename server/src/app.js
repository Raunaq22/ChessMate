const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const supabase = require('./config/supabase');
const path = require('path');
require('./config/passport')(passport);
require('dotenv').config();

// Import routes
const authRoutes = require('./api/routes/auth');
const gamesRoutes = require('./api/routes/games');
const usersRoutes = require('./api/routes/users'); 

// Import database connection check
const syncDatabase = require('./config/syncDb');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  exposedHeaders: ['Authorization', 'Content-Disposition']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// Additional headers specifically for image requests
app.use('/uploads', (req, res, next) => {
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

// API Routes - Mount auth routes first
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/users', usersRoutes);

// Add a cleanup job for abandoned games
const cleanupAbandonedGames = async () => {
  try {
    console.log("Running cleanup for abandoned games...");
    // Get users who haven't been active in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: inactiveUsers, error: inactiveError } = await supabase
      .from('Users')
      .select('user_id')
      .lt('last_active', twoMinutesAgo);

    if (inactiveError) throw inactiveError;
    
    const inactiveUserIds = inactiveUsers.map(user => user.user_id);
    
    if (inactiveUserIds.length > 0) {
      console.log(`Found ${inactiveUserIds.length} inactive users`);
      // Close any waiting games from inactive users
      const { data: result, error: updateError } = await supabase
        .from('games')
        .update({ status: 'completed' })
        .in('creator_id', inactiveUserIds)
        .eq('status', 'waiting')
        .select();

      if (updateError) throw updateError;
      
      if (result && result.length > 0) {
        console.log(`Cleaned up ${result.length} abandoned games from inactive users`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up abandoned games:', error);
  }
};

// Run cleanup job every minute
setInterval(cleanupAbandonedGames, 60 * 1000);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5001;

// Start server after checking database connection
async function startServer() {
  try {
    await syncDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Auth callback URL: ${process.env.GOOGLE_CALLBACK_URL}`);
      console.log(`Client URL: ${process.env.CLIENT_URL}`);
      console.log('Available routes:');
      console.log('- POST /api/auth/register');
      console.log('- POST /api/auth/login');
      console.log('- GET /api/auth/verify');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;