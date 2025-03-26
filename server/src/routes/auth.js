const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const router = express.Router();

// Update user activity
router.post('/activity', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { error } = await supabase
      .from('Users')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', req.user.user_id);
    
    if (error) throw error;
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
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) throw userError;
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    const { error: updateError } = await supabase
      .from('Users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    if (updateError) throw updateError;

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
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

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error: createError } = await supabase
      .from('Users')
      .insert([
        {
          email,
          password: hashedPassword,
          username,
          last_active: new Date().toISOString(),
          last_login: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) throw createError;

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
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
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const token = jwt.sign(
        { user_id: req.user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error('Google auth error:', error);
      res.redirect(`${process.env.CLIENT_URL}/auth/error`);
    }
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