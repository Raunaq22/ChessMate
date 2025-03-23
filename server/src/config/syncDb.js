const sequelize = require('./db');
// No need to import models here just for associations
// const Game = require('../models/Game');
// const User = require('../models/User');

// Remove duplicate association definitions
// Associations are already defined in the model files

const syncDatabase = async () => {
  try {
    // This will use the associations defined in the model files
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = syncDatabase;