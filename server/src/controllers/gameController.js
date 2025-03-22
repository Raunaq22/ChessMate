const Game = require('../models/Game');
const User = require('../models/User');
const { Op } = require('sequelize');

// Create a new game
const createGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Extract and validate time control parameters
    const { timeControl = 'rapid', initialTime, increment = 0 } = req.body;
    
    // Debug log the received values
    console.log('Creating game with params:', { 
      timeControl, 
      initialTime, 
      increment,
      userId
    });

    // Validate the existing active game logic
    const existingGame = await Game.findUserActiveGame(userId);
    if (existingGame) {
      return res.status(400).json({ 
        message: 'You already have an active game', 
        gameId: existingGame.game_id 
      });
    }

    // Create a new game with explicit time control parameters
    const game = await Game.create({
      player1_id: userId,
      status: 'waiting',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move_history: [],
      time_control: timeControl,
      initial_time: initialTime,
      increment: increment,
      white_time: initialTime, // Initialize both times with the initial value
      black_time: initialTime
    });
    
    // Debug log the created game
    console.log(`Game created with ID ${game.game_id}, initial time: ${initialTime}, increment: ${increment}`);

    res.status(201).json({ 
      message: 'Game created successfully', 
      game: {
        game_id: game.game_id,
        status: game.status,
        time_control: game.time_control,
        initial_time: game.initial_time,
        increment: game.increment
      }
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Failed to create game', error: error.message });
  }
};

// Join an existing game
const joinGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { gameId } = req.params;

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.player1_id === userId || game.player2_id === userId) {
      return res.status(400).json({ message: 'You are already part of this game' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game is not available for joining' });
    }

    game.player2_id = userId;
    game.status = 'playing';
    await game.save();

    res.status(200).json({ 
      message: 'Joined game successfully', 
      game: {
        game_id: game.game_id,
        status: game.status,
        time_control: game.time_control,
        initial_time: game.initial_time,
        increment: game.increment,
        white_time: game.white_time,
        black_time: game.black_time
      }
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ message: 'Failed to join game', error: error.message });
  }
};

// Get available games
const getAvailableGames = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Find all waiting games that aren't too old
    const games = await Game.findAll({
      where: {
        status: 'waiting',
        player2_id: null,
        player1_id: {
          [Op.ne]: userId // Don't show user's own games
        },
        is_private: false, // Only show public games in the lobby
        created_at: {
          [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
        }
      },
      include: [{
        model: User,
        as: 'player1',
        attributes: ['user_id', 'username', 'last_active']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ availableGames: games });
  } catch (error) {
    console.error('Error fetching available games:', error);
    res.status(500).json({ message: 'Failed to fetch available games', error: error.message });
  }
};

// Get user game history
const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Find all completed games where the user was a player
    const games = await Game.findAll({
      where: {
        [Op.or]: [
          { player1_id: userId },
          { player2_id: userId }
        ],
        status: 'completed'
      },
      include: [
        {
          model: User,
          as: 'player1',
          attributes: ['username']
        },
        {
          model: User,
          as: 'player2',
          attributes: ['username']
        },
        {
          model: User,
          as: 'winner',
          attributes: ['user_id', 'username']
        }
      ],
      order: [['end_time', 'DESC']]
    });
    
    // Format the game history to return meaningful data
    const formattedGames = games.map(game => {
      // Determine if current user won
      const userWon = game.winner && game.winner.user_id === userId;
      
      // Determine opponent name
      let opponentName = 'Unknown';
      if (game.player1_id === userId && game.player2) {
        opponentName = game.player2.username;
      } else if (game.player2_id === userId && game.player1) {
        opponentName = game.player1.username;
      }
      
      // Determine result
      let result = 'draw';
      if (game.winner) {
        result = userWon ? 'win' : 'loss';
      }
      
      return {
        game_id: game.game_id,
        end_time: game.end_time,
        updated_at: game.updatedAt,
        opponent_name: opponentName,
        result: result,
        winner_name: game.winner ? game.winner.username : null
      };
    });
    
    res.json(formattedGames);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ message: 'Failed to fetch game history' });
  }
};

module.exports = {
  createGame,
  joinGame,
  getAvailableGames,
  getGameHistory,  // Add this export
};