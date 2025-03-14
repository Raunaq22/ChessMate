const sequelize = require('./db');
const Game = require('../models/Game');
const User = require('../models/User');

// Define associations with unique aliases
User.hasMany(Game, { 
  foreignKey: 'player1_id', 
  as: 'gamesAsFirstPlayer'
});

User.hasMany(Game, { 
  foreignKey: 'player2_id', 
  as: 'gamesAsSecondPlayer'
});

Game.belongsTo(User, { 
  foreignKey: 'player1_id', 
  as: 'firstPlayer'
});

Game.belongsTo(User, { 
  foreignKey: 'player2_id', 
  as: 'secondPlayer'
});

const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = syncDatabase;