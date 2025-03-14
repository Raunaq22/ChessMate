const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  console.log('Registration attempt:', req.body); // Add this line
  const { username, email, password } = req.body;
  try {
    const user = await User.create({ username, email, password });
    const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
    console.log('Registration successful:', { userId: user.user_id }); // Add this line
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Registration error:', error); // Add this line
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

module.exports = router;