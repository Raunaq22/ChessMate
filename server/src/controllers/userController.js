const User = require('../models/User');
const Game = require('../models/Game');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

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

module.exports = {
  getUserStats
};
