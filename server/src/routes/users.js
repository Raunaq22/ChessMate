const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Get user profile
router.get('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ['password'] }
    });
    
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
    const user = await User.findByPk(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update allowed fields
    if (username) user.username = username;
    if (avatar_url) user.avatar_url = avatar_url;
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        last_active: user.last_active
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get user statistics
router.get('/stats', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      include: [{
        model: Game,
        as: 'games_as_player1',
        where: { status: 'completed' },
        required: false
      }, {
        model: Game,
        as: 'games_as_player2',
        where: { status: 'completed' },
        required: false
      }]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const totalGames = user.games_as_player1.length + user.games_as_player2.length;
    const wins = user.games_as_player1.filter(game => game.winner_id === user.user_id).length +
                user.games_as_player2.filter(game => game.winner_id === user.user_id).length;
    
    res.json({
      total_games: totalGames,
      wins: wins,
      losses: totalGames - wins,
      win_rate: totalGames > 0 ? (wins / totalGames) * 100 : 0
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get user's active games
router.get('/active-games', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const activeGames = await Game.findAll({
      where: {
        [Op.or]: [
          { player1_id: req.user.user_id },
          { player2_id: req.user.user_id }
        ],
        status: 'playing'
      },
      include: [
        {
          model: User,
          as: 'player1',
          attributes: ['username', 'user_id']
        },
        {
          model: User,
          as: 'player2',
          attributes: ['username', 'user_id']
        }
      ]
    });
    
    res.json({ activeGames });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ message: 'Failed to fetch active games' });
  }
});

module.exports = router; 