/**
 * Helper functions for database operations
 */

// Get game data from database by ID
async function getGameById(gameId) {
  try {
    // Directly import from the proper path
    const Game = require('../src/models/Game');
    const game = await Game.findByPk(gameId);
    return game;
  } catch (error) {
    console.error(`Failed to fetch game ${gameId}:`, error);
    return null;
  }
}

module.exports = {
  getGameById
};
