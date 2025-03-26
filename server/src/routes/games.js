const express = require('express');
const passport = require('passport');
const supabase = require('../config/supabase');
const router = express.Router();

// Generate a random 6-character code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding characters that look similar
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get available games
router.get('/available', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .eq('status', 'waiting')
      .neq('creator_id', req.user.user_id);

    if (error) throw error;

    res.json(games);
  } catch (error) {
    console.error('Error fetching available games:', error);
    res.status(500).json({ message: 'Error fetching available games', error: error.message });
  }
});

// Create new game
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { opponent_id, is_private } = req.body;

    const { data: game, error } = await supabase
      .from('games')
      .insert([
        {
          creator_id: req.user.user_id,
          opponent_id: opponent_id || null,
          status: opponent_id ? 'in_progress' : 'waiting',
          is_private: is_private || false,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Error creating game', error: error.message });
  }
});

// Get game history
router.get('/history', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .or(`creator_id.eq.${req.user.user_id},opponent_id.eq.${req.user.user_id}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(games);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ message: 'Error fetching game history', error: error.message });
  }
});

// Join game by invite code
router.post('/join/:inviteCode', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { inviteCode } = req.params;

    // Find game by invite code
    const { data: game, error: findError } = await supabase
      .from('games')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'waiting')
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        return res.status(404).json({ message: 'Game not found or already started' });
      }
      throw findError;
    }

    // Update game with opponent
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        opponent_id: req.user.user_id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('game_id', game.game_id)
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .single();

    if (updateError) throw updateError;

    res.json(updatedGame);
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ message: 'Error joining game', error: error.message });
  }
});

// Get game details
router.get('/:gameId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        creator:Users!games_creator_id_fkey(user_id, username, avatar_url),
        opponent:Users!games_opponent_id_fkey(user_id, username, avatar_url)
      `)
      .eq('game_id', req.params.gameId)
      .single();

    if (error) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json({ game });
  } catch (error) {
    console.error('Game fetch error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Cancel a game
router.delete('/:gameId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', req.params.gameId)
      .eq('creator_id', req.user.user_id)
      .is('opponent_id', null)
      .eq('status', 'waiting')
      .single();

    if (error) {
      throw new Error('Game not found or cannot be cancelled');
    }

    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('game_id', req.params.gameId);

    if (deleteError) throw deleteError;

    res.json({ message: 'Game cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling game:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 