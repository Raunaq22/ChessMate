const express = require('express');
const passport = require('passport');
const supabase = require('../config/supabase');
const router = express.Router();

// Get user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, username, email, avatar_url, last_active, created_at, updated_at')
      .eq('user_id', req.user.user_id)
      .single();
    
    if (error) throw error;
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .update({
        username: username || undefined,
        avatar_url: avatar_url || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.user_id)
      .select('user_id, username, email, avatar_url, last_active, created_at, updated_at')
      .single();
    
    if (error) throw error;
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get user statistics
router.get('/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Get total games played
    const { count: totalGames, error: totalGamesError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
    
    if (totalGamesError) throw totalGamesError;
    
    // Get games won
    const { count: gamesWon, error: gamesWonError } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('winner_id', userId);
    
    if (gamesWonError) throw gamesWonError;
    
    // Get win rate
    const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0;
    
    res.json({
      totalGames,
      gamesWon,
      winRate: Math.round(winRate * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get user's active games
router.get('/active-games', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: activeGames, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:player1_id (username, user_id),
        player2:player2_id (username, user_id)
      `)
      .or(`player1_id.eq.${req.user.user_id},player2_id.eq.${req.user.user_id}`)
      .eq('status', 'playing');
    
    if (error) throw error;
    
    res.json({ activeGames });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ message: 'Failed to fetch active games' });
  }
});

module.exports = router; 