const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'raunaq',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chessmate',
  logging: false
});

module.exports = sequelize;