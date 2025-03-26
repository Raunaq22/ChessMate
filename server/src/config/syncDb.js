const sequelize = require('./db');
const User = require('../models/User');
const Game = require('../models/Game');

// Remove duplicate association definitions
// Associations are already defined in the model files

async function syncDatabase() {
  try {
    // Set up model associations
    const models = {
      User,
      Game
    };

    // Call associateModels for each model
    Object.values(models).forEach(model => {
      if (model.associateModels) {
        model.associateModels(models);
      }
    });

    // Sync all models with database
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
}

module.exports = syncDatabase;