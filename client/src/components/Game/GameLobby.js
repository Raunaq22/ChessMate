import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gameService from '../../services/gameService';
import CreateGameModal from './CreateGameModal';

const GameLobby = () => {
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningGameId, setJoiningGameId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const navigate = useNavigate();

  // Helper function to check if a game is expired
  const isGameExpired = (game) => {
    if (!game.created_at) return false;
    const GAME_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
    const createdTime = new Date(game.created_at).getTime();
    return Date.now() - createdTime > GAME_EXPIRY_TIME;
  };

  const fetchGames = useCallback(async () => {
    try {
      const { availableGames } = await gameService.getAvailableGames();
      console.log("Fetched games:", availableGames);
      
      if (!Array.isArray(availableGames)) {
        console.error("Expected array of games, got:", availableGames);
        setAvailableGames([]);
        return;
      }
      
      // Only filter out expired games (created too long ago)
      const activeGames = availableGames.filter(game => !isGameExpired(game));
      console.log(`Displaying ${activeGames.length} games in lobby`);
      setAvailableGames(activeGames);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setDebugInfo(`Fetch error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 3000);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchGames]); // Add fetchGames as dependency

const handleCreateGame = async (timeControl) => {
  try {
    setDebugInfo(`Creating game with time control: ${JSON.stringify(timeControl)}`);
    
    // Convert values to proper types and validate
    const payload = {
      timeControl: timeControl.name.toLowerCase(),
      // Important: initialTime must be a number or null, not undefined
      initialTime: timeControl.time !== undefined ? Number(timeControl.time) : null,
      increment: Number(timeControl.increment || 0)
    };
    
    console.log('Creating game with params:', payload);
    
    const response = await gameService.createGame(payload);
    
    if (response?.game?.game_id) {
      // Add a small delay to ensure the game is properly saved in the database
      setTimeout(() => {
        navigate(`/game/${response.game.game_id}`);
      }, 300);
    } else {
      setDebugInfo('Game created but no game_id returned');
    }
  } catch (error) {
    console.error('Failed to create game:', error);
    setDebugInfo(`Create error: ${error.message || JSON.stringify(error)}`);
  }
};

  const handleJoinGame = async (gameId) => {
    try {
      setJoinError(null);
      setDebugInfo(`Attempting to join game ${gameId}`);
      setJoiningGameId(gameId);
      
      const game = availableGames.find(g => g.game_id === gameId);
      if (!game) {
        setJoinError('Game not found in available games');
        setDebugInfo('Game not found in available games list');
        setJoiningGameId(null);
        return;
      }
      
      if (isGameExpired(game)) {
        setJoinError('Game is expired');
        setDebugInfo('Game is expired');
        setJoiningGameId(null);
        return;
      }
      
      setDebugInfo(`Calling gameService.joinGame with ID: ${gameId}`);
      
      const response = await gameService.joinGame(gameId);
      setDebugInfo(`Raw join response: ${JSON.stringify(response)}`);
      
      if (!response) {
        throw new Error('No response received from server');
      }

      // Check if response contains a valid game object and is in playing state
      if (response.game && 
          response.game.game_id && 
          response.game.status === 'playing' &&
          response.game.player2_id) {  // Ensure player 2 is set
        setDebugInfo('Join successful, navigating to game...');
        // Add a small delay to allow server state to update
        setTimeout(() => {
          navigate(`/game/${response.game.game_id}`);
        }, 500);
      } else {
        const errorMessage = response.message || 
                           response.error || 
                           'Game is not ready to play';
        setJoinError(errorMessage);
        setDebugInfo(`Join failed: Game state invalid - ${JSON.stringify(response)}`);
        await fetchGames(); // Refresh game list
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      setJoinError(`Error joining game: ${error.message || 'Unknown error'}`);
      setDebugInfo(`Join exception: ${error.stack || error.message || JSON.stringify(error)}`);
    } finally {
      setJoiningGameId(null);
    }
  };

  const formatTimeControl = (game) => {
    if (!game.initial_time) return 'Unlimited';
    const minutes = Math.floor(game.initial_time / 60);
    const seconds = game.initial_time % 60;
    if (seconds > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}+${game.increment}`;
    }
    return `${minutes}+${game.increment}`;
  };

  const formatGameId = (gameId) => {
    const idString = String(gameId);
    return idString.length > 8 ? `${idString.substring(0, 8)}...` : idString;
  };

  if (loading && availableGames.length === 0) {
    return <div className="text-center py-8">Loading games...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Chess Games</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={joiningGameId !== null}
        >
          Create Game
        </button>
      </div>

      {joinError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error: </strong>{joinError}
        </div>
      )}
      
      {debugInfo && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 font-mono text-sm overflow-auto">
          <strong>Debug: </strong>{debugInfo}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableGames.map(game => (
          <div 
            key={game.game_id}
            className="p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">
                Time Control: {formatTimeControl(game)}
              </span>
              <span className="text-sm text-gray-500">
                Created: {new Date(game.createdAt || game.created_at).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">
                Host: {game.player1?.username || 'Unknown'}
              </span>
              <span className="text-sm text-gray-500">
                ID: {formatGameId(game.game_id)}
              </span>
            </div>
            <button
              onClick={() => handleJoinGame(game.game_id)}
              disabled={joiningGameId !== null}
              className={`w-full mt-2 py-2 px-4 rounded ${
                joiningGameId !== null
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {joiningGameId === game.game_id ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        ))}
      </div>

      {availableGames.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No games available. Create one to start playing!
        </div>
      )}

      {showCreateModal && (
        <CreateGameModal
          onClose={() => setShowCreateModal(false)}
          onCreateGame={(timeControl) => {
            handleCreateGame(timeControl);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default GameLobby;