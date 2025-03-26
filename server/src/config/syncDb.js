const sequelize = require('./db');
const User = require('../models/User');
const Game = require('../models/Game');

// Remove duplicate association definitions
// Associations are already defined in the model files

async function syncDatabase() {
  try {
    // Force sync will drop existing tables and recreate them
    // In production, you should use { alter: true } instead of { force: true }
    await sequelize.sync({ force: true });
    console.log('Database synchronized successfully');
    
    // Create associations
    const models = {
      User,
      Game
    };

    // Call associate for each model
    Object.keys(models).forEach(modelName => {
      if (models[modelName].associate) {
        models[modelName].associate(models);
      }
    });
    
    console.log('Model associations created');
  } catch (error) {
    console.error('Error syncing database:', error);
    throw error;
  }
}

module.exports = syncDatabase;