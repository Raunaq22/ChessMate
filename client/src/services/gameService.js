import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const gameService = {
  getAvailableGames: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/games/available`);
      console.log('Game service response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Game service error:', error);
      throw error;
    }
  },

  createGame: async () => {
    try {
      const response = await axios.post(`${API_URL}/api/games`);
      console.log('Game service response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Game service error:', error);
      throw error;
    }
  },

  joinGame: async (gameId) => {
    const response = await axios.post(`${API_URL}/api/games/${gameId}/join`);
    return response.data;
  },

  cancelGame: async (gameId) => {
    const response = await axios.delete(`${API_URL}/api/games/${gameId}`);
    return response.data;
  }
};

export default gameService;