import React, { useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import gameService from '../services/gameService';
import CreateGameModal from '../components/Game/CreateGameModal';

const PlayWithFriendPage = () => {
  const { currentUser } = useContext(AuthContext);
  const [joinCode, setJoinCode] = useState('');
  const [gameCode, setGameCode] = useState('');
  // Add new state to track the actual game ID separately from the display code
  const [createdGameId, setCreatedGameId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const gameCodeRef = useRef(null);
  const navigate = useNavigate();

  const handleCreateGame = async (timeControl) => {
    try {
      setLoading(true);
      setError('');
      
      // Convert values to proper types and validate
      const payload = {
        timeControl: timeControl.name.toLowerCase(),
        initialTime: timeControl.time !== undefined ? Number(timeControl.time) : 
                    timeControl.time === null ? null : 600,
        increment: Number(timeControl.increment || 0),
        createFriendGame: true // Special flag for friend games
      };
      
      const response = await gameService.createGame(payload);
      
      if (response?.game?.game_id) {
        // Store both the numeric ID and the display code separately
        const gameId = response.game.game_id;
        const shareCode = response.game.invite_code || gameId.toString();
        
        console.log(`Game created with ID: ${gameId}, invite code: ${shareCode}`);
        
        // Store both values in state
        setCreatedGameId(gameId);
        setGameCode(shareCode);
      } else {
        setError('Failed to create game');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode) {
      setError('Please enter a game code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log(`Joining game with code: ${joinCode}`);
      const response = await gameService.joinGameByCode(joinCode);
      
      if (response?.game?.game_id) {
        console.log(`Successfully joined game with ID: ${response.game.game_id}`);
        navigate(`/game/${response.game.game_id}`);
      } else {
        setError('Failed to join game');
      }
    } catch (error) {
      setError(`Error: ${error.message || 'Failed to join game'}`);
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (gameCodeRef.current) {
      gameCodeRef.current.select();
      document.execCommand('copy');
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    }
  };

  const joinCreatedGame = () => {
    // If we have the actual game ID stored, use that directly
    if (createdGameId) {
      console.log(`Navigating to game with stored game ID: ${createdGameId}`);
      navigate(`/game/${createdGameId}`);
    } else {
      console.error('No game ID available for direct navigation');
      setError('Could not find the game. Please create a new game or join with the code.');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Play with a Friend</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {gameCode ? (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Game Created!</h2>
          <p className="text-sm mb-3">Share this code with your friend:</p>
          
          <div className="flex mb-4">
            <input
              ref={gameCodeRef}
              type="text"
              value={gameCode}
              className="flex-grow px-3 py-2 border rounded-l-md bg-gray-50"
              readOnly
            />
            <button 
              onClick={copyCodeToClipboard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
            >
              Copy
            </button>
          </div>
          
          {showCopiedMessage && (
            <p className="text-sm text-green-600 mb-3">Copied to clipboard!</p>
          )}
          
          <div className="flex justify-between">
            <button
              onClick={() => {
                setGameCode('');
                setCreatedGameId(null);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
            >
              Create Another
            </button>
            <button
              onClick={joinCreatedGame}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Enter Game
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Create a Game</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create New Game'}
            </button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Join with Code</h2>
            <div className="flex mb-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter game code"
                className="flex-grow px-3 py-2 border rounded-l-md"
              />
              <button
                onClick={handleJoinGame}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-md"
                disabled={loading || !joinCode}
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </>
      )}
      
      <div className="text-center mt-4">
        <button
          onClick={() => navigate('/lobby')}
          className="text-blue-500 hover:underline"
        >
          Back to Game Lobby
        </button>
      </div>
      
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

export default PlayWithFriendPage;
