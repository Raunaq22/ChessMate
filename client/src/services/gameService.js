import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const gameService = {
  getAvailableGames: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/api/games/available`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  },

  createGame: async (payload = {}) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log('Creating game with payload:', payload);
      const response = await axios.post(`${API_URL}/api/games`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Game service response:', response.data);
      
      // Add more detailed logging of response data
      if (response.data && response.data.game) {
        console.log('Game creation successful with details:', {
          id: response.data.game.game_id,
          invite_code: response.data.game.invite_code,
          status: response.data.game.status
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  joinGame: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log(`Joining game with ID: ${gameId}`);
      const response = await axios.post(`${API_URL}/api/games/${gameId}/join`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Join response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining game:', error.response?.data || error.message);
      throw error;
    }
  },
  
  joinGameByCode: async (code) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log(`Sending request to join game with code: ${code}`);
      const response = await axios.post(`${API_URL}/api/games/join-by-code`, { code }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Join by code response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error joining game by code:', error.response?.data || error.message);
      throw error;
    }
  },

  cancelGame: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      console.log(`Cancelling game ${gameId}`);
      const response = await axios.delete(`${API_URL}/api/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling game:', error);
      throw error;
    }
  },

  getGameById: async (gameId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await axios.get(`${API_URL}/api/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.game || response.data;
    } catch (error) {
      console.error('Error fetching game details:', error);
      throw error;
    }
  }
};

export default gameService;