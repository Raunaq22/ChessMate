const supabase = require('../config/supabase');

// Create a new game
const createGame = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Extract and validate time control parameters
    const { timeControl = 'rapid', initialTime, increment = 0 } = req.body;
    
    // Validate time parameters
    const validatedInitialTime = Math.max(0, Number(initialTime) || 600);
    const validatedIncrement = Math.max(0, Number(increment) || 0);
    
    if (isNaN(validatedInitialTime) || isNaN(validatedIncrement)) {
      return res.status(400).json({ 
        message: 'Invalid time control parameters',
        details: {
          initialTime: validatedInitialTime,
          increment: validatedIncrement
        }
      });
    }
    
    console.log('Creating game with validated params:', { 
      timeControl, 
      initialTime: validatedInitialTime, 
      increment: validatedIncrement,
      userId
    });

    // Validate the existing active game logic
    const { data: existingGame, error: existingError } = await supabase
      .from('games')
      .select('*')
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'playing')
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw existingError;
    }

    if (existingGame) {
      return res.status(400).json({ 
        message: 'You already have an active game', 
        gameId: existingGame.game_id 
      });
    }

    // Create a new game with validated time control parameters
    const { data: game, error: createError } = await supabase
      .from('games')
      .insert([{
        player1_id: userId,
        status: 'waiting',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        move_history: [],
        initial_time: validatedInitialTime,
        increment: validatedIncrement,
        white_time: validatedInitialTime,
        black_time: validatedInitialTime,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (createError) throw createError;

    console.log(`Game created with ID ${game.game_id}, initial time: ${validatedInitialTime}, increment: ${validatedIncrement}`);

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

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (gameError) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.player1_id === userId || game.player2_id === userId) {
      return res.status(400).json({ message: 'You are already part of this game' });
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ message: 'Game is not available for joining' });
    }

    const startTime = new Date().toISOString();
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: userId,
        status: 'playing',
        start_time: startTime
      })
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create game player record
    const { error: playerError } = await supabase
      .from('game_players')
      .insert([{
        game_id: gameId,
        user_id: userId,
        color: 'black',
        joined_at: startTime
      }]);

    if (playerError) throw playerError;

    res.status(200).json({ 
      message: 'Joined game successfully', 
      game: {
        game_id: updatedGame.game_id,
        status: updatedGame.status,
        initial_time: updatedGame.initial_time,
        increment: updatedGame.increment,
        white_time: updatedGame.white_time,
        black_time: updatedGame.black_time,
        start_time: updatedGame.start_time
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
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:users!games_player1_id_fkey (
          user_id,
          username,
          last_active
        )
      `)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .neq('player1_id', userId)
      .eq('is_private', false)
      .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

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
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:users!games_player1_id_fkey (
          username
        ),
        player2:users!games_player2_id_fkey (
          username
        ),
        winner:users!games_winner_id_fkey (
          user_id,
          username
        )
      `)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .eq('status', 'completed')
      .not('player1_id', 'is', null)
      .not('player2_id', 'is', null)
      .order('end_time', { ascending: false });

    if (error) throw error;
    
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
        updated_at: game.updated_at,
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
    
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        player1:users!games_player1_id_fkey (*),
        player2:users!games_player2_id_fkey (*),
        winner:users!games_winner_id_fkey (*)
      `)
      .eq('game_id', gameId)
      .single();

    if (error) {
      return res.status(404).json({ message: 'Game not found' });
    }

    res.json({ game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Failed to fetch game details' });
  }
};

// Get game details (alias for getGameById)
const getGame = getGameById;

// Cancel a game
const cancelGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.user_id;

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .eq('player1_id', userId)
      .is('player2_id', null)
      .eq('status', 'waiting')
      .single();

    if (gameError) {
      return res.status(404).json({ message: 'Game not found or cannot be cancelled' });
    }

    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('game_id', gameId);

    if (deleteError) throw deleteError;

    res.json({ message: 'Game cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling game:', error);
    res.status(500).json({ message: 'Failed to cancel game' });
  }
};

// Make a move
const makeMove = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { move, fen, whiteTime, blackTime } = req.body;
    const userId = req.user.user_id;

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (gameError) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.status !== 'playing') {
      return res.status(400).json({ message: 'Game is not in progress' });
    }

    // Verify it's the player's turn
    const isWhiteTurn = game.move_history.length % 2 === 0;
    const isPlayerWhite = (game.player1_id === userId && isWhiteTurn) || 
                         (game.player2_id === userId && !isWhiteTurn);

    if (!isPlayerWhite) {
      return res.status(400).json({ message: 'Not your turn' });
    }

    // Update game state
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        fen,
        move_history: [...game.move_history, move],
        white_time: whiteTime,
        black_time: blackTime,
        updated_at: new Date().toISOString()
      })
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ 
      message: 'Move made successfully',
      game: updatedGame
    });
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ message: 'Failed to make move' });
  }
};

// End a game
const endGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { winnerId, result } = req.body;

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (gameError) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winnerId,
        result,
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ 
      message: 'Game ended successfully',
      game: updatedGame
    });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ message: 'Failed to end game' });
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