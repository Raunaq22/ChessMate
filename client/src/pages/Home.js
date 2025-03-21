import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const checkAuth = (path) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(path);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Welcome to ChessMate</h1>
      <div className="flex space-x-4">
        <button
          onClick={() => checkAuth('/lobby')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Play Lobby
        </button>
        <button
          onClick={() => checkAuth('/play-friend')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Play a Friend
        </button>
        <button
          onClick={() => checkAuth('/play-computer')}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Play Computer
        </button>
      </div>
    </div>
  );
};

export default Home;