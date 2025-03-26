const User = require('./User');
const Game = require('./Game');

// Set up associations
User.hasMany(Game, {
  foreignKey: 'player1_id',
  as: 'games_as_player1'
});

User.hasMany(Game, {
  foreignKey: 'player2_id',
  as: 'games_as_player2'
});

User.hasMany(Game, {
  foreignKey: 'winner_id',
  as: 'games_won'
});

Game.belongsTo(User, {
  foreignKey: 'player1_id',
  as: 'player1'
});

Game.belongsTo(User, {
  foreignKey: 'player2_id',
  as: 'player2'
});

Game.belongsTo(User, {
  foreignKey: 'winner_id',
  as: 'winner'
});

module.exports = {
  User,
  Game
};
