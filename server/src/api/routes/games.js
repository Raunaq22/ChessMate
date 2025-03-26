const express = require('express');
const passport = require('passport');
const supabase = require('../../config/supabase');
const gameController = require('../../controllers/gameController');
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
    console.log('Fetching available games for user:', req.user.user_id);
    
    // Get active games where current user isn't already a player - with detailed logging
    const { data: availableGames, error: gamesError } = await supabase
      .from('games')
      .select(`
        *,
        player1:users!games_player1_id_fkey (
          username,
          last_active,
          user_id
        )
      `)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .neq('player1_id', req.user.user_id)
      .eq('is_private', false)
      .order('created_at', { ascending: false });

    if (gamesError) throw gamesError;

    console.log(`Found ${availableGames.length} available games`);
    
    // Add detailed logging about each game found
    if (availableGames.length > 0) {
      console.log('Available games details:');
      availableGames.forEach(game => {
        console.log(`- Game ID: ${game.game_id}, Created by: ${game.player1?.username || 'Unknown'}, Private: ${game.is_private}`);
      });
    } else {
      // If no games found, log the total count of waiting games regardless of filters
      const { count: totalWaitingGames, error: countError } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')
        .is('player2_id', null);

      if (countError) throw countError;
      console.log(`No games available for this user. Total waiting games in system: ${totalWaitingGames}`);
    }
    
    res.json({ availableGames });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ message: 'Failed to fetch games' });
  }
});

// Create a new game
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { timeControl, initialTime, increment, createFriendGame } = req.body;
    const creator = req.user;
    
    // ALWAYS generate invite code for all games - makes it easier to share
    const inviteCode = generateInviteCode();
    
    console.log(`Creating new game with invite code: ${inviteCode} for user ${creator.user_id}`);
    console.log(`Game parameters: timeControl=${timeControl}, initialTime=${initialTime}, increment=${increment}, createFriendGame=${createFriendGame}`);
    
    const gameData = {
      player1_id: creator.user_id,
      status: 'waiting',
      initial_time: initialTime,
      increment: increment,
      white_time: initialTime,
      black_time: initialTime,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      invite_code: inviteCode,
      is_private: createFriendGame || false,
      created_at: new Date().toISOString()
    };

    const { data: game, error: insertError } = await supabase
      .from('games')
      .insert([gameData])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Created game with ID ${game.game_id} and invite code ${inviteCode}, is_private=${game.is_private}`);
    
    // Broadcast to Supabase real-time if the game is not private
    if (!game.is_private) {
      const gameData = {
        game_id: game.game_id,
        initial_time: game.initial_time,
        increment: game.increment,
        player1_id: creator.user_id,
        player1: {
          username: creator.username,
          user_id: creator.user_id
        },
        status: 'waiting',
        created_at: game.created_at
      };
      
      // Insert into Supabase games table
      const { error: broadcastError } = await supabase
        .from('games')
        .insert([gameData]);

      if (broadcastError) throw broadcastError;
      
      console.log(`Broadcasting new game ${game.game_id} to all users via Supabase`);
    }
    
    res.status(201).json({ 
      game: {
        game_id: game.game_id,
        invite_code: inviteCode,
        player1_id: creator.user_id,
        status: game.status,
        white_time: game.white_time,
        black_time: game.black_time,
        is_private: game.is_private
      }
    });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get user's game history
router.get('/history', passport.authenticate('jwt', { session: false }), gameController.getGameHistory);

// Join a game using invite code
router.post('/join-by-code', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { code } = req.body;
    const joiner = req.user;
    
    if (!code) {
      return res.status(400).json({ message: 'Game code is required' });
    }
    
    console.log(`User ${joiner.user_id} attempting to find game with invite code: ${code}`);
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('invite_code', code)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .single();

    if (gameError || !game) {
      console.log(`Game with invite code ${code} not found or unavailable`);
      return res.status(404).json({
        message: 'Game not found or no longer available',
        details: 'The game may have been cancelled or someone else has already joined'
      });
    }
    
    console.log(`Found game with ID: ${game.game_id} and invite code: ${code}`);
    
    // Prevent joining your own game
    if (game.player1_id === joiner.user_id) {
      console.log(`User ${joiner.user_id} attempted to join their own game ${game.game_id}`);
      return res.status(400).json({
        message: 'Cannot join your own game',
        details: 'You created this game. Wait for someone else to join or use the direct link.'
      });
    }
    
    // Update game status
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: req.user.user_id,
        status: 'playing'
      })
      .eq('game_id', game.game_id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // Mark any other waiting games by this user as completed
    const { error: otherGamesError } = await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('player1_id', req.user.user_id)
      .eq('status', 'waiting');

    if (otherGamesError) throw otherGamesError;
    
    // Notify game creator via Supabase
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([{
        user_id: game.player1_id,
        type: 'game_joined',
        content: {
          game_id: game.game_id,
          player: {
            user_id: req.user.user_id,
            username: req.user.username
          },
          message: 'A player has joined your game!'
        }
      }]);

    if (notificationError) throw notificationError;
    
    console.log(`Notified creator of game ${game.game_id} via Supabase`);
    
    res.json({ game: updatedGame });
  } catch (error) {
    console.error('Error joining game by code:', error);
    res.status(400).json({ message: error.message });
  }
});

// Join an existing game
router.post('/:gameId/join', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', req.params.gameId)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .single();

    if (gameError || !game) {
      return res.status(404).json({ message: 'Game not found or no longer available' });
    }
    
    // Prevent joining your own game
    if (game.player1_id === req.user.user_id) {
      return res.status(400).json({ message: 'Cannot join your own game' });
    }

    // Update game status
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: req.user.user_id,
        status: 'playing'
      })
      .eq('game_id', game.game_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Mark any other waiting games by this user as completed
    const { error: otherGamesError } = await supabase
      .from('games')
      .update({ status: 'completed' })
      .eq('player1_id', req.user.user_id)
      .eq('status', 'waiting');

    if (otherGamesError) throw otherGamesError;

    res.json({ game: updatedGame });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get game details
router.get('/:gameId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', req.params.gameId)
      .single();

    if (gameError || !game) {
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
    await supabase
      .from('games')
      .delete()
      .eq('game_id', req.params.gameId);
    res.json({ message: 'Game cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling game:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;