const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  console.log('Registration attempt:', req.body);
  const { username, email, password } = req.body;
  try {
    const user = await User.create({ username, email, password });
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
    console.log('Registration successful:', { userId: user.user_id });
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Update last active timestamp on login
    user.last_active = new Date();
    await user.save();
    
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Verify token route
router.get('/verify', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

// Update last active timestamp - Implement directly in the route
router.post('/activity', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.user_id;
    const now = new Date();
    console.log(`Updating activity for user ${userId} to ${now.toISOString()}`);
    
    await User.update(
      { last_active: now },
      { where: { user_id: userId } }
    );
    
    res.status(200).json({ message: 'Activity updated' });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ message: 'Failed to update activity' });
  }
});

module.exports = router;