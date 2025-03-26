const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const passport = require('passport');
const oauthRoutes = require('./oauth');

// Debug middleware to log all auth requests
router.use((req, res, next) => {
  console.log(`Auth Route: ${req.method} ${req.path}`);
  next();
});

// Existing routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Add verify route with JWT authentication
router.get('/verify', (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Passport authentication error:', err);
      return res.status(500).json({ message: 'Authentication error' });
    }
    
    if (!user) {
      console.log('No user found:', info);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    req.user = user;
    next();
  })(req, res, next);
}, (req, res, next) => {
  console.log('Verify route hit, user:', req.user);
  next();
}, authController.verify);

// Activity update route
router.post('/activity', 
  passport.authenticate('jwt', { session: false }), 
  authController.updateActivity
);

// OAuth routes
router.use('/oauth', oauthRoutes);

module.exports = router;