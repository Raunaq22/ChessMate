const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth routes
router.get('/oauth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/oauth/google/callback',
  (req, res, next) => {
    console.log('Google callback received with code:', req.query.code);
    passport.authenticate('google', { session: false }, (err, user, info) => {
      console.log('Passport authenticate callback:', { err, user, info });
      
      if (err) {
        console.error('Authentication error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent(err.message)}`);
      }
      
      if (!user) {
        console.error('No user returned from Google auth');
        return res.redirect(`${process.env.CLIENT_URL}/login?error=Authentication failed`);
      }

      try {
        // Generate JWT token
        const token = jwt.sign(
          { user_id: user.user_id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRATION }
        );

        console.log('Successfully generated JWT token for user:', user.user_id);
        
        // Redirect to frontend with token
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
      } catch (error) {
        console.error('Error generating JWT:', error);
        res.redirect(`${process.env.CLIENT_URL}/login?error=${encodeURIComponent('Failed to generate authentication token')}`);
      }
    })(req, res, next);
  }
);

// JWT authentication middleware
const authenticateJWT = passport.authenticate('jwt', { session: false });

// Get current user
router.get('/me', authenticateJWT, (req, res) => {
  res.json(req.user);
});

// Logout
router.post('/logout', authenticateJWT, (req, res) => {
  // Since we're using JWT, we don't need to do anything server-side
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 