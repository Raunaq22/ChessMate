const supabase = require('../config/supabase');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.user_id;
    
    // Count active games (both waiting and playing)
    const { count: activeGamesCount, error: activeError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .in('status', ['waiting', 'in_progress']);

    if (activeError) throw activeError;

    // Count total completed games
    const { count: completedGamesCount, error: completedError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq('status', 'completed');

    if (completedError) throw completedError;
    
    // Count wins (where user is the winner)
    const { count: winsCount, error: winsError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('winner_id', userId)
      .eq('status', 'completed');

    if (winsError) throw winsError;
    
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
    
    // Validate that userId is actually a UUID
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    // Find user by ID, only return public information
    const { data: user, error } = await supabase
      .from('Users')
      .select('user_id, username, created_at')
      .eq('user_id', userId)
      .single();

    if (error) {
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
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.user_id;
    const { username, email, profile_image_url, currentPassword, newPassword } = req.body;
    
    // Find the user
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check for password change
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    
    // Update fields
    if (username && username !== user.username) {
      // Check if username is already taken
      const { data: existingUser, error: usernameError } = await supabase
        .from('Users')
        .select('user_id')
        .eq('username', username)
        .neq('user_id', userId)
        .single();

      if (usernameError && usernameError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw usernameError;
      }

      if (existingUser) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }
    
    if (email && email !== user.email) {
      // Check if email is already taken
      const { data: existingUser, error: emailError } = await supabase
        .from('Users')
        .select('user_id')
        .eq('email', email)
        .neq('user_id', userId)
        .single();

      if (emailError && emailError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw emailError;
      }

      if (existingUser) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
      user.email = email;
    }
    
    if (profile_image_url) {
      user.profile_image_url = profile_image_url;
    }
    
    // Update the user
    const { data: updatedUser, error: updateError } = await supabase
      .from('Users')
      .update({
        username: user.username,
        email: user.email,
        password: user.password,
        profile_image_url: user.profile_image_url
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // Return the updated user (without password)
    const responseUser = {
      user_id: updatedUser.user_id,
      username: updatedUser.username,
      email: updatedUser.email,
      profile_image_url: updatedUser.profile_image_url
    };
    
    res.json({ 
      message: 'Profile updated successfully',
      user: responseUser
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

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
    
    // Get the user's current profile image URL
    const { data: user, error: userError } = await supabase
      .from('Users')
      .select('profile_image_url')
      .eq('user_id', userId)
      .single();

    if (userError) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If the user had a previous custom image (not the default), delete it
    if (user.profile_image_url && 
        user.profile_image_url !== '/assets/default-avatar.png' && 
        user.profile_image_url.startsWith('/uploads/profile/')) {
      try {
        const serverDir = path.resolve(__dirname, '../../'); // Go up to server directory
        const oldFilePath = path.join(serverDir, 'public', user.profile_image_url);
        
        console.log('Server directory path:', serverDir);
        console.log('Attempting to delete old profile image:', oldFilePath);
        
        // Check if the file exists and delete it
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('Successfully deleted old profile image');
        } else {
          console.log('Old profile image not found at primary location. Path:', oldFilePath);
          
          // Try the path from the upload log as a reference
          const uploadPathParts = req.file.path.split('/uploads/profile/');
          if (uploadPathParts.length > 0) {
            const baseUploadDir = uploadPathParts[0];
            const oldFileNamePart = user.profile_image_url.split('/').pop();
            const potentialPath = path.join(baseUploadDir, 'uploads', 'profile', oldFileNamePart);
            
            console.log('Trying upload directory reference path:', potentialPath);
            
            if (fs.existsSync(potentialPath)) {
              fs.unlinkSync(potentialPath);
              console.log('Successfully deleted old profile image using reference path');
            } else {
              console.log('Old profile image not found using reference path either');
            }
          }
        }
      } catch (err) {
        console.error('Error deleting old profile image:', err);
        // Continue even if deletion fails
      }
    }
    
    // Update the user profile
    const { error: updateError } = await supabase
      .from('Users')
      .update({ profile_image_url: fileUrl })
      .eq('user_id', userId);

    if (updateError) throw updateError;
    
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

// Get user's games
const getUserGames = async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.user_id;
    
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(games);
  } catch (error) {
    console.error('Error fetching user games:', error);
    res.status(500).json({ message: 'Failed to fetch user games' });
  }
};

module.exports = {
  getUserStats,
  getUserById,
  updateUser,
  uploadProfileImage,
  getUserGames
};
