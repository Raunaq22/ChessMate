const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Game = sequelize.define('Game', {
  game_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  player1_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  player2_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  winner_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  status: {
    type: DataTypes.ENUM('waiting', 'playing', 'completed', 'cancelled'),
    defaultValue: 'waiting'
  },
  initial_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  increment: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  white_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  black_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fen: {
    type: DataTypes.STRING,
    defaultValue: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  invite_code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'games',
  timestamps: true
});

// Define associations
Game.associate = (models) => {
  Game.belongsTo(models.User, {
    foreignKey: 'player1_id',
    as: 'player1'
  });
  
  Game.belongsTo(models.User, {
    foreignKey: 'player2_id',
    as: 'player2'
  });
  
  Game.belongsTo(models.User, {
    foreignKey: 'winner_id',
    as: 'winner'
  });
};

module.exports = Game;