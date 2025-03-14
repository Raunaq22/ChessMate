import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import gameService from '../services/gameService';

const Home = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleCreateGame = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      console.log('Creating new game...'); // Debug log
      const response = await gameService.createGame();
      console.log('Game created:', response); // Debug log
      
      if (response?.game?.game_id) {
        navigate(`/game/${response.game.game_id}`);
      } else {
        throw new Error('Invalid game response');
      }
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to ChessMate</h1>
      <div className="flex space-x-4">
        <button
          onClick={handleCreateGame}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create New Game
        </button>
        <button
          onClick={() => navigate('/lobby')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Join Game
        </button>
      </div>
    </div>
  );
};

export default Home;