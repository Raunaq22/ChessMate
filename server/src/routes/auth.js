const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email using the class method
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Validate password using the instance method
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Send response
    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        email 
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user - password will be hashed by the model hooks
    const user = await User.create({
      username,
      email,
      password,
      last_login: new Date(),
      last_active: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    res.status(201).json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    res.status(500).json({ 
      message: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify token route
router.get('/verify', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({
    user: {
      user_id: req.user.user_id,
      username: req.user.username,
      email: req.user.email,
      profile_image_url: req.user.profile_image_url
    }
  });
});

// Update activity route
router.post('/activity', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    req.user.last_active = new Date();
    await req.user.save();
    res.json({ message: 'Activity updated' });
  } catch (error) {
    console.error('Activity update error:', error);
    res.status(500).json({ message: 'Failed to update activity' });
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
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed` 
  }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        { id: req.user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION || '24h' }
      );

      // Update last login
      req.user.last_login = new Date();
      await req.user.save();

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL}/oauth/callback?token=${token}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

module.exports = router; 