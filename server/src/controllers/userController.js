const User = require('../models/User');
const Game = require('../models/Game');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const path = require('path');
const fs = require('fs');

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Count active games (both waiting and playing)
    const activeGamesCount = await Game.count({
      where: {
        [Op.or]: [
          { player1_id: userId },
          { player2_id: userId }
        ],
        status: {
          [Op.in]: ['waiting', 'playing']
        }
      }
    });

    // Count total completed games
    const completedGamesCount = await Game.count({
      where: {
        [Op.or]: [
          { player1_id: userId },
          { player2_id: userId }
        ],
        status: 'completed'
      }
    });
    
    // Count wins (where user is the winner)
    const winsCount = await Game.count({
      where: {
        winner_id: userId,
        status: 'completed'
      }
    });
    
    // Calculate win rate
    const winRate = completedGamesCount > 0 ? Math.round((winsCount / completedGamesCount) * 100) : 0;
    
    // Return the statistics
    res.json({
      activeGames: activeGamesCount,
      gamesPlayed: completedGamesCount,
      wins: winsCount,
      winRate: winRate
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
};

// Get user by ID (public endpoint for fetching usernames)
const getUserById = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Find user by ID, only return public information
    const user = await User.findByPk(userId, {
      attributes: ['user_id', 'username', 'created_at'] // Only return public fields
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { username, email, profile_image_url, currentPassword, newPassword } = req.body;
    
    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check for password change
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await user.verifyPassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Set new password (will be hashed in the model hooks)
      user.password = newPassword;
    }
    
    // Update fields
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser && existingUser.user_id !== userId) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }
    
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.user_id !== userId) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
      user.email = email;
    }
    
    if (profile_image_url) {
      user.profile_image_url = profile_image_url;
    }
    
    // Save the updated user
    await user.save();
    
    // Return the updated user (without password)
    const updatedUser = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      profile_image_url: user.profile_image_url
    };
    
    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const userId = req.user.user_id;
    
    // Get the file path relative to the server
    const fileUrl = `/uploads/profile/${req.file.filename}`;
    
    // Log the file information for debugging
    console.log('File uploaded:', {
      filename: req.file.filename,
      path: req.file.path,
      fileUrl: fileUrl,
      absolutePath: path.resolve(req.file.path)
    });
    
    // Update the user's profile image URL in the database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If the user had a previous custom image (not the default), delete it
    if (user.profile_image_url && 
        user.profile_image_url !== '/assets/default-avatar.png' && 
        user.profile_image_url.startsWith('/uploads/profile/')) {
      try {
        // Get the old file path
        const oldFilePath = path.join(__dirname, '../../../public', user.profile_image_url);
        
        console.log('Attempting to delete old profile image:', oldFilePath);
        
        // Check if the file exists and delete it
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Successfully deleted old profile image');
        } else {
          console.log('Old profile image not found on disk');
        }
      } catch (err) {
        console.error('Error deleting old profile image:', err);
        // Continue even if deletion fails
      }
    }
    
    // Update the user profile
    user.profile_image_url = fileUrl;
    await user.save();
    
    // Return the new image URL
    res.json({
      message: 'Profile image uploaded successfully',
      imageUrl: fileUrl
    });
    
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ message: 'Error uploading profile image' });
  }
};

module.exports = {
  getUserStats,
  getUserById,
  updateUser,
  uploadProfileImage
};
