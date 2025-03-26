const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password, 
      profile_image_url: '/assets/default-avatar.png'
    });

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    // Return user info and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if this is an OAuth user without a password (Google only)
    if (!user.password && user.google_id) {
      return res.status(401).json({ 
        message: 'Please login using Google to sign in',
        oauth: true
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    user.last_login = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '24h' }
    );

    // Return user info and token
    res.status(200).json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_image_url: user.profile_image_url,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Verify token and return user data
const verify = async (req, res) => {
  try {
    console.log('Verifying token for user:', req.user);
    
    // User is already attached to req by passport middleware
    const user = req.user;
    
    if (!user) {
      console.error('No user found in request');
      return res.status(401).json({ message: 'User not found' });
    }

    const userData = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      profile_image_url: user.profile_image_url,
      created_at: user.created_at
    };
    
    console.log('Sending user data:', userData);
    res.status(200).json({ user: userData });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

// Update user last active timestamp
const updateActivity = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await User.update(
      { last_active: new Date() },
      { where: { user_id: userId } }
    );
    
    res.status(200).json({ message: 'Activity updated' });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ message: 'Failed to update activity' });
  }
};

module.exports = {
  register,
  login,
  verify,
  updateActivity
};
