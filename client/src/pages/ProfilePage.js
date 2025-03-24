import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import UserAvatar, { formatImageUrl } from '../components/common/UserAvatar';

const ProfilePage = () => {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [gameHistory, setGameHistory] = useState([]);
  const [userStats, setUserStats] = useState({
    activeGames: 0,
    gamesPlayed: 0,
    winRate: '0%',
    joined: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'descending' });

  // Sorting function for the table
  const sortedGameHistory = React.useMemo(() => {
    let sortableGames = [...gameHistory];
    
    if (sortConfig.key) {
      sortableGames.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortConfig.key) {
          case 'date':
            aValue = new Date(a.end_time || a.updated_at);
            bValue = new Date(b.end_time || b.updated_at);
            break;
          case 'opponent':
            aValue = (a.opponent_name || "Unknown").toLowerCase();
            bValue = (b.opponent_name || "Unknown").toLowerCase();
            break;
          case 'result':
            aValue = a.result || 'draw';
            bValue = b.result || 'draw';
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableGames;
  }, [gameHistory, sortConfig]);

  // Request sort handler
  const requestSort = (key) => {
    let direction = 'ascending';
    
    // If already sorting by this key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  // Get sort direction indicator for table headers
  const getSortDirectionIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics and game history in parallel
        const [statsRes, historyRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/users/stats`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/games/history`)
        ]);
        
        // Set user statistics
        setUserStats({
          activeGames: statsRes.data.activeGames || 0,
          gamesPlayed: statsRes.data.gamesPlayed || 0,
          winRate: statsRes.data.winRate ? `${statsRes.data.winRate}%` : '0%',
          joined: new Date(currentUser.created_at).toLocaleDateString()
        }); 
        
        // Set game history
        setGameHistory(historyRes.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [isAuthenticated, navigate, currentUser]);
  
  if (!isAuthenticated || !currentUser) return null;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-1/3 bg-primary p-8 text-white">
            <div className="flex justify-center mb-4">
              <UserAvatar 
                user={currentUser} 
                className="w-32 h-32 rounded-full bg-white object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">{currentUser.username}</h2>
            <p className="text-center text-white text-opacity-80">{currentUser.email}</p>
          </div>
          
          <div className="md:w-2/3 p-8">
            <h3 className="text-xl font-bold mb-4">Player Stats</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Active Games</p>
                <p className="text-2xl font-bold">{userStats.activeGames}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Games Played</p>
                <p className="text-2xl font-bold">{userStats.gamesPlayed}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Win Rate</p>
                <p className="text-2xl font-bold">{userStats.winRate}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Joined</p>
                <p className="text-2xl font-bold">{userStats.joined}</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => navigate('/lobby')} 
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('date')}
                >
                  Date {getSortDirectionIndicator('date')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('opponent')}
                >
                  Opponent {getSortDirectionIndicator('opponent')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('result')}
                >
                  Result {getSortDirectionIndicator('result')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Replay</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedGameHistory.map((game, index) => (
                <tr key={game.game_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(game.end_time || game.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {game.opponent_name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded ${
                      game.result === 'win' ? 'bg-green-100 text-green-800' : 
                      game.result === 'loss' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {game.result || 'Draw'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/game-replay/${game.game_id}`)}
                      className="text-indigo-600 hover:text-indigo-900"
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