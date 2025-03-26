const sequelize = require('./db');
const User = require('../models/User');
const Game = require('../models/Game');

// Remove duplicate association definitions
// Associations are already defined in the model files

async function syncDatabase() {
  try {
    // Use alter: true instead of force: true to preserve data
    await sequelize.sync({ alter: true });
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