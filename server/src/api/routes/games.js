const express = require('express');
const passport = require('passport');
const { Op } = require('sequelize');
const Game = require('../../models/Game');
const User = require('../../models/User');
const router = express.Router();

// Get available games
router.get('/available', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    console.log('Fetching available games for user:', req.user.user_id);
    
    // Get active games where current user isn't already a player
    const availableGames = await Game.findAll({
      where: {
        status: 'waiting',
        player2_id: null,
        player1_id: {
          [Op.ne]: req.user.user_id // Not created by current user
        }
      },
      include: [{
        model: User,
        as: 'player1', // IMPORTANT: Match the association name with Game model
        attributes: ['username', 'last_active', 'user_id']
      }],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${availableGames.length} available games`);
    
    // Return all games and let the client handle display
    // Remove the inactive host filtering that's causing problems
    res.json({ availableGames });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ message: 'Failed to fetch games' });
  }
});

// Create a new game
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { timeControl, initialTime, increment } = req.body;
    
    const game = await Game.create({
      player1_id: req.user.user_id,
      status: 'waiting',
      initial_time: initialTime,
      increment: increment,
      white_time: initialTime,
      black_time: initialTime,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    });

    res.status(201).json({ game });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Join an existing game
router.post('/:gameId/join', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const game = await Game.findOne({
      where: {
        game_id: req.params.gameId,
        status: 'waiting',
        player2_id: null
      }
    });

    if (!game) {
      return res.status(404).json({ message: 'Game not found or no longer available' });
    }

    // Update game status
    game.player2_id = req.user.user_id;
    game.status = 'playing';
    await game.save();

    // Mark any other waiting games by this user as completed
    await Game.update(
      { status: 'completed' },
      {
        where: {
          player1_id: req.user.user_id,
          status: 'waiting'
        }
      }
    );

    res.json({ game });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get game details
router.get('/:gameId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.gameId, {
      include: ['firstPlayer', 'secondPlayer']
    });
    if (!game) {
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
    await Game.cancelGame(req.params.gameId, req.user.user_id);
    res.json({ message: 'Game cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling game:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;