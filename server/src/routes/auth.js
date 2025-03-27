const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
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
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password, // Password will be hashed in the model
      last_login: new Date()
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
    res.status(500).json({ message: 'Server error during registration' });
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

module.exports = router; 