import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const gameService = {
  getAvailableGames: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games/available`);
      return response.data;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  },

  createGame: async (payload = {}) => {
    try {
      console.log('Creating game with payload:', payload);
      const response = await axios.post(`${API_URL}/api/games`, payload);
      console.log('Game service response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  joinGame: async (gameId) => {
    const response = await axios.post(`${API_URL}/api/games/${gameId}/join`);
    return response.data;
  },
  
  joinGameByCode: async (code) => {
    try {
      const response = await axios.post(`${API_URL}/api/games/join-by-code`, { code });
      return response.data;
    } catch (error) {
      console.error('Error joining game by code:', error);
      throw error;
    }
  },

  cancelGame: async (gameId) => {
    const response = await axios.delete(`${API_URL}/api/games/${gameId}`);
    return response.data;
  }
};

export default gameService;