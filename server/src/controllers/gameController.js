const Game = require('../models/Game');
const User = require('../models/User');
const { Op } = require('sequelize');

// Create a new game
const createGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Extract and validate time control parameters
    const { timeControl = 'rapid', initialTime, increment = 0, label } = req.body;
    
    // Debug log the received values
    console.log('Creating game with params:', { 
      timeControl, 
      initialTime, 
      increment,
      label,
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

    // Format a label if not provided
    let timeControlLabel = label;
    if (!timeControlLabel) {
      if (initialTime === null) {
        timeControlLabel = "Unlimited";
      } else {
        const minutes = Math.floor(initialTime / 60);
        timeControlLabel = increment > 0 ? `${minutes}+${increment}` : `${minutes}+0`;
      }
    }

    // Create a new game with explicit time control parameters
    const game = await Game.create({
      player1_id: userId,
      status: 'waiting',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move_history: [],
      time_control: timeControl,
      time_control_label: timeControlLabel,
      initial_time: initialTime,
      increment: increment,
      white_time: initialTime, // Initialize both times with the initial value
      black_time: initialTime
    });
    
    // Debug log the created game
    console.log(`Game created with ID ${game.game_id}, initial time: ${initialTime}, increment: ${increment}, label: ${timeControlLabel}`);

    res.status(201).json({ 
      message: 'Game created successfully', 
      game: {
        game_id: game.game_id,
        status: game.status,
        time_control: game.time_control,
        time_control_label: game.time_control_label,
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

// Get game details by ID
const getGameById = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Find the game with related data
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: User,
          as: 'player1',
          attributes: ['user_id', 'username']
        },
        {
          model: User,
          as: 'player2',
          attributes: ['user_id', 'username']
        },
        {
          model: User,
          as: 'winner',
          attributes: ['user_id', 'username']
        }
      ]
    });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Ensure move_history is always an array, even if null/undefined in database
    const moveHistory = Array.isArray(game.move_history) ? game.move_history : [];
    
    // Temporary debug log to see what's in the database
    console.log(`Game ${gameId} move history type: ${typeof game.move_history}, isArray: ${Array.isArray(game.move_history)}, length: ${moveHistory.length}`);
    
    // Return game data
    res.json({
      game_id: game.game_id,
      player1_id: game.player1_id,
      player2_id: game.player2_id,
      status: game.status,
      result: game.result,
      move_history: moveHistory, // Use the guaranteed array value
      fen: game.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Provide default FEN if missing
      time_control: game.time_control,
      initial_time: game.initial_time,
      increment: game.increment,
      created_at: game.createdAt,
      end_time: game.end_time,
      winner_id: game.winner_id,
      player1: game.player1,
      player2: game.player2,
      winner: game.winner
    });
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ message: 'Failed to fetch game details' });
  }
};

module.exports = {
  createGame,
  joinGame,
  getAvailableGames,
  getGameHistory,
  getGameById, // Add the new controller function
};