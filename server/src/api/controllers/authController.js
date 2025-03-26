const supabase = require('../../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    // Remove password from user data before sending
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('Users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user in Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('Users')
      .insert([
        {
          username,
          email,
          password: hashedPassword,
          last_active: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Generate JWT token
    const token = jwt.sign(
      { user_id: newUser.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    // Remove password from user data before sending
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error during registration' });
  }
};

// Verify token and return user data
const verify = async (req, res) => {
  try {
    // User is already authenticated by passport-jwt middleware
    const user = req.user;
    
    // Get fresh user data from Supabase
    const { data: userData, error } = await supabase
      .from('Users')
      .select('*')
      .eq('user_id', user.user_id)
      .single();

    if (error) throw error;

    // Generate a new token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    // Remove password from user data before sending
    const { password: _, ...userWithoutPassword } = userData;

    // Return user data and new token
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Error in verify:', error);
    res.status(500).json({ message: 'Error verifying token' });
  }
};

// Update user's last activity
const updateActivity = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    const { error } = await supabase
      .from('Users')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Activity updated successfully' });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ message: 'Error updating activity' });
  }
};

module.exports = {
  login,
  register,
  verify,
  updateActivity
}; 