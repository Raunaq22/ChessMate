/**
 * Helper functions for database operations
 */

// Get game data from database by ID
async function getGameById(gameId) {
  try {
    // Validate that gameId is an integer
    if (!gameId || isNaN(parseInt(gameId))) {
      console.error(`Invalid game ID format: ${gameId}`);
      return null;
    }
    
    // Directly import from the proper path
    const Game = require('../src/models/Game');
    const game = await Game.findByPk(parseInt(gameId));
    return game;
  } catch (error) {
    console.error(`Failed to fetch game ${gameId}:`, error);
    return null;
  }
}

// Helper function to get user by ID
async function getUserById(userId) {
  try {
    // Validate that userId is an integer
    if (!userId || isNaN(parseInt(userId))) {
      console.error(`Invalid user ID format: ${userId}`);
      return null;
    }
    
    const User = require('../src/models/User');
    const user = await User.findByPk(parseInt(userId));
    return user;
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    return null;
  }
}

module.exports = {
  getGameById,
  getUserById
};
