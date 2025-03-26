const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Update user activity
router.post('/activity', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    await User.update(
      { last_active: new Date() },
      { where: { user_id: req.user.user_id } }
    );
    res.json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ message: 'Failed to update activity' });
  }
});

// Local login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password using the instance method
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    console.log('Login successful for user:', email);
    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    console.log('Registration attempt for email:', email);

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user (password will be hashed by the model's beforeCreate hook)
    const user = await User.create({
      email,
      password,
      username
    });

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    console.log('Registration successful for user:', email);
    res.status(201).json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

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
        
        // Update last login
        user.update({ last_login: new Date() }).catch(error => {
          console.error('Error updating last login:', error);
        });
        
        // Redirect to frontend with token and user info
        const redirectUrl = new URL(`${process.env.CLIENT_URL}/auth/callback`);
        redirectUrl.searchParams.append('token', token);
        redirectUrl.searchParams.append('user', JSON.stringify({
          user_id: user.user_id,
          email: user.email,
          username: user.username,
          avatar_url: user.avatar_url
        }));
        
        res.redirect(redirectUrl.toString());
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