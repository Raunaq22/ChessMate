const User = require('./User');
const Game = require('./Game');

// Set up all associations
const setupAssociations = () => {
  const models = { User, Game };
  
  // Call association setup functions
  Object.values(models)
    .filter(model => typeof model.associateModels === 'function')
    .forEach(model => model.associateModels(models));
  
  return models;
};

// Initialize associations
const models = setupAssociations();

module.exports = models;
