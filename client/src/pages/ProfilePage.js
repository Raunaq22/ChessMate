import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ProfilePage = () => {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const fetchGameHistory = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/history`);
        setGameHistory(res.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load game history');
        setLoading(false);
      }
    };
    
    fetchGameHistory();
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated || !currentUser) return null;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-1/3 bg-primary p-8 text-white">
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-4xl text-primary font-bold">
                {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?'}
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">{currentUser.username}</h2>
            <p className="text-center text-white text-opacity-80">{currentUser.email}</p>
          </div>
          
          <div className="md:w-2/3 p-8">
            <h3 className="text-xl font-bold mb-4">Player Stats</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">ELO Rating</p>
                <p className="text-2xl font-bold">{currentUser.elo_rating || 1200}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Rank</p>
                <p className="text-2xl font-bold">{currentUser.rank || '-'}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Games Played</p>
                <p className="text-2xl font-bold">{currentUser.games_played || 0}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold">{currentUser.win_rate || '0%'}</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => navigate('/')} 
                className="bg-chess-dark hover:bg-chess-hover text-white font-bold py-2 px-6 rounded"
              >
                Play New Game
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Recent Games</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Loading game history...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">{error}</div>
        ) : gameHistory.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opponent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gameHistory.map((game, index) => (
                <tr key={game.game_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(game.end_time).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {game.opponent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded ${
                      game.result === 'win' ? 'bg-green-100 text-green-800' : 
                      game.result === 'loss' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {game.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={game.rating_change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {game.rating_change > 0 ? '+' : ''}{game.rating_change}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button 
                      onClick={() => navigate(`/game/${game.game_id}`)}
                      className="text-primary hover:text-blue-700"
                    >
                      Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-gray-500">
            No games played yet. Start playing to build your history!
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;