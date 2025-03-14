import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gameService from '../../services/gameService';

const GameLobby = () => {
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchGames = async () => {
    try {
      const response = await gameService.getAvailableGames();
      console.log('Fetched games:', response); // Debug log
      if (Array.isArray(response.availableGames)) {
        setAvailableGames(response.availableGames);
      } else {
        console.error('Invalid response format:', response);
        setAvailableGames([]);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setAvailableGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGame = async () => {
    try {
      const { game } = await gameService.createGame();
      if (game?.game_id) {
        navigate(`/game/${game.game_id}`);
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async (gameId) => {
    try {
      const { game } = await gameService.joinGame(gameId);
      if (game?.game_id) {
        navigate(`/game/${game.game_id}`);
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Failed to join game. Please try again.');
    }
  };

  const isGameExpired = (game) => {
    const lastActive = new Date(game.firstPlayer?.last_active);
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000); // Changed from 2 minutes to 10 seconds
    return lastActive < tenSecondsAgo;
  };

  if (loading) {
    return <div className="text-center py-8">Loading games...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Game Lobby</h1>
        <button
          onClick={handleCreateGame}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create New Game
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Available Games</h2>
        {availableGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableGames.map(game => (
              <div 
                key={game.game_id} 
                className={`bg-white rounded-lg shadow-md p-4 ${
                  isGameExpired(game) ? 'opacity-50' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">Host: {game.firstPlayer?.username}</p>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(game.createdAt).toLocaleString()}
                    </p>
                    {isGameExpired(game) && (
                      <p className="text-red-500 text-sm mt-1">
                        Lobby Expired - Host Inactive
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleJoinGame(game.game_id)}
                    disabled={isGameExpired(game)}
                    className={`
                      font-bold py-2 px-4 rounded
                      ${isGameExpired(game)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-700 text-white'
                      }
                    `}
                  >
                    {isGameExpired(game) ? 'Expired' : 'Join Game'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No games available to join. Create one to start playing!</p>
        )}
      </div>
    </div>
  );
};

export default GameLobby;