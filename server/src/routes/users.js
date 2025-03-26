const express = require('express');
const passport = require('passport');
const supabase = require('../config/supabase');
const router = express.Router();

// Get user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('Users')
      .select('user_id, email, username, avatar_url, last_active, last_login')
      .eq('user_id', req.user.id)
      .single();
    
    if (error) throw error;
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    
    const { data: user, error } = await supabase
      .from('Users')
      .update({ username, avatar_url })
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile', error: error.message });
  }
});

// Update last active timestamp
router.put('/active', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { error } = await supabase
      .from('Users')
      .update({ last_active: new Date().toISOString() })
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ message: 'Last active timestamp updated' });
  } catch (error) {
    console.error('Error updating last active:', error);
    res.status(500).json({ message: 'Error updating last active', error: error.message });
  }
});

// Get user statistics
router.get('/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Get total games played
    const { count: totalGames, error: totalGamesError } = await supabase
      .from('Games')
      .select('*', { count: 'exact', head: true })
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`);
    
    if (totalGamesError) throw totalGamesError;
    
    // Get games won
    const { count: gamesWon, error: gamesWonError } = await supabase
      .from('Games')
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
      .from('Games')
      .select(`
        *,
        creator:Users!Games_creator_id_fkey(user_id, username),
        opponent:Users!Games_opponent_id_fkey(user_id, username)
      `)
      .or(`creator_id.eq.${req.user.user_id},opponent_id.eq.${req.user.user_id}`)
      .eq('status', 'in_progress');
    
    if (error) throw error;
    
    res.json({ activeGames });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ message: 'Failed to fetch active games' });
  }
});

module.exports = router; 