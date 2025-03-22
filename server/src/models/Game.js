const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Game = sequelize.define('Game', {
  game_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  player1_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  player2_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  winner_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  result: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fen: {
    type: DataTypes.STRING,
    defaultValue: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  move_history: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('waiting', 'playing', 'completed'),
    defaultValue: 'waiting'
  },
  initial_time: {
    type: DataTypes.INTEGER,
    allowNull: true // time in seconds
  },
  increment: {
    type: DataTypes.INTEGER,
    defaultValue: 0 // increment in seconds
  },
  white_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  black_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  invite_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true
  },
  is_private: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'games',
  timestamps: true
});

// Define associations - IMPORTANT: Fix the association names
Game.belongsTo(User, { as: 'player1', foreignKey: 'player1_id' });
Game.belongsTo(User, { as: 'player2', foreignKey: 'player2_id' });
Game.belongsTo(User, { as: 'winner', foreignKey: 'winner_id' });

// Static methods for game creation and joining
Game.findUserActiveGame = async function(userId) {
  return await this.findOne({
    where: {
      [Op.or]: [
        { player1_id: userId },
        { player2_id: userId }
      ],
      status: {
        [Op.in]: ['waiting', 'playing']
      }
    }
  });
};

Game.createNewGame = async function(playerId) {
  return await this.create({
    player1_id: playerId,
    status: 'waiting',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move_history: [],
    start_time: null,
    end_time: null
  });
};

Game.joinGame = async function(gameId, playerId) {
  const game = await this.findOne({
    where: {
      game_id: gameId,
      status: 'waiting',
      player2_id: null
    }
  });

  if (!game) {
    throw new Error('Game not found or already full');
  }

  game.player2_id = playerId;
  game.status = 'playing';
  game.start_time = new Date();
  await game.save();

  return game;
};

Game.findUserPendingGame = async function(userId) {
  return await this.findOne({
    where: {
      player1_id: userId,
      player2_id: null,
      status: 'waiting'
    }
  });
};

Game.findOtherAvailableGames = async function(userId) {
  const games = await this.findAll({
    where: {
      player1_id: {
        [Op.ne]: userId
      },
      player2_id: null,
      status: 'waiting'
    },
    include: [{
      model: User,
      as: 'player1', // IMPORTANT: Match the association name used above
      attributes: ['username', 'last_active']
    }],
    order: [['createdAt', 'DESC']]
  });

  // Filter out games where host hasn't been active in the last 10 seconds
  const activeGames = games.filter(game => {
    if (!game.player1 || !game.player1.last_active) return false;
    
    const lastActive = new Date(game.player1.last_active);
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    return lastActive > tenSecondsAgo;
  });

  return activeGames;
};

Game.cancelGame = async function(gameId, userId) {
  const game = await this.findOne({
    where: {
      game_id: gameId,
      player1_id: userId,
      player2_id: null,
      status: 'waiting'
    }
  });

  if (!game) {
    throw new Error('Game not found or cannot be cancelled');
  }

  await game.destroy();
  return true;
};

module.exports = Game;