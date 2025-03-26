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
      model: 'users',
      key: 'user_id'
    }
  },
  player2_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  winner_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
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
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'games'
});

// Define Game associations
Game.associateModels = function(models) {
  const { User } = models;
  
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
};

module.exports = Game;