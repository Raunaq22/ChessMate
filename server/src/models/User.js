const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  google_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  last_active: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Allow null for OAuth users
    validate: {
      len: [6, 100]
    }
  },
  profile_image_url: {
    type: DataTypes.STRING,
    defaultValue: '/assets/default-avatar.png' // Changed from API endpoint to direct file path
  },
  last_login: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  tableName: 'users' 
});

// Instance method to compare passwords
User.prototype.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Define User associations
User.associate = (models) => {
  User.hasMany(models.Game, {
    foreignKey: 'player1_id',
    as: 'games_as_player1'
  });
  
  User.hasMany(models.Game, {
    foreignKey: 'player2_id',
    as: 'games_as_player2'
  });
  
  User.hasMany(models.Game, {
    foreignKey: 'winner_id',
    as: 'games_won'
  });
};

module.exports = User;