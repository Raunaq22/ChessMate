const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('Users')
      .select('*')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw checkError;
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const { data: user, error: createError } = await supabase
      .from('Users')
      .insert([{
        username,
        email,
        password: hashedPassword,
        profile_image_url: '/assets/default-avatar.png',
        last_active: new Date().toISOString(),
        last_login: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) throw createError;

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
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// Login existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
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
    const { error: updateError } = await supabase
      .from('Users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', user.user_id);

    if (updateError) throw updateError;

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
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Verify token and return user data
const verify = async (req, res) => {
  try {
    // The user is already authenticated by passport middleware
    // Get the full user data from Supabase
    const { data: user, error } = await supabase
      .from('Users')
      .select('user_id, username, email, profile_image_url')
      .eq('user_id', req.user.user_id)
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      return res.status(500).json({ message: 'Error fetching user data' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data
    res.json({
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        profile_image_url: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Error verifying token' });
  }
};

// Update user last active timestamp
const updateActivity = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { error } = await supabase
      .from('Users')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;
    
    res.status(200).json({ message: 'Activity updated' });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ message: 'Failed to update activity', error: error.message });
  }
};

module.exports = {
  register,
  login,
  verify,
  updateActivity
};
