const Game = require('../models/Game');
const User = require('../models/User');
const { Op } = require('sequelize');
const supabase = require('../config/supabase');

// Create a new game
const createGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Extract and validate time control parameters
    const { timeControl = 'rapid', initialTime, increment = 0 } = req.body;
    
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
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      move_history: [],
      initial_time: initialTime,
      increment: increment,
      white_time: initialTime,
      black_time: initialTime
    });
    
    // Create game in Supabase for real-time updates
    await supabase
      .from('games')
      .insert([{
        game_id: game.game_id,
        player1_id: userId,
        status: 'waiting',
        fen: game.fen,
        move_history: [],
        initial_time: initialTime,
        increment: increment,
        white_time: initialTime,
        black_time: initialTime,
        created_at: new Date().toISOString()
      }]);

    console.log(`Game created with ID ${game.game_id}, initial time: ${initialTime}, increment: ${increment}`);

    res.status(201).json({ 
      message: 'Game created successfully', 
      game: {
        game_id: game.game_id,
        status: game.status,
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
    game.start_time = new Date();
    await game.save();

    // Update game in Supabase
    await supabase
      .from('games')
      .update({
        player2_id: userId,
        status: 'playing',
        start_time: game.start_time.toISOString()
      })
      .eq('game_id', gameId);

    // Create game player record in Supabase
    await supabase
      .from('game_players')
      .insert([
        {
          game_id: gameId,
          user_id: userId,
          color: 'black',
          joined_at: new Date().toISOString()
        }
      ]);

    res.status(200).json({ 
      message: 'Joined game successfully', 
      game: {
        game_id: game.game_id,
        status: game.status,
        initial_time: game.initial_time,
        increment: game.increment,
        white_time: game.white_time,
        black_time: game.black_time,
        start_time: game.start_time
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

// Update the getGameHistory function to filter out incomplete games
const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Find all completed games where the user was a player
    // AND both player1_id and player2_id fields are populated
    const games = await Game.findAll({
      where: {
        [Op.or]: [
          { player1_id: userId },
          { player2_id: userId }
        ],
        status: 'completed',
        player1_id: { [Op.ne]: null },  // Ensure player1 exists
        player2_id: { [Op.ne]: null }   // Ensure player2 exists
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

// Find functions that use "firstPlayer" or "secondPlayer" and replace with "player1" and "player2"
// For example, if there's a function like:

const getGame = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the problematic include - replace "firstPlayer" with "player1"
    const game = await Game.findOne({
      where: { game_id: id },
      include: [
        { model: User, as: 'player1', attributes: ['user_id', 'username'] },  // Changed from 'firstPlayer' to 'player1'
        { model: User, as: 'player2', attributes: ['user_id', 'username'] }   // Make sure this is 'player2', not 'secondPlayer'
      ]
    });
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error("Game fetch error:", error);
    res.status(400).json({ message: error.message });
  }
};

// Controller function to cancel a game
const cancelGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { gameId } = req.params;
    
    // Only allow cancellation of waiting games by the creator
    const game = await Game.findOne({
      where: {
        game_id: gameId,
        player1_id: userId,
        status: 'waiting',
        player2_id: null
      }
    });

    if (!game) {
      return res.status(404).json({ 
        message: 'Game not found or cannot be cancelled' 
      });
    }

    // Delete the game from the database
    await game.destroy();
    
    res.status(200).json({ 
      message: 'Game cancelled successfully' 
    });

  } catch (error) {
    console.error('Error cancelling game:', error);
    res.status(500).json({ 
      message: 'Failed to cancel game', 
      error: error.message 
    });
  }
};

// Make a move in the game
const makeMove = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { from, to, promotion, fen, moveNotation } = req.body;
    const userId = req.user.user_id;

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Validate it's the player's turn
    const isWhiteTurn = game.fen.split(' ')[1] === 'w';
    const isPlayerWhite = game.player1_id === userId;
    
    if ((isWhiteTurn && !isPlayerWhite) || (!isWhiteTurn && isPlayerWhite)) {
      return res.status(400).json({ message: 'Not your turn' });
    }

    // Update game state
    game.fen = fen;
    game.move_history = [...(game.move_history || []), {
      from,
      to,
      promotion,
      notation: moveNotation,
      timestamp: new Date().toISOString()
    }];

    // Update time controls if needed
    if (isWhiteTurn) {
      game.white_time = req.body.whiteTimeLeft;
    } else {
      game.black_time = req.body.blackTimeLeft;
    }

    await game.save();

    // Update game in Supabase
    await supabase
      .from('games')
      .update({
        fen,
        move_history: game.move_history,
        white_time: game.white_time,
        black_time: game.black_time
      })
      .eq('game_id', gameId);

    // Record the move in Supabase
    await supabase
      .from('game_moves')
      .insert([{
        game_id: gameId,
        user_id: userId,
        from,
        to,
        promotion,
        fen,
        move_notation: moveNotation,
        created_at: new Date().toISOString()
      }]);

    res.json({ 
      message: 'Move made successfully',
      game: {
        fen: game.fen,
        move_history: game.move_history,
        white_time: game.white_time,
        black_time: game.black_time
      }
    });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ message: 'Failed to make move', error: error.message });
  }
};

// End game (checkmate, draw, resignation, etc.)
const endGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { reason, winner } = req.body;
    const userId = req.user.user_id;

    const game = await Game.findByPk(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Update game status
    game.status = 'completed';
    game.end_time = new Date();
    game.result = reason;
    game.winner_id = winner;

    await game.save();

    // Update game in Supabase
    await supabase
      .from('games')
      .update({
        status: 'completed',
        end_time: game.end_time.toISOString(),
        result,
        winner_id: winner
      })
      .eq('game_id', gameId);

    // Create game result record in Supabase
    await supabase
      .from('game_results')
      .insert([{
        game_id: gameId,
        reason,
        winner_id: winner,
        completed_at: game.end_time.toISOString()
      }]);

    res.json({ 
      message: 'Game ended successfully',
      game: {
        status: game.status,
        result: game.result,
        winner_id: game.winner_id
      }
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ message: 'Failed to end game', error: error.message });
  }
};

module.exports = {
  createGame,
  joinGame,
  getAvailableGames,
  getGameHistory,
  getGameById,
  getGame,
  cancelGame,
  makeMove,
  endGame
};