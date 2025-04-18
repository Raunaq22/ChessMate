const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for OAuth users
    validate: {
      len: [6, 100]
    }
  },
  google_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  profile_image_url: {
    type: DataTypes.STRING,
    defaultValue: '/assets/default-avatar.png' // Changed from API endpoint to direct file path
  },
  last_active: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    get() {
      const value = this.getDataValue('last_active');
      return value ? value : new Date();
    }
  },
  last_login: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    get() {
      const value = this.getDataValue('last_login');
      return value ? value : new Date();
    }
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    get() {
      const value = this.getDataValue('created_at');
      return value ? value : new Date();
    }
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    get() {
      const value = this.getDataValue('updated_at');
      return value ? value : new Date();
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      // Ensure timestamps are set
      const now = new Date();
      user.setDataValue('created_at', now);
      user.setDataValue('updated_at', now);
      user.setDataValue('last_login', now);
      user.setDataValue('last_active', now);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.setDataValue('updated_at', new Date());
    }
  },
  tableName: 'Users' 
});

// Instance method to compare passwords
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Define User associations - moved here from syncDb.js
// These will be set up after Game is imported in the index.js file
User.associateModels = function(models) {
  const { Game } = models;
  
  User.hasMany(Game, { 
    foreignKey: 'player1_id',
    sourceKey: 'user_id',
    as: 'gamesAsFirstPlayer'
  });

  User.hasMany(Game, { 
    foreignKey: 'player2_id',
    sourceKey: 'user_id',
    as: 'gamesAsSecondPlayer'
  });

  User.hasMany(Game, {
    foreignKey: 'winner_id',
    sourceKey: 'user_id',
    as: 'gamesWon'
  });
};

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
  if (!this.password) return false; // For OAuth users
  return await bcrypt.compare(password, this.password);
};

// Class method to find by email with select fields
User.findByEmail = async function(email) {
  return await this.findOne({
    where: { email },
    attributes: ['user_id', 'username', 'email', 'password', 'profile_image_url', 'last_active', 'last_login']
  });
};

module.exports = User;